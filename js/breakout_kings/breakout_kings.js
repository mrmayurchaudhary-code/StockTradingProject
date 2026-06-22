'use strict';

/* ============================================================
   SAMADHAN TRADING — BREAKOUT KINGS ORCHESTRATOR
   Initializes, runs scans, and manages local states.
   ============================================================ */

window.BreakoutKings = (() => {

  let _scanning = false;
  let _scanResults = [];
  let _nseSymbols = [];
  let _bseSymbols = [];

  const init = async () => {
    console.log('[BreakoutKings] 👑 Initializing Breakout Kings Scanner module...');
    
    // Init Alerts & UI helpers
    window.BreakoutKingsAlerts.init();
    window.BreakoutKingsUI.init(
      () => window.BreakoutKingsUI.applyFilter(),
      () => window.BreakoutKingsUI.applyFilter()
    );

    // Concurrency slider label listener
    const concInput = document.getElementById('bk_concurrency');
    const concLabel = document.getElementById('bk_concurrency_val');
    if (concInput && concLabel) {
      concInput.addEventListener('input', (e) => {
        concLabel.textContent = e.target.value;
      });
    }

    // Deploy / Stop buttons
    document.getElementById('bk_deploy_btn')?.addEventListener('click', startScan);
    document.getElementById('bk_stop_btn')?.addEventListener('click', stopScan);

    // Export buttons
    document.getElementById('bk_export_csv')?.addEventListener('click', () => {
      const data = window.BreakoutKingsUI.getFilteredResults();
      window.BreakoutKingsExports.exportCSV(data);
    });

    document.getElementById('bk_export_excel')?.addEventListener('click', () => {
      const data = window.BreakoutKingsUI.getFilteredResults();
      window.BreakoutKingsExports.exportExcel(data);
    });

    document.getElementById('bk_export_pdf')?.addEventListener('click', () => {
      const data = window.BreakoutKingsUI.getFilteredResults();
      const stats = window.BreakoutKingsUI.getStats();
      window.BreakoutKingsExports.exportPDF(data, stats);
    });

    // Populate stats with initial empty/fallback metrics
    window.BreakoutKingsUI.updateResults([]);
  };

  const loadUniverseSymbols = async () => {
    if (_nseSymbols.length > 0 && _bseSymbols.length > 0) return;
    
    try {
      const nseResp = await fetch('/js/segments/nse.js');
      const nseText = await nseResp.text();
      const nseMatch = nseText.match(/const STOCKS\s*=\s*(\[[^\]]+\]);/);
      if (nseMatch) {
        _nseSymbols = JSON.parse(nseMatch[1]);
      }
    } catch (e) {
      console.warn('[BreakoutKings] Failed to load NSE symbols from file:', e);
      _nseSymbols = ["RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "KOTAKBANK.NS", "SBIN.NS", "BHARTIARTL.NS", "ITC.NS", "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "WIPRO.NS", "HCLTECH.NS", "ULTRACEMCO.NS", "BAJFINANCE.NS", "MARUTI.NS", "SUNPHARMA.NS", "TITAN.NS", "ADANIENT.NS"];
    }

    try {
      const bseResp = await fetch('/js/segments/bse.js');
      const bseText = await bseResp.text();
      const bseMatch = bseText.match(/const STOCKS\s*=\s*(\[[^\]]+\]);/);
      if (bseMatch) {
        _bseSymbols = JSON.parse(bseMatch[1]);
      }
    } catch (e) {
      console.warn('[BreakoutKings] Failed to load BSE symbols from file:', e);
      _bseSymbols = ["RELIANCE.BO", "TCS.BO", "HDFCBANK.BO"];
    }
  };

  const getUniverseSymbols = () => {
    const market = document.getElementById('bk_market_select')?.value || 'all';
    let symbols = [];
    if (market === 'nse') {
      symbols = [..._nseSymbols];
    } else if (market === 'bse') {
      symbols = [..._bseSymbols];
    } else {
      symbols = [..._nseSymbols, ..._bseSymbols];
    }
    return [...new Set(symbols)].map(s => s.toUpperCase());
  };

  const startScan = async () => {
    if (_scanning) return;

    toggleScanningUI(true);
    const progStatus = document.getElementById('bk_progress_status');
    if (progStatus) progStatus.textContent = 'Resolving stock universe...';

    await loadUniverseSymbols();
    const symbols = getUniverseSymbols();
    if (symbols.length === 0) {
      if (window.AppState && typeof window.AppState.toast === 'function') {
        window.AppState.toast('No stocks found in selected universe', 'warning');
      }
      toggleScanningUI(false);
      return;
    }

    _scanning = true;
    _scanResults = [];
    window.BreakoutKingsUI.updateResults([]);

    // UI state toggle
    toggleScanningUI(true);

    const progNumbers = document.getElementById('bk_progress_numbers');
    const progFill = document.getElementById('bk_progress_fill');
    const logsContainer = document.getElementById('bk_progress_logs');

    if (progStatus) progStatus.textContent = 'Calculating Nifty 60D baseline...';
    if (progNumbers) progNumbers.textContent = `0 / ${symbols.length}`;
    if (progFill) progFill.style.width = '0%';
    if (logsContainer) logsContainer.innerHTML = '';

    // Step 1: Calculate Nifty benchmark return
    const niftyReturn = await window.BreakoutKingsScanner.fetchNiftyBaseline();
    addProgressLog('NIFTY', `Baseline Nifty 60-Day Return: ${niftyReturn.toFixed(2)}%`, 'warn');

    if (progStatus) progStatus.textContent = 'Scanning stock universe...';

    // Step 2: Concurrent scan loop
    const concurrency = parseInt(document.getElementById('bk_concurrency')?.value || '10', 10);
    const delayMs = 150; // brief delay between batches to respect API limits

    let completed = 0;

    for (let i = 0; i < symbols.length; i += concurrency) {
      if (!_scanning) break;

      const batch = symbols.slice(i, i + concurrency);
      
      await Promise.all(batch.map(async (symbol) => {
        if (!_scanning) return;

        try {
          // Fetch daily history
          const history = await window.API.getHistory(symbol, '1y', '1d');
          
          if (!history || history.length === 0) {
            throw new Error('No historical data returned');
          }

          // Scan stock
          const result = window.BreakoutKingsScanner.scanStock(symbol, history, niftyReturn);
          
          if (result) {
            _scanResults.push(result);
            window.BreakoutKingsAlerts.processScanResult(result);
            
            const msg = `Close: ₹${result.price.toFixed(2)}, Score: ${result.score}/100 [${result.category}]`;
            addProgressLog(symbol, msg, result.score >= 70 ? 'ok' : 'normal');
          } else {
            addProgressLog(symbol, 'Filtered (Liquidity criteria not met)', 'normal');
          }

        } catch (err) {
          addProgressLog(symbol, `Error: ${err.message}`, 'err');
        } finally {
          completed++;
          updateProgressUI(completed, symbols.length);
        }
      }));

      // Throttle between batches
      if (i + concurrency < symbols.length && _scanning) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // Scan complete or aborted
    _scanning = false;
    toggleScanningUI(false);
    
    if (progStatus) {
      progStatus.textContent = completed === symbols.length ? 'Scan complete!' : 'Scan stopped.';
    }

    if (window.AppState && typeof window.AppState.toast === 'function') {
      window.AppState.toast(`Scan complete. Found ${_scanResults.filter(r => r.category !== 'Ignore').length} candidates.`, 'success');
    }
  };

  const stopScan = () => {
    if (!_scanning) return;
    _scanning = false;
    toggleScanningUI(false);
    
    const progStatus = document.getElementById('bk_progress_status');
    if (progStatus) progStatus.textContent = 'Scan aborted.';
    addProgressLog('SYSTEM', 'Scanning stopped by user', 'err');

    if (window.AppState && typeof window.AppState.toast === 'function') {
      window.AppState.toast('Scanning halted', 'info');
    }
  };

  const destroy = () => {
    stopScan();
  };

  // ── UI HELPERS ──
  const toggleScanningUI = (isScanning) => {
    const deployBtn = document.getElementById('bk_deploy_btn');
    const stopBtn = document.getElementById('bk_stop_btn');
    const progWrapper = document.getElementById('bk_progress_wrapper');

    if (deployBtn) {
      deployBtn.disabled = isScanning;
      deployBtn.innerHTML = isScanning ? '<i class="ri-loader-4-line ri-spin"></i> Scan in Progress...' : '<i class="ri-play-fill"></i> Deploy Scan';
    }
    
    if (stopBtn) {
      stopBtn.style.display = isScanning ? 'inline-flex' : 'none';
    }

    if (progWrapper && isScanning) {
      progWrapper.style.display = 'block';
    }
  };

  const updateProgressUI = (completed, total) => {
    const progNumbers = document.getElementById('bk_progress_numbers');
    const progFill = document.getElementById('bk_progress_fill');
    
    if (progNumbers) progNumbers.textContent = `${completed} / ${total}`;
    
    if (progFill) {
      const pct = Math.min(100, Math.round((completed / total) * 100));
      progFill.style.width = `${pct}%`;
    }

    // Refresh table and stats incrementally as results arrive!
    window.BreakoutKingsUI.updateResults(_scanResults);
  };

  const addProgressLog = (symbol, message, status = 'normal') => {
    const logsContainer = document.getElementById('bk_progress_logs');
    if (!logsContainer) return;

    const row = document.createElement('div');
    row.className = `bk-log-row ${status}`;
    row.innerHTML = `<span>[${symbol}]</span> <span>${FMT.escHtml(message)}</span>`;
    
    logsContainer.appendChild(row);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  };

  return {
    init,
    destroy,
    startScan,
    stopScan
  };

})();
