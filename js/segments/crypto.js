'use strict';

/* ============================================================
   SAMADHAN TRADING — CRYPTO SEGMENT MODULE
   Top 5 Global Cryptocurrencies list + detail view
   ============================================================ */

const Crypto = (() => {

  const COINS = ["BTC-USD", "ETH-USD", "USDT-USD", "BNB-USD", "SOL-USD"];

  let _quotes = {};
  let _selected = null;

  const init = async () => {
    renderList(COINS);
    setupSearch();
    await loadList();
  };

  const loadList = async () => {
    try {
      const quotes = await API.getMultipleQuotes(COINS);
      quotes.forEach((q, i) => { if (q) _quotes[COINS[i]] = q; });
      renderList(COINS);
    } catch (err) {
      console.warn('[Samadhan] Crypto loadList error:', err);
    }
  };

  const renderList = (symbols) => {
    const container = document.getElementById('cryptoCoinList');
    if (!container) return;

    container.innerHTML = symbols.map(sym => {
      const q = _quotes[sym] || FALLBACK.getQuote(sym);
      const displaySym = sym.replace('-USD', '');
      const positive = q.changePct >= 0;
      return `<div class="stock-item ${_selected === sym ? 'active' : ''}" data-symbol="${FMT.escHtml(sym)}" role="button" tabindex="0" aria-label="${FMT.escHtml(displaySym)}: $${FMT.price(q.price)} ${FMT.pct(q.changePct)}">
        <div class="stock-item-info">
          <div class="stock-item-symbol">${FMT.escHtml(displaySym)}</div>
          <div class="stock-item-name">${FMT.escHtml(q.name || displaySym)}</div>
        </div>
        <div class="stock-item-price">
          <div class="stock-item-ltp">$${FMT.price(q.price)}</div>
          <div class="stock-item-chg ${positive ? 'positive' : 'negative'}">${FMT.pct(q.changePct)}</div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('.stock-item').forEach(el => {
      el.addEventListener('click', () => selectCoin(el.dataset.symbol));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectCoin(el.dataset.symbol); });
    });

    // Auto-select first coin on initial render
    if (!_selected && symbols.length > 0) selectCoin(symbols[0]);
  };

  const selectCoin = async (symbol) => {
    _selected = symbol;

    // Highlight active coin in sidebar instantly
    document.querySelectorAll('#cryptoCoinList .stock-item').forEach(el => {
      el.classList.toggle('active', el.dataset.symbol === symbol);
    });

    // Render detail panel instantly with cached/fallback data
    const q = _quotes[symbol] || FALLBACK.getQuote(symbol);
    renderDetail(q);

    // Show chart loading state
    Charts.showChartLoading('cryptoDetailChart');

    // Asynchronously fetch live quote and history
    try {
      const [liveQ, hist] = await Promise.all([
        API.getQuote(symbol),
        API.getHistory(symbol, '3mo')
      ]);
      _quotes[symbol] = liveQ;
      renderDetail(liveQ);
      Charts.renderChart('cryptoDetailChart', hist, 'candlestick');
    } catch (e) {
      console.warn(`[Samadhan] Crypto live fetch failed for ${symbol}, loading fallback data:`, e);
      try {
        const hist = FALLBACK.getHistory(symbol, '3mo');
        Charts.renderChart('cryptoDetailChart', hist, 'candlestick');
      } catch (err) {
        console.error('[Samadhan] Crypto fallback chart render failed:', err);
      }
    }
  };

  const renderDetail = (q) => {
    const container = document.getElementById('cryptoDetail');
    if (!container) return;

    const sym = q.symbol.replace('-USD', '');
    const positive = q.changePct >= 0;
    const inWL = Watchlist.has(q.symbol);

    container.innerHTML = `
      <div class="stock-detail-header">
        <div class="stock-detail-title">
          <div class="sd-symbol">${FMT.escHtml(sym)}</div>
          <div class="sd-name">${FMT.escHtml(q.name || sym)}</div>
          <div class="sd-exchange"><span class="segment-badge badge-crypto">Crypto</span></div>
        </div>
        <div class="stock-price-block">
          <div class="sd-ltp ${positive ? 'positive' : 'negative'}">$${FMT.price(q.price)}</div>
          <div class="sd-change ${positive ? 'positive' : 'negative'}">
            <i class="${FMT.changeIcon(q.changePct)}"></i>
            ${q.change >= 0 ? '+' : ''}$${FMT.price(Math.abs(q.change))} (${FMT.pct(q.changePct)})
          </div>
        </div>
      </div>

      <div class="modal-chart-header" style="margin-bottom:8px">
        <div class="chart-type-toggle" id="cryptoChartTypeToggle">
          <button class="chart-type-btn active" data-type="candlestick">Candle</button>
          <button class="chart-type-btn" data-type="line">Line</button>
          <button class="chart-type-btn" data-type="area">Area</button>
        </div>
        <div class="time-range-group" id="cryptoTimeRange">
          <button class="time-btn" data-range="1d">1D</button>
          <button class="time-btn" data-range="5d">5D</button>
          <button class="time-btn active" data-range="3mo">3M</button>
          <button class="time-btn" data-range="6mo">6M</button>
          <button class="time-btn" data-range="1y">1Y</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-left:auto;">
          <span style="font-size:0.75rem;color:var(--text-secondary);font-weight:600">Period:</span>
          <select class="select-styled" style="padding:4px 8px;font-size:0.75rem;width:auto;border-radius:4px;background:var(--bg-3);border:1px solid var(--border-primary);color:var(--text-primary);" id="cryptoInterval">
            <option value="1d" selected>1 Day</option>
            <option value="1m">1 Min</option>
            <option value="2m">2 Min</option>
            <option value="3m">3 Min</option>
            <option value="4m">4 Min</option>
            <option value="5m">5 Min</option>
            <option value="7m">7 Min</option>
            <option value="10m">10 Min</option>
            <option value="15m">15 Min</option>
            <option value="20m">20 Min</option>
            <option value="30m">30 Min</option>
            <option value="60m">60 Min</option>
          </select>
        </div>
      </div>

      <div class="chart-container" id="cryptoDetailChart" style="height:260px"></div>

      <div class="stats-grid">
        <div class="stat-item"><div class="stat-label">Open</div><div class="stat-value">$${FMT.price(q.open)}</div></div>
        <div class="stat-item"><div class="stat-label">High</div><div class="stat-value" style="color:var(--color-positive)">$${FMT.price(q.high)}</div></div>
        <div class="stat-item"><div class="stat-label">Low</div><div class="stat-value" style="color:var(--color-negative)">$${FMT.price(q.low)}</div></div>
        <div class="stat-item"><div class="stat-label">Prev Close</div><div class="stat-value">$${FMT.price(q.prevClose)}</div></div>
        <div class="stat-item"><div class="stat-label">Volume</div><div class="stat-value">${FMT.volume(q.volume)}</div></div>
        <div class="stat-item"><div class="stat-label">Market Cap</div><div class="stat-value">${FMT.marketCap(q.marketCap).replace('₹', '$')}</div></div>
        <div class="stat-item"><div class="stat-label">52W High</div><div class="stat-value" style="color:var(--color-positive)">$${FMT.price(q.week52High)}</div></div>
        <div class="stat-item"><div class="stat-label">52W Low</div><div class="stat-value" style="color:var(--color-negative)">$${FMT.price(q.week52Low)}</div></div>
        <div class="stat-item"><div class="stat-label">Data Source</div><div class="stat-value" style="color:#f3ba2f">${q._source === 'binance' ? 'Binance Live' : (q._live ? 'Yahoo Live' : (q._simulated ? 'Demo Data' : 'Live Data'))}</div></div>
      </div>

      <div class="modal-actions" style="margin-top:14px">
        <button class="btn btn-success"><i class="ri-arrow-up-line"></i> Buy</button>
        <button class="btn btn-danger"><i class="ri-arrow-down-line"></i> Sell</button>
        <button class="btn btn-ghost wl-toggle-btn" data-symbol="${FMT.escHtml(q.symbol)}">
          <i class="${inWL ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i>
          ${inWL ? 'Saved' : 'Watchlist'}
        </button>
        <button class="btn btn-ghost" onclick="AppState.openStockModal('${FMT.escHtml(q.symbol)}')"><i class="ri-fullscreen-line"></i> Expand</button>
      </div>`;

    // Chart type toggle
    container.querySelector('#cryptoChartTypeToggle')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.chart-type-btn');
      if (!btn) return;
      container.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const range = container.querySelector('#cryptoTimeRange .time-btn.active')?.dataset.range || '3mo';
      const interval = container.querySelector('#cryptoInterval')?.value || '1d';
      Charts.showChartLoading('cryptoDetailChart');
      const hist = await API.getHistory(_selected, range, interval);
      Charts.renderChart('cryptoDetailChart', hist, btn.dataset.type);
    });

    // Time range
    container.querySelector('#cryptoTimeRange')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.time-btn');
      if (!btn) return;
      container.querySelectorAll('#cryptoTimeRange .time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = container.querySelector('#cryptoChartTypeToggle .chart-type-btn.active')?.dataset.type || 'candlestick';
      
      let interval = container.querySelector('#cryptoInterval')?.value || '1d';
      if (interval.endsWith('m') && !['1d', '5d'].includes(btn.dataset.range)) {
        interval = '1d';
        const intervalEl = container.querySelector('#cryptoInterval');
        if (intervalEl) intervalEl.value = '1d';
      }
      
      Charts.showChartLoading('cryptoDetailChart');
      const hist = await API.getHistory(_selected, btn.dataset.range, interval);
      Charts.renderChart('cryptoDetailChart', hist, type);
    });

    // Interval change
    container.querySelector('#cryptoInterval')?.addEventListener('change', async () => {
      const interval = container.querySelector('#cryptoInterval').value;
      let range = container.querySelector('#cryptoTimeRange .time-btn.active')?.dataset.range || '3mo';
      
      if (interval.endsWith('m')) {
        const mins = parseInt(interval);
        if (mins <= 4 || mins === 7) {
          range = '1d';
        } else if (mins <= 20) {
          range = '5d';
        } else {
          range = '1mo';
        }
        
        container.querySelectorAll('#cryptoTimeRange .time-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.range === range);
        });
      }
      
      const type = container.querySelector('#cryptoChartTypeToggle .chart-type-btn.active')?.dataset.type || 'candlestick';
      Charts.showChartLoading('cryptoDetailChart');
      const hist = await API.getHistory(_selected, range, interval);
      Charts.renderChart('cryptoDetailChart', hist, type);
    });

    // Watchlist toggle
    container.querySelector('.wl-toggle-btn')?.addEventListener('click', (e) => {
      const sym = e.currentTarget.dataset.symbol;
      if (Watchlist.has(sym)) { Watchlist.removeSymbol(sym); }
      else { Watchlist.addSymbol(sym); }
      const icon = e.currentTarget.querySelector('i');
      const isNow = Watchlist.has(sym);
      if (icon) icon.className = isNow ? 'ri-bookmark-fill' : 'ri-bookmark-line';
      e.currentTarget.innerHTML = `<i class="${isNow ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i> ${isNow ? 'Saved' : 'Watchlist'}`;
    });
  };

  const setupSearch = () => {
    const input = document.getElementById('cryptoSearch');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { renderList(COINS); return; }
      const filtered = COINS.filter(s => {
        const display = s.replace('-USD', '').toLowerCase();
        const name = (_quotes[s]?.name || '').toLowerCase();
        return display.includes(q) || name.includes(q);
      });
      renderList(filtered);
    });
  };

  const getSelectedSymbol = () => _selected;

  const refresh = async () => {
    await loadList();
    if (_selected) selectCoin(_selected);
  };

  return { init, refresh, getSelectedSymbol };
})();

// Register as CryptoCoins to avoid collision with browser's built-in window.Crypto
if (typeof window !== 'undefined') {
  window.CryptoCoins = Crypto;
}
