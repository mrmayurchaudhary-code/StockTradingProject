'use strict';

window.TestTab = window.TestTab || {};

window.TestTab.State = (() => {
  const _state = {
    symbol: null,
    quote: null,
    history: [],
    range: '1d',
    interval: '5m',
    indicators: {
      ema20: true,
      ema50: true,
      ema200: true,
      vwap: true,
      supertrend: false,
      rsi: true,
      macd: true,
      adx: false,
      volumeProfile: true,
      obv: false,
      atr: false,
      supportResistance: true,
      oi: false,
    },
  };

  const _listeners = new Set();

  const subscribe = (listener) => {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  };

  const notify = () => {
    _listeners.forEach(l => l({ ..._state }));
  };

  const get = () => ({ ..._state });

  const setAsset = (symbol, quote, history) => {
    _state.symbol = symbol;
    _state.quote = quote;
    _state.history = history;
    notify();
  };

  const setRangeAndInterval = (range, interval) => {
    _state.range = range;
    _state.interval = interval;
    notify();
  };

  const updateQuote = (quote) => {
    if (_state.symbol === quote.symbol) {
      _state.quote = quote;
      notify();
    }
  };

  const toggleIndicator = (name, active) => {
    if (_state.indicators[name] !== undefined) {
      _state.indicators[name] = active;
      notify();
    }
  };

  return {
    subscribe,
    get,
    setAsset,
    setRangeAndInterval,
    updateQuote,
    toggleIndicator,
  };
})();
