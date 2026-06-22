'use strict';

/* ============================================================
   SAMADHAN TRADING — BREAKOUT KINGS ORCHESTRATOR v2
   Manages scan lifecycle, auto-refresh, and coordination.
   ============================================================ */

window.BreakoutKings = (() => {

  let _scanning = false;
  let _scanResults = [];
  let _nseSymbols = [];
  let _bseSymbols = [];
  let _autoRefreshTimer = null;

  const init = async () => {
    console.log('[BreakoutKings] 👑 Initializing Breakout Kings Scanner v2...');

    // Init UI module
    window.BreakoutKingsUI.init();

    // Init Alerts module
    if (window.BreakoutKingsAlerts && typeof window.BreakoutKingsAlerts.init === 'function') {
      window.BreakoutKingsAlerts.init();
    }

    // Deploy / Stop buttons
    document.getElementById('bk_deploy_btn')?.addEventListener('click', startScan);
    document.getElementById('bk_stop_btn')?.addEventListener('click', stopScan);

    // Export buttons
    document.getElementById('bk_export_csv')?.addEventListener('click', () => {
      const data = window.BreakoutKingsUI.getFilteredResults();
      if (window.BreakoutKingsExports) window.BreakoutKingsExports.exportCSV(data);
    });
    document.getElementById('bk_export_excel')?.addEventListener('click', () => {
      const data = window.BreakoutKingsUI.getFilteredResults();
      if (window.BreakoutKingsExports) window.BreakoutKingsExports.exportExcel(data);
    });
    document.getElementById('bk_export_pdf')?.addEventListener('click', () => {
      const data = window.BreakoutKingsUI.getFilteredResults();
      const stats = window.BreakoutKingsUI.getStats();
      if (window.BreakoutKingsExports) window.BreakoutKingsExports.exportPDF(data, stats);
    });

    // Category card click filters
    ['bk_card_orb', 'bk_card_rs', 'bk_card_gap', 'bk_card_inside'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        // Visual feedback only — future: filter by category
        const card = document.getElementById(id);
        if (card) {
          card.style.transform = 'scale(0.97)';
          setTimeout(() => { card.style.transform = ''; }, 150);
        }
      });
    });

    // Initialize with empty state
    window.BreakoutKingsUI.updateResults([]);
  };

  // ── SYMBOL UNIVERSE LOADER ──
  const loadUniverseSymbols = async () => {
    if (_nseSymbols.length > 0 && _bseSymbols.length > 0) return;

    // NSE symbols from segment module
    try {
      const nseResp = await fetch('/js/segments/nse.js');
      const nseText = await nseResp.text();
      // Match: const STOCKS = ["sym1", "sym2", ...];
      const nseMatch = nseText.match(/const STOCKS\s*=\s*(\[[^\]]+\]);/);
      if (nseMatch) {
        _nseSymbols = JSON.parse(nseMatch[1]);
      }
    } catch (e) {
      console.warn('[BreakoutKings] Failed to load NSE symbols:', e);
      _nseSymbols = [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
        "KOTAKBANK.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "LT.NS",
        "AXISBANK.NS", "ASIANPAINT.NS", "WIPRO.NS", "HCLTECH.NS", "BAJFINANCE.NS",
        "MARUTI.NS", "SUNPHARMA.NS", "TITAN.NS", "ADANIENT.NS", "HINDUNILVR.NS"
      ];
    }

    // BSE symbols
    try {
      const bseResp = await fetch('/js/segments/bse.js');
      const bseText = await bseResp.text();
      const bseMatch = bseText.match(/const STOCKS\s*=\s*(\[[^\]]+\]);/);
      if (bseMatch) {
        _bseSymbols = JSON.parse(bseMatch[1]);
      }
    } catch (e) {
      console.warn('[BreakoutKings] Failed to load BSE symbols:', e);
      _bseSymbols = ["RELIANCE.BO", "TCS.BO", "HDFCBANK.BO"];
    }
  };

  const getUniverseSymbols = () => {
    const market = document.getElementById('bk_market_select')?.value || 'all';
    let symbols = [];
    if (market === 'nse') symbols = [..._nseSymbols];
    else if (market === 'bse') symbols = [..._bseSymbols];
    else symbols = [..._nseSymbols, ..._bseSymbols];
    return [...new Set(symbols)].map(s => s.toUpperCase());
  };

  // ── MAIN SCAN FLOW ──
  const startScan = async () => {
    if (_scanning) return;

    // Show progress panel
    const progPanel = document.getElementById('bk_progress_panel');
    if (progPanel) progPanel.style.display = 'block';

    setStatusUI('scanning');
    const progStatus = document.getElementById('bk_progress_status');
    if (progStatus) progStatus.textContent = 'Resolving stock universe...';

    await loadUniverseSymbols();
    const symbols = getUniverseSymbols();

    if (symbols.length === 0) {
      toast('No stocks found in selected universe', 'warning');
      setStatusUI('idle');
      return;
    }

    _scanning = true;
    _scanResults = [];
    window.BreakoutKingsUI.updateResults([]);

    const progNumbers = document.getElementById('bk_progress_numbers');
    const progFill = document.getElementById('bk_progress_fill');
    const logsContainer = document.getElementById('bk_progress_logs');

    if (progStatus) progStatus.textContent = 'Calculating Nifty 60D baseline...';
    if (progNumbers) progNumbers.textContent = `0 / ${symbols.length}`;
    if (progFill) progFill.style.width = '0%';
    if (logsContainer) logsContainer.innerHTML = '';

    // Update scan status
    const scanStatusEl = document.getElementById('bk_scan_status');
    if (scanStatusEl) { scanStatusEl.textContent = 'Scanning...'; scanStatusEl.className = 'bk-meta-value gold'; }

    // Step 1: Nifty baseline
    const niftyReturn = await window.BreakoutKingsScanner.fetchNiftyBaseline();
    addProgressLog('NIFTY', `Baseline 60-Day Return: ${niftyReturn.toFixed(2)}%`, 'warn');
    if (progStatus) progStatus.textContent = 'Scanning stock universe...';

    // Step 2: Concurrent batched scan
    const concurrency = 8;
    const delayMs = 120;
    let completed = 0;

    for (let i = 0; i < symbols.length; i += concurrency) {
      if (!_scanning) break;

      const batch = symbols.slice(i, i + concurrency);

      await Promise.all(batch.map(async (symbol) => {
        if (!_scanning) return;
        try {
          const history = await window.API.getHistory(symbol, '1y', '1d');
          if (!history || history.length === 0) throw new Error('No data');

          const result = window.BreakoutKingsScanner.scanStock(symbol, history, niftyReturn);

          if (result && result.category !== 'Ignore') {
            _scanResults.push(result);

            // Trigger alerts
            if (window.BreakoutKingsAlerts && typeof window.BreakoutKingsAlerts.processScanResult === 'function') {
              window.BreakoutKingsAlerts.processScanResult(result);
            }

            const msg = `₹${result.price.toFixed(2)} | Score: ${result.score}/100 [${result.category}]`;
            addProgressLog(symbol.replace('.NS', '').replace('.BO', ''), msg, result.score >= 70 ? 'ok' : 'normal');
          } else {
            addProgressLog(symbol.replace('.NS', '').replace('.BO', ''), 'Filtered out', 'normal');
          }
        } catch (err) {
          addProgressLog(symbol.replace('.NS', '').replace('.BO', ''), `Error: ${err.message}`, 'err');
        } finally {
          completed++;
          updateProgressBar(completed, symbols.length);
        }
      }));

      // Throttle between batches
      if (i + concurrency < symbols.length && _scanning) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Scan complete
    _scanning = false;
    setStatusUI('idle');

    // Update last scan time
    const lastUpdatedEl = document.getElementById('bk_last_updated');
    if (lastUpdatedEl) lastUpdatedEl.textContent = new Date().toLocaleTimeString();

    if (progStatus) progStatus.textContent = completed === symbols.length ? 'Scan complete!' : 'Scan stopped.';
    if (scanStatusEl) { scanStatusEl.textContent = 'Idle'; scanStatusEl.className = 'bk-meta-value'; }

    const qualifying = _scanResults.filter(r => r.category !== 'Ignore').length;
    toast(`Scan complete. Found ${qualifying} breakout candidates.`, 'success');

    // Final render
    window.BreakoutKingsUI.updateResults(_scanResults);
  };

  const stopScan = () => {
    if (!_scanning) return;
    _scanning = false;
    setStatusUI('idle');

    const progStatus = document.getElementById('bk_progress_status');
    if (progStatus) progStatus.textContent = 'Scan aborted by user.';
    addProgressLog('SYSTEM', 'Scanning stopped', 'err');

    const scanStatusEl = document.getElementById('bk_scan_status');
    if (scanStatusEl) { scanStatusEl.textContent = 'Stopped'; scanStatusEl.className = 'bk-meta-value negative'; }

    toast('Scan halted', 'info');
  };

  const destroy = () => {
    stopScan();
    if (_autoRefreshTimer) {
      clearInterval(_autoRefreshTimer);
      _autoRefreshTimer = null;
    }
  };

  // ── UI HELPERS ──
  const setStatusUI = (state) => {
    const deployBtn = document.getElementById('bk_deploy_btn');
    const stopBtn = document.getElementById('bk_stop_btn');

    if (state === 'scanning') {
      if (deployBtn) { deployBtn.disabled = true; deployBtn.innerHTML = '<i class="ri-loader-4-line ri-spin"></i> Scanning...'; }
      if (stopBtn) stopBtn.style.display = 'inline-flex';
    } else {
      if (deployBtn) { deployBtn.disabled = false; deployBtn.innerHTML = '<i class="ri-radar-line"></i> Deploy Scan'; }
      if (stopBtn) stopBtn.style.display = 'none';
    }
  };

  const updateProgressBar = (completed, total) => {
    const progNumbers = document.getElementById('bk_progress_numbers');
    const progFill = document.getElementById('bk_progress_fill');
    if (progNumbers) progNumbers.textContent = `${completed} / ${total}`;
    if (progFill) progFill.style.width = `${Math.min(100, Math.round((completed / total) * 100))}%`;

    // Incremental render
    window.BreakoutKingsUI.updateResults(_scanResults);
  };

  const addProgressLog = (symbol, message, status = 'normal') => {
    const logsContainer = document.getElementById('bk_progress_logs');
    if (!logsContainer) return;
    const row = document.createElement('div');
    row.className = `bk-log-row ${status}`;
    const safeMsg = (typeof FMT !== 'undefined' && FMT.escHtml) ? FMT.escHtml(message) : message;
    row.innerHTML = `<span>[${symbol}]</span> <span>${safeMsg}</span>`;
    logsContainer.appendChild(row);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  };

  const toast = (msg, type) => {
    if (window.AppState && typeof window.AppState.toast === 'function') {
      window.AppState.toast(msg, type);
    }
  };

  return {
    init,
    destroy,
    startScan,
    stopScan
  };

})();
