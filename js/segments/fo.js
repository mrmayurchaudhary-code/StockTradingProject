'use strict';

/* ============================================================
   SAMADHAN TRADING — F&O SEGMENT MODULE
   Futures & Options: Option Chain, PCR, Index Metrics
   ============================================================ */

const FO = (() => {

  const INDICES = {
    NIFTY:     { symbol: '^NSEI',    spot: 24800, lotSize: 50 },
    BANKNIFTY: { symbol: '^NSEBANK', spot: 53200, lotSize: 15 },
    FINNIFTY:  { symbol: 'NIFTY_FIN_SERVICE.NS', spot: 21400, lotSize: 40 },
  };

  let _selectedIndex = 'NIFTY';
  let _selectedType  = 'options';
  let _atmStrike = 0;
  let _spotPrice = 0;

  // Generate upcoming Thursdays (expiry dates)
  const getExpiries = () => {
    const dates = [];
    let d = new Date();
    for (let i = 0; i < 28; i++) {
      d = new Date(d.getTime() + 86400000);
      if (d.getDay() === 4) { // Thursday
        dates.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
        if (dates.length >= 5) break;
      }
    }
    return dates;
  };

  // Generate realistic option chain
  const generateOptionChain = (spot, strikeDiff) => {
    const atm = Math.round(spot / strikeDiff) * strikeDiff;
    const strikes = [];
    for (let i = -7; i <= 7; i++) {
      strikes.push(atm + i * strikeDiff);
    }

    const daysToExpiry = 7 + Math.floor(Math.random() * 14);
    const r = 0.065; // risk-free rate
    const sigma = 0.15 + Math.random() * 0.08; // implied vol

    return strikes.map(K => {
      const d1Val = (Math.log(spot / K) + (r + 0.5 * sigma ** 2) * (daysToExpiry / 365)) / (sigma * Math.sqrt(daysToExpiry / 365));
      const d2Val = d1Val - sigma * Math.sqrt(daysToExpiry / 365);
      const N = (x) => 0.5 * (1 + erf(x / Math.SQRT2));
      const callPremium = Math.max(0.01, spot * N(d1Val) - K * Math.exp(-r * daysToExpiry / 365) * N(d2Val));
      const putPremium  = Math.max(0.01, K * Math.exp(-r * daysToExpiry / 365) * N(-d2Val) - spot * N(-d1Val));
      const intrinsic = Math.max(0, spot - K);
      const isATM = K === atm;

      const callOI  = Math.floor((isATM ? 2 : 1) * (Math.random() * 3000000 + 500000));
      const putOI   = Math.floor((isATM ? 2 : 1) * (Math.random() * 3000000 + 500000));
      const callChg = (Math.random() - 0.5) * 20;
      const putChg  = (Math.random() - 0.5) * 20;

      return {
        strike: K,
        isATM,
        call: { ltp: +callPremium.toFixed(2), oi: callOI, chgPct: +callChg.toFixed(2) },
        put:  { ltp: +putPremium.toFixed(2),  oi: putOI,  chgPct: +putChg.toFixed(2) },
      };
    });
  };

  // Error function approximation
  const erf = (x) => {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const p = 0.254829592 * t - 0.284496736 * t**2 + 1.421413741 * t**3 - 1.453152027 * t**4 + 1.061405429 * t**5;
    return Math.sign(x) * (1 - p * Math.exp(-x * x));
  };

  const init = async () => {
    populateExpiries();
    setupControls();
    await loadFOData();
  };

  const populateExpiries = () => {
    const sel = document.getElementById('foExpiry');
    if (!sel) return;
    const expiries = getExpiries();
    sel.innerHTML = expiries.map((d, i) =>
      `<option value="${i}">${i === 0 ? 'Weekly: ' : ''}${d}</option>`
    ).join('');
  };

  const setupControls = () => {
    document.getElementById('foIndexBtnGroup')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-select');
      if (!btn) return;
      document.querySelectorAll('#foIndexBtnGroup .btn-select').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _selectedIndex = btn.dataset.value;
      await loadFOData();
    });

    document.querySelectorAll('.btn-select[data-value="options"], .btn-select[data-value="futures"]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-select[data-value="options"], .btn-select[data-value="futures"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        _selectedType = btn.dataset.value;
        renderOptionChain();
      });
    });
  };

  const loadFOData = async () => {
    const idx = INDICES[_selectedIndex];
    const quote = await API.getQuote(idx.symbol);
    _spotPrice = quote.price || idx.spot;
    _atmStrike = Math.round(_spotPrice / getStrikeDiff()) * getStrikeDiff();
    renderMetrics(quote);
    renderOptionChain();
  };

  const getStrikeDiff = () => {
    if (_selectedIndex === 'NIFTY')     return 50;
    if (_selectedIndex === 'BANKNIFTY') return 100;
    return 50;
  };

  const renderMetrics = (quote) => {
    const container = document.getElementById('foMetrics');
    if (!container) return;

    const positive = quote.changePct >= 0;
    container.innerHTML = `
      <div class="fo-metric">
        <div class="fo-metric-label">Spot</div>
        <div class="fo-metric-value" style="color:var(--accent-cyan)">${FMT.price(_spotPrice)}</div>
      </div>
      <div class="fo-metric">
        <div class="fo-metric-label">Change</div>
        <div class="fo-metric-value ${positive ? '' : 'negative'}">${FMT.pct(quote.changePct)}</div>
      </div>
      <div class="fo-metric">
        <div class="fo-metric-label">ATM Strike</div>
        <div class="fo-metric-value" style="color:var(--accent-gold)">${_atmStrike}</div>
      </div>
      <div class="fo-metric">
        <div class="fo-metric-label">Lot Size</div>
        <div class="fo-metric-value">${INDICES[_selectedIndex].lotSize}</div>
      </div>`;
  };

  const renderOptionChain = () => {
    const strikeDiff = getStrikeDiff();
    const chain = generateOptionChain(_spotPrice, strikeDiff);

    // Calculate PCR
    const totalCallOI = chain.reduce((s, r) => s + r.call.oi, 0);
    const totalPutOI  = chain.reduce((s, r) => s + r.put.oi, 0);
    const pcr = (totalPutOI / totalCallOI).toFixed(2);
    const pcrEl = document.getElementById('pcrValue');
    if (pcrEl) {
      pcrEl.textContent = pcr;
      pcrEl.className = `pcr-value ${parseFloat(pcr) >= 1 ? 'bullish' : 'bearish'}`;
    }

    const tbody = document.getElementById('optionChainBody');
    if (!tbody) return;

    tbody.innerHTML = chain.map(row => {
      const callChgClass = row.call.chgPct >= 0 ? 'positive' : 'negative';
      const putChgClass  = row.put.chgPct >= 0  ? 'positive' : 'negative';
      return `<tr class="${row.isATM ? 'atm' : ''}">
        <td class="call-cell">${FMT.volume(row.call.oi)}</td>
        <td class="call-cell ${callChgClass}">${FMT.pct(row.call.chgPct)}</td>
        <td class="call-cell" style="font-weight:${row.isATM ? '700' : '400'}">₹${FMT.price(row.call.ltp)}</td>
        <td class="strike-cell" style="font-weight:700;color:${row.isATM ? 'var(--accent-cyan)' : 'var(--text-primary)'}">${row.strike}</td>
        <td class="put-cell" style="font-weight:${row.isATM ? '700' : '400'}">₹${FMT.price(row.put.ltp)}</td>
        <td class="put-cell ${putChgClass}">${FMT.pct(row.put.chgPct)}</td>
        <td class="put-cell">${FMT.volume(row.put.oi)}</td>
      </tr>`;
    }).join('');
  };

  const refresh = async () => { await loadFOData(); };

  return { init, refresh };
})();
