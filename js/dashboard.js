'use strict';

/* ============================================================
   SAMADHAN TRADING — DASHBOARD MODULE
   Indices, Ticker Tape, Breadth, Movers, Heatmap, News
   ============================================================ */

const Dashboard = (() => {

  // ── DATA ──
  const INDEX_SYMBOLS = [
    { symbol: '^NSEI',    label: 'NIFTY 50',    color: '#00d4ff' },
    { symbol: '^BSESN',   label: 'SENSEX',       color: '#7c3aed' },
    { symbol: '^NSEBANK', label: 'NIFTY BANK',   color: '#00d97e' },
    { symbol: '^CNXIT',   label: 'NIFTY IT',     color: '#f59e0b' },
    { symbol: '^CNXAUTO', label: 'NIFTY AUTO',   color: '#ff4757' },
    { symbol: '^CNXPHARMA',label:'NIFTY PHARMA', color: '#a78bfa' },
  ];

  const TICKER_SYMBOLS = [
    '^NSEI', '^BSESN', '^NSEBANK', '^CNXIT',
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
    'KOTAKBANK.NS', 'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS',
    'LT.NS', 'ITC.NS', 'AXISBANK.NS', 'WIPRO.NS', 'HCLTECH.NS',
    'BAJFINANCE.NS', 'MARUTI.NS', 'TITAN.NS', 'GC=F', 'INR=X',
  ];

  const SECTORS = [
    { name: 'IT',          symbol: '^CNXIT',    base: 38900, icon: '💻' },
    { name: 'Banking',     symbol: '^NSEBANK',  base: 53200, icon: '🏦' },
    { name: 'Auto',        symbol: '^CNXAUTO',  base: 22400, icon: '🚗' },
    { name: 'Pharma',      symbol: '^CNXPHARMA',base: 21100, icon: '💊' },
    { name: 'Energy',      symbol: 'ONGC.NS',   base: 295,   icon: '⚡' },
    { name: 'FMCG',        symbol: 'HINDUNILVR.NS', base: 2480, icon: '🛒' },
    { name: 'Metals',      symbol: 'JSWSTEEL.NS', base: 1020, icon: '🔩' },
    { name: 'Realty',      symbol: 'ADANIENT.NS', base: 2680, icon: '🏢' },
    { name: 'Infra',       symbol: 'LT.NS',     base: 3580,  icon: '🏗️' },
    { name: 'Telecom',     symbol: 'BHARTIARTL.NS', base: 1680, icon: '📡' },
    { name: 'Consumer',    symbol: 'TITAN.NS',  base: 3410,  icon: '💎' },
    { name: 'Cement',      symbol: 'ULTRACEMCO.NS', base: 10580, icon: '🏭' },
  ];

  const NSE_MOVERS = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
    'KOTAKBANK.NS', 'HINDUNILVR.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS',
    'LT.NS', 'AXISBANK.NS', 'ASIANPAINT.NS', 'WIPRO.NS', 'HCLTECH.NS',
    'BAJFINANCE.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'ADANIENT.NS',
  ];

  const NEWS = [
    { tag: 'Markets', title: 'NIFTY 50 hits record high amid strong FII inflows', time: '10 min ago', color: '#00d4ff' },
    { tag: 'Banking', title: 'RBI keeps repo rate unchanged at 6.5%; economy stays resilient', time: '25 min ago', color: '#7c3aed' },
    { tag: 'Earnings', title: 'TCS Q4 results beat estimates; net profit rises 9.1% YoY', time: '1 hr ago', color: '#00d97e' },
    { tag: 'IPO', title: 'Upcoming IPO: SME sector eyes ₹2,400 Cr fundraise this quarter', time: '2 hrs ago', color: '#f59e0b' },
    { tag: 'Commodity', title: 'Gold prices surge to ₹72,500/10g on safe-haven demand', time: '3 hrs ago', color: '#ff9f43' },
    { tag: 'Currency', title: 'INR appreciates against USD; touches 83.25 in early trade', time: '4 hrs ago', color: '#a78bfa' },
    { tag: 'FII/DII', title: 'FIIs net buyers of ₹4,200 Cr; DIIs add ₹1,800 Cr in equities', time: '5 hrs ago', color: '#f87171' },
    { tag: 'IT Sector', title: 'Infosys raises FY26 guidance; deal wins at $4.2B for the quarter', time: '6 hrs ago', color: '#60a5fa' },
  ];

  let _indexHistory = {};
  let _moversData = [];
  let _currentMoversTab = 'gainers';

  // ── INIT ──
  const init = async () => {
    renderNewsSection();
    await Promise.all([
      loadIndexData(),
      loadTickerTape(),
      loadMovers(),
    ]);
    renderBreadth();
    renderSectorHeatmap();
  };

  // ── INDEX CARDS ──
  const loadIndexData = async () => {
    const quotes = await API.getMultipleQuotes(INDEX_SYMBOLS.map(i => i.symbol));
    const grid = document.getElementById('indicesGrid');
    if (!grid) return;

    grid.innerHTML = '';

    INDEX_SYMBOLS.forEach((idx, i) => {
      const q = quotes[i] || FALLBACK.getQuote(idx.symbol);
      _indexHistory[idx.symbol] = null; // lazy load

      const positive = q.changePct >= 0;
      const card = document.createElement('div');
      card.className = `index-card ${positive ? 'positive' : 'negative'}`;
      card.id = `idx-card-${i}`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `${idx.label}: ${FMT.price(q.price)}, ${FMT.pct(q.changePct)}`);
      card.innerHTML = `
        <div class="idx-name">${FMT.escHtml(idx.label)}</div>
        <div class="idx-value">${FMT.price(q.price)}</div>
        <div class="idx-change ${positive ? 'positive' : 'negative'}">
          <i class="${FMT.changeIcon(q.changePct)}"></i>
          <span>${FMT.pct(q.changePct)}</span>
          <span style="color:var(--text-muted);font-weight:400">(${q.change >= 0 ? '+' : ''}${FMT.price(q.change)})</span>
        </div>
        <div class="idx-sparkline">
          <canvas id="spark-${i}" width="160" height="36" aria-hidden="true"></canvas>
        </div>`;

      grid.appendChild(card);

      // Load sparkline
      API.getHistory(idx.symbol, '1mo', '1d').then(hist => {
        const closes = hist.slice(-30).map(d => d.close);
        if (closes.length > 2) {
          Charts.renderSparkline(document.getElementById(`spark-${i}`), closes, positive);
        }
      });

      // Update header pills
      if (i === 0) {
        const el = document.getElementById('headerNifty');
        const chg = document.getElementById('headerNiftyChange');
        if (el) el.textContent = FMT.price(q.price);
        if (chg) { chg.textContent = FMT.pct(q.changePct); chg.className = `index-change ${positive ? 'positive' : 'negative'}`; }
      }
      if (i === 1) {
        const el = document.getElementById('headerSensex');
        const chg = document.getElementById('headerSensexChange');
        if (el) el.textContent = FMT.price(q.price);
        if (chg) { chg.textContent = FMT.pct(q.changePct); chg.className = `index-change ${positive ? 'positive' : 'negative'}`; }
      }
    });
  };

  // ── TICKER TAPE ──
  const loadTickerTape = async () => {
    const quotes = await API.getMultipleQuotes(TICKER_SYMBOLS);

    const items = quotes.map((q, i) => {
      if (!q) return '';
      const sym = TICKER_SYMBOLS[i].replace('.NS', '').replace('=X', '').replace('^', '');
      const positive = q.changePct >= 0;
      return `<span class="ticker-item">
        <span class="ticker-symbol">${FMT.escHtml(sym)}</span>
        <span class="ticker-price">${FMT.price(q.price)}</span>
        <span class="ticker-change ${positive ? 'positive' : 'negative'}">
          <span class="ticker-arrow">${positive ? '▲' : '▼'}</span>${FMT.pct(q.changePct)}
        </span>
      </span>`;
    }).join('');

    const inner = document.getElementById('tickerInner');
    if (inner) {
      // Duplicate for seamless loop
      inner.innerHTML = items + items;
    }
  };

  // ── MARKET BREADTH ──
  const renderBreadth = () => {
    const total = 1547; // NSE listed
    const advance = Math.floor(total * (0.42 + Math.random() * 0.15));
    const decline = Math.floor(total * (0.35 + Math.random() * 0.12));
    const unchanged = total - advance - decline;

    Charts.renderBreadthChart('breadthChart', advance, decline, unchanged);

    const legend = document.getElementById('breadthLegend');
    if (legend) {
      legend.innerHTML = `
        <div class="legend-item"><div class="legend-dot" style="background:#00d97e"></div><span class="legend-label">Advancing</span><span class="legend-count" style="color:#00d97e">${advance}</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#ff4757"></div><span class="legend-label">Declining</span><span class="legend-count" style="color:#ff4757">${decline}</span></div>
        <div class="legend-item"><div class="legend-dot" style="background:#475569"></div><span class="legend-label">Unchanged</span><span class="legend-count">${unchanged}</span></div>`;
    }

    const stats = document.getElementById('breadthStats');
    const ratio = (advance / decline).toFixed(2);
    const adRatio = ratio >= 1 ? `<span style="color:var(--color-positive)">${ratio}</span>` : `<span style="color:var(--color-negative)">${ratio}</span>`;
    if (stats) {
      stats.innerHTML = `
        <div class="breadth-stat"><div class="breadth-stat-label">A/D Ratio</div><div class="breadth-stat-value">${adRatio}</div></div>
        <div class="breadth-stat"><div class="breadth-stat-label">Total</div><div class="breadth-stat-value" style="color:var(--text-secondary)">${total}</div></div>
        <div class="breadth-stat"><div class="breadth-stat-label">New High</div><div class="breadth-stat-value" style="color:var(--color-positive)">${Math.floor(Math.random()*80+20)}</div></div>`;
    }

    const dateEl = document.getElementById('breadthDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  // ── SECTOR HEATMAP ──
  const renderSectorHeatmap = () => {
    const grid = document.getElementById('heatmapGrid');
    if (!grid) return;

    grid.innerHTML = SECTORS.map(s => {
      const chgPct = (Math.random() - 0.47) * 4;
      const positive = chgPct >= 0;
      const intensity = Math.min(Math.abs(chgPct) / 4, 1);
      const bg = positive
        ? `rgba(0, 217, 126, ${0.1 + intensity * 0.5})`
        : `rgba(255, 71, 87, ${0.1 + intensity * 0.5})`;
      const textColor = positive ? '#00d97e' : '#ff4757';

      return `<div class="heatmap-cell" style="background:${bg};border:1px solid ${bg}">
        <div class="heatmap-name" style="color:${textColor}">${FMT.escHtml(s.name)}</div>
        <div class="heatmap-val" style="color:${textColor}">${FMT.pct(chgPct)}</div>
      </div>`;
    }).join('');
  };

  // ── TOP MOVERS ──
  const loadMovers = async () => {
    const quotes = await API.getMultipleQuotes(NSE_MOVERS);
    _moversData = quotes.filter(q => q && q.price);
    renderMovers('gainers');

    // Tab switching
    document.getElementById('moversTab')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (!tab) return;
      document.querySelectorAll('#moversTab .tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      _currentMoversTab = tab.dataset.tab;
      renderMovers(_currentMoversTab);
    });
  };

  const renderMovers = (type) => {
    const container = document.getElementById('moversContent');
    if (!container) return;

    let sorted = [..._moversData];
    if (type === 'gainers') sorted = sorted.filter(q => q.changePct > 0).sort((a, b) => b.changePct - a.changePct);
    else if (type === 'losers') sorted = sorted.filter(q => q.changePct < 0).sort((a, b) => a.changePct - b.changePct);
    else sorted = sorted.sort((a, b) => (b.volume || 0) - (a.volume || 0));

    const top = sorted.slice(0, 8);

    container.innerHTML = top.map((q, i) => {
      const sym = q.symbol.replace('.NS', '').replace('.BO', '');
      const positive = q.changePct >= 0;
      return `<div class="mover-item" data-symbol="${FMT.escHtml(q.symbol)}" role="button" tabindex="0" aria-label="${FMT.escHtml(sym)}: ${FMT.price(q.price)}, ${FMT.pct(q.changePct)}">
        <div class="mover-rank">${i + 1}</div>
        <div class="mover-info">
          <div class="mover-symbol">${FMT.escHtml(sym)}</div>
          <div class="mover-name">${FMT.escHtml(q.name || sym)}</div>
        </div>
        <div class="mover-price">
          <div class="mover-ltp">₹${FMT.price(q.price)}</div>
          <span class="mover-chg ${positive ? 'positive' : 'negative'}">${FMT.pct(q.changePct)}</span>
        </div>
      </div>`;
    }).join('');

    // Click to open modal
    container.querySelectorAll('.mover-item').forEach(el => {
      el.addEventListener('click', () => AppState.openStockModal(el.dataset.symbol));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') AppState.openStockModal(el.dataset.symbol); });
    });
  };

  // ── NEWS ──
  const renderNewsSection = () => {
    const container = document.getElementById('newsList');
    if (!container) return;

    container.innerHTML = NEWS.map(n => `
      <div class="news-item" role="article">
        <div class="news-tag" style="background:${n.color}22;color:${n.color};border:1px solid ${n.color}44">${FMT.escHtml(n.tag)}</div>
        <div class="news-headline">${FMT.escHtml(n.title)}</div>
        <div class="news-meta"><i class="ri-time-line"></i> ${FMT.escHtml(n.time)}</div>
      </div>`).join('');
  };

  // ── REFRESH ──
  const refresh = async () => {
    await Promise.all([loadIndexData(), loadTickerTape(), loadMovers()]);
    renderBreadth();
    renderSectorHeatmap();
  };

  return { init, refresh };
})();
