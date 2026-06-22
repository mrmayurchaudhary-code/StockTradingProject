'use strict';

window.TestTab = window.TestTab || {};

window.TestTab.Search = (() => {

  const init = (inputId, onSelect) => {
    const input = document.getElementById(inputId);
    const results = document.getElementById('testSearchResults');
    const clearBtn = document.getElementById('testSearchClearBtn');
    if (!input || !results) return;

    let debounceTimer;

    input.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = input.value.trim();
      
      if (q) {
        clearBtn.style.display = 'block';
      } else {
        clearBtn.style.display = 'none';
      }

      if (!q || q.length < 2) {
        results.classList.remove('open');
        results.innerHTML = '';
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const hits = await window.TestTab.API.searchSymbols(q);
          if (!hits.length) {
            results.innerHTML = `<div style="padding:12px; font-size:0.8rem; color:var(--text-muted); text-align:center;">No results found</div>`;
            results.classList.add('open');
            return;
          }

          results.innerHTML = hits.map(h => {
            const displaySym = h.symbol.replace('.NS', '').replace('.BO', '');
            const displayExchange = h.exchange || h.type || 'NSE';
            return `
              <div class="search-result-item" data-symbol="${FMT.escHtml(h.symbol)}" role="option" tabindex="0" style="display:flex; justify-content:space-between; align-items:center; padding: 10px 14px; border-bottom: 1px solid var(--border-primary); cursor:pointer;">
                <div style="display:flex; flex-direction:column; gap:2px;">
                  <span class="search-result-symbol" style="font-weight:700; color:var(--accent-cyan); font-family:var(--font-mono); font-size:0.85rem;">${FMT.escHtml(displaySym)}</span>
                  <span class="search-result-name" style="font-size:0.75rem; color:var(--text-muted); max-width:260px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${FMT.escHtml(h.name || h.symbol)}</span>
                </div>
                <span class="segment-badge badge-nse" style="font-size:0.6rem;">${FMT.escHtml(displayExchange)}</span>
              </div>`;
          }).join('');
          results.classList.add('open');

          results.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', () => {
              const sym = el.dataset.symbol;
              onSelect(sym);
              input.value = '';
              clearBtn.style.display = 'none';
              results.classList.remove('open');
            });
            el.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') el.click();
            });
          });
        } catch (err) {
          console.error('[TestTab Search] Error fetching search suggestions:', err);
        }
      }, 300);
    });

    clearBtn?.addEventListener('click', () => {
      input.value = '';
      clearBtn.style.display = 'none';
      results.classList.remove('open');
      results.innerHTML = '';
      input.focus();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        results.classList.remove('open');
        input.blur();
      }
    });

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.classList.remove('open');
      }
    });
  };

  return { init };
})();
