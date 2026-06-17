'use strict';

/* ============================================================
   SAMADHAN TRADING — MAIN APP MODULE
   SPA Router, Global State, Auto-refresh, Modal, Search, Toast
   ============================================================ */

// ── GLOBAL APP STATE ──
const AppState = (() => {

  let _currentSegment = 'dashboard';
  let _refreshInterval = null;
  let _refreshCountdown = 30;
  let _modalSymbol = null;
  let _modalChart = null;
  let _modalType = 'candlestick';
  let _modalRange = '1d';
  let _initialized = new Set();

  // ── SEGMENT METADATA ──
  const SEGMENTS = {
    dashboard: { title: 'Market Dashboard',      subtitle: 'Real-time Indian equity market overview',    module: null },
    nse:       { title: 'NSE — National Stock Exchange', subtitle: 'Live equities on National Stock Exchange', module: 'NSE' },
    bse:       { title: 'BSE — Bombay Stock Exchange',   subtitle: 'Live equities on Bombay Stock Exchange',  module: 'BSE' },
    etf:       { title: 'Exchange Traded Funds',          subtitle: 'Live ETF prices, NAV and performance',    module: 'ETF' },
    mf:        { title: 'Mutual Funds',                   subtitle: 'Schemes, returns and fund categories',    module: 'MF' },
    fo:        { title: 'Futures & Options',              subtitle: 'F&O option chain, PCR and derivatives',   module: 'FO' },
    commodity: { title: 'Commodities — MCX',              subtitle: 'Gold, Silver, Crude Oil and more',        module: 'Commodity' },
    currency:  { title: 'Currency / Forex',               subtitle: 'USD/INR, EUR/INR and major INR pairs',    module: 'Currency' },
    watchlist: { title: 'My Watchlist',                   subtitle: 'Your tracked stocks across all segments', module: 'Watchlist' },
    screener:  { title: 'Stock Screener',                 subtitle: 'Filter stocks by fundamentals and price',  module: 'Screener' },
    scanner:   { title: 'Technical Intelligence Scanner', subtitle: 'NSE technical breakout setups & confluence signals', module: 'Scanner' },
  };

  // ── NAVIGATE TO SEGMENT ──
  const navigate = async (segment) => {
    if (!SEGMENTS[segment]) return;
    _currentSegment = segment;

    // Update nav items
    document.querySelectorAll('.nav-item').forEach(el => {
      const active = el.dataset.segment === segment;
      el.classList.toggle('active', active);
      el.setAttribute('aria-current', active ? 'page' : 'false');
    });

    // Update content sections
    document.querySelectorAll('.content-section').forEach(el => {
      const sec = el.id.replace('section-', '');
      if (sec === segment) {
        el.style.display = 'block';
        el.classList.add('active');
        el.removeAttribute('hidden');
      } else {
        el.style.display = 'none';
        el.classList.remove('active');
        el.setAttribute('hidden', '');
      }
    });

    // Update page title
    const meta = SEGMENTS[segment];
    const titleEl = document.getElementById('pageTitle');
    const subtitleEl = document.getElementById('pageSubtitle');
    if (titleEl) titleEl.textContent = meta.title;
    if (subtitleEl) subtitleEl.textContent = meta.subtitle;

    // Init module if first visit
    if (segment !== 'dashboard' && meta.module && !_initialized.has(segment)) {
      _initialized.add(segment);
      const mod = window[meta.module];
      if (mod && typeof mod.init === 'function') {
        try { await mod.init(); } catch (err) { console.warn(`[Samadhan] ${meta.module}.init error:`, err); }
      }
    }

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('mobile-open');
  };

  // ── TOAST NOTIFICATIONS ──
  const toast = (message, type = 'info', duration = 3500) => {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = { success: 'ri-checkbox-circle-fill', error: 'ri-error-warning-fill', info: 'ri-information-fill', warning: 'ri-alert-fill' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.setAttribute('role', 'alert');
    t.innerHTML = `
      <i class="${icons[type] || icons.info} toast-icon"></i>
      <div class="toast-message"><div class="toast-body">${FMT.escHtml(message)}</div></div>
      <button class="toast-close" aria-label="Dismiss notification"><i class="ri-close-line"></i></button>`;

    container.appendChild(t);

    const dismiss = () => {
      t.style.animation = 'slideOutToast 0.3s ease forwards';
      setTimeout(() => t.remove(), 300);
    };

    t.querySelector('.toast-close')?.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
  };

  // ── STOCK DETAIL MODAL ──
  const openStockModal = async (symbol) => {
    _modalSymbol = symbol;
    _modalType = 'candlestick';
    _modalRange = '1d';

    const modal = document.getElementById('stockModal');
    if (!modal) return;

    // Reset range and interval UI
    const intervalEl = document.getElementById('modalInterval');
    if (intervalEl) intervalEl.value = '1d';
    document.querySelectorAll('#modalTimeRange .time-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.range === '1d');
    });

    // Show loading state
    document.getElementById('modalTicker').textContent = symbol.replace('.NS', '').replace('.BO', '');
    document.getElementById('modalStockName').textContent = 'Loading...';
    document.getElementById('modalLtp').textContent = '—';
    document.getElementById('modalChange').textContent = '';
    document.getElementById('modalStats').innerHTML = '';
    document.getElementById('modalExchange').textContent = '';
    Charts.showChartLoading('modalChart');

    modal.removeAttribute('hidden');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Fetch data
    const [q, hist] = await Promise.all([
      API.getQuote(symbol),
      API.getHistory(symbol, _modalRange, document.getElementById('modalInterval')?.value || '1d'),
    ]);

    const sym = q.symbol.replace('.NS', '').replace('.BO', '');
    const positive = q.changePct >= 0;

    document.getElementById('modalTicker').textContent = sym;
    document.getElementById('modalStockName').textContent = q.name || sym;
    document.getElementById('modalLtp').textContent = `₹${FMT.price(q.price)}`;
    document.getElementById('modalLtp').style.color = positive ? 'var(--color-positive)' : 'var(--color-negative)';

    const changeEl = document.getElementById('modalChange');
    changeEl.className = `modal-change ${positive ? 'positive' : 'negative'}`;
    changeEl.innerHTML = `<i class="${FMT.changeIcon(q.changePct)}"></i> ${q.change >= 0 ? '+' : ''}₹${FMT.price(Math.abs(q.change))} (${FMT.pct(q.changePct)})`;

    const exchangeEl = document.getElementById('modalExchange');
    const badgeClass = q.exchange === 'BSE' ? 'badge-bse' : 'badge-nse';
    exchangeEl.innerHTML = `<span class="segment-badge ${badgeClass}">${FMT.escHtml(q.exchange || 'NSE')}</span>`;

    // Stats
    const statsEl = document.getElementById('modalStats');
    statsEl.innerHTML = [
      { label: 'Open',      value: `₹${FMT.price(q.open)}` },
      { label: 'High',      value: `₹${FMT.price(q.high)}`,    color: 'var(--color-positive)' },
      { label: 'Low',       value: `₹${FMT.price(q.low)}`,     color: 'var(--color-negative)' },
      { label: 'Prev Close',value: `₹${FMT.price(q.prevClose)}` },
      { label: 'Volume',    value: FMT.volume(q.volume),        color: 'var(--accent-gold)' },
      { label: 'Market Cap',value: FMT.marketCap(q.marketCap) },
      { label: '52W High',  value: `₹${FMT.price(q.week52High)}`, color: 'var(--color-positive)' },
      { label: '52W Low',   value: `₹${FMT.price(q.week52Low)}`,  color: 'var(--color-negative)' },
      { label: 'P/E Ratio', value: q.pe ? q.pe.toFixed(1) : (FALLBACK.getStockInfo(symbol)?.pe || '—') },
      { label: 'Exchange',  value: q.exchange || 'NSE' },
      { label: 'Currency',  value: q.currency || 'INR' },
      { label: 'Data Source', value: q._live ? 'Groww Live' : (q._source === 'yahoo' ? 'Yahoo Finance' : (q._simulated ? 'Demo Data' : 'Live Data')), color: q._live ? '#00d97e' : (q._source === 'yahoo' ? '#00d4ff' : (q._simulated ? 'var(--color-warning)' : 'var(--color-positive)')) },
    ].map(s => `<div class="stat-item">
      <div class="stat-label">${FMT.escHtml(s.label)}</div>
      <div class="stat-value" style="${s.color ? `color:${s.color}` : ''}">${FMT.escHtml(String(s.value))}</div>
    </div>`).join('');

    // Watchlist button state
    const wlBtn = document.getElementById('modalWatchBtn');
    if (wlBtn) {
      const inWL = Watchlist.has(symbol);
      wlBtn.innerHTML = `<i class="${inWL ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i> ${inWL ? 'Saved' : 'Watchlist'}`;
      wlBtn.onclick = () => {
        if (Watchlist.has(symbol)) { Watchlist.removeSymbol(symbol); wlBtn.innerHTML = '<i class="ri-bookmark-line"></i> Watchlist'; }
        else { Watchlist.addSymbol(symbol); wlBtn.innerHTML = '<i class="ri-bookmark-fill"></i> Saved'; }
      };
    }

    // Render chart
    Charts.renderChart('modalChart', hist, _modalType);
  };

  const closeStockModal = () => {
    const modal = document.getElementById('stockModal');
    if (modal) { modal.setAttribute('hidden', ''); modal.style.display = 'none'; }
    document.body.style.overflow = '';
    Charts.destroyChart('modalChart');
    _modalSymbol = null;
  };

  // ── GLOBAL SEARCH ──
  const initSearch = () => {
    const input = document.getElementById('globalSearch');
    const results = document.getElementById('searchResults');
    if (!input || !results) return;

    let debounceTimer;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      if (!q || q.length < 2) { results.classList.remove('open'); return; }
      debounceTimer = setTimeout(async () => {
        const hits = await API.searchSymbols(q);
        if (!hits.length) { results.classList.remove('open'); return; }
        results.innerHTML = hits.map(h => `
          <div class="search-result-item" data-symbol="${FMT.escHtml(h.symbol)}" role="option" tabindex="0">
            <span class="search-result-symbol">${FMT.escHtml(h.symbol.replace('.NS', '').replace('.BO', ''))}</span>
            <span class="search-result-name">${FMT.escHtml(h.name || h.symbol)}</span>
            <span class="search-result-badge">${FMT.escHtml(h.exchange || h.type || 'NSE')}</span>
          </div>`).join('');
        results.classList.add('open');

        results.querySelectorAll('.search-result-item').forEach(el => {
          el.addEventListener('click', () => {
            openStockModal(el.dataset.symbol);
            input.value = '';
            results.classList.remove('open');
          });
          el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.click(); });
        });
      }, 350);
    });

    input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { results.classList.remove('open'); input.blur(); } });
    document.addEventListener('click', (e) => { if (!input.contains(e.target) && !results.contains(e.target)) results.classList.remove('open'); });
  };

  // ── REFRESH TIMER ──
  const startRefreshTimer = () => {
    _refreshCountdown = 15;
    updateRefreshUI();

    _refreshInterval = setInterval(() => {
      _refreshCountdown--;
      updateRefreshUI();
      if (_refreshCountdown <= 0) {
        _refreshCountdown = 15;
        API.invalidateCache();
        refreshCurrentSegment();
      }
    }, 1000);
  };

  const updateRefreshUI = () => {
    const el = document.getElementById('refreshCountdown');
    if (el) el.textContent = `${_refreshCountdown}s`;

    // Update data source badge dynamically
    const badge = document.getElementById('dataSourceText');
    if (badge && API.getDataSource) {
      const src = API.getDataSource();
      const labels = { groww: 'Groww Live', yahoo: 'Yahoo Finance', simulation: 'Demo Data' };
      badge.textContent = labels[src] || 'Demo Data';
    }
  };

  const refreshCurrentSegment = async () => {
    const meta = SEGMENTS[_currentSegment];
    if (!meta) return;
    if (_currentSegment === 'dashboard') { await Dashboard.refresh(); return; }
    const mod = window[meta.module];
    if (mod && typeof mod.refresh === 'function') {
      try { await mod.refresh(); } catch {}
    }
  };

  // ── MARKET STATUS ──
  const checkMarketStatus = () => {
    const now = new Date();
    const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const day = ist.getDay();
    const h = ist.getHours();
    const m = ist.getMinutes();
    const mins = h * 60 + m;
    const isWeekday = day >= 1 && day <= 5;
    const isOpen = isWeekday && mins >= 555 && mins < 930; // 9:15 AM - 3:30 PM IST

    const pill = document.getElementById('marketStatusPill');
    const text = document.getElementById('marketStatusText');
    if (pill) pill.classList.toggle('closed', !isOpen);
    if (text) text.textContent = isOpen ? 'Markets Open' : 'Markets Closed';
  };

  // ── KEYBOARD SHORTCUTS ──
  const initKeyboard = () => {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeStockModal();
      if (e.key === '/' && !e.target.matches('input, textarea, select')) {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
      }
    });
  };

  // ── SIDEBAR TOGGLE ──
  const initSidebar = () => {
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('collapsed');
    });
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('mobile-open');
    });
  };

  // ── MODAL CONTROLS ──
  const initModal = () => {
    document.getElementById('closeModal')?.addEventListener('click', closeStockModal);
    document.getElementById('stockModal')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeStockModal();
    });

    // Chart type toggle in modal
    document.getElementById('chartTypeToggle')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.chart-type-btn');
      if (!btn || !_modalSymbol) return;
      document.querySelectorAll('#chartTypeToggle .chart-type-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      _modalType = btn.dataset.type;
      Charts.showChartLoading('modalChart');
      const hist = await API.getHistory(_modalSymbol, _modalRange, document.getElementById('modalInterval')?.value || '1d');
      Charts.renderChart('modalChart', hist, _modalType);
    });

    // Time range in modal
    document.getElementById('modalTimeRange')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.time-btn');
      if (!btn || !_modalSymbol) return;
      document.querySelectorAll('#modalTimeRange .time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _modalRange = btn.dataset.range;
      
      // Auto-adjust interval if incompatible
      let interval = document.getElementById('modalInterval')?.value || '1d';
      if (interval.endsWith('m') && !['1d', '5d'].includes(_modalRange)) {
        interval = '1d';
        const intervalEl = document.getElementById('modalInterval');
        if (intervalEl) intervalEl.value = '1d';
      }
      
      Charts.showChartLoading('modalChart');
      const hist = await API.getHistory(_modalSymbol, _modalRange, interval);
      Charts.renderChart('modalChart', hist, _modalType);
    });

    // Interval selector in modal
    document.getElementById('modalInterval')?.addEventListener('change', async () => {
      if (!_modalSymbol) return;
      const interval = document.getElementById('modalInterval').value;
      
      let range = _modalRange;
      if (interval.endsWith('m')) {
        const mins = parseInt(interval);
        if (mins <= 4 || mins === 7) {
          range = '1d';
        } else if (mins <= 20) {
          range = '5d';
        } else {
          range = '1mo';
        }
        
        document.querySelectorAll('#modalTimeRange .time-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.range === range);
        });
        _modalRange = range;
      }
      
      Charts.showChartLoading('modalChart');
      const hist = await API.getHistory(_modalSymbol, range, interval);
      Charts.renderChart('modalChart', hist, _modalType);
    });

    // Buy/Sell buttons (demo)
    document.getElementById('modalBuyBtn')?.addEventListener('click', () => {
      if (_modalSymbol) toast(`Simulated BUY order placed for ${_modalSymbol.replace('.NS','')}`, 'success');
    });
    document.getElementById('modalSellBtn')?.addEventListener('click', () => {
      if (_modalSymbol) toast(`Simulated SELL order placed for ${_modalSymbol.replace('.NS','')}`, 'error');
    });
  };

  // ── REFRESH BUTTON ──
  const initRefreshBtn = () => {
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
      _refreshCountdown = 30;
      API.invalidateCache();
      await refreshCurrentSegment();
      toast('Data refreshed', 'success');
    });
  };

  return { navigate, toast, openStockModal, closeStockModal, initSearch, startRefreshTimer, checkMarketStatus, initKeyboard, initSidebar, initModal, initRefreshBtn };
})();

