'use strict';

/* ============================================================
   SAMADHAN TRADING — BREAKOUT KINGS UI v2
   Card-based rendering with Canvas sparklines.
   ============================================================ */

window.BreakoutKingsUI = (() => {

  let _scanResults = [];

  const init = () => {
    // Filter change listeners
    ['bk_f_category', 'bk_sort_by', 'bk_f_score_min', 'bk_market_select'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => applyFilter());
    });
  };

  const updateResults = (results) => {
    _scanResults = results;
    applyFilter();
    updateHeroStats();
    updateCategoryCards();
  };

  const getFilteredResults = () => {
    const filterCat = document.getElementById('bk_f_category')?.value || 'all';
    const filterScoreMin = parseInt(document.getElementById('bk_f_score_min')?.value || '0', 10);
    const selectMarket = document.getElementById('bk_market_select')?.value || 'all';
    const sortBy = document.getElementById('bk_sort_by')?.value || 'score';

    let filtered = _scanResults.filter(r => {
      // Only show qualifying stocks (score >= 55)
      if (r.category === 'Ignore') return false;

      // Market filter
      if (selectMarket === 'nse' && !r.symbol.endsWith('.NS')) return false;
      if (selectMarket === 'bse' && !r.symbol.endsWith('.BO')) return false;

      // Category filter
      if (filterCat === 'king' && r.category !== 'Breakout King') return false;
      if (filterCat === 'strong' && r.category !== 'Strong') return false;
      if (filterCat === 'watchlist' && r.category !== 'Watchlist') return false;

      // Score filter
      if (r.score < filterScoreMin) return false;

      return true;
    });

    // Sort: primary by selected, tiebreak by RS, then volRatio
    filtered.sort((a, b) => {
      const va = a[sortBy] ?? 0;
      const vb = b[sortBy] ?? 0;
      if (vb !== va) return vb - va;
      if (b.rsScore !== a.rsScore) return b.rsScore - a.rsScore;
      return b.volRatio - a.volRatio;
    });

    return filtered;
  };

  const applyFilter = () => {
    const data = getFilteredResults();
    renderCards(data);
    const matchEl = document.getElementById('bk_match_count');
    if (matchEl) matchEl.textContent = `${data.length} results`;
  };

  const updateHeroStats = () => {
    const qualifying = _scanResults.filter(r => r.category !== 'Ignore');
    const kings = _scanResults.filter(r => r.category === 'Breakout King').length;
    const strong = _scanResults.filter(r => r.category === 'Strong').length;
    const watchlist = _scanResults.filter(r => r.category === 'Watchlist').length;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('bk_total_candidates', qualifying.length);
    el('bk_kings_count', kings);
    el('bk_strong_count', strong);
    el('bk_watchlist_count', watchlist);

    // Market status
    const statusEl = document.getElementById('bk_market_status');
    if (statusEl) {
      const open = typeof window.isMarketOpenForSymbol === 'function' ? window.isMarketOpenForSymbol('RELIANCE.NS') : false;
      statusEl.textContent = open ? 'Open' : 'Closed';
      statusEl.className = 'bk-meta-value ' + (open ? 'positive' : 'negative');
    }

    // Hero subtitle
    const subtitleEl = document.getElementById('bk_hero_subtitle');
    if (subtitleEl && qualifying.length > 0) {
      subtitleEl.textContent = `${qualifying.length} Stocks near 52W High with Volume Breakout`;
    }
  };

  const updateCategoryCards = () => {
    const orb = _scanResults.filter(r => r.isORB && r.category !== 'Ignore').length;
    const rs = _scanResults.filter(r => r.isHighRS && r.category !== 'Ignore').length;
    const gap = _scanResults.filter(r => r.isGapUp && r.category !== 'Ignore').length;
    const inside = _scanResults.filter(r => r.isInsideBar && r.category !== 'Ignore').length;

    const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    el('bk_orb_count', orb);
    el('bk_rs_count', rs);
    el('bk_gap_count', gap);
    el('bk_inside_count', inside);
  };

  // ── CARD RENDERING ──
  const renderCards = (data) => {
    const grid = document.getElementById('bk_stock_grid');
    if (!grid) return;

    if (data.length === 0) {
      grid.innerHTML = `<div class="bk-empty-state" id="bk_empty_state">
        <i class="bk-empty-icon ri-search-eye-line"></i>
        <p>No breakout candidates match your criteria. Adjust filters or deploy a new scan.</p>
      </div>`;
      return;
    }

    grid.innerHTML = data.map(r => {
      const displaySym = r.symbol.replace('.NS', '').replace('.BO', '');
      const positive = r.changePct >= 0;
      const changeClass = positive ? 'positive' : 'negative';
      const changeIcon = positive ? '▲' : '▼';
      const changeSign = positive ? '+' : '';

      // Card variant class
      let cardClass = 'watchlist-card';
      let badgeClass = 'watchlist';
      let barClass = 'watchlist-bar';
      let numClass = 'watchlist-num';
      let badgeText = 'WATCHLIST';
      if (r.category === 'Breakout King') {
        cardClass = 'king-card'; badgeClass = 'king'; barClass = 'king-bar'; numClass = 'king-num'; badgeText = '👑 BREAKOUT KING';
      } else if (r.category === 'Strong') {
        cardClass = 'strong-card'; badgeClass = 'strong'; barClass = 'strong-bar'; numClass = 'strong-num'; badgeText = 'STRONG';
      }

      const volFormatted = formatVolume(r.volume);
      const sparkId = `spark_${displaySym.replace(/[^a-zA-Z0-9]/g, '_')}`;

      return `<div class="bk-stock-card ${cardClass}" data-symbol="${escHtml(r.symbol)}">
        <div class="bk-card-header">
          <div class="bk-card-identity">
            <span class="bk-card-symbol">${escHtml(displaySym)}</span>
            <span class="bk-card-name">${escHtml(displaySym)}</span>
            <span class="bk-card-exchange">${r.exchange}</span>
          </div>
          <span class="bk-strength-badge ${badgeClass}">${badgeText}</span>
        </div>

        <div class="bk-card-price-row">
          <span class="bk-card-price">₹${r.price.toFixed(2)}</span>
          <span class="bk-card-change ${changeClass}">${changeIcon} ${changeSign}${r.changePct.toFixed(2)}%</span>
        </div>

        <div class="bk-card-score-row">
          <span class="bk-card-score-label">Score</span>
          <div class="bk-card-score-bar-wrap">
            <div class="bk-card-score-bar ${barClass}" style="width:${r.score}%;"></div>
          </div>
          <span class="bk-card-score-num ${numClass}">${r.score}</span>
        </div>

        <canvas class="bk-card-sparkline" id="${sparkId}" width="340" height="36"></canvas>

        <div class="bk-card-metrics">
          <div class="bk-card-metric">
            <span class="bk-card-metric-label">Volume</span>
            <span class="bk-card-metric-value">${volFormatted}</span>
          </div>
          <div class="bk-card-metric">
            <span class="bk-card-metric-label">Day High</span>
            <span class="bk-card-metric-value">₹${r.high.toFixed(2)}</span>
          </div>
          <div class="bk-card-metric">
            <span class="bk-card-metric-label">Day Low</span>
            <span class="bk-card-metric-value">₹${r.low.toFixed(2)}</span>
          </div>
        </div>

        <div class="bk-card-insight">
          <i>💡</i> ${escHtml(r.reason)}
        </div>
      </div>`;
    }).join('');

    // Draw sparklines after DOM is rendered
    requestAnimationFrame(() => {
      data.forEach(r => {
        const displaySym = r.symbol.replace('.NS', '').replace('.BO', '');
        const sparkId = `spark_${displaySym.replace(/[^a-zA-Z0-9]/g, '_')}`;
        const canvas = document.getElementById(sparkId);
        if (canvas && r.sparkline && r.sparkline.length > 1) {
          drawSparkline(canvas, r.sparkline, r.changePct >= 0);
        }
      });
    });

    // Click-to-open modal
    grid.querySelectorAll('.bk-stock-card[data-symbol]').forEach(card => {
      card.addEventListener('click', () => {
        if (window.AppState && typeof window.AppState.openStockModal === 'function') {
          window.AppState.openStockModal(card.dataset.symbol);
        }
      });
    });
  };

  // ── SPARKLINE DRAWER ──
  const drawSparkline = (canvas, data, isPositive) => {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;

    const points = data.map((v, i) => ({
      x: padding + (i / (data.length - 1)) * (w - 2 * padding),
      y: padding + (1 - (v - min) / range) * (h - 2 * padding)
    }));

    // Fill gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    if (isPositive) {
      gradient.addColorStop(0, 'rgba(0, 217, 126, 0.15)');
      gradient.addColorStop(1, 'rgba(0, 217, 126, 0.0)');
    } else {
      gradient.addColorStop(0, 'rgba(255, 71, 87, 0.15)');
      gradient.addColorStop(1, 'rgba(255, 71, 87, 0.0)');
    }

    ctx.beginPath();
    ctx.moveTo(points[0].x, h);
    points.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1].x, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = isPositive ? '#00d97e' : '#ff4757';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Dot on last point
    const last = points[points.length - 1];
    ctx.beginPath();
    ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = isPositive ? '#00d97e' : '#ff4757';
    ctx.fill();
  };

  // ── HELPERS ──
  const formatVolume = (vol) => {
    if (vol >= 10000000) return (vol / 10000000).toFixed(1) + ' Cr';
    if (vol >= 100000) return (vol / 100000).toFixed(1) + ' L';
    if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
    return vol.toString();
  };

  const escHtml = (str) => {
    if (typeof FMT !== 'undefined' && FMT.escHtml) return FMT.escHtml(str);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  };

  const getStats = () => ({
    total: _scanResults.filter(r => r.category !== 'Ignore').length,
    kings: _scanResults.filter(r => r.category === 'Breakout King').length,
    strong: _scanResults.filter(r => r.category === 'Strong').length,
    watchlist: _scanResults.filter(r => r.category === 'Watchlist').length
  });

  return {
    init,
    updateResults,
    applyFilter,
    getStats,
    getFilteredResults
  };

})();
