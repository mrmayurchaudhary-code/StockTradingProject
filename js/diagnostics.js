'use strict';

/* ============================================================
   SAMADHAN TRADING — DIAGNOSTICS MODULE
   Tracks active provider, connection status, latency, tick rate
   ============================================================ */

const Diagnostics = (() => {
  let _latencyLog = [];
  let _interval = null;

  const init = () => {
    refresh();
    if (_interval) clearInterval(_interval);
    _interval = setInterval(refresh, 1000);
  };

  const refresh = async () => {
    // Stop running if section is hidden to save client performance
    const section = document.getElementById('section-diagnostics-market-feed');
    if (!section || section.hidden || section.style.display === 'none') {
      if (_interval) {
        clearInterval(_interval);
        _interval = null;
      }
      return;
    }

    const t0 = performance.now();
    let src = 'simulation';
    let latency = 0;
    
    try {
      // Query groww bridge health endpoint (or dhan depending on preference)
      const healthEndpoint = API.getDataSource && API.getDataSource() === 'dhan' 
        ? '/api/dhan/health' 
        : '/api/groww/health';
        
      const resp = await fetch(healthEndpoint);
      await resp.json();
      const t1 = performance.now();
      latency = Math.round(t1 - t0);
      
      if (API.getDataSource) {
        src = API.getDataSource();
      }
    } catch (e) {
      console.warn('[Diagnostics] health call error:', e);
      latency = Math.round(performance.now() - t0);
    }

    // Update latency log
    _latencyLog.push(latency);
    if (_latencyLog.length > 15) _latencyLog.shift();

    // Populate DOM elements
    const providerEl = document.getElementById('diag_provider');
    const activeProvEl = document.getElementById('diag_active_provider');
    const latencyEl = document.getElementById('diag_latency');
    const lastTickEl = document.getElementById('diag_last_tick');
    const wsStatusEl = document.getElementById('diag_ws_status');
    const activeConnEl = document.getElementById('diag_conn_type');
    
    const providerNames = {
      dhan: 'Dhan API Bridge (REST)',
      groww: 'Groww API Bridge (REST)',
      yahoo: 'Yahoo Finance Proxy',
      simulation: 'Demo Data Simulator'
    };

    if (providerEl) providerEl.textContent = providerNames[src] || 'Demo Data';
    if (activeProvEl) {
      activeProvEl.textContent = src === 'dhan' ? 'Dhan Live' : (src === 'groww' ? 'Groww Live' : (src === 'yahoo' ? 'Yahoo Live' : 'Demo Data'));
    }
    if (latencyEl) latencyEl.textContent = `${latency} ms`;
    if (lastTickEl) {
      const now = new Date();
      lastTickEl.textContent = now.toLocaleTimeString() + '.' + String(now.getMilliseconds()).padStart(3, '0');
    }

    const wsActive = API.isWebSocketActive && API.isWebSocketActive();
    if (wsStatusEl) {
      wsStatusEl.textContent = wsActive ? 'CONNECTED' : 'DISCONNECTED';
      wsStatusEl.style.color = wsActive ? 'var(--color-positive)' : 'var(--color-negative)';
    }
    if (activeConnEl) {
      activeConnEl.textContent = wsActive ? 'WebSocket (Real-Time)' : 'REST Polling (1s)';
      activeConnEl.style.color = wsActive ? 'var(--accent-purple)' : 'var(--text-primary)';
    }

    // Render latency log chart
    renderLatencyChart();

    // Render high frequency monitored symbols table
    renderMonitoredSymbols(src);
  };

  const renderLatencyChart = () => {
    const chartEl = document.getElementById('diag_latency_chart');
    if (!chartEl) return;

    if (_latencyLog.length === 0) {
      chartEl.innerHTML = '<span style="font-size:0.75rem; color:var(--text-muted);">Awaiting tick latency data...</span>';
      return;
    }

    const maxVal = Math.max(..._latencyLog, 100);
    chartEl.innerHTML = _latencyLog.map((val, idx) => {
      const heightPercent = Math.min((val / maxVal) * 100, 100);
      let color = 'var(--color-positive)';
      if (val > 150) color = 'var(--color-warning)';
      if (val > 300) color = 'var(--color-negative)';

      return `
        <div style="display:flex; flex-direction:column; align-items:center; flex:1; height:100%; justify-content:flex-end;">
          <span style="font-size:0.6rem; color:var(--text-secondary); margin-bottom:4px;">${val}ms</span>
          <div style="width:12px; height:${heightPercent}%; background:${color}; border-radius:3px 3px 0 0; transition: height 0.3s ease;"></div>
          <span style="font-size:0.55rem; color:var(--text-secondary); margin-top:4px;">#${idx+1}</span>
        </div>
      `;
    }).join('');
  };

  const renderMonitoredSymbols = (src) => {
    const tbody = document.getElementById('diag_monitored_table');
    if (!tbody) return;

    const indices = ['^NSEI', '^BSESN', '^NSEBANK', '^CNXIT', '^CNXAUTO', '^CNXPHARMA'];
    
    tbody.innerHTML = indices.map(sym => {
      const priceEl = document.querySelector(`[data-symbol="${sym}"][data-field="price"]`);
      const chgEl = document.querySelector(`[data-symbol="${sym}"][data-field="changePct"]`);
      const priceText = priceEl ? priceEl.textContent : '--';
      const chgText = chgEl ? chgEl.textContent : '0.00%';
      const color = chgText.startsWith('-') ? 'var(--color-negative)' : 'var(--color-positive)';

      return `
        <tr style="border-bottom:1px solid var(--border-primary);">
          <td style="padding:6px 8px; font-weight:700; font-family:var(--font-mono);">${sym}</td>
          <td style="padding:6px 8px; font-family:var(--font-mono);">${priceText}</td>
          <td style="padding:6px 8px; font-family:var(--font-mono); color:${color}">${chgText}</td>
          <td style="padding:6px 8px;"><span class="nav-badge" style="font-size:0.6rem; border-color:var(--border-accent); background:var(--bg-hover); color:var(--accent-cyan);">${src.toUpperCase()}</span></td>
        </tr>
      `;
    }).join('');
  };

  return { init, refresh };
})();

if (typeof window !== 'undefined') {
  window.Diagnostics = Diagnostics;
}