// ── NAVIGATION ROUTER ──
const Router = {
  init() {
    // Sidebar nav clicks
    document.querySelectorAll('.nav-item[data-segment]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        AppState.navigate(el.dataset.segment);
        history.pushState({ segment: el.dataset.segment }, '', `#${el.dataset.segment}`);
      });
    });

    // Browser back/forward
    window.addEventListener('popstate', (e) => {
      const seg = e.state?.segment || 'dashboard';
      AppState.navigate(seg);
    });

    // Initial route from hash
    const hash = location.hash.replace('#', '') || 'dashboard';
    AppState.navigate(hash);
  }
};

// ── APPLICATION BOOTSTRAP ──
(async () => {
  try {
    // Mark all sections as hidden initially (except dashboard)
    document.querySelectorAll('.content-section').forEach(el => {
      if (el.id !== 'section-dashboard') {
        el.style.display = 'none';
        el.setAttribute('hidden', '');
      }
    });

    // Init core systems
    AppState.initSidebar();
    AppState.initModal();
    AppState.initSearch();
    AppState.initKeyboard();
    AppState.initRefreshBtn();
    AppState.checkMarketStatus();
    Router.init();

    // Init dashboard first (visible immediately)
    await Dashboard.init();

    // Init Watchlist and Screener (lightweight, no heavy API)
    Watchlist.init();
    Screener.init();
    try {
      if (window.Scanner && typeof window.Scanner.init === 'function') {
        window.Scanner.init();
      }
    } catch (e) {
      console.warn('[Samadhan] Scanner.init error at bootstrap:', e);
    }

    // Start auto-refresh timer
    AppState.startRefreshTimer();

    // Market status check every minute
    setInterval(AppState.checkMarketStatus, 60_000);

    // Show welcome toast
    setTimeout(() => {
      const source = API.getDataSource ? API.getDataSource() : 'simulation';
      const sourceLabel = source === 'groww' ? '🟢 Groww Live Data' : (source === 'yahoo' ? '✅ Yahoo Finance' : '📊 Demo Data');
      AppState.toast(`Welcome to Samadhan Trading! ${sourceLabel} — Updates every 15 seconds.`, 'info', 5000);
    }, 1500);

  } catch (err) {
    console.error('[Samadhan] Bootstrap error:', err);
  }
})();
