'use strict';

/* ============================================================
   SAMADHAN TRADING — NSE SEGMENT MODULE
   National Stock Exchange stock list + detail view
   ============================================================ */

const NSE = (() => {

  const STOCKS = ["ABDL.NS", "AKUMS.NS", "APARINDS.NS", "ASIANPAINT.NS", "AVALON.NS", "BOSCHLTD.NS", "CAPLIPOINT.NS", "CERA.NS", "CGCL.NS", "CUPID.NS", "DATAPATTNS.NS", "EQUITASBNK.NS", "FEDERALBNK.NS", "ICIL.NS", "IFCI.NS", "INOXGREEN.NS", "J&KBANK.NS", "KOTAKBANK.NS", "KTKBANK.NS", "MAHABANK.NS", "NAVINFLUOR.NS", "NUVAMA.NS", "PARAS.NS", "PIDILITIND.NS", "PIRAMALFIN.NS", "PRIVISCL.NS", "QPOWER.NS", "RBLBANK.NS", "SAATVIKGL.NS", "SAILIFE.NS", "SFL.NS", "SOUTHBANK.NS", "SPARC.NS", "STYL.NS", "SYRMA.NS", "TEJASNET.NS", "ABSLAMC.NS", "ACE.NS", "ADANIPORTS.NS", "AEGISLOG.NS", "AEGISVOPAK.NS", "AIIL.NS", "ANTHEM.NS", "APOLLOHOSP.NS", "APTUS.NS", "ASTERDM.NS", "ASTRAMICRO.NS", "AXISBANK.NS", "BANCOINDIA.NS", "BLUEJET.NS", "CHAMBLFERT.NS", "CONCORDBIO.NS", "DEEPAKFERT.NS", "DIACABS.NS", "ELECON.NS", "FIEMIND.NS", "GAIL.NS", "GMRAIRPORT.NS", "GROWW.NS", "HONAUT.NS", "ICICIBANK.NS", "IDEA.NS", "IDFCFIRSTB.NS", "IIFL.NS", "INDHOTEL.NS", "INDIGO.NS", "IXIGO.NS", "JBCHEPHARM.NS", "JSWINFRA.NS", "KIRLOSBROS.NS", "KRBL.NS", "KRN.NS", "MOTHERSON.NS", "MSTCLTD.NS", "NBCC.NS", "NEOGEN.NS", "NETWEB.NS", "POWERMECH.NS", "PRUDENT.NS", "QUESS.NS", "RATEGAIN.NS", "RBA.NS", "SHRIPISTON.NS", "SMLMAH.NS", "SUPRIYA.NS", "SWSOLAR.NS", "TBOTEK.NS", "THANGAMAYL.NS", "AAVAS.NS", "AETHER.NS", "AJANTPHARM.NS", "ALKYLAMINE.NS", "AUBANK.NS", "BANKBARODA.NS", "BELRISE.NS", "BORORENEW.NS", "CHOLAFIN.NS", "COROMANDEL.NS", "EPL.NS", "FORTIS.NS", "HCC.NS", "HOMEFIRST.NS", "HYUNDAI.NS", "IFBIND.NS", "INTELLECT.NS", "JBMA.NS", "KEI.NS", "KPIL.NS", "KSB.NS", "MARKSANS.NS", "MMTC.NS", "MOTILALOFS.NS", "NEULANDLAB.NS", "NYKAA.NS", "OSWALPUMPS.NS", "PAGEIND.NS", "RKFORGE.NS", "SHAKTIPUMP.NS", "SURYAROSNI.NS", "TATACAP.NS", "THELEELA.NS", "AADHARHFC.NS", "ARVIND.NS", "ASHOKA.NS", "ATHERENERG.NS", "AUROPHARMA.NS", "BALAMINES.NS", "BANKINDIA.NS", "BIKAJI.NS", "CUB.NS", "EICHERMOT.NS", "HONASA.NS", "HSCL.NS", "IDBI.NS", "INDIANB.NS", "INDIGOPNTS.NS", "JYOTICNC.NS", "KIMS.NS", "KIRLOSENG.NS", "MEDANTA.NS", "MIDHANI.NS", "NAM-INDIA.NS", "NAZARA.NS", "OLECTRA.NS", "PARADEEP.NS", "PNB.NS", "POLYMED.NS", "PTCIL.NS", "RAIN.NS", "RAYMONDLSL.NS", "RELAXO.NS", "SANSERA.NS", "SHYAMMETL.NS", "SKIPPER.NS", "SRF.NS", "STAR.NS", "TATATECH.NS", "360ONE.NS", "ABCAPITAL.NS", "ANGELONE.NS", "APOLLOTYRE.NS", "BANDHANBNK.NS", "BHARATFORG.NS", "CANFINHOME.NS", "CARBORUNIV.NS", "CEATLTD.NS", "CHOLAHLDNG.NS", "CRAMC.NS", "CREDITACC.NS", "CSBBANK.NS", "DCBBANK.NS", "DIXON.NS", "DOMS.NS", "ELGIEQUIP.NS", "EMCURE.NS", "ERIS.NS", "GABRIEL.NS", "GAEL.NS", "GOKULAGRO.NS", "GREAVESCOT.NS", "GVT&D.NS", "IGIL.NS", "IKS.NS", "INDIAGLYCO.NS", "INDIASHLTR.NS", "ITI.NS", "JAMNAAUTO.NS", "JSWSTEEL.NS", "JUBLPHARMA.NS", "JUSTDIAL.NS", "KARURVYSYA.NS", "KPRMILL.NS", "LICHSGFIN.NS", "LLOYDSENGG.NS", "LLOYDSME.NS", "M&MFIN.NS", "MAHSEAMLES.NS", "MAXHEALTH.NS", "MINDACORP.NS", "MTARTECH.NS", "NIACL.NS", "NIVABUPA.NS", "POLYCAB.NS", "RADICO.NS", "RECLTD.NS", "RELIGARE.NS", "RRKABEL.NS", "SAREGAMA.NS", "SBIN.NS", "SHARDACROP.NS", "SHRIRAMFIN.NS", "SYNGENE.NS", "TATACOMM.NS", "TEGA.NS", "ANANDRATHI.NS", "ANUP.NS", "ASHOKLEY.NS", "AZAD.NS", "BAJFINANCE.NS", "BECTORFOOD.NS", "BERGEPAINT.NS", "BPCL.NS", "BRIGADE.NS", "BSE.NS", "CGPOWER.NS", "CRAFTSMAN.NS", "DATAMATICS.NS", "EIEL.NS", "ENGINERSIN.NS", "ENRIN.NS", "EXIDEIND.NS", "FACT.NS", "FLUOROCHEM.NS", "GLAND.NS", "GODFRYPHLP.NS", "GRASIM.NS", "HEROMOTOCO.NS", "HFCL.NS", "IGL.NS", "INOXWIND.NS", "IOC.NS", "JSL.NS", "KEC.NS", "LT.NS", "LXCHEM.NS", "MANAPPURAM.NS", "MARICO.NS", "MARUTI.NS", "MRPL.NS", "NSLNISP.NS", "OLAELEC.NS", "PCBL.NS", "PIIND.NS", "POONAWALLA.NS", "PRESTIGE.NS", "RAINBOW.NS", "RCF.NS", "REDINGTON.NS", "ROUTE.NS", "SCI.NS", "SHILPAMED.NS", "STLTECH.NS", "SUZLON.NS", "THERMAX.NS", "THOMASCOOK.NS", "THYROCARE.NS", "AARTIPHARM.NS", "ADANIGREEN.NS", "ADVENZYMES.NS", "ANANTRAJ.NS", "BALRAMCHIN.NS", "BIOCON.NS", "BLS.NS", "CAMS.NS", "CANBK.NS", "CENTRALBK.NS", "COLPAL.NS", "DBREALTY.NS", "DLF.NS", "FINCABLES.NS", "GNFC.NS", "GODREJCP.NS", "GRANULES.NS", "GRAVITA.NS", "HDFCBANK.NS", "HINDUNILVR.NS", "IIFLCAPS.NS", "INDIACEM.NS", "INDIAMART.NS", "INDUSINDBK.NS", "INOXINDIA.NS", "IRCON.NS", "JINDALSAW.NS", "JMFINANCIL.NS", "JSWCEMENT.NS", "LTFOODS.NS", "LUPIN.NS", "MCX.NS", "MEDPLUS.NS", "NCC.NS", "NMDC.NS", "PAYTM.NS", "PETRONET.NS", "PNBHOUSING.NS", "POLICYBZR.NS", "RAMCOCEM.NS", "RATNAMANI.NS", "SANDUMA.NS", "SUNDARMFIN.NS", "TATAINVEST.NS", "TDPOWERSYS.NS", "ABBOTINDIA.NS", "ADANIPOWER.NS", "AFCONS.NS", "AMBUJACEM.NS", "ATGL.NS", "AURIONPRO.NS", "AVANTIFEED.NS", "AWL.NS", "BBTC.NS", "BDL.NS", "BEML.NS", "BHARTIARTL.NS", "CARTRADE.NS", "CDSL.NS", "CHOICEIN.NS", "CIEINDIA.NS", "CYIENT.NS", "DBL.NS", "EDELWEISS.NS", "FEDFINA.NS", "FIVESTAR.NS", "FORCEMOT.NS", "GMDCLTD.NS", "GODREJIND.NS", "GODREJPROP.NS", "GRSE.NS", "HBLENGINE.NS", "HINDPETRO.NS", "IONEXCHANG.NS", "IPCALAB.NS", "IRB.NS", "JIOFIN.NS", "JKTYRE.NS", "JPPOWER.NS", "JWL.NS", "KAJARIACER.NS", "KANSAINER.NS", "LALPATHLAB.NS", "LATENTVIEW.NS", "LICI.NS", "LTTS.NS", "MANKIND.NS", "MAZDOCK.NS", "METROPOLIS.NS", "MRF.NS", "NETWORK18.NS", "NFL.NS", "NH.NS", "PGEL.NS", "PHOENIXLTD.NS", "POWERINDIA.NS", "RAILTEL.NS", "REDTAPE.NS", "RVNL.NS", "SCHAEFFLER.NS", "SJVN.NS", "SOBHA.NS", "SONACOMS.NS", "SUBROS.NS", "SUDARSCHEM.NS", "SUMICHEM.NS", "SUNPHARMA.NS", "SUNTECK.NS", "SUNTV.NS", "TANLA.NS", "TATACHEM.NS", "ACC.NS", "ACMESOLAR.NS", "ADANIENSOL.NS", "ALOKINDS.NS", "APLAPOLLO.NS", "APLLTD.NS", "BAJAJHLDNG.NS", "BIRLACORPN.NS", "CCL.NS", "CIPLA.NS", "CUMMINSIND.NS", "DIVISLAB.NS", "ECLERX.NS", "EIHOTEL.NS", "ETHOSLTD.NS", "FINPIPE.NS", "GRAPHITE.NS", "GSFC.NS", "HDBFS.NS", "HGINFRA.NS", "HUDCO.NS", "IRFC.NS", "JLHL.NS", "KNRCON.NS", "KPIGREEN.NS", "LAURUSLABS.NS", "LINDEINDIA.NS", "LUMAXTECH.NS", "MANYAVAR.NS", "MGL.NS", "MUTHOOTFIN.NS", "NEWGEN.NS", "NLCINDIA.NS", "OBEROIRLTY.NS", "ORIENTCEM.NS", "RENUKA.NS", "RITES.NS", "RPOWER.NS", "SBICARD.NS", "SENCO.NS", "SHREECEM.NS", "SWIGGY.NS", "AARTIDRUGS.NS", "AARTIIND.NS", "ABFRL.NS", "ASTRAL.NS", "BAJAJFINSV.NS", "BAJAJHFL.NS", "BATAINDIA.NS", "BHEL.NS", "BLUEDART.NS", "BLUESTARCO.NS", "BLUESTONE.NS", "BRITANNIA.NS", "CAMPUS.NS", "CANHLIFE.NS", "CLEAN.NS", "CONCOR.NS", "DEEPAKNTR.NS", "DELHIVERY.NS", "DRREDDY.NS", "ETERNAL.NS", "GPIL.NS", "HDFCAMC.NS", "HEG.NS", "IEX.NS", "INDUSTOWER.NS", "IOB.NS", "IREDA.NS", "ITC.NS", "ITCHOTELS.NS", "JINDALSTEL.NS", "KALYANKJIL.NS", "M&M.NS", "MOIL.NS", "NHPC.NS", "PATANJALI.NS", "PURVA.NS", "RELIANCE.NS", "SAIL.NS", "SCHNEIDER.NS", "STARHEALTH.NS", "ABREL.NS", "ASHOKLEY.NS", "BHARTIHEXA.NS", "CASTROLIND.NS", "CHENNPETRO.NS", "COCHINSHIP.NS", "DABUR.NS", "DALBHARAT.NS", "EMAMILTD.NS", "GODIGIT.NS", "GODREJAGRO.NS", "HAPPSTMNDS.NS", "HAVELLS.NS", "HCG.NS", "HINDCOPPER.NS", "HINDZINC.NS", "IRCTC.NS", "JKCEMENT.NS", "KAYNES.NS", "KPITTECH.NS", "MAPMYINDIA.NS", "MPHASIS.NS", "NATCOPHARM.NS", "NAUKRI.NS", "PFC.NS", "PFIZER.NS", "PNCINFRA.NS", "SKFINDIA.NS", "3MINDIA.NS", "ABB.NS", "ADANIENT.NS", "AIAENG.NS", "AMBER.NS", "BEL.NS", "CRISIL.NS", "DEVYANI.NS", "EIDPARRY.NS", "ENDURANCE.NS", "FIRSTCRY.NS", "GHCL.NS", "HERITGFOOD.NS", "JAIBALAJI.NS", "JKLAKSHMI.NS", "JSWENERGY.NS", "JUBLFOOD.NS", "JUBLINGREA.NS", "JYOTHYLAB.NS", "KFINTECH.NS", "LEMONTREE.NS", "MFSL.NS", "NATIONALUM.NS", "NAVA.NS", "NESTLEIND.NS", "PRAJIND.NS", "SANOFICONR.NS", "SAPPHIRE.NS", "STYRENIX.NS", "TCS.NS", "AFFLE.NS", "BAJAJ-AUTO.NS", "BALKRISIND.NS", "BSOFT.NS", "COALINDIA.NS", "CROMPTON.NS", "ESCORTS.NS", "FSL.NS", "GESHIP.NS", "GICRE.NS", "GILLETTE.NS", "HAL.NS", "HDFCLIFE.NS", "ICICIPRULI.NS", "MSUMI.NS", "NTPCGREEN.NS", "OFSS.NS", "PVRINOX.NS", "SARDAEN.NS", "SBFC.NS", "SIEMENS.NS", "SUPREMEIND.NS", "TATAELXSI.NS", "ALKEM.NS", "GLAXO.NS", "HINDALCO.NS", "NTPC.NS", "ONESOURCE.NS", "SOLARINDS.NS", "SONATSOFTW.NS", "TATAPOWER.NS", "TATASTEEL.NS", "ATUL.NS", "CENTURYPLY.NS", "CESC.NS", "COFORGE.NS", "DMART.NS", "ICICIGI.NS", "INFY.NS", "MASTEK.NS", "OIL.NS", "ONGC.NS", "PERSISTENT.NS", "POWERGRID.NS", "TATACONSUM.NS", "TECHM.NS", "HCLTECH.NS", "SBILIFE.NS", "TIINDIA.NS", "TIMKEN.NS", "TITAGARH.NS", "TITAN.NS", "TMB.NS", "TVSMOTOR.NS", "TORNTPHARM.NS", "TORNTPOWER.NS", "TRIDENT.NS", "TRIVENI.NS", "UBL.NS", "UCOBANK.NS", "UJJIVANSFB.NS", "ULTRACEMCO.NS", "UNIONBANK.NS", "UNOMINDA.NS", "UPL.NS", "USHAMART.NS", "UTIAMC.NS", "VAIBHAVGBL.NS", "VBL.NS", "VEDL.NS", "VGUARD.NS", "VIJAYA.NS", "VOLTAS.NS", "WAAREEENER.NS", "WABAG.NS", "WELCORP.NS", "WELSPUNLIV.NS", "WHIRLPOOL.NS", "WIPRO.NS", "WOCKPHARMA.NS", "YATHARTH.NS", "YESBANK.NS", "ZAGGLE.NS", "ZEEL.NS", "ZENSARTECH.NS", "ZENTEC.NS", "ZFCVINDIA.NS", "ZYDUSLIFE.NS", "ZYDUSWELL.NS"];

  let _quotes = {};
  let _selected = null;
  let _allStocks = [...STOCKS];
  let _holdings = [];

  const init = async () => {
    try {
      _holdings = await API.getHoldings();
    } catch (e) {
      console.warn('[Samadhan] NSE holdings fetch error:', e);
    }

    const holdingsSymbols = _holdings.map(h => `${h.trading_symbol}.NS`);
    const otherStocks = STOCKS.filter(s => !holdingsSymbols.includes(s));
    _allStocks = [...holdingsSymbols, ...otherStocks];

    renderList(_allStocks);
    setupSearch();
    await loadList();
  };

  const loadList = async () => {
    const quotes = await API.getMultipleQuotes(_allStocks);
    quotes.forEach((q, i) => { if (q) _quotes[_allStocks[i]] = q; });
    renderList(_allStocks);
  };

  const renderList = (symbols) => {
    const container = document.getElementById('nseStockList');
    if (!container) return;
    container.innerHTML = symbols.map(sym => {
      const q = _quotes[sym] || FALLBACK.getQuote(sym);
      const displaySym = sym.replace('.NS', '');
      const positive = q.changePct >= 0;
      
      const isHolding = _holdings.some(h => `${h.trading_symbol}.NS` === sym);
      const holdingBadge = isHolding ? `<span class="segment-badge badge-etf" style="margin-left:4px;font-size:0.55rem;padding:1px 5px"><i class="ri-wallet-3-line"></i> Portfolio</span>` : '';

      return `<div class="stock-item ${_selected === sym ? 'active' : ''}" data-symbol="${FMT.escHtml(sym)}" role="button" tabindex="0" aria-label="${FMT.escHtml(displaySym)}: ₹${FMT.price(q.price)} ${FMT.pct(q.changePct)}">
        <div class="stock-item-info">
          <div class="stock-item-symbol" style="display:flex;align-items:center;gap:4px">
            ${FMT.escHtml(displaySym)}
            ${holdingBadge}
          </div>
          <div class="stock-item-name">${FMT.escHtml(q.name || displaySym)}</div>
        </div>
        <div class="stock-item-price">
          <div class="stock-item-ltp">₹${FMT.price(q.price)}</div>
          <div class="stock-item-chg ${positive ? 'positive' : 'negative'}">${FMT.pct(q.changePct)}</div>
        </div>
      </div>`;
    }).join('');

    container.querySelectorAll('.stock-item').forEach(el => {
      el.addEventListener('click', () => selectStock(el.dataset.symbol));
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter') selectStock(el.dataset.symbol); });
    });

    // Auto-select first if on NSE tab
    if (!_selected && symbols.length > 0) selectStock(symbols[0]);
  };

  const selectStock = async (symbol) => {
    _selected = symbol;

    // Highlight active stock in sidebar instantly
    document.querySelectorAll('#nseStockList .stock-item').forEach(el => {
      el.classList.toggle('active', el.dataset.symbol === symbol);
    });

    // Render detail panel instantly with fallback data
    const q = _quotes[symbol] || FALLBACK.getQuote(symbol);
    renderDetail(q);

    // Load chart loading state
    Charts.showChartLoading('nseDetailChart');

    // Asynchronously fetch live quote and history from Yahoo Finance
    try {
      const [liveQ, hist] = await Promise.all([
        API.getQuote(symbol),
        API.getHistory(symbol, '3mo')
      ]);
      _quotes[symbol] = liveQ;
      renderDetail(liveQ);
      Charts.renderChart('nseDetailChart', hist, 'candlestick');
    } catch (e) {
      // If real API fails, load with fallback data
      const hist = await API.getHistory(symbol, '3mo');
      Charts.renderChart('nseDetailChart', hist, 'candlestick');
    }
  };

  const renderDetail = (q) => {
    const container = document.getElementById('nseDetail');
    if (!container) return;

    const sym = q.symbol.replace('.NS', '');
    const positive = q.changePct >= 0;
    const inWL = Watchlist.has(q.symbol);

    // Check if it is in holdings
    const holding = _holdings.find(h => `${h.trading_symbol}.NS` === q.symbol);
    let holdingHtml = '';
    if (holding) {
      const currentVal = q.price * holding.quantity;
      const investedVal = holding.average_price * holding.quantity;
      const profitLoss = currentVal - investedVal;
      const profitLossPct = investedVal > 0 ? (profitLoss / investedVal) * 100 : 0;
      const pnlPositive = profitLoss >= 0;
      
      holdingHtml = `
        <div class="glass-card" style="margin:12px 0;border:1px solid var(--border-accent);padding:14px;background:rgba(0,217,126,0.02)">
          <div class="card-header" style="margin-bottom:8px">
            <h3 class="card-title" style="color:var(--accent-gold);font-size:0.8rem">
              <i class="ri-wallet-3-fill" style="color:var(--accent-gold)"></i> YOUR PORTFOLIO POSITION
            </h3>
          </div>
          <div class="stats-grid" style="margin:0;grid-template-columns:repeat(4,1fr);gap:8px">
            <div class="stat-item" style="padding:6px 8px">
              <div class="stat-label" style="font-size:0.58rem">QTY</div>
              <div class="stat-value" style="font-size:0.75rem">${holding.quantity}</div>
            </div>
            <div class="stat-item" style="padding:6px 8px">
              <div class="stat-label" style="font-size:0.58rem">AVG PRICE</div>
              <div class="stat-value" style="font-size:0.75rem">₹${FMT.price(holding.average_price)}</div>
            </div>
            <div class="stat-item" style="padding:6px 8px">
              <div class="stat-label" style="font-size:0.58rem">CURRENT VAL</div>
              <div class="stat-value" style="font-size:0.75rem">₹${FMT.price(currentVal)}</div>
            </div>
            <div class="stat-item" style="padding:6px 8px">
              <div class="stat-label" style="font-size:0.58rem">P&L</div>
              <div class="stat-value ${pnlPositive ? 'positive' : 'negative'}" style="font-size:0.75rem;font-weight:700">
                ₹${FMT.price(profitLoss)} (${FMT.pct(profitLossPct)})
              </div>
            </div>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="stock-detail-header">
        <div class="stock-detail-title">
          <div class="sd-symbol">${FMT.escHtml(sym)}</div>
          <div class="sd-name">${FMT.escHtml(q.name || sym)}</div>
          <div class="sd-exchange"><span class="segment-badge badge-nse">NSE</span></div>
        </div>
        <div class="stock-price-block">
          <div class="sd-ltp ${positive ? 'positive' : 'negative'}">₹${FMT.price(q.price)}</div>
          <div class="sd-change ${positive ? 'positive' : 'negative'}">
            <i class="${FMT.changeIcon(q.changePct)}"></i>
            ${q.change >= 0 ? '+' : ''}₹${FMT.price(Math.abs(q.change))} (${FMT.pct(q.changePct)})
          </div>
        </div>
      </div>

      <div class="modal-chart-header" style="margin-bottom:8px">
        <div class="chart-type-toggle" id="nseChartTypeToggle">
          <button class="chart-type-btn active" data-type="candlestick">Candle</button>
          <button class="chart-type-btn" data-type="line">Line</button>
          <button class="chart-type-btn" data-type="area">Area</button>
        </div>
        <div class="time-range-group" id="nseTimeRange">
          <button class="time-btn" data-range="1d">1D</button>
          <button class="time-btn" data-range="5d">5D</button>
          <button class="time-btn active" data-range="3mo">3M</button>
          <button class="time-btn" data-range="6mo">6M</button>
          <button class="time-btn" data-range="1y">1Y</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-left:auto;">
          <span style="font-size:0.75rem;color:var(--text-secondary);font-weight:600">Period:</span>
          <select class="select-styled" style="padding:4px 8px;font-size:0.75rem;width:auto;border-radius:4px;background:var(--bg-3);border:1px solid var(--border-primary);color:var(--text-primary);" id="nseInterval">
            <option value="1d" selected>1 Day</option>
            <option value="1m">1 Min</option>
            <option value="2m">2 Min</option>
            <option value="3m">3 Min</option>
            <option value="4m">4 Min</option>
            <option value="5m">5 Min</option>
            <option value="7m">7 Min</option>
            <option value="10m">10 Min</option>
            <option value="15m">15 Min</option>
            <option value="20m">20 Min</option>
            <option value="30m">30 Min</option>
            <option value="60m">60 Min</option>
          </select>
        </div>
      </div>

      <div class="chart-container" id="nseDetailChart" style="height:260px"></div>

      ${holdingHtml}

      <div class="stats-grid">
        <div class="stat-item"><div class="stat-label">Open</div><div class="stat-value">₹${FMT.price(q.open)}</div></div>
        <div class="stat-item"><div class="stat-label">High</div><div class="stat-value" style="color:var(--color-positive)">₹${FMT.price(q.high)}</div></div>
        <div class="stat-item"><div class="stat-label">Low</div><div class="stat-value" style="color:var(--color-negative)">₹${FMT.price(q.low)}</div></div>
        <div class="stat-item"><div class="stat-label">Prev Close</div><div class="stat-value">₹${FMT.price(q.prevClose)}</div></div>
        <div class="stat-item"><div class="stat-label">Volume</div><div class="stat-value">${FMT.volume(q.volume)}</div></div>
        <div class="stat-item"><div class="stat-label">Market Cap</div><div class="stat-value">${FMT.marketCap(q.marketCap)}</div></div>
        <div class="stat-item"><div class="stat-label">52W High</div><div class="stat-value" style="color:var(--color-positive)">₹${FMT.price(q.week52High)}</div></div>
        <div class="stat-item"><div class="stat-label">52W Low</div><div class="stat-value" style="color:var(--color-negative)">₹${FMT.price(q.week52Low)}</div></div>
        <div class="stat-item"><div class="stat-label">P/E Ratio</div><div class="stat-value">${q.pe || FALLBACK.getStockInfo(q.symbol)?.pe || '—'}</div></div>
      </div>

      <div class="modal-actions" style="margin-top:14px">
        <button class="btn btn-success"><i class="ri-arrow-up-line"></i> Buy</button>
        <button class="btn btn-danger"><i class="ri-arrow-down-line"></i> Sell</button>
        <button class="btn btn-ghost wl-toggle-btn" data-symbol="${FMT.escHtml(q.symbol)}">
          <i class="${inWL ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i>
          ${inWL ? 'Saved' : 'Watchlist'}
        </button>
        <button class="btn btn-ghost" onclick="AppState.openStockModal('${FMT.escHtml(q.symbol)}')"><i class="ri-fullscreen-line"></i> Expand</button>
      </div>`;

    // Chart type toggle
    container.querySelector('#nseChartTypeToggle')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.chart-type-btn');
      if (!btn) return;
      container.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const range = container.querySelector('#nseTimeRange .time-btn.active')?.dataset.range || '3mo';
      const interval = container.querySelector('#nseInterval')?.value || '1d';
      Charts.showChartLoading('nseDetailChart');
      const hist = await API.getHistory(_selected, range, interval);
      Charts.renderChart('nseDetailChart', hist, btn.dataset.type);
    });

    // Time range
    container.querySelector('#nseTimeRange')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.time-btn');
      if (!btn) return;
      container.querySelectorAll('#nseTimeRange .time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = container.querySelector('#nseChartTypeToggle .chart-type-btn.active')?.dataset.type || 'candlestick';
      
      let interval = container.querySelector('#nseInterval')?.value || '1d';
      if (interval.endsWith('m') && !['1d', '5d'].includes(btn.dataset.range)) {
        interval = '1d';
        const intervalEl = container.querySelector('#nseInterval');
        if (intervalEl) intervalEl.value = '1d';
      }
      
      Charts.showChartLoading('nseDetailChart');
      const hist = await API.getHistory(_selected, btn.dataset.range, interval);
      Charts.renderChart('nseDetailChart', hist, type);
    });

    // Interval change
    container.querySelector('#nseInterval')?.addEventListener('change', async () => {
      const interval = container.querySelector('#nseInterval').value;
      let range = container.querySelector('#nseTimeRange .time-btn.active')?.dataset.range || '3mo';
      
      if (interval.endsWith('m')) {
        const mins = parseInt(interval);
        if (mins <= 4 || mins === 7) {
          range = '1d';
        } else if (mins <= 20) {
          range = '5d';
        } else {
          range = '1mo';
        }
        
        container.querySelectorAll('#nseTimeRange .time-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.range === range);
        });
      }
      
      const type = container.querySelector('#nseChartTypeToggle .chart-type-btn.active')?.dataset.type || 'candlestick';
      Charts.showChartLoading('nseDetailChart');
      const hist = await API.getHistory(_selected, range, interval);
      Charts.renderChart('nseDetailChart', hist, type);
    });

    // Watchlist toggle
    container.querySelector('.wl-toggle-btn')?.addEventListener('click', (e) => {
      const sym = e.currentTarget.dataset.symbol;
      if (Watchlist.has(sym)) { Watchlist.removeSymbol(sym); }
      else { Watchlist.addSymbol(sym); }
      const icon = e.currentTarget.querySelector('i');
      const isNow = Watchlist.has(sym);
      if (icon) icon.className = isNow ? 'ri-bookmark-fill' : 'ri-bookmark-line';
      e.currentTarget.innerHTML = `<i class="${isNow ? 'ri-bookmark-fill' : 'ri-bookmark-line'}"></i> ${isNow ? 'Saved' : 'Watchlist'}`;
    });
  };

  const setupSearch = () => {
    const input = document.getElementById('nseSearch');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { renderList(_allStocks); return; }
      const filtered = _allStocks.filter(s => {
        const display = s.replace('.NS', '').toLowerCase();
        const name = (_quotes[s]?.name || '').toLowerCase();
        return display.includes(q) || name.includes(q);
      });
      renderList(filtered);
    });
  };

  const getSelectedSymbol = () => _selected;
  const getHoldingsSymbols = () => _holdings.map(h => `${h.trading_symbol}.NS`);

  const refresh = async () => {
    try {
      _holdings = await API.getHoldings();
    } catch {}
    await loadList();
    if (_selected) selectStock(_selected);
  };

  return { init, refresh, getSelectedSymbol, getHoldingsSymbols };
})();
