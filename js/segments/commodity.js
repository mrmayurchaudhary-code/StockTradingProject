'use strict';

/* ============================================================
   SAMADHAN TRADING — COMMODITIES SEGMENT MODULE
   MCX: Gold, Silver, Crude, Natural Gas, Copper
   ============================================================ */

const Commodity = (() => {

  const COMMODITIES = [
    { symbol: 'GC=F',  name: 'Gold',         unit: 'USD/oz',     icon: 'gold',    mcx: 'Gold (10g)', currency: 'USD' },
    { symbol: 'SI=F',  name: 'Silver',       unit: 'USD/oz',     icon: 'silver',  mcx: 'Silver (1kg)', currency: 'USD' },
    { symbol: 'CL=F',  name: 'Crude Oil',    unit: 'USD/bbl',    icon: 'crude',   mcx: 'Crude (bbl)', currency: 'USD' },
    { symbol: 'NG=F',  name: 'Natural Gas',  unit: 'USD/MMBtu',  icon: 'gas',     mcx: 'Nat Gas', currency: 'USD' },
    { symbol: 'HG=F',  name: 'Copper',       unit: 'USD/lb',     icon: 'copper',  mcx: 'Copper (MT)', currency: 'USD' },
    { symbol: 'ZW=F',  name: 'Wheat',        unit: 'USc/bu',     icon: 'default', mcx: 'Wheat', currency: 'USD' },
  ];

  let _quotes = {};
  let _selected = null;
  let _currentRange = '1mo';
  let _currentType = 'candlestick';

  const init = async () => {
    const quotes = await API.getMultipleQuotes(COMMODITIES.map(c => c.symbol));
    quotes.forEach((q, i) => { if (q) _quotes[COMMODITIES[i].symbol] = q; });
    renderGrid();
    setupChartControls();
    // Auto select gold
    if (COMMODITIES.length > 0) await selectCommodity(COMMODITIES[0].symbol);
  };

  const renderGrid = () => {
    const grid = document.getElementById('commodityGrid');
    if (!grid) return;

    grid.innerHTML = COMMODITIES.map(c => {
      const q = _quotes[c.symbol] || FALLBACK.getQuote(c.symbol);
      const positive = q.changePct >= 0;
      return `<div class="asset-card ${_selected === c.symbol ? 'selected' : ''}" data-symbol="${FMT.escHtml(c.symbol)}" role="button" tabindex="0" aria-label="${FMT.escHtml(c.name)} commodity">
        <div class="asset-card-header">
          <div class="asset-icon ${c.icon}"><i class="ri-copper-coin-fill"></i></div>
          <span class="segment-badge badge-commodity">MCX</span>
        </div>
        <div class="asset-name">${FMT.escHtml(c.name)}</div>
        <div class="asset-ticker">${FMT.escHtml(c.mcx)}</div>
        <div class="asset-ltp">${c.currency === 'INR' ? '₹' : '$'}${FMT.price(q.price)}</div>
        <div class="asset-change ${positive ? 'positive' : 'negative'}">
          <i class="${FMT.changeIcon(q.changePct)}"></i>
          ${FMT.pct(q.changePct)}
        </div>
        <div class="asset-meta">
          <span>${FMT.escHtml(c.unit)}</span>
          <span>Vol: ${FMT.volume(q.volume)}</span>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.asset-card').forEach(card => {
      card.addEventListener('click', () => selectCommodity(card.dataset.symbol));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectCommodity(card.dataset.symbol); });
    });
  };

  const selectCommodity = async (symbol) => {
    _selected = symbol;
    document.querySelectorAll('#commodityGrid .asset-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.symbol === symbol);
    });
    const info = COMMODITIES.find(c => c.symbol === symbol);
    const titleEl = document.getElementById('commodityChartTitle');
    if (titleEl && info) titleEl.textContent = `${info.name} — ${info.unit}`;
    await loadCommodityChart(symbol, _currentRange);
  };

  const loadCommodityChart = async (symbol, range) => {
    Charts.showChartLoading('commodityChart');
    const hist = await API.getHistory(symbol, range);
    Charts.renderChart('commodityChart', hist, _currentType, 280);
  };

  const setupChartControls = () => {
    document.getElementById('commodityTimeRange')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.time-btn');
      if (!btn) return;
      document.querySelectorAll('#commodityTimeRange .time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _currentRange = btn.dataset.range;
      if (_selected) await loadCommodityChart(_selected, _currentRange);
    });
  };

  const getSelectedSymbol = () => _selected;

  const refresh = async () => {
    await init();
  };

  return { init, refresh, getSelectedSymbol };
})();
