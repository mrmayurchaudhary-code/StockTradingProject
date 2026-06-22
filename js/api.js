'use strict';

/* ============================================================
   SAMADHAN TRADING — API MODULE
   Groww API (primary) + Yahoo Finance (fallback) + Simulation
   Data priority: Groww Bridge → Yahoo Proxy → CORS Proxy → Simulation
   Security: Input sanitization, rate limiting, cache TTL
   ============================================================ */

const API = (() => {

  // ── CONFIGURATION ──

  // Groww API Bridge (primary — live Indian market data)
  const GROWW_PROXY_BASE = '/api/groww';

  // Dhan API Bridge
  const DHAN_PROXY_BASE = '/api/dhan';

  // Local Yahoo proxy server (fallback)
  const LOCAL_PROXY_BASE = '/api/yahoo1';   // Proxied via server.js
  const LOCAL_PROXY2     = '/api/yahoo2';   // query2 endpoint

  // CORS proxies (last resort when both Groww and Yahoo proxy fail)
  const CORS_PROXIES = [
    'https://corsproxy.io/?url=',
    'https://api.allorigins.win/raw?url=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://api.codetabs.com/v1/proxy?quest=',
  ];

  const YAHOO_BASE  = 'https://query1.finance.yahoo.com';
  const YAHOO_BASE2 = 'https://query2.finance.yahoo.com';
  const CACHE_TTL      = 15_000;   // 15 seconds — faster live updates
  const RATE_LIMIT_MS  = 300;      // 300ms between requests per symbol
  const MAX_RETRIES    = 2;

  // ── INTERNAL STATE ──
  const _cache = new Map();
  const _lastRequest = new Map();
  const _pendingRequests = new Map();
  let _localProxyAvailable = null;   // null = not checked, true/false = result
  let _growwAvailable = null;        // null = not checked, true/false = result
  let _growwAuthenticated = false;   // true when Groww bridge is running AND authenticated
  let _dhanAvailable = null;
  let _dhanAuthenticated = false;
  let _dataSource = 'simulation';    // 'dhan' | 'groww' | 'yahoo' | 'simulation'

  // ── DETECT GROWW BRIDGE ──
  const checkGrowwBridge = async () => {
    if (_growwAvailable !== null) return _growwAvailable;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(`${GROWW_PROXY_BASE}/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      _growwAvailable = data.status === 'ok';
      _growwAuthenticated = data.authenticated === true;
      if (_growwAuthenticated) {
        _dataSource = 'groww';
        console.log('[Samadhan] 🟢 Groww API Bridge detected — LIVE market data active');
      } else if (_growwAvailable) {
        console.log('[Samadhan] 🟡 Groww Bridge running but NOT authenticated — check .env credentials');
      }
      return _growwAvailable && _growwAuthenticated;
    } catch {
      _growwAvailable = false;
      _growwAuthenticated = false;
      console.log('[Samadhan] ⚪ Groww Bridge not detected — trying Yahoo Finance');
      return false;
    }
  };

  // ── DETECT LOCAL YAHOO PROXY ──
  const checkLocalProxy = async () => {
    if (_localProxyAvailable !== null) return _localProxyAvailable;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch('/api/health', { signal: controller.signal });
      clearTimeout(timer);
      const data = await resp.json();
      _localProxyAvailable = data.proxy === true;
      if (_localProxyAvailable && _dataSource !== 'groww') {
        _dataSource = 'yahoo';
        console.log('[Samadhan] ✅ Yahoo proxy server detected');
      }
      return _localProxyAvailable;
    } catch {
      _localProxyAvailable = false;
      console.log('[Samadhan] ⚠️  Yahoo proxy not found — using CORS proxy fallback');
      return false;
    }
  };

  // ── DETECT DHAN BRIDGE ──
  const checkDhanBridge = async () => {
    if (_dhanAvailable !== null) return _dhanAvailable && _dhanAuthenticated;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      const resp = await fetch(`${DHAN_PROXY_BASE}/health`, { signal: controller.signal });
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      _dhanAvailable = data.status === 'ok';
      _dhanAuthenticated = data.authenticated === true;
      if (_dhanAuthenticated) {
        _dataSource = 'dhan';
        console.log('[Samadhan] 🟢 Dhan API Bridge detected — LIVE market data active');
      } else if (_dhanAvailable) {
        console.log('[Samadhan] 🟡 Dhan Bridge running but NOT authenticated — using fallback mode');
      }
      return _dhanAvailable && _dhanAuthenticated;
    } catch {
      _dhanAvailable = false;
      _dhanAuthenticated = false;
      console.log('[Samadhan] ⚪ Dhan Bridge not detected');
      return false;
    }
  };

  // Initial checks on load (Dhan & Groww first, then Yahoo)
  (async () => {
    await checkDhanBridge();
    await checkGrowwBridge();
    await checkLocalProxy();
  })();

  // ── INPUT SANITIZER ──
  const sanitizeSymbol = (s) => {
    if (typeof s !== 'string') return '';
    return s.replace(/[^A-Za-z0-9.^=\-_&]/g, '').slice(0, 20).toUpperCase();
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

  // ════════════════════════════════════════════════════════════
  //  BINANCE API PROVIDER (For Crypto Tab)
  // ════════════════════════════════════════════════════════════

  const mapToBinanceSymbol = (sym) => {
    const mapping = {
      'BTC-USD': 'BTCUSDT',
      'ETH-USD': 'ETHUSDT',
      'USDT-USD': 'USDTUSD',
      'BNB-USD': 'BNBUSDT',
      'SOL-USD': 'SOLUSDT'
    };
    return mapping[sym] || sym.replace('-USD', 'USDT');
  };

  const mapIntervalToBinance = (interval) => {
    const mapping = {
      '1d': '1d',
      '1m': '1m',
      '2m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '60m': '1h',
      '1h': '1h',
      '1wk': '1w',
      '1w': '1w',
      '1mo': '1M',
    };
    return mapping[interval] || '1d';
  };

  const getLimitForRange = (range, interval) => {
    if (interval.endsWith('m')) {
      const mins = parseInt(interval) || 5;
      const ranges = { '1d': 1440 / mins, '5d': (1440 * 5) / mins, '1mo': (1440 * 30) / mins };
      return Math.round(ranges[range] || (1440 / mins));
    } else {
      const days = { '1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365, '2y': 730, '5y': 1825 };
      return days[range] || 365;
    }
  };

  const fetchBinanceQuote = async (symbol) => {
    const binanceSym = mapToBinanceSymbol(symbol);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const resp = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSym}`, {
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`Binance HTTP ${resp.status}`);
      const data = await resp.json();
      
      const price = parseFloat(data.lastPrice);
      const open = parseFloat(data.openPrice);
      const high = parseFloat(data.highPrice);
      const low = parseFloat(data.lowPrice);
      const prevClose = parseFloat(data.prevClosePrice);
      const change = parseFloat(data.priceChange);
      const changePct = parseFloat(data.priceChangePercent);
      const volume = parseFloat(data.volume);
      
      return {
        symbol,
        name: symbol.replace('-USD', ''),
        price,
        open,
        high,
        low,
        prevClose,
        change,
        changePct,
        volume,
        marketCap: null,
        currency: 'USD',
        exchange: 'Binance',
        week52High: high,
        week52Low: low,
        pe: null,
        bidPrice: parseFloat(data.bidPrice),
        bidQty: parseFloat(data.bidQty),
        offerPrice: parseFloat(data.askPrice),
        offerQty: parseFloat(data.askQty),
        _live: true,
        _source: 'binance',
      };
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  const fetchBinanceHistory = async (symbol, range, interval) => {
    const binanceSym = mapToBinanceSymbol(symbol);
    const binanceInterval = mapIntervalToBinance(interval);
    const limit = getLimitForRange(range, interval);
    
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const resp = await fetch(`https://api.binance.com/api/v3/klines?symbol=${binanceSym}&interval=${binanceInterval}&limit=${limit}`, {
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`Binance History HTTP ${resp.status}`);
      const data = await resp.json();
      
      return data.map(c => ({
        time: Math.floor(c[0] / 1000),
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5])
      }));
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  // ════════════════════════════════════════════════════════════
  //  DHAN API PROVIDER
  // ════════════════════════════════════════════════════════════

  const fetchDhanQuote = async (symbol) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const resp = await fetch(`${DHAN_PROXY_BASE}/quote?symbol=${encodeURIComponent(symbol)}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`Dhan HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  const fetchDhanMultiQuotes = async (symbols) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const resp = await fetch(`${DHAN_PROXY_BASE}/quotes?symbols=${encodeURIComponent(symbols.join(','))}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`Dhan batch HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  const fetchDhanHistory = async (symbol, range, interval) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const params = new URLSearchParams({ symbol, range, interval });
      const resp = await fetch(`${DHAN_PROXY_BASE}/history?${params}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`Dhan history HTTP ${resp.status}`);
      const data = await resp.json();
      return data.candles || [];
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  // ════════════════════════════════════════════════════════════
  //  GROWW API PROVIDER (Primary)
  // ════════════════════════════════════════════════════════════

  const fetchGrowwQuote = async (symbol) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const resp = await fetch(`${GROWW_PROXY_BASE}/quote?symbol=${encodeURIComponent(symbol)}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`Groww HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  const fetchGrowwMultiQuotes = async (symbols) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const resp = await fetch(`${GROWW_PROXY_BASE}/quotes?symbols=${encodeURIComponent(symbols.join(','))}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`Groww batch HTTP ${resp.status}`);
      return await resp.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  const fetchGrowwHistory = async (symbol, range, interval) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const params = new URLSearchParams({ symbol, range, interval });
      const resp = await fetch(`${GROWW_PROXY_BASE}/history?${params}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timer);
      if (!resp.ok) throw new Error(`Groww history HTTP ${resp.status}`);
      const data = await resp.json();
      return data.candles || [];
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  // ════════════════════════════════════════════════════════════
  //  YAHOO FINANCE PROVIDER (Fallback)
  // ════════════════════════════════════════════════════════════

  // ── FETCH VIA LOCAL PROXY (primary) ──
  const fetchViaLocalProxy = async (path) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const url = `${LOCAL_PROXY_BASE}${path}`;
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`Local proxy HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  // ── FETCH VIA CORS PROXIES (fallback) ──
  const fetchViaCorsProxy = async (path) => {
    const fullUrl = `${YAHOO_BASE}${path}`;
    let lastError;

    for (let i = 0; i < CORS_PROXIES.length; i++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const url = `${CORS_PROXIES[i]}${encodeURIComponent(fullUrl)}`;
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timer);
        if (!response.ok) throw new Error(`CORS proxy ${i} HTTP ${response.status}`);
        return await response.json();
      } catch (err) {
        clearTimeout(timer);
        lastError = err;
      }
    }

    // Last resort: try direct fetch (works in some environments)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(fullUrl, {
        signal: controller.signal,
        mode: 'cors',
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timer);
      if (!response.ok) throw new Error(`Direct fetch HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      clearTimeout(timer);
      throw lastError || err;
    }
  };

  // ── UNIFIED YAHOO FETCH: Local Proxy → CORS Proxies ──
  const fetchYahoo = async (path) => {
    const cacheKey = `yahoo:${path}`;
    const cached = fromCache(cacheKey);
    if (cached) return cached;

    // Deduplicate simultaneous identical requests
    if (_pendingRequests.has(cacheKey)) return _pendingRequests.get(cacheKey);

    const promise = (async () => {
      // 1. Try local proxy first (fastest)
      const useLocal = await checkLocalProxy();
      if (useLocal) {
        try {
          const data = await fetchViaLocalProxy(path);
          toCache(cacheKey, data);
          return data;
        } catch (err) {
          console.warn('[Samadhan] Local proxy failed, trying CORS fallback:', err.message);
        }
      }

      // 2. Try CORS proxies as fallback
      try {
        const data = await fetchViaCorsProxy(path);
        toCache(cacheKey, data);
        return data;
      } catch (err) {
        throw err;
      }
    })();

    _pendingRequests.set(cacheKey, promise);
    promise.finally(() => _pendingRequests.delete(cacheKey));
    return promise;
  };

  // ── YAHOO PARSERS ──
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
        _source: 'yahoo',
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

  // ════════════════════════════════════════════════════════════
  //  PUBLIC API  — Groww → Yahoo → Simulation
  // ════════════════════════════════════════════════════════════

  const getQuote = async (symbol, bypassCache = false) => {
    symbol = sanitizeSymbol(symbol);
    if (!symbol) throw new Error('Invalid symbol');

    // Check cache first
    const cacheKey = `quote:${symbol}`;
    if (!bypassCache) {
      const cached = fromCache(cacheKey);
      if (cached) return cached;
    }

    // Route to Binance for Crypto
    if (symbol.endsWith('-USD') || symbol.endsWith('-USDT')) {
      try {
        const bq = await fetchBinanceQuote(symbol);
        toCache(cacheKey, bq);
        return bq;
      } catch (err) {
        console.warn(`[Samadhan] Binance quote failed for ${symbol}:`, err.message);
        return FALLBACK.getQuote(symbol);
      }
    }

    await waitForRateLimit(symbol);

    // 0. Try Dhan API first
    const dhanReady = await checkDhanBridge();
    if (dhanReady) {
      try {
        const dq = await fetchDhanQuote(symbol);
        if (dq && dq.price) {
          _dataSource = 'dhan';
          toCache(cacheKey, dq);
          return dq;
        }
      } catch (err) {
        console.warn(`[Samadhan] Dhan quote failed for ${symbol}:`, err.message);
      }
    }

    // 1. Try Groww API first
    const growwReady = await checkGrowwBridge();
    if (growwReady) {
      try {
        const gq = await fetchGrowwQuote(symbol);
        if (gq && gq._live && gq.price) {
          _dataSource = 'groww';
          toCache(cacheKey, gq);
          return gq;
        }
      } catch (err) {
        console.warn(`[Samadhan] Groww quote failed for ${symbol}:`, err.message);
      }
    }

    // 2. Try Yahoo Finance
    try {
      const raw = await fetchYahoo(`/v8/finance/chart/${symbol}?interval=1d&range=1d`);
      const q = parseChart(raw, symbol);
      if (q) {
        if (_dataSource !== 'groww') _dataSource = 'yahoo';
        toCache(cacheKey, q);
        return q;
      }
      throw new Error('Parse failed');
    } catch {
      // 3. Simulation fallback
      if (_dataSource !== 'groww') _dataSource = 'simulation';
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

    // Route to Binance for Crypto
    if (symbol.endsWith('-USD') || symbol.endsWith('-USDT')) {
      try {
        const hist = await fetchBinanceHistory(symbol, range, interval);
        if (hist && hist.length > 0) return hist;
      } catch (err) {
        console.warn(`[Samadhan] Binance history failed for ${symbol}:`, err.message);
        return FALLBACK.getHistory(symbol, range, interval);
      }
    }

    // 0. Try Dhan API first
    const dhanReady = await checkDhanBridge();
    if (dhanReady) {
      try {
        const hist = await fetchDhanHistory(symbol, range, interval);
        if (hist && hist.length > 0) {
          return hist;
        }
      } catch (err) {
        console.warn(`[Samadhan] Dhan history failed for ${symbol}:`, err.message);
      }
    }

    // 1. Try Groww API first
    const growwReady = await checkGrowwBridge();
    if (growwReady) {
      try {
        const hist = await fetchGrowwHistory(symbol, range, interval);
        if (hist && hist.length > 0) {
          return hist;
        }
      } catch (err) {
        console.warn(`[Samadhan] Groww history failed for ${symbol}:`, err.message);
      }
    }

    // 2. Fall through to Yahoo
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

  const getMultipleQuotes = async (symbols, bypassCache = false) => {
    // 0. Try Dhan batch endpoint first
    const dhanReady = await checkDhanBridge();
    if (dhanReady) {
      try {
        const results = await fetchDhanMultiQuotes(symbols);
        if (Array.isArray(results) && results.length > 0) {
          return results.map((r, i) => {
            if (r && r.price) return r;
            return FALLBACK.getQuote(symbols[i]);
          });
        }
      } catch (err) {
        console.warn('[Samadhan] Dhan batch quotes failed:', err.message);
      }
    }

    // 1. Try Groww batch endpoint first
    const growwReady = await checkGrowwBridge();
    if (growwReady) {
      try {
        const results = await fetchGrowwMultiQuotes(symbols);
        if (Array.isArray(results) && results.length > 0) {
          // Fill in any failed items with fallback
          return results.map((r, i) => {
            if (r && r._live && r.price) return r;
            return FALLBACK.getQuote(symbols[i]);
          });
        }
      } catch (err) {
        console.warn('[Samadhan] Groww batch quotes failed:', err.message);
      }
    }

    // 2. Fall through to individual Yahoo quotes
    return Promise.all(symbols.map(s => getQuote(s).catch(() => FALLBACK.getQuote(s))));
  };

  // ── SEARCH (uses query2 endpoint) ──
  const fetchYahooSearch = async (searchPath) => {
    const cacheKey = `search:${searchPath}`;
    const cached = fromCache(cacheKey);
    if (cached) return cached;

    // Try local proxy (query2 endpoint) first
    const useLocal = await checkLocalProxy();
    if (useLocal) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(`${LOCAL_PROXY2}${searchPath}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timer);
        if (resp.ok) {
          const data = await resp.json();
          toCache(cacheKey, data);
          return data;
        }
      } catch {}
    }

    // CORS proxy fallback for search
    const fullUrl = `${YAHOO_BASE2}${searchPath}`;
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(`${CORS_PROXIES[i]}${encodeURIComponent(fullUrl)}`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timer);
        if (resp.ok) {
          const data = await resp.json();
          toCache(cacheKey, data);
          return data;
        }
      } catch {}
    }
    throw new Error('Search fetch failed');
  };

  const searchSymbols = async (query) => {
    query = query.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 30);
    if (!query || query.length < 2) return [];
    try {
      const raw = await fetchYahooSearch(`/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=0&quotesCount=10&enableFuzzyQuery=false&region=IN`);
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

  const getHoldings = async () => {
    const growwReady = await checkGrowwBridge();
    if (growwReady) {
      try {
        const resp = await fetch(`${GROWW_PROXY_BASE}/holdings`, {
          headers: { 'Accept': 'application/json' },
        });
        if (resp.ok) {
          const data = await resp.json();
          return data.holdings || [];
        }
      } catch (err) {
        console.warn('[Samadhan] getHoldings failed:', err.message);
      }
    }
    return [];
  };

  const invalidateCache = () => _cache.clear();

  // Reset all provider detection (useful after starting servers)
  const resetProxyCheck = () => {
    _localProxyAvailable = null;
    _growwAvailable = null;
    _growwAuthenticated = false;
    _dhanAvailable = null;
    _dhanAuthenticated = false;
    (async () => {
      await checkDhanBridge();
      await checkGrowwBridge();
      await checkLocalProxy();
    })();
  };

  // Check if live data is available (either Groww, Dhan or Yahoo)
  const isLive = () => _growwAuthenticated || _dhanAuthenticated || _localProxyAvailable === true;

  // Check if Groww live data is active
  const isGrowwLive = () => _growwAuthenticated;

  // Check if Dhan live data is active
  const isDhanLive = () => _dhanAuthenticated;

  // Get current data source identifier
  const getDataSource = () => _dataSource;

  // New Dhan Specific Data APIs
  const getOptionExpiryList = async (symbol) => {
    try {
      const resp = await fetch(`${DHAN_PROXY_BASE}/optionchain/expirylist?symbol=${encodeURIComponent(symbol)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const res = await resp.json();
      return res.data || [];
    } catch (e) {
      console.warn('[Samadhan] getOptionExpiryList failed:', e);
      // Return simulated Thursdays as fallback
      const dates = [];
      let d = new Date();
      while (dates.length < 5) {
        d = new Date(d.getTime() + 86400000);
        if (d.getDay() === 4) {
          dates.push(d.toISOString().split('T')[0]);
        }
      }
      return dates;
    }
  };

  const getOptionChain = async (symbol, expiry) => {
    try {
      const resp = await fetch(`${DHAN_PROXY_BASE}/optionchain?symbol=${encodeURIComponent(symbol)}&expiry=${encodeURIComponent(expiry)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      console.warn('[Samadhan] getOptionChain failed:', e);
      return null;
    }
  };

  const getMarketDepth = async (symbol) => {
    try {
      const resp = await fetch(`${DHAN_PROXY_BASE}/depth?symbol=${encodeURIComponent(symbol)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      console.warn('[Samadhan] getMarketDepth failed:', e);
      return null;
    }
  };

  const getExpiredOptions = async (symbol, strike, fromDate, toDate) => {
    try {
      const resp = await fetch(`${DHAN_PROXY_BASE}/expired-options?symbol=${encodeURIComponent(symbol)}&strike=${encodeURIComponent(strike)}&from=${encodeURIComponent(fromDate || '')}&to=${encodeURIComponent(toDate || '')}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (e) {
      console.warn('[Samadhan] getExpiredOptions failed:', e);
      return null;
    }
  };

  // ── WEBSOCKET CLIENT FOR REAL-TIME BROADCAST ──
  let _ws = null;
  let _wsSubscribed = new Set();
  const _wsHandlers = new Set();

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/dhan/ws`;
      
      console.log('[Samadhan] 🔌 Connecting to live Dhan WebSocket feed:', wsUrl);
      _ws = new WebSocket(wsUrl);

      _ws.onopen = () => {
        console.log('[Samadhan] 🟢 Live WebSocket feed connected successfully');
        // Resubscribe to any active symbols
        if (_wsSubscribed.size > 0) {
          _ws.send(JSON.stringify({
            action: 'subscribe',
            symbols: Array.from(_wsSubscribed)
          }));
        }
      };

      _ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ticks' && Array.isArray(msg.data)) {
            _wsHandlers.forEach(handler => handler(msg.data));
          }
        } catch (err) {
          console.warn('[Samadhan] Error parsing WebSocket message:', err);
        }
      };

      _ws.onerror = (err) => {
        console.error('[Samadhan] ❌ WebSocket feed error:', err);
      };

      _ws.onclose = () => {
        console.log('[Samadhan] 🔴 WebSocket feed closed. Reconnecting in 3s...');
        setTimeout(connectWebSocket, 3000);
      };
    } catch (e) {
      console.error('[Samadhan] WebSocket setup error:', e);
    }
  };

  const subscribeQuotes = (symbols) => {
    const syms = symbols.map(s => s.toUpperCase());
    const toSub = [];
    syms.forEach(s => {
      if (!_wsSubscribed.has(s)) {
        _wsSubscribed.add(s);
        toSub.push(s);
      }
    });

    if (toSub.length > 0 && _ws && _ws.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({
        action: 'subscribe',
        symbols: toSub
      }));
    }
  };

  const unsubscribeQuotes = (symbols) => {
    const syms = symbols.map(s => s.toUpperCase());
    const toUnsub = [];
    syms.forEach(s => {
      if (_wsSubscribed.has(s)) {
        _wsSubscribed.delete(s);
        toUnsub.push(s);
      }
    });

    if (toUnsub.length > 0 && _ws && _ws.readyState === WebSocket.OPEN) {
      _ws.send(JSON.stringify({
        action: 'unsubscribe',
        symbols: toUnsub
      }));
    }
  };

  const onTick = (handler) => {
    _wsHandlers.add(handler);
    return () => _wsHandlers.delete(handler);
  };

  const isWebSocketActive = () => _ws && _ws.readyState === WebSocket.OPEN;

  // Initial trigger
  setTimeout(connectWebSocket, 1000);

  // ── EXPOSE ──
  return {
    getQuote, getHistory, getMultipleQuotes, searchSymbols, getHoldings,
    invalidateCache, resetProxyCheck, isLive, isGrowwLive, isDhanLive, getDataSource,
    getOptionExpiryList, getOptionChain, getMarketDepth, getExpiredOptions, checkDhanBridge,
    subscribeQuotes, unsubscribeQuotes, onTick, isWebSocketActive
  };
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
    // Crypto
    'BTC-USD':  { name: 'Bitcoin',   base: 67250.00, exchange: 'CRYPTO', type: 'CRYPTOCURRENCY' },
    'ETH-USD':  { name: 'Ethereum',  base: 3520.00,  exchange: 'CRYPTO', type: 'CRYPTOCURRENCY' },
    'USDT-USD': { name: 'Tether',    base: 1.00,     exchange: 'CRYPTO', type: 'CRYPTOCURRENCY' },
    'BNB-USD':  { name: 'BNB',       base: 585.00,   exchange: 'CRYPTO', type: 'CRYPTOCURRENCY' },
    'SOL-USD':  { name: 'Solana',    base: 145.00,   exchange: 'CRYPTO', type: 'CRYPTOCURRENCY' },
  };

  // Persistent volatility seeds per symbol (so prices move consistently in one session)
  const _seeds = new Map();

  const getSeed = (symbol) => {
    if (!_seeds.has(symbol)) _seeds.set(symbol, Math.random() * 2 - 1);
    return _seeds.get(symbol);
  };

  const livePrice = (symbol) => {
    const info = STOCKS[symbol] || { base: 1000 };
    const seed = getSeed(symbol);
    const intraVolatility = 0.015;
    
    // Skip mock fluctuations if the market is closed
    const open = typeof isMarketOpenForSymbol === 'function' ? isMarketOpenForSymbol(symbol) : true;
    const fluctuation = open ? (Math.random() - 0.499) * 0.003 : 0.0;
    
    const chgPct = seed * intraVolatility + fluctuation;
    const price = +(info.base * (1 + chgPct)).toFixed(2);
    const chg = +(price - info.base).toFixed(2);
    return { price, chg, pct: +((chg / info.base) * 100).toFixed(2) };
  };

  const getQuote = (symbol) => {
    const info = STOCKS[symbol] || { name: symbol, base: 1000, exchange: 'NSE' };
    const { price, chg, pct } = livePrice(symbol);
    const isCrypto = info.exchange === 'CRYPTO' || symbol.endsWith('-USD');
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
      currency: isCrypto ? 'USD' : 'INR',
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

const isMarketOpenForSymbol = (symbol) => {
  if (!symbol) return false;
  
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  const h = ist.getHours();
  const m = ist.getMinutes();
  const mins = h * 60 + m;
  const isWeekday = day >= 1 && day <= 5;

  const nseOpen = isWeekday && mins >= 555 && mins < 930;     // 9:15 AM - 3:30 PM IST
  const mcxOpen = isWeekday && mins >= 540 && mins < 1410;    // 9:00 AM - 11:30 PM IST
  const forexOpen = isWeekday && mins >= 540 && mins < 1020;  // 9:00 AM - 5:00 PM IST
  const cryptoOpen = true;

  const sym = symbol.toUpperCase();
  if (sym.startsWith('^')) return nseOpen;
  if (sym.endsWith('-USD') || sym.endsWith('-USDT')) return cryptoOpen;
  if (sym.endsWith('=F') || sym.startsWith('MCX:')) return mcxOpen;
  if (sym.endsWith('=X') || sym.includes('INR=X')) return forexOpen;
  return nseOpen; // Default: Indian equities
};

if (typeof window !== 'undefined') {
  window.isMarketOpenForSymbol = isMarketOpenForSymbol;
}
