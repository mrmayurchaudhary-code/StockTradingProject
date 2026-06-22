'use strict';

window.TestTab = window.TestTab || {};

window.TestTab.Charts = (() => {
  let _chartInstance = null;
  let _seriesMap = new Map();
  let _lastSymbol = null;
  let _lastRange = null;
  let _lastIndicatorsHash = '';

  const getIndicatorsHash = (indicators) => {
    return Object.entries(indicators)
      .filter(([_, val]) => val)
      .map(([key]) => key)
      .sort()
      .join(',');
  };

  const getTheme = () => {
    const isLight = document.body.classList.contains('light-theme');
    return {
      layout: {
        background: { color: 'transparent' },
        textColor: isLight ? '#475569' : '#94a3b8',
      },
      grid: {
        vertLines: { color: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)' },
        horzLines: { color: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.03)' },
      },
      crosshair: {
        vertLine: { color: 'rgba(187, 134, 252, 0.4)', width: 1, style: 1 },
        horzLine: { color: 'rgba(187, 134, 252, 0.4)', width: 1, style: 1 },
      },
      timeScale: {
        borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)',
      },
    };
  };

  const destroy = () => {
    if (_chartInstance) {
      try { _chartInstance.remove(); } catch {}
      _chartInstance = null;
    }
    _seriesMap.clear();
    _lastSymbol = null;
    _lastRange = null;
    _lastIndicatorsHash = '';
    const el = document.getElementById('testChartContainer');
    if (el) el.innerHTML = '';
  };

  const render = (state) => {
    const container = document.getElementById('testChartContainer');
    if (!container || !state.history || !state.history.length) {
      destroy();
      return;
    }

    if (!_chartInstance) {
      container.innerHTML = '';
      _chartInstance = LightweightCharts.createChart(container, {
        width: container.clientWidth || 600,
        height: 360,
        ...getTheme(),
      });

      const resizeObs = new ResizeObserver(entries => {
        if (entries[0] && _chartInstance) {
          _chartInstance.applyOptions({ width: entries[0].contentRect.width });
        }
      });
      resizeObs.observe(container);
    }

    const history = state.history;
    const indicators = state.indicators;
    const hash = getIndicatorsHash(indicators);

    const formattedCandles = history
      .filter(d => d.time && d.close)
      .map(d => ({
        time: d.time,
        open: +(d.open || d.close).toFixed(2),
        high: +(d.high || d.close).toFixed(2),
        low: +(d.low || d.close).toFixed(2),
        close: +d.close.toFixed(2),
      }))
      .sort((a, b) => a.time - b.time);

    const needRebuild = _lastSymbol !== state.symbol || _lastRange !== state.range || _lastIndicatorsHash !== hash;

    if (needRebuild) {
      _lastSymbol = state.symbol;
      _lastRange = state.range;
      _lastIndicatorsHash = hash;

      _seriesMap.forEach(s => {
        try { _chartInstance.removeSeries(s); } catch {}
      });
      _seriesMap.clear();

      const candleSeries = _chartInstance.addCandlestickSeries({
        upColor: '#00d97e',
        downColor: '#ff4757',
        borderUpColor: '#00d97e',
        borderDownColor: '#ff4757',
        wickUpColor: '#00d97e',
        wickDownColor: '#ff4757',
      });
      candleSeries.setData(formattedCandles);
      _seriesMap.set('candles', candleSeries);

      if (indicators.ema20) {
        const ema20Values = window.TestTab.Indicators.calculateEMA(history, 20);
        const ema20Data = formattedCandles.map((c, idx) => ({
          time: c.time,
          value: ema20Values[idx],
        })).filter(d => d.value !== null && d.value !== undefined);

        if (ema20Data.length) {
          const ema20Series = _chartInstance.addLineSeries({
            color: '#00d4ff',
            lineWidth: 1.5,
            title: 'EMA 20',
          });
          ema20Series.setData(ema20Data);
          _seriesMap.set('ema20', ema20Series);
        }
      }

      if (indicators.ema50) {
        const ema50Values = window.TestTab.Indicators.calculateEMA(history, 50);
        const ema50Data = formattedCandles.map((c, idx) => ({
          time: c.time,
          value: ema50Values[idx],
        })).filter(d => d.value !== null && d.value !== undefined);

        if (ema50Data.length) {
          const ema50Series = _chartInstance.addLineSeries({
            color: '#bb86fc',
            lineWidth: 1.5,
            title: 'EMA 50',
          });
          ema50Series.setData(ema50Data);
          _seriesMap.set('ema50', ema50Series);
        }
      }

      if (indicators.ema200) {
        const ema200Values = window.TestTab.Indicators.calculateEMA(history, 200);
        const ema200Data = formattedCandles.map((c, idx) => ({
          time: c.time,
          value: ema200Values[idx],
        })).filter(d => d.value !== null && d.value !== undefined);

        if (ema200Data.length) {
          const ema200Series = _chartInstance.addLineSeries({
            color: '#ffc107',
            lineWidth: 1.5,
            title: 'EMA 200',
          });
          ema200Series.setData(ema200Data);
          _seriesMap.set('ema200', ema200Series);
        }
      }

      if (indicators.vwap) {
        const vwapValues = window.TestTab.Indicators.calculateVWAP(history);
        const vwapData = formattedCandles.map((c, idx) => ({
          time: c.time,
          value: vwapValues[idx],
        })).filter(d => d.value !== null && d.value !== undefined);

        if (vwapData.length) {
          const vwapSeries = _chartInstance.addLineSeries({
            color: '#ff5722',
            lineWidth: 1.5,
            title: 'VWAP',
          });
          vwapSeries.setData(vwapData);
          _seriesMap.set('vwap', vwapSeries);
        }
      }

      if (indicators.supertrend) {
        const stResult = window.TestTab.Indicators.calculateSuperTrend(history);
        const stData = formattedCandles.map((c, idx) => ({
          time: c.time,
          value: stResult.supertrend[idx],
        })).filter(d => d.value !== null && d.value !== undefined);

        if (stData.length) {
          const stSeries = _chartInstance.addLineSeries({
            color: '#e040fb',
            lineWidth: 2,
            title: 'SuperTrend',
          });
          stSeries.setData(stData);
          _seriesMap.set('supertrend', stSeries);
        }
      }

      _chartInstance.timeScale().fitContent();
    } else {
      // Just update existing series data smoothly
      const candleSeries = _seriesMap.get('candles');
      if (candleSeries) {
        candleSeries.setData(formattedCandles);
      }

      if (indicators.ema20) {
        const ema20Series = _seriesMap.get('ema20');
        if (ema20Series) {
          const ema20Values = window.TestTab.Indicators.calculateEMA(history, 20);
          const ema20Data = formattedCandles.map((c, idx) => ({
            time: c.time,
            value: ema20Values[idx],
          })).filter(d => d.value !== null && d.value !== undefined);
          ema20Series.setData(ema20Data);
        }
      }

      if (indicators.ema50) {
        const ema50Series = _seriesMap.get('ema50');
        if (ema50Series) {
          const ema50Values = window.TestTab.Indicators.calculateEMA(history, 50);
          const ema50Data = formattedCandles.map((c, idx) => ({
            time: c.time,
            value: ema50Values[idx],
          })).filter(d => d.value !== null && d.value !== undefined);
          ema50Series.setData(ema50Data);
        }
      }

      if (indicators.ema200) {
        const ema200Series = _seriesMap.get('ema200');
        if (ema200Series) {
          const ema200Values = window.TestTab.Indicators.calculateEMA(history, 200);
          const ema200Data = formattedCandles.map((c, idx) => ({
            time: c.time,
            value: ema200Values[idx],
          })).filter(d => d.value !== null && d.value !== undefined);
          ema200Series.setData(ema200Data);
        }
      }

      if (indicators.vwap) {
        const vwapSeries = _seriesMap.get('vwap');
        if (vwapSeries) {
          const vwapValues = window.TestTab.Indicators.calculateVWAP(history);
          const vwapData = formattedCandles.map((c, idx) => ({
            time: c.time,
            value: vwapValues[idx],
          })).filter(d => d.value !== null && d.value !== undefined);
          vwapSeries.setData(vwapData);
        }
      }

      if (indicators.supertrend) {
        const stSeries = _seriesMap.get('supertrend');
        if (stSeries) {
          const stResult = window.TestTab.Indicators.calculateSuperTrend(history);
          const stData = formattedCandles.map((c, idx) => ({
            time: c.time,
            value: stResult.supertrend[idx],
          })).filter(d => d.value !== null && d.value !== undefined);
          stSeries.setData(stData);
        }
      }
    }
  };

  const applyTheme = () => {
    if (_chartInstance) {
      _chartInstance.applyOptions(getTheme());
    }
  };

  return { render, destroy, applyTheme };
})();
