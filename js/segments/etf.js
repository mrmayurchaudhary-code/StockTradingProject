'use strict';

/* ============================================================
   SAMADHAN TRADING — ETF SEGMENT MODULE
   Exchange Traded Funds with live NAV, AUM, returns
   ============================================================ */

const ETF = (() => {

  const ETF_DATA = [
    { symbol: 'NIFTYBEES.NS', name: 'Nifty BeES', amc: 'Nippon India', underlying: 'NIFTY 50', aum: '22,450 Cr', expense: '0.04%', icon: 'default', color: '#00d4ff' },
    { symbol: 'GOLDBEES.NS',  name: 'Gold BeES', amc: 'Nippon India', underlying: 'Gold Prices', aum: '8,320 Cr', expense: '0.54%', icon: 'gold', color: '#f59e0b' },
    { symbol: 'BANKBEES.NS',  name: 'Bank BeES', amc: 'Nippon India', underlying: 'NIFTY BANK', aum: '7,890 Cr', expense: '0.18%', icon: 'default', color: '#7c3aed' },
    { symbol: 'JUNIORBEES.NS',name: 'Junior BeES', amc: 'Nippon India', underlying: 'NIFTY NEXT 50', aum: '4,280 Cr', expense: '0.19%', icon: 'default', color: '#00d97e' },
    { symbol: 'ICICIB22.NS',  name: 'ICICI Pru IT ETF', amc: 'ICICI Prudential', underlying: 'NIFTY IT', aum: '2,150 Cr', expense: '0.28%', icon: 'default', color: '#f59e0b' },
    { symbol: 'LIQUIDBEES.NS',name: 'Liquid BeES', amc: 'Nippon India', underlying: 'TREPS', aum: '12,400 Cr', expense: '0.10%', icon: 'default', color: '#94a3b8' },
    { symbol: 'NETFIT.NS',    name: 'Nifty IT ETF', amc: 'Mirae Asset', underlying: 'NIFTY IT', aum: '1,840 Cr', expense: '0.14%', icon: 'default', color: '#60a5fa' },
    { symbol: 'HDFCSENSEX.NS',name: 'HDFC Sensex ETF', amc: 'HDFC AMC', underlying: 'SENSEX', aum: '3,680 Cr', expense: '0.20%', icon: 'default', color: '#ff4757' },
  ];

  let _quotes = {};
  let _selectedSymbol = null;

  const init = async () => {
    const quotes = await API.getMultipleQuotes(ETF_DATA.map(e => e.symbol));
    quotes.forEach((q, i) => { if (q) _quotes[ETF_DATA[i].symbol] = q; });
    renderGrid();
  };

  const renderGrid = () => {
    const grid = document.getElementById('etfGrid');
    if (!grid) return;

    grid.innerHTML = ETF_DATA.map(etf => {
      const q = _quotes[etf.symbol] || FALLBACK.getQuote(etf.symbol);
      const positive = q.changePct >= 0;
      return `<div class="asset-card ${_selectedSymbol === etf.symbol ? 'selected' : ''}" data-symbol="${FMT.escHtml(etf.symbol)}" role="button" tabindex="0" aria-label="${FMT.escHtml(etf.name)} ETF">
        <div class="asset-card-header">
          <div class="asset-icon ${etf.icon}" style="${etf.icon === 'default' ? `background:${etf.color}22;color:${etf.color}` : ''}">
            <i class="ri-funds-fill"></i>
          </div>
          <div style="text-align:right">
            <span class="segment-badge badge-etf">ETF</span>
          </div>
        </div>
        <div class="asset-name">${FMT.escHtml(etf.name)}</div>
        <div class="asset-ticker">${FMT.escHtml(etf.symbol.replace('.NS', ''))}</div>
        <div class="asset-ltp">₹${FMT.price(q.price)}</div>
        <div class="asset-change ${positive ? 'positive' : 'negative'}">
          <i class="${FMT.changeIcon(q.changePct)}"></i>
          ${FMT.pct(q.changePct)} (${q.change >= 0 ? '+' : ''}₹${FMT.price(Math.abs(q.change))})
        </div>
        <div class="asset-meta">
          <span><i class="ri-building-fill"></i> ${FMT.escHtml(etf.amc)}</span>
          <span>AUM: ${FMT.escHtml(etf.aum)}</span>
        </div>
        <div class="asset-meta" style="margin-top:4px">
          <span>Underlying: ${FMT.escHtml(etf.underlying)}</span>
          <span>Exp: ${FMT.escHtml(etf.expense)}</span>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.asset-card').forEach(card => {
      card.addEventListener('click', () => selectETF(card.dataset.symbol));
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectETF(card.dataset.symbol); });
    });

    // Auto select first
    if (!_selectedSymbol) selectETF(ETF_DATA[0].symbol);
  };

  const selectETF = async (symbol) => {
    _selectedSymbol = symbol;
    document.querySelectorAll('#etfGrid .asset-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.symbol === symbol);
    });
    AppState.openStockModal(symbol);
  };

  const refresh = async () => { await init(); };

  return { init, refresh };
})();
