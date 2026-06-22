'use strict';

window.TestTab = window.TestTab || {};

window.TestTab.API = (() => {
  const LOCAL_PROXY2 = '/api/yahoo2';
  const CORS_PROXIES = [
    'https://corsproxy.io/?url=',
    'https://api.allorigins.win/raw?url=',
    'https://thingproxy.freeboard.io/fetch/',
    'https://api.codetabs.com/v1/proxy?quest=',
  ];
  const YAHOO_BASE2 = 'https://query2.finance.yahoo.com';

  const fetchYahooSearch = async (searchPath) => {
    try {
      const resp = await fetch(`${LOCAL_PROXY2}${searchPath}`, {
        headers: { 'Accept': 'application/json' },
      });
      if (resp.ok) return await resp.json();
    } catch (e) {
      console.warn('[TestTab API] Local search proxy failed, trying CORS:', e);
    }

    const fullUrl = `${YAHOO_BASE2}${searchPath}`;
    for (let i = 0; i < CORS_PROXIES.length; i++) {
      try {
        const resp = await fetch(`${CORS_PROXIES[i]}${encodeURIComponent(fullUrl)}`, {
          headers: { 'Accept': 'application/json' },
        });
        if (resp.ok) return await resp.json();
      } catch (e) {
        // continue
      }
    }
    throw new Error('Search failed');
  };

  const searchSymbols = async (query) => {
    query = query.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 30);
    if (!query || query.length < 2) return [];

    try {
      const raw = await fetchYahooSearch(`/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=0&quotesCount=10&enableFuzzyQuery=false`);
      return (raw.quotes || []).slice(0, 8).map(q => ({
        symbol: q.symbol,
        name: q.longname || q.shortname || q.symbol,
        exchange: q.exchange,
        type: q.quoteType,
      }));
    } catch (err) {
      console.warn('[TestTab API] Search failed, using fallback:', err);
      return window.FALLBACK ? window.FALLBACK.search(query) : [];
    }
  };

  const getQuote = async (symbol) => {
    return await window.API.getQuote(symbol, true);
  };

  const getHistory = async (symbol, range, interval) => {
    return await window.API.getHistory(symbol, range, interval);
  };

  return {
    searchSymbols,
    getQuote,
    getHistory,
  };
})();
