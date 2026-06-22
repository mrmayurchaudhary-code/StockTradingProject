'use strict';

/* ============================================================
   SAMADHAN TRADING — BREAKOUT KINGS SCANNER ENGINE v2
   Institutional-grade momentum filters, scoring, and insight.
   ============================================================ */

window.BreakoutKingsScanner = (() => {

  // ── TECHNICAL INDICATOR FORMULAS ──
  const calculateEMA = (data, period) => {
    const res = Array(data.length).fill(null);
    const k = 2 / (period + 1);
    let sum = 0, count = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] == null) continue;
      if (count < period) {
        sum += data[i];
        count++;
        if (count === period) res[i] = sum / period;
      } else {
        res[i] = data[i] * k + res[i - 1] * (1 - k);
      }
    }
    return res;
  };

  const calculateRSI = (data, period = 14) => {
    const res = Array(data.length).fill(null);
    if (data.length < period + 1) return res;
    let avgGain = 0, avgLoss = 0;
    for (let i = 1; i <= period; i++) {
      const diff = data[i] - data[i - 1];
      if (diff > 0) avgGain += diff; else avgLoss -= diff;
    }
    avgGain /= period;
    avgLoss /= period;
    res[period] = 100 - 100 / (1 + avgGain / (avgLoss || 0.0001));
    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i] - data[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      res[i] = 100 - 100 / (1 + avgGain / (avgLoss || 0.0001));
    }
    return res;
  };

  const calculateADX = (data, period = 14) => {
    if (data.length < period * 2) {
      return { adx: Array(data.length).fill(null) };
    }
    const adx = Array(period * 2 - 1).fill(null);
    let dmPlus = [], dmMinus = [], tr = [];
    for (let i = 1; i < data.length; i++) {
      const highDiff = data[i].high - data[i - 1].high;
      const lowDiff = data[i - 1].low - data[i].low;
      dmPlus.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      dmMinus.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
      const h = data[i].high, l = data[i].low, pc = data[i - 1].close;
      tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    let smoothedTR = 0, smoothedDMPlus = 0, smoothedDMMinus = 0;
    for (let i = 0; i < period; i++) {
      smoothedTR += tr[i];
      smoothedDMPlus += dmPlus[i];
      smoothedDMMinus += dmMinus[i];
    }
    const dx = [];
    let pDi = (smoothedDMPlus / smoothedTR) * 100;
    let mDi = (smoothedDMMinus / smoothedTR) * 100;
    dx.push(Math.abs(pDi - mDi) / (pDi + mDi === 0 ? 1 : pDi + mDi) * 100);
    for (let i = period; i < tr.length; i++) {
      smoothedTR = smoothedTR - (smoothedTR / period) + tr[i];
      smoothedDMPlus = smoothedDMPlus - (smoothedDMPlus / period) + dmPlus[i];
      smoothedDMMinus = smoothedDMMinus - (smoothedDMMinus / period) + dmMinus[i];
      pDi = (smoothedDMPlus / smoothedTR) * 100;
      mDi = (smoothedDMMinus / smoothedTR) * 100;
      dx.push(Math.abs(pDi - mDi) / (pDi + mDi === 0 ? 1 : pDi + mDi) * 100);
    }
    let dxSum = 0;
    for (let i = 0; i < period; i++) dxSum += dx[i];
    let prevAdx = dxSum / period;
    adx.push(prevAdx);
    for (let i = period; i < dx.length; i++) {
      const currentAdx = (prevAdx * (period - 1) + dx[i]) / period;
      adx.push(currentAdx);
      prevAdx = currentAdx;
    }
    const padding = Array(data.length - adx.length).fill(null);
    return { adx: padding.concat(adx) };
  };

  // ── CORE STOCK SCAN (returns full result object) ──
  const scanStock = (symbol, history, niftyReturn60d) => {
    if (!history || history.length < 50) return null;

    const closes = history.map(h => h.close);
    const highs = history.map(h => h.high);
    const lows = history.map(h => h.low);
    const opens = history.map(h => h.open);
    const vols = history.map(h => h.volume);
    const lastIdx = history.length - 1;

    const close = closes[lastIdx];
    const open = opens[lastIdx];
    const high = highs[lastIdx];
    const low = lows[lastIdx];
    const volume = vols[lastIdx];
    const prevClose = closes[lastIdx - 1] || close;
    const prevHigh = highs[lastIdx - 1] || high;
    const prevLow = lows[lastIdx - 1] || low;
    const turnover = close * volume;

    // 1. Liquidity Filter
    if (close <= 100) return null;
    if (volume <= 500000) return null;
    if (turnover <= 50000000) return null; // ₹5 Cr

    // 2. EMA Calculations
    const ema20Arr = calculateEMA(closes, 20);
    const ema50Arr = calculateEMA(closes, 50);
    const ema200Arr = calculateEMA(closes, 200);
    const ema20 = ema20Arr[lastIdx];
    const ema50 = ema50Arr[lastIdx];
    const ema200 = ema200Arr[lastIdx];

    // 3. 50-Day High (excluding today)
    const prev50Highs = highs.slice(Math.max(0, lastIdx - 50), lastIdx);
    const high50d = prev50Highs.length > 0 ? Math.max(...prev50Highs) : close;

    // 4. 52-Week High
    const yearHighs = highs.slice(Math.max(0, lastIdx - 250), lastIdx + 1);
    const high52w = yearHighs.length > 0 ? Math.max(...yearHighs) : close;

    // 5. Volume
    const volSlice = vols.slice(Math.max(0, lastIdx - 20), lastIdx);
    const avgVol20 = volSlice.length > 0 ? volSlice.reduce((a, b) => a + b, 0) / volSlice.length : volume;
    const volRatio = avgVol20 > 0 ? volume / avgVol20 : 1;

    // 6. RSI(14)
    const rsiArr = calculateRSI(closes, 14);
    const rsi = rsiArr[lastIdx];

    // 7. ADX(14)
    const adxObj = calculateADX(history, 14);
    const adx = adxObj.adx[lastIdx];

    // 8. Relative Strength vs Nifty (60D)
    const close60d = closes[Math.max(0, lastIdx - 60)];
    const stockReturn60d = ((close - close60d) / (close60d || 1)) * 100;
    const rsScore = stockReturn60d - niftyReturn60d;

    // 9. Change percent
    const changePct = prevClose > 0 ? ((close - prevClose) / prevClose) * 100 : 0;
    const change = close - prevClose;

    // ── CATEGORY-SPECIFIC SCANNERS ──
    const avgIntraDayVol = avgVol20; // approximation
    const isORB = volume > 1.5 * avgIntraDayVol && close > ema20;
    const isGapUp = open > prevClose * 1.02 && volume > avgVol20 && close > (ema20 || 0);
    const isInsideBar = high < prevHigh && low > prevLow;

    // RS category: 1M & 3M returns > Nifty
    const close20d = closes[Math.max(0, lastIdx - 20)] || close;
    const close60dv = closes[Math.max(0, lastIdx - 60)] || close;
    const return1m = ((close - close20d) / close20d) * 100;
    const return3m = ((close - close60dv) / close60dv) * 100;
    const isHighRS = rsScore > 10 && return1m > 0 && return3m > 0;

    // ── SCORING ENGINE (100 pts normalized) ──
    const details = {
      breakout50d: close > high50d,
      volumeExpansion: volRatio > 2,
      relativeStrength: rsScore > 0,
      trendAlignment: ema20 && ema50 && ema200 && (close > ema20) && (ema20 > ema50) && (ema50 > ema200),
      rsiRange: rsi != null && rsi >= 60 && rsi <= 80,
      adxStrength: adx != null && adx > 25,
      near52wHigh: close >= 0.95 * high52w
    };

    let rawScore = 0;
    if (details.breakout50d) rawScore += 30;
    if (details.volumeExpansion) rawScore += 20;
    if (details.relativeStrength) rawScore += 20;
    if (details.trendAlignment) rawScore += 15;
    if (details.adxStrength) rawScore += 10;
    if (details.rsiRange) rawScore += 5;
    // Bonus for near 52W high
    if (details.near52wHigh) rawScore += 10;

    const score = Math.round((rawScore / 110) * 100);

    // Category
    let category = 'Ignore';
    if (score >= 85) category = 'Breakout King';
    else if (score >= 70) category = 'Strong';
    else if (score >= 55) category = 'Watchlist';

    // ── AUTO-GENERATED INSIGHT ──
    const reason = generateInsight(details, volRatio, rsScore, score, close, high52w, rsi, adx);

    // Sparkline data (last 30 closes)
    const sparkline = closes.slice(Math.max(0, lastIdx - 29));

    return {
      symbol,
      price: close,
      open,
      high,
      low,
      prevClose,
      change: +change.toFixed(2),
      changePct: +changePct.toFixed(2),
      volume,
      high50d,
      high52w,
      volRatio,
      rsi,
      adx,
      rsScore,
      rawScore,
      score,
      category,
      details,
      reason,
      sparkline,
      isORB,
      isGapUp,
      isInsideBar,
      isHighRS,
      exchange: symbol.endsWith('.BO') ? 'BSE' : 'NSE',
      timestamp: Date.now()
    };
  };

  // ── INSIGHT GENERATOR ──
  const generateInsight = (details, volRatio, rsScore, score, close, high52w, rsi, adx) => {
    const reasons = [];

    if (details.breakout50d && details.volumeExpansion) {
      reasons.push(`50-day breakout with ${volRatio.toFixed(1)}x volume`);
    } else if (details.breakout50d) {
      reasons.push('Breaking above 50-day high');
    }

    if (details.near52wHigh) {
      const pctFrom52w = ((close / high52w) * 100).toFixed(1);
      reasons.push(`Near 52-week high (${pctFrom52w}%)`);
    }

    if (rsScore > 15) {
      reasons.push('Strong RS vs Nifty');
    } else if (rsScore > 5) {
      reasons.push('Outperforming Nifty');
    }

    if (volRatio > 3) {
      reasons.push('Institutional accumulation detected');
    } else if (volRatio > 2) {
      reasons.push('Volume expansion above 2x avg');
    }

    if (details.trendAlignment) {
      reasons.push('EMA stack aligned (20>50>200)');
    }

    if (adx != null && adx > 30) {
      reasons.push(`Strong trend (ADX ${adx.toFixed(0)})`);
    }

    if (rsi != null && rsi >= 60 && rsi <= 75) {
      reasons.push('Momentum sweet spot');
    }

    if (reasons.length === 0) {
      if (score >= 55) reasons.push('Multiple technical signals converging');
      else reasons.push('Monitoring for setup development');
    }

    return reasons.slice(0, 3).join('. ') + '.';
  };

  // ── NIFTY BASELINE ──
  const fetchNiftyBaseline = async () => {
    try {
      const hist = await window.API.getHistory('^NSEI', '1y', '1d');
      if (hist && hist.length > 60) {
        const lastIdx = hist.length - 1;
        const closeToday = hist[lastIdx].close;
        const close60d = hist[lastIdx - 60].close;
        return ((closeToday - close60d) / close60d) * 100;
      }
      return 0;
    } catch (e) {
      console.warn('[BreakoutKings] Failed to compute Nifty baseline:', e);
      return 0;
    }
  };

  return {
    scanStock,
    fetchNiftyBaseline,
    calculateEMA,
    calculateRSI,
    calculateADX
  };

})();
