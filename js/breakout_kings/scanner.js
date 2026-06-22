'use strict';

/* ============================================================
   SAMADHAN TRADING — BREAKOUT KINGS SCANNER ENGINE
   Calculates indicators, outperformance, and scoring.
   ============================================================ */

window.BreakoutKingsScanner = (() => {

  // ── TECHNICAL PARAMETER FORMULAS ──
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
    let dmPlus = [];
    let dmMinus = [];
    let tr = [];

    for (let i = 1; i < data.length; i++) {
      const highDiff = data[i].high - data[i - 1].high;
      const lowDiff = data[i - 1].low - data[i].low;

      dmPlus.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
      dmMinus.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);

      const h = data[i].high;
      const l = data[i].low;
      const pc = data[i - 1].close;
      tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }

    let smoothedTR = 0;
    let smoothedDMPlus = 0;
    let smoothedDMMinus = 0;

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
    for (let i = 0; i < period; i++) {
      dxSum += dx[i];
    }

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

  // ── CORE STOCK FILTER & SCAN ──
  const scanStock = (symbol, history, niftyReturn60d) => {
    if (!history || history.length < 50) return null;

    const closes = history.map(h => h.close);
    const highs = history.map(h => h.high);
    const vols = history.map(h => h.volume);
    const lastIdx = history.length - 1;

    const close = closes[lastIdx];
    const volume = vols[lastIdx];
    const turnover = close * volume;

    // 1. Liquidity Filters (Price > ₹100, Volume > 500k, Turnover > ₹5 Cr)
    if (close <= 100) return null;
    if (volume <= 500000) return null;
    if (turnover <= 50000000) return null; // 5 Cr = 50,000,000

    // 2. Technical Computations
    const ema20Arr = calculateEMA(closes, 20);
    const ema50Arr = calculateEMA(closes, 50);
    const ema200Arr = calculateEMA(closes, 200);

    const ema20 = ema20Arr[lastIdx];
    const ema50 = ema50Arr[lastIdx];
    const ema200 = ema200Arr[lastIdx];

    // Previous 50-Day High (excluding today's candle)
    const prev50Highs = highs.slice(Math.max(0, lastIdx - 50), lastIdx);
    const high50d = prev50Highs.length > 0 ? Math.max(...prev50Highs) : close;

    // 52-Week High (including today's high)
    const yearHighs = highs.slice(Math.max(0, lastIdx - 250), lastIdx + 1);
    const high52w = yearHighs.length > 0 ? Math.max(...yearHighs) : close;

    // Volume Average 20
    const volSlice = vols.slice(Math.max(0, lastIdx - 20), lastIdx + 1);
    const avgVol20 = volSlice.reduce((a, b) => a + b, 0) / volSlice.length;
    const volRatio = avgVol20 > 0 ? volume / avgVol20 : 1;

    // RSI(14)
    const rsiArr = calculateRSI(closes, 14);
    const rsi = rsiArr[lastIdx];

    // ADX(14)
    const adxObj = calculateADX(history, 14);
    const adx = adxObj.adx[lastIdx];

    // Relative Strength vs Nifty (60-Day Return Outperformance)
    const close60d = closes[Math.max(0, lastIdx - 60)];
    const stockReturn60d = ((close - close60d) / (close60d || 1)) * 100;
    const rsScore = stockReturn60d - niftyReturn60d;

    // 3. Scoring Engine (100 Points Normalized)
    let rawScore = 0;
    const details = {
      breakout50d: close > high50d,
      volumeExpansion: volRatio > 2,
      relativeStrength: rsScore > 0,
      trendAlignment: ema20 && ema50 && ema200 && (close > ema20) && (ema20 > ema50) && (ema50 > ema200),
      rsiRange: rsi != null && rsi >= 60 && rsi <= 80,
      adxStrength: adx != null && adx > 25,
      near52wHigh: close >= 0.95 * high52w
    };

    if (details.breakout50d) rawScore += 30;
    if (details.volumeExpansion) rawScore += 20;
    if (details.relativeStrength) rawScore += 20;
    if (details.trendAlignment) rawScore += 15;
    if (details.rsiRange) rawScore += 5;
    if (details.adxStrength) rawScore += 10;
    if (details.near52wHigh) rawScore += 10;

    const normalizedScore = Math.round((rawScore / 110) * 100);

    // 4. Classification
    let category = 'Ignore';
    if (normalizedScore >= 85) category = 'Breakout King';
    else if (normalizedScore >= 70) category = 'Strong Breakout';
    else if (normalizedScore >= 55) category = 'Watchlist';

    return {
      symbol,
      price: close,
      high50d,
      high52w,
      volRatio,
      rsi,
      adx,
      rsScore,
      rawScore,
      score: normalizedScore,
      category,
      details,
      timestamp: Date.now()
    };
  };

  // ── GET NIFTY 60D RETURN BASELINE ──
  const fetchNiftyBaseline = async () => {
    try {
      const hist = await window.API.getHistory('^NSEI', '1y', '1d');
      if (hist && hist.length > 60) {
        const lastIdx = hist.length - 1;
        const closeToday = hist[lastIdx].close;
        const close60d = hist[lastIdx - 60].close;
        return ((closeToday - close60d) / close60d) * 100;
      }
      return 0; // fallback if Nifty data failed
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
