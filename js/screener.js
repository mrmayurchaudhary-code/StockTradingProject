'use strict';

/* ============================================================
   SAMADHAN TRADING — SCREENER MODULE
   Filter stocks across NSE/BSE/ETF by cap, P/E, change%, etc.
   ============================================================ */

const Screener = (() => {

  // ── SCREENER UNIVERSE ──
  const UNIVERSE = [
    // Large Cap NSE
    { symbol: 'RELIANCE.NS',   name: 'Reliance Industries',    price: 2920, changePct: 1.2,  volume: 4200000, pe: 28.4, marketCap: 1980000, segment: 'nse' },
    { symbol: 'TCS.NS',        name: 'Tata Consultancy Svcs',  price: 4180, changePct: 0.8,  volume: 1800000, pe: 32.1, marketCap: 1520000, segment: 'nse' },
    { symbol: 'HDFCBANK.NS',   name: 'HDFC Bank',              price: 1750, changePct: -0.3, volume: 3100000, pe: 19.2, marketCap: 1330000, segment: 'nse' },
    { symbol: 'INFY.NS',       name: 'Infosys Ltd',            price: 1892, changePct: 1.5,  volume: 2900000, pe: 29.5, marketCap: 790000,  segment: 'nse' },
    { symbol: 'ICICIBANK.NS',  name: 'ICICI Bank',             price: 1298, changePct: 0.6,  volume: 3800000, pe: 18.6, marketCap: 916000,  segment: 'nse' },
    { symbol: 'KOTAKBANK.NS',  name: 'Kotak Mahindra Bank',    price: 1940, changePct: -0.9, volume: 1200000, pe: 22.1, marketCap: 386000,  segment: 'nse' },
    { symbol: 'HINDUNILVR.NS', name: 'HUL',                    price: 2480, changePct: 0.4,  volume: 900000,  pe: 56.2, marketCap: 581000,  segment: 'nse' },
    { symbol: 'SBIN.NS',       name: 'State Bank of India',    price: 815,  changePct: 2.1,  volume: 8500000, pe: 12.3, marketCap: 728000,  segment: 'nse' },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel',          price: 1680, changePct: 1.8,  volume: 2600000, pe: 78.4, marketCap: 994000,  segment: 'nse' },
    { symbol: 'ITC.NS',        name: 'ITC Limited',            price: 466,  changePct: -0.6, volume: 6200000, pe: 27.8, marketCap: 583000,  segment: 'nse' },
    { symbol: 'LT.NS',         name: 'Larsen & Toubro',        price: 3580, changePct: 2.4,  volume: 1500000, pe: 33.6, marketCap: 492000,  segment: 'nse' },
    { symbol: 'AXISBANK.NS',   name: 'Axis Bank',              price: 1158, changePct: 0.2,  volume: 3400000, pe: 16.9, marketCap: 357000,  segment: 'nse' },
    { symbol: 'ASIANPAINT.NS', name: 'Asian Paints',           price: 2780, changePct: -1.2, volume: 700000,  pe: 62.3, marketCap: 266000,  segment: 'nse' },
    { symbol: 'WIPRO.NS',      name: 'Wipro Ltd',              price: 518,  changePct: 0.9,  volume: 2800000, pe: 25.4, marketCap: 270000,  segment: 'nse' },
    { symbol: 'HCLTECH.NS',    name: 'HCL Technologies',       price: 1820, changePct: 1.3,  volume: 1700000, pe: 30.2, marketCap: 494000,  segment: 'nse' },
    { symbol: 'ULTRACEMCO.NS', name: 'UltraTech Cement',       price: 10580,changePct: 0.7,  volume: 180000,  pe: 41.7, marketCap: 305000,  segment: 'nse' },
    { symbol: 'BAJFINANCE.NS', name: 'Bajaj Finance',          price: 6950, changePct: -0.8, volume: 420000,  pe: 35.8, marketCap: 419000,  segment: 'nse' },
    { symbol: 'MARUTI.NS',     name: 'Maruti Suzuki',          price: 11200,changePct: 1.1,  volume: 280000,  pe: 25.6, marketCap: 337000,  segment: 'nse' },
    { symbol: 'SUNPHARMA.NS',  name: 'Sun Pharmaceutical',     price: 1698, changePct: 0.5,  volume: 1600000, pe: 37.9, marketCap: 407000,  segment: 'nse' },
    { symbol: 'TITAN.NS',      name: 'Titan Company',          price: 3410, changePct: -0.4, volume: 580000,  pe: 92.4, marketCap: 303000,  segment: 'nse' },
    // Mid Cap
    { symbol: 'ADANIENT.NS',   name: 'Adani Enterprises',      price: 2680, changePct: 3.2,  volume: 1100000, pe: 55.1, marketCap: 306000,  segment: 'nse' },
    { symbol: 'DRREDDY.NS',    name: "Dr Reddy's Lab",         price: 5780, changePct: -1.8, volume: 380000,  pe: 18.7, marketCap: 97000,   segment: 'nse' },
    { symbol: 'TECHM.NS',      name: 'Tech Mahindra',          price: 1420, changePct: 2.6,  volume: 1800000, pe: 28.9, marketCap: 137000,  segment: 'nse' },
    { symbol: 'NESTLEIND.NS',  name: 'Nestle India',           price: 2450, changePct: 0.3,  volume: 160000,  pe: 85.3, marketCap: 236000,  segment: 'nse' },
    { symbol: 'POWERGRID.NS',  name: 'Power Grid Corp',        price: 327,  changePct: 1.4,  volume: 3900000, pe: 18.4, marketCap: 227000,  segment: 'nse' },
    { symbol: 'NTPC.NS',       name: 'NTPC Ltd',               price: 378,  changePct: 0.9,  volume: 4200000, pe: 18.9, marketCap: 368000,  segment: 'nse' },
    { symbol: 'ONGC.NS',       name: 'ONGC Ltd',               price: 295,  changePct: -2.1, volume: 5800000, pe: 9.2,  marketCap: 371000,  segment: 'nse' },
    { symbol: 'COALINDIA.NS',  name: 'Coal India',             price: 478,  changePct: 1.7,  volume: 2100000, pe: 7.8,  marketCap: 295000,  segment: 'nse' },
    { symbol: 'JSWSTEEL.NS',   name: 'JSW Steel',              price: 1020, changePct: 3.5,  volume: 1800000, pe: 22.1, marketCap: 252000,  segment: 'nse' },
    { symbol: 'GRASIM.NS',     name: 'Grasim Industries',      price: 2680, changePct: -0.3, volume: 520000,  pe: 24.6, marketCap: 177000,  segment: 'nse' },
    // ETFs
    { symbol: 'NIFTYBEES.NS',  name: 'Nifty BeES ETF',         price: 248,  changePct: 0.7,  volume: 2800000, pe: null, marketCap: null, segment: 'etf' },
    { symbol: 'GOLDBEES.NS',   name: 'Gold BeES ETF',          price: 58.5, changePct: 1.2,  volume: 1200000, pe: null, marketCap: null, segment: 'etf' },
    { symbol: 'BANKBEES.NS',   name: 'Bank BeES ETF',          price: 498,  changePct: -0.4, volume: 980000,  pe: null, marketCap: null, segment: 'etf' },
    { symbol: 'JUNIORBEES.NS', name: 'Junior BeES ETF',        price: 88.4, changePct: 1.1,  volume: 450000,  pe: null, marketCap: null, segment: 'etf' },
    // BSE
    { symbol: 'RELIANCE.BO',   name: 'Reliance Industries BSE',price: 2921, changePct: 1.1,  volume: 280000,  pe: 28.4, marketCap: 1980000, segment: 'bse' },
    { symbol: 'TCS.BO',        name: 'TCS BSE',                price: 4182, changePct: 0.7,  volume: 120000,  pe: 32.1, marketCap: 1520000, segment: 'bse' },
    { symbol: 'HDFCBANK.BO',   name: 'HDFC Bank BSE',          price: 1749, changePct: -0.4, volume: 180000,  pe: 19.2, marketCap: 1330000, segment: 'bse' },
  ];

  let _results = [];
  let _sortCol = 'changePct';
  let _sortAsc = false;

  // ── INIT ──
  const init = () => {
    document.getElementById('runScreener')?.addEventListener('click', runScreener);
    document.getElementById('resetFilters')?.addEventListener('click', resetFilters);
    document.getElementById('exportResults')?.addEventListener('click', exportResults);

    // Sort columns
    document.querySelector('#screenerTable thead')?.addEventListener('click', (e) => {
      const th = e.target.closest('th[data-sort]');
      if (!th) return;
      const col = th.dataset.sort;
      if (_sortCol === col) _sortAsc = !_sortAsc;
      else { _sortCol = col; _sortAsc = false; }
      renderResults();
    });
  };

  // ── RUN SCREENER ──
  const runScreener = () => {
    const segment  = document.getElementById('filterSegment')?.value || 'all';
    const cap      = document.getElementById('filterMarketCap')?.value || 'all';
    const peMin    = parseFloat(document.getElementById('filterPeMin')?.value) || null;
    const peMax    = parseFloat(document.getElementById('filterPeMax')?.value) || null;
    const w52      = document.getElementById('filter52w')?.value || 'all';
    const change   = document.getElementById('filterChange')?.value || 'all';

    let results = [...UNIVERSE];

    // Apply live price variation
    results = results.map(r => {
      const q = FALLBACK.getQuote(r.symbol);
      return {
        ...r,
        price: q.price || r.price,
        changePct: q.changePct || r.changePct,
        volume: q.volume || r.volume,
      };
    });

    // Segment filter
    if (segment !== 'all') results = results.filter(r => r.segment === segment);

    // Market cap filter
    if (cap !== 'all') {
      results = results.filter(r => {
        if (!r.marketCap) return cap === 'all';
        if (cap === 'large') return r.marketCap >= 20000;
        if (cap === 'mid')   return r.marketCap >= 5000 && r.marketCap < 20000;
        if (cap === 'small') return r.marketCap < 5000;
        return true;
      });
    }

    // P/E filter
    if (peMin !== null) results = results.filter(r => r.pe !== null && r.pe >= peMin);
    if (peMax !== null) results = results.filter(r => r.pe !== null && r.pe <= peMax);

    // Change filter
    if (change !== 'all') {
      results = results.filter(r => {
        if (change === 'top_gainers') return r.changePct > 3;
        if (change === 'top_losers')  return r.changePct < -3;
        if (change === 'positive')    return r.changePct >= 0;
        if (change === 'negative')    return r.changePct < 0;
        return true;
      });
    }

    _results = results;
    renderResults();

    const btn = document.getElementById('runScreener');
    if (btn) {
      btn.classList.add('loading');
      setTimeout(() => btn.classList.remove('loading'), 500);
    }

    AppState.toast(`Found ${results.length} stocks matching your criteria`, 'success');
  };

  // ── RENDER RESULTS ──
  const renderResults = () => {
    const tbody = document.getElementById('screenerBody');
    const countEl = document.getElementById('screenerCount');
    if (!tbody) return;

    let sorted = [..._results].sort((a, b) => {
      let va, vb;
      switch (_sortCol) {
        case 'price':     va = a.price;     vb = b.price; break;
        case 'change':    va = a.changePct;  vb = b.changePct; break;
        case 'volume':    va = a.volume;     vb = b.volume; break;
        case 'pe':        va = a.pe || 999;  vb = b.pe || 999; break;
        case 'marketCap': va = a.marketCap || 0; vb = b.marketCap || 0; break;
        default:          va = a.symbol;     vb = b.symbol;
      }
      if (typeof va === 'string') return _sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      return _sortAsc ? va - vb : vb - va;
    });

    if (countEl) countEl.textContent = `${sorted.length} stocks`;

    if (sorted.length === 0) {
      tbody.innerHTML = `<tr class="empty-row"><td colspan="7">
        <div class="empty-state"><i class="ri-search-line"></i><p>No stocks match your filters. Try adjusting the criteria.</p></div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = sorted.map(r => {
      const sym = r.symbol.replace('.NS', '').replace('.BO', '');
      const positive = r.changePct >= 0;
      const badgeClass = `badge-${r.segment}`;
      return `<tr data-symbol="${FMT.escHtml(r.symbol)}" style="cursor:pointer" role="row">
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="mono" style="font-weight:700;color:var(--accent-cyan)">${FMT.escHtml(sym)}</span>
          </div>
          <div style="font-size:0.68rem;color:var(--text-muted)">${FMT.escHtml(r.name)}</div>
        </td>
        <td class="mono" style="font-weight:700">₹${FMT.price(r.price)}</td>
        <td>
          <span class="change-pill ${positive ? 'positive' : 'negative'}">
            <i class="${FMT.changeIcon(r.changePct)}" style="font-size:0.65rem"></i>
            ${FMT.pct(r.changePct)}
          </span>
        </td>
        <td class="mono" style="color:var(--text-secondary)">${FMT.volume(r.volume)}</td>
        <td class="mono">${r.pe ? r.pe.toFixed(1) : '—'}</td>
        <td class="mono" style="color:var(--text-secondary)">${FMT.marketCap(r.marketCap ? r.marketCap * 1e7 : null)}</td>
        <td><span class="segment-badge ${badgeClass}">${r.segment.toUpperCase()}</span></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('tr[data-symbol]').forEach(row => {
      row.addEventListener('click', () => AppState.openStockModal(row.dataset.symbol));
    });
  };

  // ── RESET FILTERS ──
  const resetFilters = () => {
    ['filterSegment', 'filterMarketCap', 'filter52w', 'filterChange'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 'all';
    });
    ['filterPeMin', 'filterPeMax'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    _results = [];
    const tbody = document.getElementById('screenerBody');
    if (tbody) tbody.innerHTML = `<tr class="empty-row"><td colspan="7">
      <div class="empty-state"><i class="ri-filter-3-line"></i><p>Set filters and click "Run Screener" to see results</p></div>
    </td></tr>`;
    const countEl = document.getElementById('screenerCount');
    if (countEl) countEl.textContent = '0 stocks';
  };

  // ── EXPORT CSV ──
  const exportResults = () => {
    if (!_results.length) { AppState.toast('No results to export', 'warning'); return; }
    const headers = ['Symbol', 'Name', 'Price', 'Change%', 'Volume', 'P/E', 'Market Cap', 'Segment'];
    const rows = _results.map(r => [
      r.symbol.replace('.NS', ''),
      `"${r.name}"`,
      r.price,
      r.changePct.toFixed(2),
      r.volume,
      r.pe || '',
      r.marketCap || '',
      r.segment.toUpperCase(),
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'trading_screener.csv'; a.click();
    URL.revokeObjectURL(url);
    AppState.toast('Exported to CSV', 'success');
  };

  return { init };
})();
