'use strict';

window.TestTab = window.TestTab || {};

window.TestTab.Indicators = (() => {

  // Exponential Moving Average (EMA)
  const calculateEMA = (data, period) => {
    if (data.length < period) return Array(data.length).fill(null);
    const ema = [];
    const k = 2 / (period + 1);
    
    // Simple Moving Average for first period
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i].close;
      ema.push(null);
    }
    
    let prevEma = sum / period;
    ema[period - 1] = prevEma;
    
    for (let i = period; i < data.length; i++) {
      const currentEma = data[i].close * k + prevEma * (1 - k);
      ema.push(currentEma);
      prevEma = currentEma;
    }
    return ema;
  };

  // Volume Weighted Average Price (VWAP)
  const calculateVWAP = (data) => {
    let cumulativeTypicalPriceVolume = 0;
    let cumulativeVolume = 0;
    const vwap = [];
    
    for (let i = 0; i < data.length; i++) {
      const c = data[i];
      const typicalPrice = (c.high + c.low + c.close) / 3;
      cumulativeTypicalPriceVolume += typicalPrice * (c.volume || 1);
      cumulativeVolume += (c.volume || 1);
      vwap.push(cumulativeTypicalPriceVolume / cumulativeVolume);
    }
    return vwap;
  };

  // Average True Range (ATR)
  const calculateATR = (data, period = 14) => {
    if (data.length < 2) return Array(data.length).fill(0);
    const tr = [data[0].high - data[0].low];
    
    for (let i = 1; i < data.length; i++) {
      const h = data[i].high;
      const l = data[i].low;
      const pc = data[i - 1].close;
      tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    
    if (tr.length < period) return Array(data.length).fill(0);
    
    // SMA of TR for first ATR value
    const atr = Array(period - 1).fill(null);
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += tr[i];
    }
    
    let prevAtr = sum / period;
    atr.push(prevAtr);
    
    for (let i = period; i < data.length; i++) {
      const currentAtr = (prevAtr * (period - 1) + tr[i]) / period;
      atr.push(currentAtr);
      prevAtr = currentAtr;
    }
    return atr;
  };

  // SuperTrend
  const calculateSuperTrend = (data, period = 10, multiplier = 3) => {
    const atr = calculateATR(data, period);
    const supertrend = [];
    const direction = []; // 1 for bull, -1 for bear
    
    let prevUpperBand = 0;
    let prevLowerBand = 0;
    let prevSuperTrend = 0;
    let prevDir = 1;

    for (let i = 0; i < data.length; i++) {
      if (i < period || atr[i] === null) {
        supertrend.push(null);
        direction.push(1);
        continue;
      }
      
      const c = data[i];
      const typicalPrice = (c.high + c.low) / 2;
      
      let basicUpperBand = typicalPrice + multiplier * atr[i];
      let basicLowerBand = typicalPrice - multiplier * atr[i];
      
      let upperBand = (basicUpperBand < prevUpperBand || data[i - 1].close > prevUpperBand)
        ? basicUpperBand
        : prevUpperBand;
        
      let lowerBand = (basicLowerBand > prevLowerBand || data[i - 1].close < prevLowerBand)
        ? basicLowerBand
        : prevLowerBand;
        
      let dir = prevDir;
      let trendVal = 0;
      
      if (prevSuperTrend === prevUpperBand) {
        dir = c.close > upperBand ? 1 : -1;
      } else {
        dir = c.close < lowerBand ? -1 : 1;
      }
      
      if (dir === 1) {
        trendVal = lowerBand;
      } else {
        trendVal = upperBand;
      }
      
      supertrend.push(trendVal);
      direction.push(dir);
      
      prevUpperBand = upperBand;
      prevLowerBand = lowerBand;
      prevSuperTrend = trendVal;
      prevDir = dir;
    }
    
    return { supertrend, direction };
  };

  // Relative Strength Index (RSI)
  const calculateRSI = (data, period = 14) => {
    if (data.length < period + 1) return Array(data.length).fill(null);
    const rsi = Array(period).fill(null);
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const diff = data[i].close - data[i - 1].close;
      if (diff > 0) gains += diff;
      else losses -= diff;
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    
    let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
    
    for (let i = period + 1; i < data.length; i++) {
      const diff = data[i].close - data[i - 1].close;
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? -diff : 0;
      
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      
      rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
    return rsi;
  };

  // Moving Average Convergence Divergence (MACD)
  const calculateMACD = (data, fast = 12, slow = 26, signal = 9) => {
    const fastEma = calculateEMA(data, fast);
    const slowEma = calculateEMA(data, slow);
    
    const macdLine = [];
    for (let i = 0; i < data.length; i++) {
      if (fastEma[i] === null || slowEma[i] === null) {
        macdLine.push(null);
      } else {
        macdLine.push(fastEma[i] - slowEma[i]);
      }
    }
    
    // Create dummy objects to run calculateEMA on the macdLine
    const macdObjects = macdLine.map(v => ({ close: v || 0 }));
    const signalLine = calculateEMA(macdObjects, signal);
    
    // Fix nulls
    for (let i = 0; i < data.length; i++) {
      if (macdLine[i] === null) signalLine[i] = null;
    }
    
    const histogram = macdLine.map((m, idx) => (m === null || signalLine[idx] === null) ? null : m - signalLine[idx]);
    
    return { macdLine, signalLine, histogram };
  };

  // Average Directional Index (ADX)
  const calculateADX = (data, period = 14) => {
    if (data.length < period * 2) return { adx: Array(data.length).fill(null), plusDI: [], minusDI: [] };
    
    const adx = Array(period * 2 - 1).fill(null);
    const plusDI = Array(period).fill(null);
    const minusDI = Array(period).fill(null);
    
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
    
    // Smooth DM and TR
    let smoothedTR = 0;
    let smoothedDMPlus = 0;
    let smoothedDMMinus = 0;
    
    for (let i = 0; i < period; i++) {
      smoothedTR += tr[i];
      smoothedDMPlus += dmPlus[i];
      smoothedDMMinus += dmMinus[i];
    }
    
    plusDI.push((smoothedDMPlus / smoothedTR) * 100);
    minusDI.push((smoothedDMMinus / smoothedTR) * 100);
    
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
      plusDI.push(pDi);
      minusDI.push(mDi);
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
    return {
      adx: padding.concat(adx),
      plusDI: Array(data.length - plusDI.length).fill(null).concat(plusDI),
      minusDI: Array(data.length - minusDI.length).fill(null).concat(minusDI)
    };
  };

  // On Balance Volume (OBV)
  const calculateOBV = (data) => {
    if (!data.length) return [];
    const obv = [data[0].volume || 0];
    
    for (let i = 1; i < data.length; i++) {
      const prevObv = obv[i - 1];
      const vol = data[i].volume || 0;
      if (data[i].close > data[i - 1].close) {
        obv.push(prevObv + vol);
      } else if (data[i].close < data[i - 1].close) {
        obv.push(prevObv - vol);
      } else {
        obv.push(prevObv);
      }
    }
    return obv;
  };

  // Volume Profile (Fixed-Range)
  const calculateVolumeProfile = (data, bins = 15) => {
    if (!data.length) return [];
    const closes = data.map(d => d.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min;
    const step = range / bins;
    
    const profile = Array(bins).fill(0).map((_, i) => ({
      priceLower: min + i * step,
      priceUpper: min + (i + 1) * step,
      volume: 0,
      buyVolume: 0,
      sellVolume: 0,
    }));
    
    data.forEach(d => {
      const p = d.close;
      const binIdx = Math.min(bins - 1, Math.floor((p - min) / (step || 1)));
      if (binIdx >= 0 && binIdx < bins) {
        profile[binIdx].volume += d.volume || 0;
        if (d.close >= d.open) {
          profile[binIdx].buyVolume += d.volume || 0;
        } else {
          profile[binIdx].sellVolume += d.volume || 0;
        }
      }
    });
    return profile;
  };

  // Pivot Points Support and Resistance (Standard Daily Pivot)
  const calculatePivotPoints = (quote) => {
    if (!quote || !quote.high || !quote.low || !quote.price) {
      return { pivot: 0, r1: 0, r2: 0, s1: 0, s2: 0 };
    }
    const h = quote.high;
    const l = quote.low;
    const c = quote.price;
    
    const pivot = (h + l + c) / 3;
    const r1 = 2 * pivot - l;
    const s1 = 2 * pivot - h;
    const r2 = pivot + (h - l);
    const s2 = pivot - (h - l);
    
    return { pivot, r1, r2, s1, s2 };
  };

  return {
    calculateEMA,
    calculateVWAP,
    calculateATR,
    calculateSuperTrend,
    calculateRSI,
    calculateMACD,
    calculateADX,
    calculateOBV,
    calculateVolumeProfile,
    calculatePivotPoints,
  };
})();
