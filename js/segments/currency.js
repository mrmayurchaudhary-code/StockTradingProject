'use strict';

/* ============================================================
   SAMADHAN TRADING — CURRENCY SEGMENT MODULE
   Forex rates: USD/INR, EUR/INR, GBP/INR, JPY/INR, etc.
   ============================================================ */

const Currency = (() => {

  const CURRENCIES = [
    { symbol: 'INR=X',    name: 'US Dollar',  pair: 'USD/INR', flag: '🇺🇸', code: 'USD' },
    { symbol: 'EURINR=X', name: 'Euro',        pair: 'EUR/INR', flag: '🇪🇺', code: 'EUR' },
    { symbol: 'GBPINR=X', name: 'British Pound', pair: 'GBP/INR', flag: '🇬🇧', code: 'GBP' },
    { symbol: 'JPYINR=X', name: 'Japanese Yen', pair: 'JPY/INR', flag: '🇯🇵', code: 'JPY' },
    { symbol: 'AUDINR=X', name: 'Australian Dollar', pair: 'AUD/INR', flag: '🇦🇺', code: 'AUD' },
    { symbol: 'SGDINR=X', name: 'Singapore Dollar', pair: 'SGD/INR', flag: '🇸🇬', code: 'SGD' },
  ];

  let _quotes = {};
  let _selected = null;
  let _currentRange = '1mo';

  const init = async () => {
    const quotes = await API.getMultipleQuotes(CURRENCIES.map(c => c.symbol));
    quotes.forEach((q, i) => { if (q) _quotes[CURRENCIES[i].symbol] = q; });
    renderGrid();
    setupChartControls();
    if (CURRENCIES.length > 0) await selectCurrency(CURRENCIES[0].symbol);
  };

  const renderGrid = () => {
    const grid = document.getElementById('currencyGrid');
    if (!grid) return;

    grid.innerHTML = CURRENCIES.map(c => {
      const q = _quotes[c.symbol] || FALLBACK.getQuote(c.symbol);
      const positive = q.changePct >= 0;
      const inr = q.price || 83;
      return `<div class="asset-card ${_selected === c.symbol ? 'selected' : ''}" data-symbol="${FMT.escHtml(c.symbol)}" role="button" tabindex="0" aria-label="${FMT.escHtml(c.pair)}">
        <div class="asset-card-header">
          <div style="font-size:1.6rem;line-height:1">${c.flag}</div>
          <span class="segment-badge badge-currency">FOREX</span>
        </div>
        <div class="asset-name">${FMT.escHtml(c.pair)}</div>
        <div class="asset-ticker">${FMT.escHtml(c.name)}</div>
        <div class="asset-ltp" style="font-size:1.1rem">₹${FMT.price(inr, 4)}</div>
        <div class="asset-change ${positive ? 'positive' : 'negative'}">
          <i class="${FMT.changeIcon(q.changePct)}"></i>
          ${FMT.pct(q.changePct)}
          <span style="color:var(--text-muted);font-weight:400;font-size:0.65rem">(${q.change >= 0 ? '+' : ''}₹${FMT.price(Math.abs(q.change), 4)})</span>
        </div>
        <div class="asset-meta">
          <span>Exchange: NSE</span>
          <span>Vol: ${FMT.volume(q.volume)}</span>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.asset-card').forEach(card => {
      card.addEventListener('click', () => selectCurrency(card.dataset.symbol));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectCurrency(card.dataset.symbol); });
    });
  };

  const selectCurrency = async (symbol) => {
    _selected = symbol;
    document.querySelectorAll('#currencyGrid .asset-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.symbol === symbol);
    });
    const info = CURRENCIES.find(c => c.symbol === symbol);
    const titleEl = document.getElementById('currencyChartTitle');
    if (titleEl && info) titleEl.textContent = `${info.flag} ${info.pair} — Live Rate`;
    await loadCurrencyChart(symbol, _currentRange);
  };

  const loadCurrencyChart = async (symbol, range) => {
    Charts.showChartLoading('currencyChart');
    const hist = await API.getHistory(symbol, range, '1d');
    Charts.renderChart('currencyChart', hist, 'area', 280);
  };

  const setupChartControls = () => {
    document.getElementById('currencyTimeRange')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.time-btn');
      if (!btn) return;
      document.querySelectorAll('#currencyTimeRange .time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _currentRange = btn.dataset.range;
      if (_selected) await loadCurrencyChart(_selected, _currentRange);
    });
  };

  const refresh = async () => { await init(); };

  return { init, refresh };
})();
