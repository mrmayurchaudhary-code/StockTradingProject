'use strict';

/* ============================================================
   SAMADHAN TRADING — API MODULE
   Yahoo Finance integration with CORS proxy + fallback data
   Security: Input sanitization, rate limiting, cache TTL
   ============================================================ */

const API = (() => {

  // ── CONFIGURATION ──
  const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url=',
  ];

  const YAHOO_BASE = 'https://query1.finance.yahoo.com';
  const YAHOO_BASE2 = 'https://query2.finance.yahoo.com';
  const CACHE_TTL = 30_000;   // 30 seconds
  const RATE_LIMIT_MS = 500;  // 500ms between requests per symbol
  const MAX_RETRIES = 2;

  // ── INTERNAL STATE ──
  const _cache = new Map();
  const _lastRequest = new Map();
  const _pendingRequests = new Map();

  // ── INPUT SANITIZER ──
  const sanitizeSymbol = (s) => {
    if (typeof s !== 'string') return '';
    return s.replace(/[^A-Za-z0-9.^=\-_]/g, '').slice(0, 20).toUpperCase();
  };

  // ── RATE LIMITER ──
  const waitForRateLimit = async (key) => {
    const last = _lastRequest.get(key) || 0;
    const wait = RATE_LIMIT_MS - (Date.now() - last);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    _lastRequest.set(key, Date.now());
  };

  // ── CACHE ──
  const fromCache = (key) => {
    const entry = _cache.get(key);
    if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
    return null;
  };

  const toCache = (key, data) => {
    _cache.set(key, { data, ts: Date.now() });
    // Prune old entries
    if (_cache.size > 200) {
      const oldest = [..._cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) _cache.delete(oldest[0]);
    }
  };

  // ── FETCH WITH CORS PROXY ──
  const fetchYahoo = async (path, proxyIndex = 0) => {
    const cacheKey = path;
    const cached = fromCache(cacheKey);
    if (cached) return cached;

    // Deduplicate simultaneous identical requests
    if (_pendingRequests.has(cacheKey)) return _pendingRequests.get(cacheKey);

    const promise = (async () => {
      const fullUrl = `${YAHOO_BASE}${path}`;
      let lastError;

      for (let i = proxyIndex; i < CORS_PROXIES.length + 1; i++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          let url, response;
          if (i < CORS_PROXIES.length) {
            url = `${CORS_PROXIES[i]}${encodeURIComponent(fullUrl)}`;
            response = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
          } else {
            // Try direct (may work in some environments)
            response = await fetch(fullUrl, { signal: controller.signal, mode: 'cors', headers: { 'Accept': 'application/json' } });
          }
          clearTimeout(timer);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          toCache(cacheKey, data);
          return data;
        } catch (err) {
          clearTimeout(timer);
          lastError = err;
        }
      }
      // All failed, throw with original error
      throw lastError || new Error('All fetch attempts failed');
    })();

    _pendingRequests.set(cacheKey, promise);
    promise.finally(() => _pendingRequests.delete(cacheKey));
    return promise;
  };

  // ── PARSERS ──
  const parseChart = (raw, symbol) => {
    try {
      const res = raw.chart.result[0];
      const m = res.meta;
      const prev = m.chartPreviousClose || m.previousClose || m.regularMarketPrice;
      const price = m.regularMarketPrice;
      const chg = price - prev;
      return {
        symbol: m.symbol || symbol,
        name: m.longName || m.shortName || m.symbol || symbol,
        price,
        open: m.regularMarketOpen,
        high: m.regularMarketDayHigh,
        low: m.regularMarketDayLow,
        volume: m.regularMarketVolume,
        prevClose: prev,
        change: chg,
        changePct: prev ? (chg / prev) * 100 : 0,
        marketCap: m.marketCap,
        currency: m.currency || 'INR',
        exchange: m.exchangeName || '—',
        week52High: m.fiftyTwoWeekHigh,
        week52Low: m.fiftyTwoWeekLow,
        pe: null, // not in chart endpoint
        _raw: true,
      };
    } catch {
      return null;
    }
  };

  const parseHistory = (raw) => {
    try {
      const res = raw.chart.result[0];
      const ts = res.timestamp || [];
      const q = res.indicators.quote[0];
      return ts.map((t, i) => ({
        time: t,
        open: q.open[i],
        high: q.high[i],
        low: q.low[i],
        close: q.close[i],
        volume: q.volume[i] || 0,
      })).filter(d => d.close !== null && d.close !== undefined);
    } catch {
      return [];
    }
  };

  // ── PUBLIC API ──
  const getQuote = async (symbol) => {
    symbol = sanitizeSymbol(symbol);
    if (!symbol) throw new Error('Invalid symbol');
    await waitForRateLimit(symbol);
    try {
      const raw = await fetchYahoo(`/v8/finance/chart/${symbol}?interval=1d&range=1d`);
      const q = parseChart(raw, symbol);
      if (q) return q;
      throw new Error('Parse failed');
    } catch {
      return FALLBACK.getQuote(symbol);
    }
  };

  const resampleHistory = (history, minutes) => {
    if (!history || !history.length) return [];
    const intervalSeconds = minutes * 60;
    const resampled = [];
    let currentCandle = null;

    for (const row of history) {
      const time = row.time; // Unix timestamp in seconds
      const bucket = Math.floor(time / intervalSeconds) * intervalSeconds;

      if (!currentCandle || currentCandle.time !== bucket) {
        if (currentCandle) {
          resampled.push(currentCandle);
        }
        currentCandle = {
          time: bucket,
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
          volume: row.volume || 0
        };
      } else {
        currentCandle.high = Math.max(currentCandle.high, row.high);
        currentCandle.low = Math.min(currentCandle.low, row.low);
        currentCandle.close = row.close;
        currentCandle.volume += (row.volume || 0);
      }
    }

    if (currentCandle) {
      resampled.push(currentCandle);
    }
    return resampled;
  };

  const getHistory = async (symbol, range = '1y', interval = '1d') => {
    symbol = sanitizeSymbol(symbol);
    if (!symbol) return [];

    let queryInterval = interval;
    let resampleMinutes = 0;

    if (interval.endsWith('m')) {
      const mins = parseInt(interval);
      if (mins === 3) { queryInterval = '1m'; resampleMinutes = 3; }
      else if (mins === 4) { queryInterval = '1m'; resampleMinutes = 4; }
      else if (mins === 7) { queryInterval = '1m'; resampleMinutes = 7; }
      else if (mins === 10) { queryInterval = '5m'; resampleMinutes = 10; }
      else if (mins === 20) { queryInterval = '5m'; resampleMinutes = 20; }
    }

    const path = `/v8/finance/chart/${symbol}?interval=${queryInterval}&range=${range}`;
    try {
      const raw = await fetchYahoo(path);
      let hist = parseHistory(raw);
      if (hist.length > 0) {
        if (resampleMinutes > 0) {
          hist = resampleHistory(hist, resampleMinutes);
        }
        return hist;
      }
      throw new Error('Empty');
    } catch {
      return FALLBACK.getHistory(symbol, range, interval);
    }
  };

  const getMultipleQuotes = async (symbols) => {
    return Promise.all(symbols.map(s => getQuote(s).catch(() => FALLBACK.getQuote(s))));
  };

  // ── SEARCH ──
  const searchSymbols = async (query) => {
    query = query.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 30);
    if (!query || query.length < 2) return [];
    try {
      const url = `${YAHOO_BASE2}/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=0&quotesCount=10&enableFuzzyQuery=false&region=IN`;
      const raw = await fetchYahoo(`/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=0&quotesCount=10&region=IN`);
      return (raw.quotes || []).filter(q => q.quoteType !== 'CRYPTOCURRENCY').slice(0, 8).map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchange,
        type: q.quoteType,
      }));
    } catch {
      return FALLBACK.search(query);
    }
  };

  const invalidateCache = () => _cache.clear();

  // ── EXPOSE ──
  return { getQuote, getHistory, getMultipleQuotes, searchSymbols, invalidateCache };
})();

