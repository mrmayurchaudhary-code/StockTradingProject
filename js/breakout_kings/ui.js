'use strict';

/* ============================================================
   SAMADHAN TRADING — BREAKOUT KINGS UI COMPONENT RENDERER
   Manages controls, data tables, and live filtering.
   ============================================================ */

window.BreakoutKingsUI = (() => {

  let _scanResults = [];
  let _sortCol = 'score';
  let _sortDir = -1; // Default desc

  const init = (onFilterChange, onSortChange) => {
    setupSliders();
    setupDropdowns(onFilterChange);
    setupSortHeaders(onSortChange);
  };

  const setupSliders = () => {
    const sliders = [
      { id: 'bk_f_score_min', valId: 'bk_f_score_min_val', prec: 0 },
      { id: 'bk_f_rsi_min', valId: 'bk_f_rsi_min_val', prec: 0 },
      { id: 'bk_f_adx_min', valId: 'bk_f_adx_min_val', prec: 0 },
      { id: 'bk_f_vol_ratio', valId: 'bk_f_vol_ratio_val', prec: 1 }
    ];

    sliders.forEach(s => {
      const slider = document.getElementById(s.id);
      const valLabel = document.getElementById(s.valId);
      if (slider && valLabel) {
        slider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          valLabel.textContent = s.prec === 1 ? val.toFixed(1) : Math.round(val);
          applyFilter();
        });
      }
    });

    document.getElementById('bk_f_price_min')?.addEventListener('input', () => {
      applyFilter();
    });
  };

  const setupDropdowns = (onFilterChange) => {
    ['bk_f_category'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        applyFilter();
      });
    });
  };

  const setupSortHeaders = (onSortChange) => {
    document.querySelector('#bk_scanner_table thead')?.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      
      const col = th.dataset.sort;
      if (_sortCol === col) {
        _sortDir = -_sortDir;
      } else {
        _sortCol = col;
        _sortDir = -1; // Default to desc on first click
      }

      // Update header indicator icons
      document.querySelectorAll('#bk_scanner_table th[data-sort]').forEach(header => {
        const icon = header.querySelector('i');
        if (icon) {
          if (header.dataset.sort === _sortCol) {
            icon.className = _sortDir === 1 ? 'ri-arrow-up-line' : 'ri-arrow-down-line';
          } else {
            icon.className = 'ri-arrow-up-down-line';
          }
        }
      });

      applyFilter();
    });
  };

  const updateResults = (results) => {
    _scanResults = results;
    populateSectors();
    applyFilter();
    updateStats();
  };

  const populateSectors = () => {
    const dropdown = document.getElementById('bk_sector_select');
    if (!dropdown) return;

    // Collect sectors from existing global mappings or results
    const sectors = new Set();
    
    // Look in App data or results
    _scanResults.forEach(r => {
      const info = window.API.getStockInfo(r.symbol) || {};
      if (info.sector) sectors.add(info.sector);
    });

    // Reset and rebuild options
    dropdown.innerHTML = '<option value="all" selected>All Sectors</option>';
    Array.from(sectors).sort().forEach(sec => {
      dropdown.innerHTML += `<option value="${FMT.escHtml(sec)}">${FMT.escHtml(sec)}</option>`;
    });

    dropdown.addEventListener('change', () => {
      applyFilter();
    });
  };

  const getFilteredResults = () => {
    const selectMarket = document.getElementById('bk_market_select')?.value || 'all';
    const selectSector = document.getElementById('bk_sector_select')?.value || 'all';
    
    const filterCat = document.getElementById('bk_f_category')?.value || 'all';
    const filterScoreMin = parseInt(document.getElementById('bk_f_score_min')?.value || '0', 10);
    const filterRsiMin = parseInt(document.getElementById('bk_f_rsi_min')?.value || '0', 10);
    const filterAdxMin = parseInt(document.getElementById('bk_f_adx_min')?.value || '0', 10);
    const filterVolRatio = parseFloat(document.getElementById('bk_f_vol_ratio')?.value || '0');
    const filterPriceMin = parseFloat(document.getElementById('bk_f_price_min')?.value) || 0;

    let filtered = _scanResults.filter(r => {
      // Market filter
      const sym = r.symbol.toUpperCase();
      if (selectMarket === 'nse' && !sym.endsWith('.NS')) return false;
      if (selectMarket === 'bse' && !sym.endsWith('.BO')) return false;

      // Sector filter
      const info = window.API.getStockInfo(r.symbol) || {};
      if (selectSector !== 'all' && info.sector !== selectSector) return false;

      // Category filter
      if (filterCat === 'king' && r.category !== 'Breakout King') return false;
      if (filterCat === 'strong' && r.category !== 'Strong Breakout') return false;
      if (filterCat === 'watchlist' && r.category !== 'Watchlist') return false;

      // Sliders & inputs
      if (r.score < filterScoreMin) return false;
      if (r.rsi != null && r.rsi < filterRsiMin) return false;
      if (r.adx != null && r.adx < filterAdxMin) return false;
      if (r.volRatio < filterVolRatio) return false;
      if (r.price < filterPriceMin) return false;

      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      let va = a[_sortCol], vb = b[_sortCol];
      if (va == null) return _sortDir;
      if (vb == null) return -_sortDir;
      return (va - vb) * _sortDir;
    });

    return filtered;
  };

  const applyFilter = () => {
    const data = getFilteredResults();
    renderTable(data);
  };

  const updateStats = () => {
    const scannedEl = document.getElementById('bk-total-scanned');
    const kingsEl = document.getElementById('bk-kings-count');
    const strongEl = document.getElementById('bk-strong-count');
    const wlEl = document.getElementById('bk-watchlist-count');

    if (scannedEl) scannedEl.textContent = _scanResults.length;
    if (kingsEl) kingsEl.textContent = _scanResults.filter(r => r.category === 'Breakout King').length;
    if (strongEl) strongEl.textContent = _scanResults.filter(r => r.category === 'Strong Breakout').length;
    if (wlEl) wlEl.textContent = _scanResults.filter(r => r.category === 'Watchlist').length;

    // Render timezone status badge in ribbon
    const statusEl = document.getElementById('bk-market-status');
    if (statusEl) {
      const open = typeof window.isMarketOpenForSymbol === 'function' ? window.isMarketOpenForSymbol('RELIANCE.NS') : false;
      statusEl.textContent = open ? 'Open' : 'Closed';
      statusEl.className = 'bk-stat-val ' + (open ? 'positive' : 'negative');
    }
  };

  const renderTable = (data) => {
    const body = document.getElementById('bk_scanner_body');
    const matchCount = document.getElementById('bk_match_count');
    if (!body) return;

    if (matchCount) matchCount.textContent = `${data.length} matches`;

    if (data.length === 0) {
      body.innerHTML = `<tr class="bk-empty-row"><td colspan="11">
        <div class="bk-empty-state">
          <i class="ri-search-eye-line" style="font-size:2rem; color:var(--text-muted);"></i>
          <p>No scanned assets match your filter criteria.</p>
        </div>
      </td></tr>`;
      return;
    }

    body.innerHTML = data.map(r => {
      const info = window.API.getStockInfo(r.symbol) || { name: r.symbol, sector: '—' };
      const rowClass = r.category === 'Breakout King' ? 'king-row' : (r.category === 'Strong Breakout' ? 'strong-row' : '');
      const catClass = r.category === 'Breakout King' ? 'king' : (r.category === 'Strong Breakout' ? 'strong' : 'watchlist');
      
      const scoreClass = r.score >= 85 ? 'high' : (r.score >= 55 ? 'mid' : 'low');
      const volRatioClass = r.volRatio > 3 ? 'bk-vol-highlight' : '';

      return `<tr class="${rowClass}" data-symbol="${FMT.escHtml(r.symbol)}" style="cursor:pointer;">
        <td>
          <div style="font-weight:700; color:var(--accent-cyan); font-family:var(--font-mono);">${FMT.escHtml(r.symbol.replace('.NS','').replace('.BO',''))}</div>
          <div style="font-size:0.65rem; color:var(--text-muted);">${FMT.escHtml(info.name)}</div>
        </td>
        <td class="mono" style="text-align:right; font-weight:600;">₹${FMT.price(r.price)}</td>
        <td class="mono" style="text-align:right; color:var(--text-secondary);">₹${FMT.price(r.high50d)}</td>
        <td class="mono" style="text-align:right; color:var(--text-secondary);">₹${FMT.price(r.high52w)}</td>
        <td class="mono ${volRatioClass}" style="text-align:right;">${r.volRatio.toFixed(2)}x</td>
        <td class="mono" style="text-align:right;">${r.rsi != null ? r.rsi.toFixed(1) : '—'}</td>
        <td class="mono" style="text-align:right;">${r.adx != null ? r.adx.toFixed(1) : '—'}</td>
        <td class="mono" style="text-align:right; color:${r.rsScore >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'};">
          ${r.rsScore >= 0 ? '+' : ''}${r.rsScore.toFixed(2)}%
        </td>
        <td style="text-align:right;">
          <span class="bk-score-badge ${scoreClass}">${r.score}/100</span>
        </td>
        <td style="text-align:center;">
          <span class="bk-cat-badge ${catClass}">${r.category}</span>
        </td>
        <td class="mono" style="text-align:right; color:var(--text-secondary); font-size:0.7rem;">
          ${new Date(r.timestamp).toLocaleTimeString()}
        </td>
      </tr>`;
    }).join('');

    // Attach click events
    body.querySelectorAll('tr[data-symbol]').forEach(row => {
      row.addEventListener('click', () => {
        if (window.AppState && typeof window.AppState.openStockModal === 'function') {
          window.AppState.openStockModal(row.dataset.symbol);
        }
      });
    });
  };

  const getStats = () => {
    return {
      total: _scanResults.length,
      kings: _scanResults.filter(r => r.category === 'Breakout King').length,
      strong: _scanResults.filter(r => r.category === 'Strong Breakout').length,
      watchlist: _scanResults.filter(r => r.category === 'Watchlist').length
    };
  };

  return {
    init,
    updateResults,
    applyFilter,
    getStats,
    getFilteredResults
  };

})();
