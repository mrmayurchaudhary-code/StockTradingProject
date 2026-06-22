'use strict';

/* ============================================================
   SAMADHAN TRADING — WATCHLIST MODULE
   localStorage persistence, add/remove, live price refresh
   ============================================================ */

const Watchlist = (() => {

  const STORAGE_KEY = 'samadhan_watchlist_v2';
  const DEFAULT_SYMBOLS = ['RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS'];

  let _symbols = [];
  let _quotes = {};
  let _sortCol = 'name';
  let _sortAsc = true;

  // ── INIT ──
  const init = () => {
    _load();
    _setupEventListeners();
    refresh();
  };

  // ── LOAD FROM STORAGE ──
  const _load = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      _symbols = stored ? JSON.parse(stored) : [...DEFAULT_SYMBOLS];
      // Validate: only allow safe symbol strings
      _symbols = _symbols.filter(s => typeof s === 'string' && /^[A-Z0-9.\-^=]{1,20}$/i.test(s)).slice(0, 50);
    } catch {
      _symbols = [...DEFAULT_SYMBOLS];
    }
    _updateCount();
  };

  // ── SAVE TO STORAGE ──
  const _save = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_symbols)); } catch {}
    _updateCount();
  };

  // ── UPDATE BADGE COUNT ──
  const _updateCount = () => {
    const el = document.getElementById('watchlistCount');
    if (el) el.textContent = _symbols.length;
  };

  // ── ADD SYMBOL ──
  const addSymbol = (rawSymbol) => {
    const symbol = rawSymbol.trim().toUpperCase().replace(/\s+/g, '');
    // Infer .NS if no suffix
    const finalSymbol = symbol.includes('.') || symbol.startsWith('^') || symbol.endsWith('=F') || symbol.endsWith('=X')
      ? symbol
      : `${symbol}.NS`;

    if (!finalSymbol || !/^[A-Z0-9.\-^=]{1,20}$/.test(finalSymbol)) {
      AppState.toast('Invalid symbol format', 'error');
      return false;
    }

    if (_symbols.includes(finalSymbol)) {
      AppState.toast(`${finalSymbol} is already in your watchlist`, 'warning');
      return false;
    }

    if (_symbols.length >= 50) {
      AppState.toast('Watchlist limit reached (50 stocks)', 'warning');
      return false;
    }

    _symbols.push(finalSymbol);
    _save();
    refresh();
    AppState.toast(`Added ${finalSymbol} to watchlist`, 'success');
    return true;
  };

  // ── REMOVE SYMBOL ──
  const removeSymbol = (symbol) => {
    _symbols = _symbols.filter(s => s !== symbol);
    delete _quotes[symbol];
    _save();
    renderTable();
    AppState.toast(`Removed ${symbol.replace('.NS', '')} from watchlist`, 'info');
  };

  // ── CHECK IF IN WATCHLIST ──
  const has = (symbol) => _symbols.includes(symbol);

  // ── REFRESH DATA ──
  const refresh = async () => {
    if (_symbols.length === 0) { renderTable(); return; }
    try {
      const results = await API.getMultipleQuotes(_symbols);
      results.forEach((q, i) => { if (q) _quotes[_symbols[i]] = q; });
    } catch {}
    renderTable();
  };

  // ── RENDER TABLE ──
  const renderTable = () => {
    const tbody = document.getElementById('watchlistBody');
    if (!tbody) return;

    if (_symbols.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">
        <div class="empty-state"><i class="ri-bookmark-line"></i><p>Your watchlist is empty. Search and add symbols above.</p></div>
      </td></tr>`;
      return;
    }

    let rows = _symbols.map(sym => {
      const q = _quotes[sym] || FALLBACK.getQuote(sym);
      return { sym, q };
    });

    // Sort
    rows.sort((a, b) => {
      let va, vb;
      switch (_sortCol) {
        case 'price':    va = a.q.price;     vb = b.q.price; break;
        case 'change':   va = a.q.changePct;  vb = b.q.changePct; break;
        case 'volume':   va = a.q.volume;     vb = b.q.volume; break;
        default:         va = a.sym;          vb = b.sym;
      }
      if (typeof va === 'string') return _sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return _sortAsc ? va - vb : vb - va;
    });

    tbody.innerHTML = rows.map(({ sym, q }) => {
      const displaySym = sym.replace('.NS', '').replace('.BO', '');
      const positive = q.changePct >= 0;
      return `<tr data-symbol="${FMT.escHtml(sym)}" class="watchlist-row" role="row">
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="mono" style="font-weight:700;color:var(--accent-cyan)">${FMT.escHtml(displaySym)}</span>
            <span class="segment-badge badge-nse">${q.exchange || 'NSE'}</span>
          </div>
        </td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-secondary);font-size:0.75rem">${FMT.escHtml(q.name || sym)}</td>
        <td class="mono" style="font-weight:700">₹${FMT.price(q.price)}</td>
        <td class="mono ${positive ? 'positive' : 'negative'}">${q.change >= 0 ? '+' : ''}₹${FMT.price(Math.abs(q.change))}</td>
        <td>
          <span class="change-pill ${positive ? 'positive' : 'negative'}">
            <i class="${FMT.changeIcon(q.changePct)}" style="font-size:0.65rem"></i>
            ${FMT.pct(q.changePct)}
          </span>
        </td>
        <td class="mono" style="color:var(--text-secondary)">${FMT.volume(q.volume)}</td>
        <td>
          <div style="display:flex;gap:6px">
            <button class="action-btn add" data-action="view" data-symbol="${FMT.escHtml(sym)}" title="View chart" aria-label="View chart for ${FMT.escHtml(displaySym)}"><i class="ri-line-chart-line"></i></button>
            <button class="action-btn" data-action="remove" data-symbol="${FMT.escHtml(sym)}" title="Remove" aria-label="Remove ${FMT.escHtml(displaySym)} from watchlist"><i class="ri-delete-bin-line"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Bind row actions
    tbody.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const { action, symbol } = btn.dataset;
        if (action === 'remove') removeSymbol(symbol);
        if (action === 'view') AppState.openStockModal(symbol);
      });
    });

    tbody.querySelectorAll('.watchlist-row').forEach(row => {
      row.style.cursor = 'pointer';
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        AppState.openStockModal(row.dataset.symbol);
      });
    });
  };

  // ── SETUP EVENTS ──
  const _setupEventListeners = () => {
    const addBtn = document.getElementById('addToWatchlist');
    const searchInput = document.getElementById('watchlistSearch');

    const doAdd = () => {
      const val = searchInput?.value?.trim();
      if (val) { addSymbol(val); if (searchInput) searchInput.value = ''; }
    };

    addBtn?.addEventListener('click', doAdd);
    searchInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAdd(); });

    // Sort columns
    document.querySelector('#watchlistTable thead')?.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      const col = th.dataset.sort;
      if (_sortCol === col) _sortAsc = !_sortAsc;
      else { _sortCol = col; _sortAsc = true; }
      renderTable();
    });
  };

  const getSymbols = () => _symbols;

  return { init, refresh, addSymbol, removeSymbol, has, getSymbols };
})();