/* ============================================================
   FALLBACK DATA — Realistic simulation when API fails
   ============================================================ */
const FALLBACK = (() => {

  // Well-known stock data (approximate as of 2025)
  const STOCKS = {
    // NSE Indices
    '^NSEI':     { name: 'NIFTY 50',          base: 24800, exchange: 'NSE', type: 'INDEX' },
    '^BSESN':    { name: 'BSE SENSEX',         base: 81500, exchange: 'BSE', type: 'INDEX' },
    '^NSEBANK':  { name: 'NIFTY BANK',         base: 53200, exchange: 'NSE', type: 'INDEX' },
    '^CNXIT':    { name: 'NIFTY IT',           base: 38900, exchange: 'NSE', type: 'INDEX' },
    '^CNXAUTO':  { name: 'NIFTY AUTO',         base: 22400, exchange: 'NSE', type: 'INDEX' },
    '^CNXPHARMA':{ name: 'NIFTY PHARMA',       base: 21100, exchange: 'NSE', type: 'INDEX' },
    // NSE Top Stocks
    'RELIANCE.NS':  { name: 'Reliance Industries',  base: 2920, exchange: 'NSE', cap: 1980000, pe: 28.4 },
    'TCS.NS':       { name: 'Tata Consultancy',     base: 4180, exchange: 'NSE', cap: 1520000, pe: 32.1 },
    'HDFCBANK.NS':  { name: 'HDFC Bank',            base: 1750, exchange: 'NSE', cap: 1330000, pe: 19.2 },
    'INFY.NS':      { name: 'Infosys Ltd',          base: 1892, exchange: 'NSE', cap: 790000,  pe: 29.5 },
    'ICICIBANK.NS': { name: 'ICICI Bank',           base: 1298, exchange: 'NSE', cap: 916000,  pe: 18.6 },
    'KOTAKBANK.NS': { name: 'Kotak Mahindra Bank',  base: 1940, exchange: 'NSE', cap: 386000,  pe: 22.1 },
    'HINDUNILVR.NS':{ name: 'HUL',                 base: 2480, exchange: 'NSE', cap: 581000,  pe: 56.2 },
    'SBIN.NS':      { name: 'State Bank of India',  base: 815,  exchange: 'NSE', cap: 728000,  pe: 12.3 },
    'BHARTIARTL.NS':{ name: 'Bharti Airtel',       base: 1680, exchange: 'NSE', cap: 994000,  pe: 78.4 },
    'ITC.NS':       { name: 'ITC Limited',          base: 466,  exchange: 'NSE', cap: 583000,  pe: 27.8 },
    'LT.NS':        { name: 'Larsen & Toubro',      base: 3580, exchange: 'NSE', cap: 492000,  pe: 33.6 },
    'AXISBANK.NS':  { name: 'Axis Bank',            base: 1158, exchange: 'NSE', cap: 357000,  pe: 16.9 },
    'ASIANPAINT.NS':{ name: 'Asian Paints',         base: 2780, exchange: 'NSE', cap: 266000,  pe: 62.3 },
    'WIPRO.NS':     { name: 'Wipro Ltd',            base: 518,  exchange: 'NSE', cap: 270000,  pe: 25.4 },
    'HCLTECH.NS':   { name: 'HCL Technologies',     base: 1820, exchange: 'NSE', cap: 494000,  pe: 30.2 },
    'ULTRACEMCO.NS':{ name: 'UltraTech Cement',     base: 10580,exchange: 'NSE', cap: 305000,  pe: 41.7 },
    'BAJFINANCE.NS':{ name: 'Bajaj Finance',        base: 6950, exchange: 'NSE', cap: 419000,  pe: 35.8 },
    'MARUTI.NS':    { name: 'Maruti Suzuki',        base: 11200,exchange: 'NSE', cap: 337000,  pe: 25.6 },
    'SUNPHARMA.NS': { name: 'Sun Pharmaceutical',  base: 1698, exchange: 'NSE', cap: 407000,  pe: 37.9 },
    'TITAN.NS':     { name: 'Titan Company',        base: 3410, exchange: 'NSE', cap: 303000,  pe: 92.4 },
    'ADANIENT.NS':  { name: 'Adani Enterprises',   base: 2680, exchange: 'NSE', cap: 306000,  pe: 55.1 },
    'POWERGRID.NS': { name: 'Power Grid Corp',      base: 327,  exchange: 'NSE', cap: 227000,  pe: 18.4 },
    'NTPC.NS':      { name: 'NTPC Ltd',             base: 378,  exchange: 'NSE', cap: 368000,  pe: 18.9 },
    'ONGC.NS':      { name: 'ONGC Ltd',             base: 295,  exchange: 'NSE', cap: 371000,  pe: 9.2  },
    'COALINDIA.NS': { name: 'Coal India',           base: 478,  exchange: 'NSE', cap: 295000,  pe: 7.8  },
    'JSWSTEEL.NS':  { name: 'JSW Steel',            base: 1020, exchange: 'NSE', cap: 252000,  pe: 22.1 },
    'GRASIM.NS':    { name: 'Grasim Industries',    base: 2680, exchange: 'NSE', cap: 177000,  pe: 24.6 },
    'TECHM.NS':     { name: 'Tech Mahindra',        base: 1420, exchange: 'NSE', cap: 137000,  pe: 28.9 },
    'NESTLEIND.NS': { name: 'Nestle India',         base: 2450, exchange: 'NSE', cap: 236000,  pe: 85.3 },
    'DRREDDY.NS':   { name: 'Dr Reddy\'s Lab',     base: 5780, exchange: 'NSE', cap: 97000,   pe: 18.7 },
    // ETFs
    'NIFTYBEES.NS': { name: 'Nifty BeES',           base: 248,  exchange: 'NSE', type: 'ETF' },
    'GOLDBEES.NS':  { name: 'Gold BeES',            base: 58.5, exchange: 'NSE', type: 'ETF' },
    'BANKBEES.NS':  { name: 'Bank BeES',            base: 498,  exchange: 'NSE', type: 'ETF' },
    'JUNIORBEES.NS':{ name: 'Junior BeES',          base: 88.4, exchange: 'NSE', type: 'ETF' },
    'ICICIB22.NS':  { name: 'ICICI Pru IT ETF',    base: 58.2, exchange: 'NSE', type: 'ETF' },
    'NETFIT.NS':    { name: 'Nifty IT ETF',         base: 74.6, exchange: 'NSE', type: 'ETF' },
    'LIQUIDBEES.NS':{ name: 'Liquid BeES',          base: 1000, exchange: 'NSE', type: 'ETF' },
    // Commodities
    'GC=F':   { name: 'Gold Futures',        base: 2380, exchange: 'COMEX', type: 'COMMODITY', unit: 'USD/oz' },
    'SI=F':   { name: 'Silver Futures',      base: 31.2, exchange: 'COMEX', type: 'COMMODITY', unit: 'USD/oz' },
    'CL=F':   { name: 'Crude Oil WTI',       base: 78.5, exchange: 'NYMEX', type: 'COMMODITY', unit: 'USD/bbl' },
    'NG=F':   { name: 'Natural Gas',         base: 2.45, exchange: 'NYMEX', type: 'COMMODITY', unit: 'USD/MMBtu' },
    'HG=F':   { name: 'Copper Futures',      base: 4.68, exchange: 'COMEX', type: 'COMMODITY', unit: 'USD/lb' },
    'ZW=F':   { name: 'Wheat Futures',       base: 620,  exchange: 'CBOT',  type: 'COMMODITY', unit: 'USc/bu' },
    // Currency
    'INR=X':    { name: 'USD/INR',   base: 83.68,  exchange: 'FOREX', type: 'CURRENCY' },
    'EURINR=X': { name: 'EUR/INR',   base: 89.95,  exchange: 'FOREX', type: 'CURRENCY' },
    'GBPINR=X': { name: 'GBP/INR',   base: 106.25, exchange: 'FOREX', type: 'CURRENCY' },
    'JPYINR=X': { name: 'JPY/INR',   base: 0.5412, exchange: 'FOREX', type: 'CURRENCY' },
    'AUDINR=X': { name: 'AUD/INR',   base: 54.32,  exchange: 'FOREX', type: 'CURRENCY' },
    'SGDINR=X': { name: 'SGD/INR',   base: 62.18,  exchange: 'FOREX', type: 'CURRENCY' },
  };

  // Persistent volatility seeds per symbol (so prices move consistently in one session)
  const _seeds = new Map();

  const getSeed = (symbol) => {
    if (!_seeds.has(symbol)) _seeds.set(symbol, Math.random() * 2 - 1);
    return _seeds.get(symbol);
  };

  const livePrice = (symbol) => {
    const info = STOCKS[symbol];
    if (!info) return { base: 1000, change: 0, pct: 0 };
    const seed = getSeed(symbol);
    const intraVolatility = 0.015;
    const chgPct = seed * intraVolatility + (Math.random() - 0.499) * 0.003;
    const price = +(info.base * (1 + chgPct)).toFixed(2);
    const chg = +(price - info.base).toFixed(2);
    return { price, chg, pct: +((chg / info.base) * 100).toFixed(2) };
  };

  const getQuote = (symbol) => {
    const info = STOCKS[symbol] || { name: symbol, base: 1000, exchange: 'NSE' };
    const { price, chg, pct } = livePrice(symbol);
    return {
      symbol,
      name: info.name || symbol,
      price,
      open: +(info.base * 1.001).toFixed(2),
      high: +(price * 1.012).toFixed(2),
      low: +(price * 0.988).toFixed(2),
      volume: Math.floor(Math.random() * 5_000_000 + 100_000),
      prevClose: info.base,
      change: chg,
      changePct: pct,
      marketCap: info.cap || null,
      currency: 'INR',
      exchange: info.exchange || 'NSE',
      week52High: +(info.base * 1.38).toFixed(2),
      week52Low: +(info.base * 0.68).toFixed(2),
      pe: info.pe || null,
      _simulated: true,
    };
  };

  const getHistory = (symbol, range = '1y', interval = '1d') => {
    const info = STOCKS[symbol] || { base: 1000 };
    
    let stepSeconds = 86400; // default 1 day
    let count = 365;

    if (interval.endsWith('m')) {
      const mins = parseInt(interval) || 5;
      stepSeconds = mins * 60;
      const ranges = { '1d': 375 / mins, '5d': (375 * 5) / mins, '1mo': (375 * 20) / mins };
      count = Math.round(ranges[range] || (375 / mins));
    } else {
      const days = { '1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '2y': 730, '5y': 1825 };
      count = days[range] || 365;
    }

    const now = Math.floor(Date.now() / 1000);
    let price = info.base;
    const history = [];
    const seed = getSeed(symbol);
    const trend = seed * 0.0001; // slight directional bias
    const volatility = interval.endsWith('m') ? 0.002 : 0.018;

    for (let i = count; i >= 0; i--) {
      const change = trend + (Math.random() - 0.495) * volatility;
      price = Math.max(price * (1 + change), 1);
      const open = +(price * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2);
      const close = +price.toFixed(2);
      const high = +(Math.max(open, close) * (1 + Math.random() * 0.003)).toFixed(2);
      const low = +(Math.min(open, close) * (1 - Math.random() * 0.003)).toFixed(2);
      history.push({
        time: now - i * stepSeconds,
        open, high, low, close,
        volume: Math.floor(Math.random() * 200_000 + 5_000),
      });
    }
    return history;
  };

  const search = (query) => {
    const q = query.toLowerCase();
    return Object.entries(STOCKS)
      .filter(([sym, info]) =>
        sym.toLowerCase().includes(q) ||
        (info.name || '').toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map(([symbol, info]) => ({
        symbol,
        name: info.name,
        exchange: info.exchange || 'NSE',
        type: info.type || 'EQUITY',
      }));
  };

  // Expose the full stocks map for segments to reference
  const getAllSymbols = (type) => {
    if (type) return Object.entries(STOCKS).filter(([, v]) => v.type === type).map(([k]) => k);
    return Object.keys(STOCKS);
  };

  const getStockInfo = (symbol) => STOCKS[symbol] || null;

  return { getQuote, getHistory, search, getAllSymbols, getStockInfo, STOCKS };
})();

/* ============================================================
   UTILITY FORMATTERS (used across all modules)
   ============================================================ */
const FMT = {
  currency: (n, decimals = 2, currency = '₹') => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1e7) return `${currency}${(n / 1e7).toFixed(2)}Cr`;
    if (abs >= 1e5) return `${currency}${(n / 1e5).toFixed(2)}L`;
    return `${currency}${n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  },

  price: (n, decimals = 2) => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return n.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  },

  pct: (n) => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    const sign = n >= 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
  },

  volume: (n) => {
    if (!n || isNaN(n)) return '—';
    if (n >= 1e7) return `${(n / 1e7).toFixed(2)}Cr`;
    if (n >= 1e5) return `${(n / 1e5).toFixed(2)}L`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toString();
  },

  marketCap: (n) => {
    if (!n || isNaN(n)) return '—';
    if (n >= 1e13) return `₹${(n / 1e13).toFixed(2)}L Cr`;
    if (n >= 1e11) return `₹${(n / 1e11).toFixed(2)}K Cr`;
    if (n >= 1e9)  return `₹${(n / 1e9).toFixed(2)} Cr`;
    return `₹${(n / 1e7).toFixed(2)} L`;
  },

  // Sanitize HTML output
  escHtml: (s) => {
    if (typeof s !== 'string') return '';
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  },

  changeClass: (n) => n >= 0 ? 'positive' : 'negative',
  changeIcon: (n) => n >= 0 ? 'ri-arrow-up-s-fill' : 'ri-arrow-down-s-fill',
};
