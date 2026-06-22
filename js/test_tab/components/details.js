'use strict';

window.TestTab = window.TestTab || {};

window.TestTab.Details = (() => {

  const render = (state) => {
    const workspace = document.getElementById('testAssetWorkspace');
    const emptyState = document.getElementById('testEmptyState');
    
    if (!state.symbol || !state.quote) {
      if (workspace) workspace.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (workspace) workspace.style.display = 'block';

    const q = state.quote;
    const sym = state.symbol;
    const positive = q.changePct >= 0;
    const cleanSym = sym.replace('.NS', '').replace('.BO', '');

    // Title and Exchange
    const tickerEl = document.getElementById('testAssetTicker');
    if (tickerEl) tickerEl.textContent = cleanSym;

    const exchangeEl = document.getElementById('testAssetExchangeBadge');
    if (exchangeEl) {
      exchangeEl.textContent = q.exchange || 'NSE';
      exchangeEl.className = `segment-badge ${q.exchange === 'BSE' ? 'badge-bse' : (q.exchange === 'CRYPTO' || sym.endsWith('-USD') ? 'badge-crypto' : 'badge-nse')}`;
    }

    const nameEl = document.getElementById('testAssetName');
    if (nameEl) nameEl.textContent = q.name || cleanSym;

    // Price
    const ltpEl = document.getElementById('testAssetLtp');
    if (ltpEl) {
      const prefix = q.currency === 'USD' ? '$' : '₹';
      ltpEl.textContent = `${prefix}${FMT.price(q.price)}`;
      ltpEl.style.color = positive ? 'var(--color-positive)' : 'var(--color-negative)';
    }

    const changeEl = document.getElementById('testAssetChange');
    if (changeEl) {
      changeEl.className = positive ? 'positive' : 'negative';
      const prefix = q.currency === 'USD' ? '$' : '₹';
      changeEl.innerHTML = `<i class="${FMT.changeIcon(q.changePct)}"></i> ${q.change >= 0 ? '+' : ''}${prefix}${FMT.price(Math.abs(q.change))} (${FMT.pct(q.changePct)})`;
    }

    // Stats Grid
    const statsEl = document.getElementById('testAssetStats');
    if (statsEl) {
      const prefix = q.currency === 'USD' ? '$' : '₹';
      const stats = [
        { label: 'Open', value: `${prefix}${FMT.price(q.open)}` },
        { label: 'High', value: `${prefix}${FMT.price(q.high)}`, color: 'var(--color-positive)' },
        { label: 'Low', value: `${prefix}${FMT.price(q.low)}`, color: 'var(--color-negative)' },
        { label: 'Prev Close', value: `${prefix}${FMT.price(q.prevClose)}` },
        { label: 'Volume', value: FMT.volume(q.volume), color: 'var(--accent-gold)' },
        { label: '52W High', value: q.week52High ? `${prefix}${FMT.price(q.week52High)}` : '—', color: 'var(--color-positive)' },
        { label: '52W Low', value: q.week52Low ? `${prefix}${FMT.price(q.week52Low)}` : '—', color: 'var(--color-negative)' },
        { label: 'P/E Ratio', value: q.pe ? q.pe.toFixed(1) : '—' },
      ];

      statsEl.innerHTML = stats.map(s => `
        <div class="stat-item" style="display:flex; flex-direction:column; gap:4px; padding: 8px; border-radius: var(--radius-sm); background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-primary);">
          <div class="stat-label" style="font-size:0.65rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">${FMT.escHtml(s.label)}</div>
          <div class="stat-value" style="font-size:0.85rem; font-weight:700; font-family:var(--font-mono); ${s.color ? `color:${s.color}` : 'color:var(--text-primary)'}">${FMT.escHtml(s.value)}</div>
        </div>
      `).join('');
    }

    updateIndicatorValues(state);
  };

  const updateIndicatorValues = (state) => {
    const history = state.history;
    const q = state.quote;
    if (!history || !history.length) return;

    const ema20List = window.TestTab.Indicators.calculateEMA(history, 20);
    const ema50List = window.TestTab.Indicators.calculateEMA(history, 50);
    const ema200List = window.TestTab.Indicators.calculateEMA(history, 200);
    const vwapList = window.TestTab.Indicators.calculateVWAP(history);
    const { supertrend, direction } = window.TestTab.Indicators.calculateSuperTrend(history);
    const rsiList = window.TestTab.Indicators.calculateRSI(history);
    const macdData = window.TestTab.Indicators.calculateMACD(history);
    const adxData = window.TestTab.Indicators.calculateADX(history);
    const obvList = window.TestTab.Indicators.calculateOBV(history);
    const atrList = window.TestTab.Indicators.calculateATR(history);
    const pivots = window.TestTab.Indicators.calculatePivotPoints(q);

    const prefix = q.currency === 'USD' ? '$' : '₹';

    const lastEma20 = ema20List[ema20List.length - 1];
    const lastEma50 = ema50List[ema50List.length - 1];
    const lastEma200 = ema200List[ema200List.length - 1];
    
    const emaValEl = document.getElementById('testEmaValues');
    if (emaValEl) {
      emaValEl.innerHTML = `
        <span class="mono" style="font-size:0.75rem; color:var(--accent-cyan)">EMA20: ${lastEma20 ? prefix + FMT.price(lastEma20) : '—'}</span>
        <span class="mono" style="font-size:0.75rem; color:var(--accent-purple)">EMA50: ${lastEma50 ? prefix + FMT.price(lastEma50) : '—'}</span>
        <span class="mono" style="font-size:0.75rem; color:var(--accent-gold)">EMA200: ${lastEma200 ? prefix + FMT.price(lastEma200) : '—'}</span>
      `;
    }

    const lastVwap = vwapList[vwapList.length - 1];
    const vwapValEl = document.getElementById('testVwapValue');
    if (vwapValEl) {
      vwapValEl.textContent = lastVwap ? `${prefix}${FMT.price(lastVwap)}` : '—';
    }

    const lastSt = supertrend[supertrend.length - 1];
    const lastDir = direction[direction.length - 1];
    const stValEl = document.getElementById('testSuperTrendValue');
    if (stValEl) {
      stValEl.textContent = lastSt ? `${lastDir === 1 ? 'BULLISH' : 'BEARISH'} (${prefix}${FMT.price(lastSt)})` : '—';
      stValEl.style.color = lastDir === 1 ? 'var(--color-positive)' : 'var(--color-negative)';
      stValEl.style.borderColor = lastDir === 1 ? 'rgba(0, 217, 126, 0.2)' : 'rgba(255, 71, 87, 0.2)';
    }

    const lastRsi = rsiList[rsiList.length - 1];
    const rsiValEl = document.getElementById('testRsiValue');
    if (rsiValEl) {
      rsiValEl.textContent = lastRsi ? lastRsi.toFixed(2) : '—';
      if (lastRsi > 70) {
        rsiValEl.style.color = 'var(--color-negative)';
        rsiValEl.textContent += ' (Overbought)';
      } else if (lastRsi < 30) {
        rsiValEl.style.color = 'var(--color-positive)';
        rsiValEl.textContent += ' (Oversold)';
      } else {
        rsiValEl.style.color = 'var(--text-primary)';
      }
    }

    const lastMacd = macdData.macdLine[macdData.macdLine.length - 1];
    const lastSignal = macdData.signalLine[macdData.signalLine.length - 1];
    const macdValEl = document.getElementById('testMacdValue');
    if (macdValEl) {
      macdValEl.textContent = (lastMacd && lastSignal) ? `MACD: ${lastMacd.toFixed(2)} | Sig: ${lastSignal.toFixed(2)}` : '—';
      const histVal = lastMacd - lastSignal;
      macdValEl.style.color = histVal >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';
    }

    const lastAdx = adxData.adx[adxData.adx.length - 1];
    const adxValEl = document.getElementById('testAdxValue');
    if (adxValEl) {
      adxValEl.textContent = lastAdx ? `${lastAdx.toFixed(1)}` : '—';
      if (lastAdx > 25) {
        adxValEl.textContent += ' (Strong Trend)';
        adxValEl.style.color = 'var(--accent-purple)';
      } else {
        adxValEl.textContent += ' (Weak / No Trend)';
        adxValEl.style.color = 'var(--text-muted)';
      }
    }

    const lastObv = obvList[obvList.length - 1];
    const obvValEl = document.getElementById('testObvValue');
    if (obvValEl) {
      obvValEl.textContent = lastObv ? FMT.volume(lastObv) : '—';
    }

    const lastAtr = atrList[atrList.length - 1];
    const atrValEl = document.getElementById('testAtrValue');
    if (atrValEl) {
      atrValEl.textContent = lastAtr ? `${prefix}${FMT.price(lastAtr)}` : '—';
    }

    const srValEl = document.getElementById('testSrLevels');
    if (srValEl) {
      srValEl.innerHTML = `
        <span class="mono" style="font-size:0.7rem; color:var(--color-positive);">S1: ${prefix}${FMT.price(pivots.s1)} | S2: ${prefix}${FMT.price(pivots.s2)}</span>
        <span class="mono" style="font-size:0.7rem; color:var(--color-negative);">R1: ${prefix}${FMT.price(pivots.r1)} | R2: ${prefix}${FMT.price(pivots.r2)}</span>
      `;
    }

    const foMetricsEl = document.getElementById('testFoMetrics');
    const oiBuildUpEl = document.getElementById('testOiBuildUp');
    const isEquityOrIndex = q.exchange === 'NSE' && (sym.startsWith('^') || sym.endsWith('.NS'));

    if (isEquityOrIndex) {
      const pcr = 0.85 + Math.sin(Date.now() / 100000) * 0.2;
      const maxPain = Math.round(q.price / 100) * 100;
      
      if (foMetricsEl) {
        foMetricsEl.innerHTML = `
          <span class="mono" style="font-size:0.7rem;">PCR: ${pcr.toFixed(2)}</span>
          <span class="mono" style="font-size:0.7rem;">Max Pain: ₹${FMT.price(maxPain)}</span>
        `;
      }

      if (oiBuildUpEl) {
        const buildUpModes = ['Long Build-up', 'Short Build-up', 'Short Covering', 'Long Unwinding'];
        const idx = Math.floor(Math.sin(q.price) * 2 + 2) % 4;
        const mode = buildUpModes[idx];
        oiBuildUpEl.textContent = mode;
        if (mode.includes('Long') || mode.includes('Covering')) {
          oiBuildUpEl.style.color = 'var(--color-positive)';
          oiBuildUpEl.style.borderColor = 'rgba(0, 217, 126, 0.2)';
        } else {
          oiBuildUpEl.style.color = 'var(--color-negative)';
          oiBuildUpEl.style.borderColor = 'rgba(255, 71, 87, 0.2)';
        }
      }
    } else {
      if (foMetricsEl) {
        foMetricsEl.innerHTML = `<span style="font-size:0.7rem; color:var(--text-muted);">F&O Not Supported</span>`;
      }
      if (oiBuildUpEl) {
        oiBuildUpEl.textContent = 'N/A';
        oiBuildUpEl.style.color = 'var(--text-muted)';
        oiBuildUpEl.style.borderColor = 'var(--border-primary)';
      }
    }
  };

  return { render };
})();
