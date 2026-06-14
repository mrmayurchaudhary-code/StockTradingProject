'use strict';

/* ============================================================
   SAMADHAN TRADING — MUTUAL FUNDS SEGMENT MODULE
   Category browsing, fund cards, returns, risk ratings
   ============================================================ */

const MF = (() => {

  const CATEGORIES = ['All', 'Large Cap', 'Mid Cap', 'Small Cap', 'ELSS', 'Hybrid', 'Debt', 'Index', 'International'];

  const FUNDS = [
    { name: 'Mirae Asset Large Cap Fund', amc: 'Mirae Asset', cat: 'Large Cap', nav: 91.45, ret1y: 18.4, ret3y: 22.1, ret5y: 19.8, aum: '38,450', risk: 'High', code: 'MA' },
    { name: 'Parag Parikh Flexi Cap Fund', amc: 'PPFAS', cat: 'Large Cap', nav: 78.92, ret1y: 22.6, ret3y: 26.3, ret5y: 23.1, aum: '72,800', risk: 'High', code: 'PP' },
    { name: 'SBI Blue Chip Fund', amc: 'SBI MF', cat: 'Large Cap', nav: 68.14, ret1y: 16.2, ret3y: 20.4, ret5y: 18.5, aum: '41,200', risk: 'High', code: 'SB' },
    { name: 'Nippon India Mid Cap Fund', amc: 'Nippon India', cat: 'Mid Cap', nav: 312.80, ret1y: 32.5, ret3y: 29.8, ret5y: 26.4, aum: '28,600', risk: 'Very High', code: 'NI' },
    { name: 'HDFC Mid Cap Opportunities', amc: 'HDFC MF', cat: 'Mid Cap', nav: 145.62, ret1y: 28.4, ret3y: 27.6, ret5y: 25.2, aum: '62,400', risk: 'Very High', code: 'HM' },
    { name: 'Quant Small Cap Fund', amc: 'Quant MF', cat: 'Small Cap', nav: 218.45, ret1y: 45.2, ret3y: 38.6, ret5y: 33.8, aum: '22,100', risk: 'Very High', code: 'QS' },
    { name: 'SBI Small Cap Fund', amc: 'SBI MF', cat: 'Small Cap', nav: 168.90, ret1y: 38.1, ret3y: 32.4, ret5y: 29.6, aum: '30,800', risk: 'Very High', code: 'SS' },
    { name: 'Axis Long Term Equity (ELSS)', amc: 'Axis MF', cat: 'ELSS', nav: 78.35, ret1y: 19.2, ret3y: 22.8, ret5y: 21.4, aum: '34,500', risk: 'High', code: 'AE' },
    { name: 'Mirae Asset Tax Saver (ELSS)', amc: 'Mirae Asset', cat: 'ELSS', nav: 42.18, ret1y: 21.8, ret3y: 25.1, ret5y: 22.6, aum: '18,200', risk: 'High', code: 'ME' },
    { name: 'ICICI Pru Equity & Debt Hybrid', amc: 'ICICI Pru', cat: 'Hybrid', nav: 342.60, ret1y: 22.4, ret3y: 20.8, ret5y: 18.9, aum: '31,400', risk: 'Moderate', code: 'IH' },
    { name: 'HDFC Balanced Advantage Fund', amc: 'HDFC MF', cat: 'Hybrid', nav: 428.90, ret1y: 18.6, ret3y: 19.4, ret5y: 17.8, aum: '88,600', risk: 'Moderate', code: 'HB' },
    { name: 'SBI Magnum Gilt Fund', amc: 'SBI MF', cat: 'Debt', nav: 68.42, ret1y: 8.2, ret3y: 7.8, ret5y: 8.4, aum: '8,450', risk: 'Low', code: 'SG' },
    { name: 'HDFC Nifty 50 Index Fund', amc: 'HDFC MF', cat: 'Index', nav: 184.20, ret1y: 18.1, ret3y: 21.4, ret5y: 19.2, aum: '12,600', risk: 'High', code: 'HN' },
    { name: 'Motilal Nasdaq 100 FOF', amc: 'Motilal Oswal', cat: 'International', nav: 38.75, ret1y: 28.4, ret3y: 18.6, ret5y: 24.1, aum: '4,800', risk: 'Very High', code: 'MN' },
    { name: 'Nippon India Growth Fund', amc: 'Nippon India', cat: 'Mid Cap', nav: 2840.60, ret1y: 31.2, ret3y: 28.9, ret5y: 25.8, aum: '26,400', risk: 'Very High', code: 'NG' },
    { name: 'Axis Small Cap Fund', amc: 'Axis MF', cat: 'Small Cap', nav: 82.45, ret1y: 41.8, ret3y: 35.2, ret5y: 31.6, aum: '19,800', risk: 'Very High', code: 'AS' },
  ];

  const AMC_COLORS = {
    'Mirae Asset': '#00d4ff', 'PPFAS': '#7c3aed', 'SBI MF': '#3b82f6',
    'Nippon India': '#f59e0b', 'HDFC MF': '#00d97e', 'Quant MF': '#ff4757',
    'Axis MF': '#f97316', 'ICICI Pru': '#a78bfa', 'Motilal Oswal': '#34d399',
  };

  const RISK_COLORS = {
    'Low': '#00d97e', 'Moderate': '#f59e0b', 'High': '#ff9f43', 'Very High': '#ff4757',
  };

  let _currentCategory = 'All';

  const init = () => {
    renderCategories();
    renderFunds('All');
  };

  const renderCategories = () => {
    const container = document.getElementById('mfCategories');
    if (!container) return;
    container.innerHTML = CATEGORIES.map(c =>
      `<button class="mf-category-btn ${c === _currentCategory ? 'active' : ''}" data-cat="${FMT.escHtml(c)}" aria-pressed="${c === _currentCategory}">${FMT.escHtml(c)}</button>`
    ).join('');

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.mf-category-btn');
      if (!btn) return;
      container.querySelectorAll('.mf-category-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      _currentCategory = btn.dataset.cat;
      renderFunds(_currentCategory);
    });
  };

  const renderFunds = (category) => {
    const grid = document.getElementById('mfGrid');
    if (!grid) return;

    const filtered = category === 'All' ? FUNDS : FUNDS.filter(f => f.cat === category);

    grid.innerHTML = filtered.map(f => {
      const color = AMC_COLORS[f.amc] || '#00d4ff';
      const riskColor = RISK_COLORS[f.risk] || '#ff9f43';
      // Add slight random variation to returns for realism
      const r1y = (f.ret1y + (Math.random() - 0.5) * 2).toFixed(1);
      const r3y = (f.ret3y + (Math.random() - 0.5) * 1.5).toFixed(1);
      const r5y = (f.ret5y + (Math.random() - 0.5) * 1).toFixed(1);

      return `<div class="mf-card" role="article" aria-label="${FMT.escHtml(f.name)}">
        <div class="mf-card-top">
          <div class="mf-logo" style="background:${color}22;color:${color};">${FMT.escHtml(f.code)}</div>
          <div style="flex:1;min-width:0">
            <div class="mf-name">${FMT.escHtml(f.name)}</div>
            <div class="mf-category">${FMT.escHtml(f.amc)} · ${FMT.escHtml(f.cat)}</div>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <div>
            <div class="mf-nav">NAV: <strong>₹${FMT.price(f.nav)}</strong></div>
            <div class="mf-aum">AUM: ₹${FMT.escHtml(f.aum)} Cr</div>
          </div>
          <div class="mf-risk-badge">
            <span style="font-size:0.65rem;font-weight:700;padding:2px 8px;border-radius:20px;background:${riskColor}22;color:${riskColor};border:1px solid ${riskColor}44">${FMT.escHtml(f.risk)}</span>
          </div>
        </div>

        <div class="mf-returns">
          <div class="mf-return-item">
            <div class="mf-return-label">1Y Return</div>
            <div class="mf-return-val ${parseFloat(r1y) >= 0 ? 'positive' : 'negative'}">${r1y > 0 ? '+' : ''}${r1y}%</div>
          </div>
          <div class="mf-return-item">
            <div class="mf-return-label">3Y Return</div>
            <div class="mf-return-val ${parseFloat(r3y) >= 0 ? 'positive' : 'negative'}">${r3y > 0 ? '+' : ''}${r3y}%</div>
          </div>
          <div class="mf-return-item">
            <div class="mf-return-label">5Y Return</div>
            <div class="mf-return-val ${parseFloat(r5y) >= 0 ? 'positive' : 'negative'}">${r5y > 0 ? '+' : ''}${r5y}%</div>
          </div>
        </div>
      </div>`;
    }).join('');
  };

  const refresh = () => renderFunds(_currentCategory);

  return { init, refresh };
})();
