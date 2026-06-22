'use strict';

window.TestTab = (() => {
  let _activeSymbol = null;
  let _refreshInterval = null;
  let _unsubscribeState = null;

  const init = () => {
    console.log('[TestTab] 🧪 Initializing Test Sandbox tab...');
    
    _unsubscribeState = window.TestTab.State.subscribe((state) => {
      window.TestTab.Details.render(state);
      window.TestTab.Charts.render(state);
    });

    window.TestTab.Search.init('testSearchInput', selectAsset);

    setupRangeButtons();
    setupIndicatorToggles();

    startAutoRefresh();
  };

  const setupIndicatorToggles = () => {
    const container = document.getElementById('testTrendIndicatorsContainer');
    if (!container) return;

    container.querySelectorAll('.test-indicator-checkbox').forEach(chk => {
      const name = chk.dataset.indicator;
      const state = window.TestTab.State.get();
      if (state.indicators[name] !== undefined) {
        chk.checked = state.indicators[name];
      }

      chk.addEventListener('change', () => {
        window.TestTab.State.toggleIndicator(name, chk.checked);
      });
    });
  };

  const setupRangeButtons = () => {
    const container = document.getElementById('testChartRanges');
    if (!container) return;

    container.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        container.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const range = btn.dataset.range;
        let interval = '5m';
        if (range === '1d') interval = '5m';
        else if (range === '5d') interval = '15m';
        else if (range === '1mo') interval = '60m';
        else if (range === '3mo') interval = '1d';
        else if (range === '1y') interval = '1d';

        window.TestTab.State.setRangeAndInterval(range, interval);

        if (_activeSymbol) {
          try {
            const hist = await window.TestTab.API.getHistory(_activeSymbol, range, interval);
            const state = window.TestTab.State.get();
            window.TestTab.State.setAsset(_activeSymbol, state.quote, hist);
          } catch (e) {
            console.error('[TestTab] Failed to fetch history for new range:', e);
          }
        }
      });
    });
  };

  const selectAsset = async (symbol) => {
    _activeSymbol = symbol;
    console.log('[TestTab] Asset selected:', symbol);
    
    const state = window.TestTab.State.get();
    
    const workspace = document.getElementById('testAssetWorkspace');
    const emptyState = document.getElementById('testEmptyState');
    if (emptyState) emptyState.style.display = 'none';
    if (workspace) workspace.style.display = 'block';

    const tickerEl = document.getElementById('testAssetTicker');
    if (tickerEl) tickerEl.textContent = symbol.replace('.NS', '').replace('.BO', '');
    const nameEl = document.getElementById('testAssetName');
    if (nameEl) nameEl.textContent = 'Loading...';
    
    try {
      const [quote, history] = await Promise.all([
        window.TestTab.API.getQuote(symbol),
        window.TestTab.API.getHistory(symbol, state.range, state.interval),
      ]);
      
      window.TestTab.State.setAsset(symbol, quote, history);
      if (window.AppState && window.AppState.toast) {
        window.AppState.toast(`Loaded ${symbol.replace('.NS', '')} in sandbox`, 'success');
      }
    } catch (e) {
      console.error('[TestTab] Error loading asset:', e);
      if (window.AppState && window.AppState.toast) {
        window.AppState.toast(`Failed to load asset details`, 'error');
      }
    }
  };

  const startAutoRefresh = () => {
    if (_refreshInterval) clearInterval(_refreshInterval);
    _refreshInterval = setInterval(async () => {
      const section = document.getElementById('section-test');
      if (!section || section.hidden || section.style.display === 'none') return;

      if (_activeSymbol) {
        try {
          const quote = await window.TestTab.API.getQuote(_activeSymbol);
          window.TestTab.State.updateQuote(quote);
        } catch {}
      }
    }, 2000);
  };

  const destroy = () => {
    if (_refreshInterval) {
      clearInterval(_refreshInterval);
      _refreshInterval = null;
    }
    if (_unsubscribeState) {
      _unsubscribeState();
      _unsubscribeState = null;
    }
    if (window.TestTab.Charts && window.TestTab.Charts.destroy) {
      window.TestTab.Charts.destroy();
    }
  };

  return { init, destroy, selectAsset };
})();
