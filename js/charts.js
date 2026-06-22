'use strict';

/* ============================================================
   SAMADHAN TRADING — CHARTS MODULE
   TradingView Lightweight Charts + Chart.js Sparklines
   ============================================================ */

const Charts = (() => {

  // Active chart instances to destroy on reuse
  const _instances = new Map();

  // ── THEME CONFIG ──
  const getTVTheme = () => {
    const isLight = document.body.classList.contains('light-theme');
    return {
      layout: {
        background: { color: 'transparent' },
        textColor: isLight ? '#475569' : '#94a3b8',
      },
      grid: {
        vertLines: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)' },
        horzLines: { color: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)' },
      },
      crosshair: {
        vertLine: { color: isLight ? 'rgba(14,165,233,0.5)' : 'rgba(0,212,255,0.5)', width: 1, style: 1, labelBackgroundColor: isLight ? '#cbd5e1' : '#0d1629' },
        horzLine: { color: isLight ? 'rgba(14,165,233,0.5)' : 'rgba(0,212,255,0.5)', width: 1, style: 1, labelBackgroundColor: isLight ? '#cbd5e1' : '#0d1629' },
      },
      timeScale: {
        borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: { borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)' },
    };
  };

  const CANDLE_COLORS = {
    upColor: '#00d97e',
    downColor: '#ff4757',
    borderUpColor: '#00d97e',
    borderDownColor: '#ff4757',
    wickUpColor: '#00d97e',
    wickDownColor: '#ff4757',
  };

  const LINE_COLOR = '#00d4ff';

  // ── DESTROY EXISTING CHART ──
  const destroyChart = (containerId) => {
    const inst = _instances.get(containerId);
    if (inst) {
      try { inst.remove(); } catch {}
      _instances.delete(containerId);
    }
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = '';
  };

  // ── CREATE TV CHART ──
  const createTV = (containerId, height = 320) => {
    destroyChart(containerId);
    const container = document.getElementById(containerId);
    if (!container || typeof LightweightCharts === 'undefined') return null;

    container.innerHTML = '';

    const chart = LightweightCharts.createChart(container, {
      width: container.clientWidth || 600,
      height,
      ...getTVTheme(),
    });

    // Responsive resize
    const resizeObs = new ResizeObserver(entries => {
      if (entries[0]) {
        chart.applyOptions({ width: entries[0].contentRect.width });
      }
    });
    resizeObs.observe(container);

    _instances.set(containerId, chart);
    return chart;
  };

  // ── FORMAT HISTORY DATA FOR TV ──
  const formatForTV = (history) => {
    return history
      .filter(d => d.time && d.close)
      .map(d => ({
        time: d.time,
        open: +(d.open || d.close).toFixed(2),
        high: +(d.high || d.close).toFixed(2),
        low: +(d.low || d.close).toFixed(2),
        close: +d.close.toFixed(2),
        value: +d.close.toFixed(2),
      }))
      .sort((a, b) => a.time - b.time);
  };

  // ── CANDLESTICK CHART ──
  const renderCandlestick = (containerId, history, height = 320) => {
    const chart = createTV(containerId, height);
    if (!chart || !history || !history.length) return;

    const series = chart.addCandlestickSeries(CANDLE_COLORS);
    const data = formatForTV(history);
    series.setData(data);
    chart.timeScale().fitContent();
    return { chart, series };
  };

  // ── LINE CHART ──
  const renderLine = (containerId, history, height = 320, color = LINE_COLOR) => {
    const chart = createTV(containerId, height);
    if (!chart || !history || !history.length) return;

    const series = chart.addLineSeries({
      color,
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      crosshairMarkerBorderColor: color,
      crosshairMarkerBackgroundColor: color,
    });
    const data = formatForTV(history).map(d => ({ time: d.time, value: d.close }));
    series.setData(data);
    chart.timeScale().fitContent();
    return { chart, series };
  };

  // ── AREA CHART ──
  const renderArea = (containerId, history, height = 320, color = LINE_COLOR) => {
    const chart = createTV(containerId, height);
    if (!chart || !history || !history.length) return;

    const isPositive = history.length > 1
      ? history[history.length - 1].close >= history[0].close
      : true;

    const lineColor = isPositive ? '#00d97e' : '#ff4757';
    const topColor = isPositive ? 'rgba(0,217,126,0.3)' : 'rgba(255,71,87,0.3)';
    const bottomColor = isPositive ? 'rgba(0,217,126,0.0)' : 'rgba(255,71,87,0.0)';

    const series = chart.addAreaSeries({
      lineColor,
      topColor,
      bottomColor,
      lineWidth: 2,
    });
    const data = formatForTV(history).map(d => ({ time: d.time, value: d.close }));
    series.setData(data);
    chart.timeScale().fitContent();
    return { chart, series };
  };

  // ── RENDER CHART BY TYPE ──
  const renderChart = (containerId, history, type = 'candlestick', height = 320) => {
    if (!history || !history.length) {
      showChartError(containerId, 'No data available');
      return;
    }
    switch (type) {
      case 'line':  return renderLine(containerId, history, height);
      case 'area':  return renderArea(containerId, history, height);
      default:      return renderCandlestick(containerId, history, height);
    }
  };

  // ── CHART.JS SPARKLINE (for index cards) ──
  const _cjsInstances = new Map();

  const renderSparkline = (canvasEl, data, positive = true) => {
    if (!canvasEl) return;
    const id = canvasEl.id || canvasEl;
    if (_cjsInstances.has(id)) { try { _cjsInstances.get(id).destroy(); } catch {} }

    const color = positive ? '#00d97e' : '#ff4757';
    const fillColor = positive ? 'rgba(0,217,126,0.15)' : 'rgba(255,71,87,0.15)';

    const ctx = typeof canvasEl === 'string'
      ? document.getElementById(canvasEl)?.getContext('2d')
      : canvasEl.getContext('2d');

    if (!ctx) return;

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: color,
          backgroundColor: fillColor,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1.5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600 },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: {
          x: { display: false },
          y: { display: false },
        },
        elements: { point: { radius: 0 } },
      },
    });

    _cjsInstances.set(id, chart);
    return chart;
  };

  // ── BREADTH DONUT CHART ──
  const renderBreadthChart = (canvasId, advance, decline, unchanged) => {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return;

    const id = canvasId;
    if (_cjsInstances.has(id)) { try { _cjsInstances.get(id).destroy(); } catch {} }

    const chart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['Advancing', 'Declining', 'Unchanged'],
        datasets: [{
          data: [advance, decline, unchanged],
          backgroundColor: ['#00d97e', '#ff4757', '#475569'],
          borderColor: ['rgba(0,217,126,0.5)', 'rgba(255,71,87,0.5)', 'rgba(71,85,105,0.5)'],
          borderWidth: 2,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: false,
        cutout: '70%',
        animation: { animateRotate: true, duration: 800 },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.raw} (${((ctx.raw / (advance + decline + unchanged)) * 100).toFixed(1)}%)`
            }
          },
        },
      },
    });

    _cjsInstances.set(id, chart);
    return chart;
  };

  // ── SHOW LOADING STATE ──
  const showChartLoading = (containerId) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="chart-loading">
        <div class="chart-loading-spinner"></div>
        <span>Loading chart data...</span>
      </div>`;
  };

  // ── SHOW ERROR STATE ──
  const showChartError = (containerId, message = 'Unable to load chart') => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="chart-loading">
        <i class="ri-line-chart-line" style="font-size:2rem;opacity:0.3;"></i>
        <span>${FMT.escHtml(message)}</span>
      </div>`;
  };

  const applyTheme = () => {
    if (typeof LightweightCharts === 'undefined') return;
    const theme = getTVTheme();
    _instances.forEach(chart => {
      chart.applyOptions(theme);
    });
  };

  return { renderChart, renderCandlestick, renderLine, renderArea, renderSparkline, renderBreadthChart, showChartLoading, showChartError, destroyChart, applyTheme };
})();
