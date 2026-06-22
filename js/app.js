'use strict';

/* ============================================================
   SAMADHAN TRADING — MAIN APP MODULE
   SPA Router, Global State, Auto-refresh, Modal, Search, Toast
   ============================================================ */

// Attach global modules to window (since top-level const does not auto-attach)
if (typeof window !== 'undefined') {
  if (typeof NSE !== 'undefined') window.NSE = NSE;
  if (typeof BSE !== 'undefined') window.BSE = BSE;
  // Note: Crypto module registers itself as window.CryptoCoins in crypto.js (avoids window.Crypto collision)
  if (typeof ETF !== 'undefined') window.ETF = ETF;
  if (typeof MF !== 'undefined') window.MF = MF;
  if (typeof FO !== 'undefined') window.FO = FO;
  if (typeof Commodity !== 'undefined') window.Commodity = Commodity;
  if (typeof Currency !== 'undefined') window.Currency = Currency;
  if (typeof Watchlist !== 'undefined') window.Watchlist = Watchlist;
  if (typeof Screener !== 'undefined') window.Screener = Screener;
  if (typeof Scanner !== 'undefined') window.Scanner = Scanner;
  if (typeof Dashboard !== 'undefined') window.Dashboard = Dashboard;
  if (typeof Diagnostics !== 'undefined') window.Diagnostics = Diagnostics;
}

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

  // Real-time polling & micro-ticking state
  let _officialQuotes = new Map();
  let _tickedPrices = new Map();
  let _highFreqInterval = null;
  let _backgroundInterval = null;
  let _microTickInterval = null;
  let _msCountdownInterval = null;
  let _msRemaining = 1000;
  let _lastSubscribed = [];

  // ── SEGMENT METADATA ──
  const SEGMENTS = {
    dashboard: { title: 'Market Dashboard',      subtitle: 'Real-time Indian equity market overview',    module: null },
    nse:       { title: 'NSE — National Stock Exchange', subtitle: 'Live equities on National Stock Exchange', module: 'NSE' },
    bse:       { title: 'BSE — Bombay Stock Exchange',   subtitle: 'Live equities on Bombay Stock Exchange',  module: 'BSE' },
    crypto:    { title: 'Cryptocurrency',                subtitle: 'Live crypto prices — BTC, ETH, SOL and more', module: 'CryptoCoins' },
    etf:       { title: 'Exchange Traded Funds',          subtitle: 'Live ETF prices, NAV and performance',    module: 'ETF' },
    mf:        { title: 'Mutual Funds',                   subtitle: 'Schemes, returns and fund categories',    module: 'MF' },
    fo:        { title: 'Futures & Options',              subtitle: 'F&O option chain, PCR and derivatives',   module: 'FO' },
    commodity: { title: 'Commodities — MCX',              subtitle: 'Gold, Silver, Crude Oil and more',        module: 'Commodity' },
    currency:  { title: 'Currency / Forex',               subtitle: 'USD/INR, EUR/INR and major INR pairs',    module: 'Currency' },
    watchlist: { title: 'My Watchlist',                   subtitle: 'Your tracked stocks across all segments', module: 'Watchlist' },
    screener:  { title: 'Stock Screener',                 subtitle: 'Filter stocks by fundamentals and price',  module: 'Screener' },
    scanner:   { title: 'Technical Intelligence Scanner', subtitle: 'NSE technical breakout setups & confluence signals', module: 'Scanner' },
    'diagnostics/market-feed': { title: 'Market Feed Diagnostics', subtitle: 'Real-time feed analytics and network stats', module: 'Diagnostics' },
    test:      { title: 'Indicator Testbed Sandbox',      subtitle: 'Isolated advanced analysis and indicators', module: 'TestTab' },
  };

  // ── NAVIGATE TO SEGMENT ──
  const navigate = async (segment) => {
    if (!SEGMENTS[segment]) return;
    
    // If transitioning away from 'test', call its destroy to clean up intervals
    if (_currentSegment === 'test' && window.TestTab && typeof window.TestTab.destroy === 'function') {
      try { window.TestTab.destroy(); } catch (e) { console.warn('[Samadhan] TestTab.destroy error:', e); }
    }
    
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
      const targetSec = segment.replace('/', '-');
      if (sec === targetSec) {
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
    if (segment !== 'dashboard' && meta.module) {
      const mod = window[meta.module];
      if (!_initialized.has(segment)) {
        _initialized.add(segment);
        if (mod && typeof mod.init === 'function') {
          try { await mod.init(); } catch (err) { console.warn(`[Samadhan] ${meta.module}.init error:`, err); }
        }
      } else if (segment === 'diagnostics/market-feed' && mod && typeof mod.init === 'function') {
        try { mod.init(); } catch (err) { console.warn(`[Samadhan] Diagnostics.init re-trigger error:`, err); }
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

  // ── THEME CONTROL ──
  const getAutoThemeMode = () => {
    const hour = new Date().getHours();
    return (hour >= 6 && hour < 18) ? 'light' : 'dark';
  };

  const updateThemeUI = (isLight, activeThemeSetting) => {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;

    if (isLight) {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }

    // Update button icon based on setting
    if (activeThemeSetting === 'auto') {
      btn.innerHTML = '<i class="ri-contrast-2-line" style="color: var(--accent-cyan);"></i>';
      btn.title = `Theme: Auto (${isLight ? 'Day' : 'Night'} Mode)`;
    } else if (activeThemeSetting === 'light') {
      btn.innerHTML = '<i class="ri-sun-fill" style="color: var(--accent-gold);"></i>';
      btn.title = "Theme: Day Mode";
    } else {
      btn.innerHTML = '<i class="ri-moon-fill" style="color: var(--accent-purple);"></i>';
      btn.title = "Theme: Night Mode";
    }

    // Toggle active state in dropdown list
    document.querySelectorAll('.theme-opt-btn').forEach(opt => {
      opt.classList.toggle('active', opt.dataset.theme === activeThemeSetting);
    });

    if (window.Charts && typeof window.Charts.applyTheme === 'function') {
      window.Charts.applyTheme();
    }
    if (window.TestTab && window.TestTab.Charts && typeof window.TestTab.Charts.applyTheme === 'function') {
      window.TestTab.Charts.applyTheme();
    }
  };

  const checkAutoTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    if (savedTheme === 'auto') {
      const mode = getAutoThemeMode();
      const currentIsLight = document.body.classList.contains('light-theme');
      const shouldBeLight = mode === 'light';
      if (currentIsLight !== shouldBeLight) {
        updateThemeUI(shouldBeLight, 'auto');
      }
    }
  };

  const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'auto';
    let isLight = false;

    if (savedTheme === 'auto') {
      isLight = getAutoThemeMode() === 'light';
    } else {
      isLight = savedTheme === 'light';
    }

    updateThemeUI(isLight, savedTheme);

    const toggleBtn = document.getElementById('themeToggle');
    const dropdown = document.getElementById('themeDropdown');

    if (!toggleBtn || !dropdown) return;

    // Toggle dropdown open/close on click
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
      // Close other dropdowns if open
      document.getElementById('notificationDropdown')?.classList.remove('open');
      document.getElementById('globalSearchResults')?.classList.remove('open');
    });

    // Handle selection of options
    dropdown.querySelectorAll('.theme-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const selectedSetting = btn.dataset.theme; // 'light', 'dark', or 'auto'
        localStorage.setItem('theme', selectedSetting);

        let finalIsLight = false;
        if (selectedSetting === 'auto') {
          finalIsLight = getAutoThemeMode() === 'light';
        } else {
          finalIsLight = selectedSetting === 'light';
        }

        updateThemeUI(finalIsLight, selectedSetting);
        dropdown.classList.remove('open');

        toast(`Theme set to ${selectedSetting === 'auto' ? 'Auto' : (selectedSetting === 'light' ? 'Day Mode' : 'Night Mode')}`, 'success');
      });
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!toggleBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });

    // Periodic check for auto theme transitions (every 60 seconds)
    setInterval(checkAutoTheme, 60000);
  };

  // ── NOTIFICATIONS STATE & ACTIONS ──
  let _notifications = [
    {
      id: 1,
      type: 'success',
      icon: 'ri-checkbox-circle-fill',
      title: 'Dhan API Bridge Running',
      body: 'Successfully initialized simulated bridge on port 5060.',
      time: 'Just now',
      unread: true
    },
    {
      id: 2,
      type: 'info',
      icon: 'ri-database-2-fill',
      title: 'Groww API Synced',
      body: 'Successfully connected and synced portfolio holding data.',
      time: '15 mins ago',
      unread: true
    },
    {
      id: 3,
      type: 'warning',
      icon: 'ri-error-warning-fill',
      title: 'Crypto Feed Live',
      body: 'Connecting to binance.com live feed for crypto trading data.',
      time: '1 hour ago',
      unread: true
    }
  ];

  const renderNotifications = () => {
    const listEl = document.getElementById('notifList');
    const badgeEl = document.getElementById('notifBadge');
    if (!listEl) return;

    const unreadCount = _notifications.filter(n => n.unread).length;
    if (badgeEl) {
      if (unreadCount > 0) {
        badgeEl.textContent = unreadCount;
        badgeEl.style.display = 'flex';
      } else {
        badgeEl.style.display = 'none';
      }
    }

    if (_notifications.length === 0) {
      listEl.innerHTML = `
        <div class="notif-empty">
          <i class="ri-notification-off-line"></i>
          <span>No new notifications</span>
        </div>`;
      return;
    }

    listEl.innerHTML = _notifications.map(n => `
      <div class="notif-item ${n.unread ? 'unread' : ''}" data-id="${n.id}">
        <div class="notif-item-icon ${n.type}">
          <i class="${n.icon}"></i>
        </div>
        <div class="notif-item-content">
          <span class="notif-item-title">${FMT.escHtml(n.title)}</span>
          <span class="notif-item-body">${FMT.escHtml(n.body)}</span>
          <span class="notif-item-time">${FMT.escHtml(n.time)}</span>
        </div>
      </div>
    `).join('');
  };

  const addNotification = (type, title, body, icon = null) => {
    const defaultIcons = {
      success: 'ri-checkbox-circle-fill',
      info: 'ri-information-fill',
      warning: 'ri-error-warning-fill',
      danger: 'ri-close-circle-fill'
    };
    const newNotif = {
      id: Date.now(),
      type,
      icon: icon || defaultIcons[type] || 'ri-notification-3-fill',
      title,
      body,
      time: 'Just now',
      unread: true
    };
    _notifications.unshift(newNotif);
    renderNotifications();
  };

  const initNotifications = () => {
    const notifBtn = document.getElementById('notificationBtn');
    const dropdown = document.getElementById('notificationDropdown');
    const clearBtn = document.getElementById('clearNotifBtn');

    if (!notifBtn || !dropdown) return;

    renderNotifications();

    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = dropdown.classList.contains('open');
      
      // Close search if open
      document.getElementById('globalSearchResults')?.classList.remove('open');
      
      if (!isOpen) {
        dropdown.classList.add('open');
        // Mark all as read when opening dropdown
        _notifications.forEach(n => n.unread = false);
        renderNotifications();
      } else {
        dropdown.classList.remove('open');
      }
    });

    clearBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      _notifications = [];
      renderNotifications();
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!notifBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
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

    // Dhan L3 Depth & Rolling Options
    refreshModalDepthAndExpired(symbol);
    loadExpiredOptionsChart();

    // Event listeners
    const loadExpiredBtn = document.getElementById('loadExpiredBtn');
    if (loadExpiredBtn) {
      loadExpiredBtn.onclick = loadExpiredOptionsChart;
    }
  };

  const closeStockModal = () => {
    const modal = document.getElementById('stockModal');
    if (modal) { modal.setAttribute('hidden', ''); modal.style.display = 'none'; }
    document.body.style.overflow = '';
    Charts.destroyChart('modalChart');
    Charts.destroyChart('expiredOptionsChart');
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
  // ── DUAL LOOP HIGH-FREQUENCY & BACKGROUND REFRESH ──
  const startRefreshTimer = () => {
    if (_highFreqInterval) clearInterval(_highFreqInterval);
    if (_backgroundInterval) clearInterval(_backgroundInterval);
    if (_microTickInterval) clearInterval(_microTickInterval);
    if (_msCountdownInterval) clearInterval(_msCountdownInterval);

    // 1. High-Frequency Polling Loop (1s) for visible/active symbols
    _highFreqInterval = setInterval(runHighFrequencyRefresh, 1000);

    // 2. Background Polling Loop (15s) for full segment updates
    _backgroundInterval = setInterval(runBackgroundRefresh, 15000);

    // 3. Micro-Ticking Engine (250ms) for visual fluidity
    _microTickInterval = setInterval(runMicroTicking, 250);

    // 4. Sidebar Countdown Timer (50ms interval for millisecond countdown)
    _msRemaining = 1000;
    _msCountdownInterval = setInterval(() => {
      _msRemaining -= 50;
      if (_msRemaining <= 0) {
        _msRemaining = 1000;
      }
      const el = document.getElementById('refreshCountdown');
      if (el) el.textContent = `${_msRemaining}ms`;

      // Update data source badge dynamically
      const badge = document.getElementById('dataSourceText');
      if (badge && API.getDataSource) {
        const src = API.getDataSource();
        const labels = { dhan: 'Dhan Live', groww: 'Groww Live', yahoo: 'Yahoo Finance', simulation: 'Demo Data' };
        badge.textContent = labels[src] || 'Demo Data';
      }
    }, 50);

    // Run immediately on start
    runHighFrequencyRefresh();
    runBackgroundRefresh();
  };

  const getActiveSymbols = () => {
    const symbols = new Set([
      '^NSEI', '^BSESN', '^NSEBANK', '^CNXIT', '^CNXAUTO', '^CNXPHARMA'
    ]);

    // Active segment symbol
    if (_currentSegment === 'nse' && window.NSE && window.NSE.getSelectedSymbol) {
      const s = window.NSE.getSelectedSymbol();
      if (s) symbols.add(s);
    } else if (_currentSegment === 'bse' && window.BSE && window.BSE.getSelectedSymbol) {
      const s = window.BSE.getSelectedSymbol();
      if (s) symbols.add(s);
    } else if (_currentSegment === 'crypto' && window.CryptoCoins && window.CryptoCoins.getSelectedSymbol) {
      const s = window.CryptoCoins.getSelectedSymbol();
      if (s) symbols.add(s);
    } else if (_currentSegment === 'test' && window.TestTab && window.TestTab.State) {
      const state = window.TestTab.State.get();
      if (state.symbol) symbols.add(state.symbol);
    }

    // Modal symbol
    if (_modalSymbol) {
      symbols.add(_modalSymbol);
    }

    // Top Watchlist symbols
    if (window.Watchlist && window.Watchlist.getSymbols) {
      const wl = window.Watchlist.getSymbols();
      wl.slice(0, 10).forEach(s => symbols.add(s));
    }

    return Array.from(symbols);
  };

  const runHighFrequencyRefresh = async () => {
    const allActive = getActiveSymbols();
    // Filter to only include symbols whose markets are open
    const active = allActive.filter(s => typeof window.isMarketOpenForSymbol === 'function' ? window.isMarketOpenForSymbol(s) : true);

    // Sync WebSocket subscriptions for active symbols
    try {
      if (API.subscribeQuotes && API.unsubscribeQuotes) {
        const toUnsub = _lastSubscribed.filter(s => !active.includes(s));
        if (toUnsub.length > 0) {
          API.unsubscribeQuotes(toUnsub);
        }
        if (active.length > 0) {
          API.subscribeQuotes(active);
        }
        _lastSubscribed = active;
      }
    } catch (err) {
      console.warn('[Samadhan] WebSocket subscription sync failed:', err);
    }

    if (active.length === 0) return;

    try {
      const quotes = await API.getMultipleQuotes(active, true);
      quotes.forEach((q, i) => {
        if (q && q.price) {
          const sym = active[i];
          // Only update base if not already streaming from WebSocket to avoid jitter
          const current = _officialQuotes.get(sym);
          if (!current || current._source !== 'dhan_ws') {
            _officialQuotes.set(sym, q);
            _tickedPrices.set(sym, q.price);
            updateDOMForSymbol(sym, q);
            
            if (_modalSymbol === sym) {
              refreshModalDepthAndExpired(sym);
            }
          }
        }
      });
    } catch (e) {
      console.warn('[Samadhan] High frequency refresh failed:', e);
    }
  };

  const runBackgroundRefresh = async () => {
    API.invalidateCache();
    await refreshCurrentSegment();
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

  const runMicroTicking = () => {
    const active = getActiveSymbols();
    active.forEach(sym => {
      // Skip client-side mock micro-ticking if the market is closed for this symbol
      if (typeof window.isMarketOpenForSymbol === 'function' && !window.isMarketOpenForSymbol(sym)) {
        return;
      }

      const official = _officialQuotes.get(sym);
      if (!official) return;

      // Skip client-side mock micro-ticking if quotes are already streaming live from WebSocket
      if (official._source === 'dhan_ws') {
        return;
      }

      let currentPrice = _tickedPrices.get(sym) || official.price;
      const changePercent = (Math.random() - 0.5) * 0.0006;
      currentPrice = currentPrice * (1 + changePercent);

      const maxDrift = official.price * 0.002;
      if (currentPrice > official.price + maxDrift) {
        currentPrice = official.price + maxDrift;
      } else if (currentPrice < official.price - maxDrift) {
        currentPrice = official.price - maxDrift;
      }

      _tickedPrices.set(sym, currentPrice);

      const prevClose = official.prevClose || official.price;
      const change = currentPrice - prevClose;
      const changePct = (change / prevClose) * 100;

      const tickedQuote = {
        ...official,
        price: currentPrice,
        change: change,
        changePct: changePct
      };

      updateDOMForSymbol(sym, tickedQuote);
    });
  };

  const updateDOMForSymbol = (symbol, q) => {
    if (!q) return;

    // Test tab update
    if (_currentSegment === 'test' && window.TestTab && window.TestTab.State) {
      const state = window.TestTab.State.get();
      if (state.symbol === symbol) {
        window.TestTab.State.updateQuote(q);
      }
    }
    const positive = q.changePct >= 0;
    const chgIcon = FMT.changeIcon(q.changePct);
    const chgText = `${q.change >= 0 ? '+' : ''}₹${FMT.price(Math.abs(q.change))} (${FMT.pct(q.changePct)})`;
    const pctText = FMT.pct(q.changePct);
    const priceText = `₹${FMT.price(q.price)}`;
    const priceNoSymbol = FMT.price(q.price);

    // 1. Index Cards
    document.querySelectorAll(`.index-card[data-symbol="${symbol}"]`).forEach(card => {
      const valEl = card.querySelector('.idx-value');
      const chgEl = card.querySelector('.idx-change');
      if (valEl) valEl.textContent = priceNoSymbol;
      if (chgEl) {
        chgEl.className = `idx-change ${positive ? 'positive' : 'negative'}`;
        chgEl.innerHTML = `<i class="${chgIcon}"></i> <span>${pctText}</span> <span style="color:var(--text-muted);font-weight:400">(${q.change >= 0 ? '+' : ''}${FMT.price(q.change)})</span>`;
      }
      card.className = `index-card ${positive ? 'positive' : 'negative'}`;
    });

    // Header Index Pills
    if (symbol === '^NSEI') {
      const valEl = document.getElementById('headerNifty');
      const chgEl = document.getElementById('headerNiftyChange');
      if (valEl) valEl.textContent = priceNoSymbol;
      if (chgEl) {
        chgEl.textContent = pctText;
        chgEl.className = `index-change ${positive ? 'positive' : 'negative'}`;
      }
    } else if (symbol === '^BSESN') {
      const valEl = document.getElementById('headerSensex');
      const chgEl = document.getElementById('headerSensexChange');
      if (valEl) valEl.textContent = priceNoSymbol;
      if (chgEl) {
        chgEl.textContent = pctText;
        chgEl.className = `index-change ${positive ? 'positive' : 'negative'}`;
      }
    }

    // 2. Ticker Tape Items
    document.querySelectorAll(`.ticker-item[data-symbol="${symbol}"]`).forEach(item => {
      const priceEl = item.querySelector('.ticker-price');
      const chgEl = item.querySelector('.ticker-change');
      if (priceEl) priceEl.textContent = priceNoSymbol;
      if (chgEl) {
        chgEl.className = `ticker-change ${positive ? 'positive' : 'negative'}`;
        chgEl.innerHTML = `<span class="ticker-arrow">${positive ? '▲' : '▼'}</span>${pctText}`;
      }
    });

    // 3. Sidebar Stock Lists
    document.querySelectorAll(`.stock-item[data-symbol="${symbol}"]`).forEach(item => {
      const ltpEl = item.querySelector('.stock-item-ltp');
      const chgEl = item.querySelector('.stock-item-chg');
      if (ltpEl) ltpEl.textContent = priceText;
      if (chgEl) {
        chgEl.textContent = pctText;
        chgEl.className = `stock-item-chg ${positive ? 'positive' : 'negative'}`;
      }
    });

    // 4. Watchlist Rows
    document.querySelectorAll(`.watchlist-row[data-symbol="${symbol}"]`).forEach(row => {
      const ltpTd = row.cells[2];
      const chgTd = row.cells[3];
      const pctSpan = row.querySelector('.change-pill');
      if (ltpTd) ltpTd.textContent = priceText;
      if (chgTd) {
        chgTd.textContent = `${q.change >= 0 ? '+' : ''}₹${FMT.price(Math.abs(q.change))}`;
        chgTd.className = `mono ${positive ? 'positive' : 'negative'}`;
      }
      if (pctSpan) {
        pctSpan.className = `change-pill ${positive ? 'positive' : 'negative'}`;
        pctSpan.innerHTML = `<i class="${chgIcon}" style="font-size:0.65rem"></i> ${pctText}`;
      }
    });

    // 5. Stock Details Panels
    if (_currentSegment === 'nse' && window.NSE && window.NSE.getSelectedSymbol && window.NSE.getSelectedSymbol() === symbol) {
      const nseDetail = document.getElementById('nseDetail');
      if (nseDetail) {
        const ltpEl = nseDetail.querySelector('.sd-ltp');
        const chgEl = nseDetail.querySelector('.sd-change');
        if (ltpEl) {
          ltpEl.textContent = priceText;
          ltpEl.className = `sd-ltp ${positive ? 'positive' : 'negative'}`;
        }
        if (chgEl) {
          chgEl.className = `sd-change ${positive ? 'positive' : 'negative'}`;
          chgEl.innerHTML = `<i class="${chgIcon}"></i> ${q.change >= 0 ? '+' : ''}₹${FMT.price(Math.abs(q.change))} (${pctText})`;
        }
      }
    }
    if (_currentSegment === 'bse' && window.BSE && window.BSE.getSelectedSymbol && window.BSE.getSelectedSymbol() === symbol) {
      const bseDetail = document.getElementById('bseDetail');
      if (bseDetail) {
        const ltpEl = bseDetail.querySelector('.sd-ltp');
        const chgEl = bseDetail.querySelector('.sd-change');
        if (ltpEl) {
          ltpEl.textContent = priceText;
          ltpEl.className = `sd-ltp ${positive ? 'positive' : 'negative'}`;
        }
        if (chgEl) {
          chgEl.className = `sd-change ${positive ? 'positive' : 'negative'}`;
          chgEl.innerHTML = `<i class="${chgIcon}"></i> ${q.change >= 0 ? '+' : ''}₹${FMT.price(Math.abs(q.change))} (${pctText})`;
        }
      }
    }

    // 6. Open Modal
    if (_modalSymbol === symbol) {
      const ltpEl = document.getElementById('modalLtp');
      const chgEl = document.getElementById('modalChange');
      if (ltpEl) {
        ltpEl.textContent = priceText;
        ltpEl.style.color = positive ? 'var(--color-positive)' : 'var(--color-negative)';
      }
      if (chgEl) {
        chgEl.className = `modal-change ${positive ? 'positive' : 'negative'}`;
        chgEl.innerHTML = `<i class="${chgIcon}"></i> ${q.change >= 0 ? '+' : ''}₹${FMT.price(Math.abs(q.change))} (${pctText})`;
      }
    }
  };

  // ── DHAN WIDGETS HELPERS ──
  const refreshModalDepthAndExpired = async (symbol) => {
    try {
      const depth = await API.getMarketDepth(symbol);
      if (depth && (depth.buy || depth.sell)) {
        renderMarketDepth(depth);
      }
    } catch (e) {
      console.warn('[Samadhan] Failed to refresh depth:', e);
    }
  };

  const renderMarketDepth = (depth) => {
    const bidsContainer = document.getElementById('modalBidsList');
    const asksContainer = document.getElementById('modalAsksList');
    if (!bidsContainer || !asksContainer) return;

    const buy = (depth.buy || []).slice(0, 10);
    const sell = (depth.sell || []).slice(0, 10);

    const maxBuyQty = buy.length > 0 ? Math.max(...buy.map(b => b.quantity)) : 1;
    const maxSellQty = sell.length > 0 ? Math.max(...sell.map(s => s.quantity)) : 1;

    bidsContainer.innerHTML = buy.map(b => {
      const pct = (b.quantity / maxBuyQty) * 100;
      return `<div style="display:grid; grid-template-columns: 2fr 1fr 1fr; position:relative; padding:2px 0;">
        <div style="position:absolute; top:0; left:0; bottom:0; width:${pct}%; background:rgba(0,217,126,0.08); z-index:0"></div>
        <span style="color:var(--color-positive); font-weight:700; z-index:1">₹${FMT.price(b.price)}</span>
        <span class="mono" style="z-index:1; text-align:right">${b.quantity}</span>
        <span class="mono" style="z-index:1; text-align:right; color:var(--text-secondary)">${b.orders || 1}</span>
      </div>`;
    }).join('');

    asksContainer.innerHTML = sell.map(s => {
      const pct = (s.quantity / maxSellQty) * 100;
      return `<div style="display:grid; grid-template-columns: 2fr 1fr 1fr; position:relative; padding:2px 0;">
        <div style="position:absolute; top:0; right:0; bottom:0; width:${pct}%; background:rgba(255,71,87,0.08); z-index:0"></div>
        <span style="color:var(--color-negative); font-weight:700; z-index:1">₹${FMT.price(s.price)}</span>
        <span class="mono" style="z-index:1; text-align:right">${s.quantity}</span>
        <span class="mono" style="z-index:1; text-align:right; color:var(--text-secondary)">${s.orders || 1}</span>
      </div>`;
    }).join('');

    const buyTotal = depth.total_buy_qty || buy.reduce((acc, b) => acc + b.quantity, 0);
    const sellTotal = depth.total_sell_qty || sell.reduce((acc, s) => acc + s.quantity, 0);

    const totalBuyEl = document.getElementById('modalTotalBuyQty');
    const totalSellEl = document.getElementById('modalTotalSellQty');
    if (totalBuyEl) totalBuyEl.textContent = FMT.volume(buyTotal);
    if (totalSellEl) totalSellEl.textContent = FMT.volume(sellTotal);
  };

  const loadExpiredOptionsChart = async () => {
    if (!_modalSymbol) return;
    const strike = document.getElementById('expiredStrikeSelect')?.value || 'ATM';
    Charts.showChartLoading('expiredOptionsChart');
    try {
      const data = await API.getExpiredOptions(_modalSymbol, strike);
      if (data && data.candles) {
        Charts.renderChart('expiredOptionsChart', data.candles, 'line');
      }
    } catch (e) {
      console.warn('[Samadhan] Failed to load expired options:', e);
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

    // ── NSE / BSE: Weekdays 9:15 AM – 3:30 PM IST ──
    const nsePreOpen = isWeekday && mins >= 540 && mins < 555; // 9:00 – 9:15
    const nseOpen = isWeekday && mins >= 555 && mins < 930;     // 9:15 – 15:30
    const nsePostClose = isWeekday && mins >= 930 && mins < 960; // 15:30 – 16:00

    // ── MCX Commodities: Weekdays 9:00 AM – 11:30 PM IST ──
    const mcxOpen = isWeekday && mins >= 540 && mins < 1410; // 9:00 – 23:30

    // ── Crypto: 24/7 ──
    const cryptoLive = true;

    // Helper to set badge state
    const setBadge = (id, text, state) => {
      const badge = document.getElementById(id);
      if (!badge) return;
      badge.textContent = text;
      badge.className = 'nav-badge'; // reset all variant classes
      if (state === 'live') {
        // default cyan style (no extra class needed)
      } else if (state === 'closed') {
        badge.classList.add('closed');
      } else if (state === 'delayed') {
        badge.classList.add('delayed');
      } else if (state === 'pre') {
        badge.classList.add('delayed');
      }
    };

    // ── Update global pill ──
    const pill = document.getElementById('marketStatusPill');
    const text = document.getElementById('marketStatusText');
    if (pill) pill.classList.toggle('closed', !nseOpen);
    if (text) text.textContent = nseOpen ? 'Markets Open' : 'Markets Closed';

    // ── NSE Badge ──
    if (nseOpen) {
      setBadge('badge-nse', 'Live', 'live');
    } else if (nsePreOpen) {
      setBadge('badge-nse', 'Pre-Open', 'delayed');
    } else if (nsePostClose) {
      setBadge('badge-nse', 'Closing', 'delayed');
    } else {
      setBadge('badge-nse', 'Closed', 'closed');
    }

    // ── BSE Badge ──
    if (nseOpen) {
      setBadge('badge-bse', 'Live', 'live');
    } else if (nsePreOpen) {
      setBadge('badge-bse', 'Pre-Open', 'delayed');
    } else if (nsePostClose) {
      setBadge('badge-bse', 'Closing', 'delayed');
    } else {
      setBadge('badge-bse', 'Closed', 'closed');
    }

    // ── Crypto Badge (24/7) ──
    if (cryptoLive) {
      setBadge('badge-crypto', 'Live', 'live');
    }

    // ── Commodities Badge ──
    if (mcxOpen) {
      setBadge('badge-commodity', 'Live', 'live');
    } else {
      setBadge('badge-commodity', 'Closed', 'closed');
    }
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

  // ── WEBSOCKET CLIENT LISTENER ──
  const initWebSocketListener = () => {
    if (API.onTick) {
      API.onTick((ticks) => {
        ticks.forEach(q => {
          if (q && q.symbol) {
            const sym = q.symbol;
            // Update cache and ticked prices immediately on message receive
            _officialQuotes.set(sym, q);
            _tickedPrices.set(sym, q.price);
            updateDOMForSymbol(sym, q);
            
            if (_modalSymbol === sym) {
              refreshModalDepthAndExpired(sym);
            }
          }
        });
      });
    }
  };

  return { navigate, toast, openStockModal, closeStockModal, initSearch, startRefreshTimer, checkMarketStatus, initKeyboard, initSidebar, initModal, initRefreshBtn, initTheme, initNotifications, addNotification, initWebSocketListener };
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
    AppState.initTheme();
    AppState.initNotifications();
    AppState.initWebSocketListener();
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
