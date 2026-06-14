'use strict';

/* ============================================================
   SAMADHAN TRADING — BSE SEGMENT MODULE
   Bombay Stock Exchange stocks + SENSEX components
   ============================================================ */

const BSE = (() => {

  const STOCKS = ["ABDL.BO", "AKUMS.BO", "APARINDS.BO", "ASIANPAINT.BO", "AVALON.BO", "BOSCHLTD.BO", "CAPLIPOINT.BO", "CERA.BO", "CGCL.BO", "CUPID.BO", "DATAPATTNS.BO", "EQUITASBNK.BO", "FEDERALBNK.BO", "ICIL.BO", "IFCI.BO", "INOXGREEN.BO", "J&KBANK.BO", "KOTAKBANK.BO", "KTKBANK.BO", "MAHABANK.BO", "NAVINFLUOR.BO", "NUVAMA.BO", "PARAS.BO", "PIDILITIND.BO", "PIRAMALFIN.BO", "PRIVISCL.BO", "QPOWER.BO", "RBLBANK.BO", "SAATVIKGL.BO", "SAILIFE.BO", "SFL.BO", "SOUTHBANK.BO", "SPARC.BO", "STYL.BO", "SYRMA.BO", "TEJASNET.BO", "ABSLAMC.BO", "ACE.BO", "ADANIPORTS.BO", "AEGISLOG.BO", "AEGISVOPAK.BO", "AIIL.BO", "ANTHEM.BO", "APOLLOHOSP.BO", "APTUS.BO", "ASTERDM.BO", "ASTRAMICRO.BO", "AXISBANK.BO", "BANCOINDIA.BO", "BLUEJET.BO", "CHAMBLFERT.BO", "CONCORDBIO.BO", "DEEPAKFERT.BO", "DIACABS.BO", "ELECON.BO", "FIEMIND.BO", "GAIL.BO", "GMRAIRPORT.BO", "GROWW.BO", "HONAUT.BO", "ICICIBANK.BO", "IDEA.BO", "IDFCFIRSTB.BO", "IIFL.BO", "INDHOTEL.BO", "INDIGO.BO", "IXIGO.BO", "JBCHEPHARM.BO", "JSWINFRA.BO", "KIRLOSBROS.BO", "KRBL.BO", "KRN.BO", "MOTHERSON.BO", "MSTCLTD.BO", "NBCC.BO", "NEOGEN.BO", "NETWEB.BO", "POWERMECH.BO", "PRUDENT.BO", "QUESS.BO", "RATEGAIN.BO", "RBA.BO", "SHRIPISTON.BO", "SMLMAH.BO", "SUPRIYA.BO", "SWSOLAR.BO", "TBOTEK.BO", "THANGAMAYL.BO", "AAVAS.BO", "AETHER.BO", "AJANTPHARM.BO", "ALKYLAMINE.BO", "AUBANK.BO", "BANKBARODA.BO", "BELRISE.BO", "BORORENEW.BO", "CHOLAFIN.BO", "COROMANDEL.BO", "EPL.BO", "FORTIS.BO", "HCC.BO", "HOMEFIRST.BO", "HYUNDAI.BO", "IFBIND.BO", "INTELLECT.BO", "JBMA.BO", "KEI.BO", "KPIL.BO", "KSB.BO", "MARKSANS.BO", "MMTC.BO", "MOTILALOFS.BO", "NEULANDLAB.BO", "NYKAA.BO", "OSWALPUMPS.BO", "PAGEIND.BO", "RKFORGE.BO", "SHAKTIPUMP.BO", "SURYAROSNI.BO", "TATACAP.BO", "THELEELA.BO", "AADHARHFC.BO", "ARVIND.BO", "ASHOKA.BO", "ATHERENERG.BO", "AUROPHARMA.BO", "BALAMINES.BO", "BANKINDIA.BO", "BIKAJI.BO", "CUB.BO", "EICHERMOT.BO", "HONASA.BO", "HSCL.BO", "IDBI.BO", "INDIANB.BO", "INDIGOPNTS.BO", "JYOTICNC.BO", "KIMS.BO", "KIRLOSENG.BO", "MEDANTA.BO", "MIDHANI.BO", "NAM-INDIA.BO", "NAZARA.BO", "OLECTRA.BO", "PARADEEP.BO", "PNB.BO", "POLYMED.BO", "PTCIL.BO", "RAIN.BO", "RAYMONDLSL.BO", "RELAXO.BO", "SANSERA.BO", "SHYAMMETL.BO", "SKIPPER.BO", "SRF.BO", "STAR.BO", "TATATECH.BO", "360ONE.BO", "ABCAPITAL.BO", "ANGELONE.BO", "APOLLOTYRE.BO", "BANDHANBNK.BO", "BHARATFORG.BO", "CANFINHOME.BO", "CARBORUNIV.BO", "CEATLTD.BO", "CHOLAHLDNG.BO", "CRAMC.BO", "CREDITACC.BO", "CSBBANK.BO", "DCBBANK.BO", "DIXON.BO", "DOMS.BO", "ELGIEQUIP.BO", "EMCURE.BO", "ERIS.BO", "GABRIEL.BO", "GAEL.BO", "GOKULAGRO.BO", "GREAVESCOT.BO", "GVT&D.BO", "IGIL.BO", "IKS.BO", "INDIAGLYCO.BO", "INDIASHLTR.BO", "ITI.BO", "JAMNAAUTO.BO", "JSWSTEEL.BO", "JUBLPHARMA.BO", "JUSTDIAL.BO", "KARURVYSYA.BO", "KPRMILL.BO", "LICHSGFIN.BO", "LLOYDSENGG.BO", "LLOYDSME.BO", "M&MFIN.BO", "MAHSEAMLES.BO", "MAXHEALTH.BO", "MINDACORP.BO", "MTARTECH.BO", "NIACL.BO", "NIVABUPA.BO", "POLYCAB.BO", "RADICO.BO", "RECLTD.BO", "RELIGARE.BO", "RRKABEL.BO", "SAREGAMA.BO", "SBIN.BO", "SHARDACROP.BO", "SHRIRAMFIN.BO", "SYNGENE.BO", "TATACOMM.BO", "TEGA.BO", "ANANDRATHI.BO", "ANUP.BO", "ASHOKLEY.BO", "AZAD.BO", "BAJFINANCE.BO", "BECTORFOOD.BO", "BERGEPAINT.BO", "BPCL.BO", "BRIGADE.BO", "BSE.BO", "CGPOWER.BO", "CRAFTSMAN.BO", "DATAMATICS.BO", "EIEL.BO", "ENGINERSIN.BO", "ENRIN.BO", "EXIDEIND.BO", "FACT.BO", "FLUOROCHEM.BO", "GLAND.BO", "GODFRYPHLP.BO", "GRASIM.BO", "HEROMOTOCO.BO", "HFCL.BO", "IGL.BO", "INOXWIND.BO", "IOC.BO", "JSL.BO", "KEC.BO", "LT.BO", "LXCHEM.BO", "MANAPPURAM.BO", "MARICO.BO", "MARUTI.BO", "MRPL.BO", "NSLNISP.BO", "OLAELEC.BO", "PCBL.BO", "PIIND.BO", "POONAWALLA.BO", "PRESTIGE.BO", "RAINBOW.BO", "RCF.BO", "REDINGTON.BO", "ROUTE.BO", "SCI.BO", "SHILPAMED.BO", "STLTECH.BO", "SUZLON.BO", "THERMAX.BO", "THOMASCOOK.BO", "THYROCARE.BO", "AARTIPHARM.BO", "ADANIGREEN.BO", "ADVENZYMES.BO", "ANANTRAJ.BO", "BALRAMCHIN.BO", "BIOCON.BO", "BLS.BO", "CAMS.BO", "CANBK.BO", "CENTRALBK.BO", "COLPAL.BO", "DBREALTY.BO", "DLF.BO", "FINCABLES.BO", "GNFC.BO", "GODREJCP.BO", "GRANULES.BO", "GRAVITA.BO", "HDFCBANK.BO", "HINDUNILVR.BO", "IIFLCAPS.BO", "INDIACEM.BO", "INDIAMART.BO", "INDUSINDBK.BO", "INOXINDIA.BO", "IRCON.BO", "JINDALSAW.BO", "JMFINANCIL.BO", "JSWCEMENT.BO", "LTFOODS.BO", "LUPIN.BO", "MCX.BO", "MEDPLUS.BO", "NCC.BO", "NMDC.BO", "PAYTM.BO", "PETRONET.BO", "PNBHOUSING.BO", "POLICYBZR.BO", "RAMCOCEM.BO", "RATNAMANI.BO", "SANDUMA.BO", "SUNDARMFIN.BO", "TATAINVEST.BO", "TDPOWERSYS.BO", "ABBOTINDIA.BO", "ADANIPOWER.BO", "AFCONS.BO", "AMBUJACEM.BO", "ATGL.BO", "AURIONPRO.BO", "AVANTIFEED.BO", "AWL.BO", "BBTC.BO", "BDL.BO", "BEML.BO", "BHARTIARTL.BO", "CARTRADE.BO", "CDSL.BO", "CHOICEIN.BO", "CIEINDIA.BO", "CYIENT.BO", "DBL.BO", "EDELWEISS.BO", "FEDFINA.BO", "FIVESTAR.BO", "FORCEMOT.BO", "GMDCLTD.BO", "GODREJIND.BO", "GODREJPROP.BO", "GRSE.BO", "HBLENGINE.BO", "HINDPETRO.BO", "IONEXCHANG.BO", "IPCALAB.BO", "IRB.BO", "JIOFIN.BO", "JKTYRE.BO", "JPPOWER.BO", "JWL.BO", "KAJARIACER.BO", "KANSAINER.BO", "LALPATHLAB.BO", "LATENTVIEW.BO", "LICI.BO", "LTTS.BO", "MANKIND.BO", "MAZDOCK.BO", "METROPOLIS.BO", "MRF.BO", "NETWORK18.BO", "NFL.BO", "NH.BO", "PGEL.BO", "PHOENIXLTD.BO", "POWERINDIA.BO", "RAILTEL.BO", "REDTAPE.BO", "RVNL.BO", "SCHAEFFLER.BO", "SJVN.BO", "SOBHA.BO", "SONACOMS.BO", "SUBROS.BO", "SUDARSCHEM.BO", "SUMICHEM.BO", "SUNPHARMA.BO", "SUNTECK.BO", "SUNTV.BO", "TANLA.BO", "TATACHEM.BO", "ACC.BO", "ACMESOLAR.BO", "ADANIENSOL.BO", "ALOKINDS.BO", "APLAPOLLO.BO", "APLLTD.BO", "BAJAJHLDNG.BO", "BIRLACORPN.BO", "CCL.BO", "CIPLA.BO", "CUMMINSIND.BO", "DIVISLAB.BO", "ECLERX.BO", "EIHOTEL.BO", "ETHOSLTD.BO", "FINPIPE.BO", "GRAPHITE.BO", "GSFC.BO", "HDBFS.BO", "HGINFRA.BO", "HUDCO.BO", "IRFC.BO", "JLHL.BO", "KNRCON.BO", "KPIGREEN.BO", "LAURUSLABS.BO", "LINDEINDIA.BO", "LUMAXTECH.BO", "MANYAVAR.BO", "MGL.BO", "MUTHOOTFIN.BO", "NEWGEN.BO", "NLCINDIA.BO", "OBEROIRLTY.BO", "ORIENTCEM.BO", "RENUKA.BO", "RITES.BO", "RPOWER.BO", "SBICARD.BO", "SENCO.BO", "SHREECEM.BO", "SWIGGY.BO", "AARTIDRUGS.BO", "AARTIIND.BO", "ABFRL.BO", "ASTRAL.BO", "BAJAJFINSV.BO", "BAJAJHFL.BO", "BATAINDIA.BO", "BHEL.BO", "BLUEDART.BO", "BLUESTARCO.BO", "BLUESTONE.BO", "BRITANNIA.BO", "CAMPUS.BO", "CANHLIFE.BO", "CLEAN.BO", "CONCOR.BO", "DEEPAKNTR.BO", "DELHIVERY.BO", "DRREDDY.BO", "ETERNAL.BO", "GPIL.BO", "HDFCAMC.BO", "HEG.BO", "IEX.BO", "INDUSTOWER.BO", "IOB.BO", "IREDA.BO", "ITC.BO", "ITCHOTELS.BO", "JINDALSTEL.BO", "KALYANKJIL.BO", "M&M.BO", "MOIL.BO", "NHPC.BO", "PATANJALI.BO", "PURVA.BO", "RELIANCE.BO", "SAIL.BO", "SCHNEIDER.BO", "STARHEALTH.BO", "ABREL.BO", "ASHOKLEY.BO", "BHARTIHEXA.BO", "CASTROLIND.BO", "CHENNPETRO.BO", "COCHINSHIP.BO", "DABUR.BO", "DALBHARAT.BO", "EMAMILTD.BO", "GODIGIT.BO", "GODREJAGRO.BO", "HAPPSTMNDS.BO", "HAVELLS.BO", "HCG.BO", "HINDCOPPER.BO", "HINDZINC.BO", "IRCTC.BO", "JKCEMENT.BO", "KAYNES.BO", "KPITTECH.BO", "MAPMYINDIA.BO", "MPHASIS.BO", "NATCOPHARM.BO", "NAUKRI.BO", "PFC.BO", "PFIZER.BO", "PNCINFRA.BO", "SKFINDIA.BO", "3MINDIA.BO", "ABB.BO", "ADANIENT.BO", "AIAENG.BO", "AMBER.BO", "BEL.BO", "CRISIL.BO", "DEVYANI.BO", "EIDPARRY.BO", "ENDURANCE.BO", "FIRSTCRY.BO", "GHCL.BO", "HERITGFOOD.BO", "JAIBALAJI.BO", "JKLAKSHMI.BO", "JSWENERGY.BO", "JUBLFOOD.BO", "JUBLINGREA.BO", "JYOTHYLAB.BO", "KFINTECH.BO", "LEMONTREE.BO", "MFSL.BO", "NATIONALUM.BO", "NAVA.BO", "NESTLEIND.BO", "PRAJIND.BO", "SANOFICONR.BO", "SAPPHIRE.BO", "STYRENIX.BO", "TCS.BO", "AFFLE.BO", "BAJAJ-AUTO.BO", "BALKRISIND.BO", "BSOFT.BO", "COALINDIA.BO", "CROMPTON.BO", "ESCORTS.BO", "FSL.BO", "GESHIP.BO", "GICRE.BO", "GILLETTE.BO", "HAL.BO", "HDFCLIFE.BO", "ICICIPRULI.BO", "MSUMI.BO", "NTPCGREEN.BO", "OFSS.BO", "PVRINOX.BO", "SARDAEN.BO", "SBFC.BO", "SIEMENS.BO", "SUPREMEIND.BO", "TATAELXSI.BO", "ALKEM.BO", "GLAXO.BO", "HINDALCO.BO", "NTPC.BO", "ONESOURCE.BO", "SOLARINDS.BO", "SONATSOFTW.BO", "TATAPOWER.BO", "TATASTEEL.BO", "ATUL.BO", "CENTURYPLY.BO", "CESC.BO", "COFORGE.BO", "DMART.BO", "ICICIGI.BO", "INFY.BO", "MASTEK.BO", "OIL.BO", "ONGC.BO", "PERSISTENT.BO", "POWERGRID.BO", "TATACONSUM.BO", "TECHM.BO", "HCLTECH.BO", "SBILIFE.BO", "TIINDIA.BO", "TIMKEN.BO", "TITAGARH.BO", "TITAN.BO", "TMB.BO", "TVSMOTOR.BO", "TORNTPHARM.BO", "TORNTPOWER.BO", "TRIDENT.BO", "TRIVENI.BO", "UBL.BO", "UCOBANK.BO", "UJJIVANSFB.BO", "ULTRACEMCO.BO", "UNIONBANK.BO", "UNOMINDA.BO", "UPL.BO", "USHAMART.BO", "UTIAMC.BO", "VAIBHAVGBL.BO", "VBL.BO", "VEDL.BO", "VGUARD.BO", "VIJAYA.BO", "VOLTAS.BO", "WAAREEENER.BO", "WABAG.BO", "WELCORP.BO", "WELSPUNLIV.BO", "WHIRLPOOL.BO", "WIPRO.BO", "WOCKPHARMA.BO", "YATHARTH.BO", "YESBANK.BO", "ZAGGLE.BO", "ZEEL.BO", "ZENSARTECH.BO", "ZENTEC.BO", "ZFCVINDIA.BO", "ZYDUSLIFE.BO", "ZYDUSWELL.BO"];

  // Map BSE symbols to NSE for history (Yahoo Finance has better history for .NS)
  const NSE_MAP = {};
  STOCKS.forEach(s => { NSE_MAP[s] = s.replace('.BO', '.NS'); });

  let _quotes = {};
  let _selected = null;

  const init = async () => {
    renderList(STOCKS);
    setupSearch();
  };

  const loadList = async () => {
    // Fetch using NSE equivalent for reliability, display as BSE
    const nseSymbols = STOCKS.map(s => NSE_MAP[s]);
    const quotes = await API.getMultipleQuotes(nseSymbols);
    quotes.forEach((q, i) => {
      if (q) {
        const bseSym = STOCKS[i];
        _quotes[bseSym] = { ...q, symbol: bseSym, exchange: 'BSE' };
      }
    });
    renderList(STOCKS);
  };

  const renderList = (symbols) => {
    const container = document.getElementById('bseStockList');
    if (!container) return;
    container.innerHTML = symbols.map(sym => {
      const q = _quotes[sym] || FALLBACK.getQuote(sym);
      const displaySym = sym.replace('.BO', '');
      const positive = q.changePct >= 0;
      return `<div class="stock-item ${_selected === sym ? 'active' : ''}" data-symbol="${FMT.escHtml(sym)}" role="button" tabindex="0">
        <div class="stock-item-info">
          <div class="stock-item-symbol">${FMT.escHtml(displaySym)}</div>
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

    if (!_selected && symbols.length > 0) selectStock(symbols[0]);
  };

  const selectStock = async (symbol) => {
    _selected = symbol;

    document.querySelectorAll('#bseStockList .stock-item').forEach(el => {
      el.classList.toggle('active', el.dataset.symbol === symbol);
    });

    const q = _quotes[symbol] || FALLBACK.getQuote(symbol);
    renderDetail(q);

    Charts.showChartLoading('bseDetailChart');
    const nseSymbol = NSE_MAP[symbol] || symbol;
    try {
      const [liveQ, hist] = await Promise.all([
        API.getQuote(nseSymbol),
        API.getHistory(nseSymbol, '3mo')
      ]);
      const bseQ = { ...liveQ, symbol, exchange: 'BSE' };
      _quotes[symbol] = bseQ;
      renderDetail(bseQ);
      Charts.renderChart('bseDetailChart', hist, 'candlestick');
    } catch (e) {
      const hist = await API.getHistory(nseSymbol, '3mo');
      Charts.renderChart('bseDetailChart', hist, 'candlestick');
    }
  };

  const renderDetail = (q) => {
    const container = document.getElementById('bseDetail');
    if (!container) return;
    const sym = q.symbol.replace('.BO', '');
    const positive = q.changePct >= 0;

    container.innerHTML = `
      <div class="stock-detail-header">
        <div class="stock-detail-title">
          <div class="sd-symbol">${FMT.escHtml(sym)}</div>
          <div class="sd-name">${FMT.escHtml(q.name || sym)}</div>
          <div class="sd-exchange"><span class="segment-badge badge-bse">BSE</span></div>
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
        <div class="chart-type-toggle" id="bseChartTypeToggle">
          <button class="chart-type-btn active" data-type="candlestick">Candle</button>
          <button class="chart-type-btn" data-type="line">Line</button>
          <button class="chart-type-btn" data-type="area">Area</button>
        </div>
        <div class="time-range-group" id="bseTimeRange">
          <button class="time-btn" data-range="1d">1D</button>
          <button class="time-btn" data-range="5d">5D</button>
          <button class="time-btn active" data-range="3mo">3M</button>
          <button class="time-btn" data-range="6mo">6M</button>
          <button class="time-btn" data-range="1y">1Y</button>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-left:auto;">
          <span style="font-size:0.75rem;color:var(--text-secondary);font-weight:600">Period:</span>
          <select class="select-styled" style="padding:4px 8px;font-size:0.75rem;width:auto;border-radius:4px;background:var(--bg-3);border:1px solid var(--border-primary);color:var(--text-primary);" id="bseInterval">
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
      <div class="chart-container" id="bseDetailChart" style="height:260px"></div>
      <div class="stats-grid">
        <div class="stat-item"><div class="stat-label">Open</div><div class="stat-value">₹${FMT.price(q.open)}</div></div>
        <div class="stat-item"><div class="stat-label">High</div><div class="stat-value" style="color:var(--color-positive)">₹${FMT.price(q.high)}</div></div>
        <div class="stat-item"><div class="stat-label">Low</div><div class="stat-value" style="color:var(--color-negative)">₹${FMT.price(q.low)}</div></div>
        <div class="stat-item"><div class="stat-label">Volume</div><div class="stat-value">${FMT.volume(q.volume)}</div></div>
        <div class="stat-item"><div class="stat-label">52W High</div><div class="stat-value" style="color:var(--color-positive)">₹${FMT.price(q.week52High)}</div></div>
        <div class="stat-item"><div class="stat-label">52W Low</div><div class="stat-value" style="color:var(--color-negative)">₹${FMT.price(q.week52Low)}</div></div>
      </div>
      <div class="modal-actions" style="margin-top:14px">
        <button class="btn btn-success"><i class="ri-arrow-up-line"></i> Buy</button>
        <button class="btn btn-danger"><i class="ri-arrow-down-line"></i> Sell</button>
        <button class="btn btn-ghost" onclick="AppState.openStockModal('${FMT.escHtml(q.symbol)}')"><i class="ri-fullscreen-line"></i> Expand</button>
      </div>`;

    container.querySelector('#bseChartTypeToggle')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.chart-type-btn');
      if (!btn) return;
      container.querySelectorAll('.chart-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const range = container.querySelector('#bseTimeRange .time-btn.active')?.dataset.range || '3mo';
      const interval = container.querySelector('#bseInterval')?.value || '1d';
      Charts.showChartLoading('bseDetailChart');
      const nseSymbol = NSE_MAP[_selected] || _selected;
      const hist = await API.getHistory(nseSymbol, range, interval);
      Charts.renderChart('bseDetailChart', hist, btn.dataset.type);
    });

    container.querySelector('#bseTimeRange')?.addEventListener('click', async (e) => {
      const btn = e.target.closest('.time-btn');
      if (!btn) return;
      container.querySelectorAll('#bseTimeRange .time-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const type = container.querySelector('#bseChartTypeToggle .chart-type-btn.active')?.dataset.type || 'candlestick';
      
      let interval = container.querySelector('#bseInterval')?.value || '1d';
      if (interval.endsWith('m') && !['1d', '5d'].includes(btn.dataset.range)) {
        interval = '1d';
        const intervalEl = container.querySelector('#bseInterval');
        if (intervalEl) intervalEl.value = '1d';
      }
      
      Charts.showChartLoading('bseDetailChart');
      const nseSymbol = NSE_MAP[_selected] || _selected;
      const hist = await API.getHistory(nseSymbol, btn.dataset.range, interval);
      Charts.renderChart('bseDetailChart', hist, type);
    });

    container.querySelector('#bseInterval')?.addEventListener('change', async () => {
      const interval = container.querySelector('#bseInterval').value;
      let range = container.querySelector('#bseTimeRange .time-btn.active')?.dataset.range || '3mo';
      
      if (interval.endsWith('m')) {
        const mins = parseInt(interval);
        if (mins <= 4 || mins === 7) {
          range = '1d';
        } else if (mins <= 20) {
          range = '5d';
        } else {
          range = '1mo';
        }
        
        container.querySelectorAll('#bseTimeRange .time-btn').forEach(b => {
          b.classList.toggle('active', b.dataset.range === range);
        });
      }
      
      const type = container.querySelector('#bseChartTypeToggle .chart-type-btn.active')?.dataset.type || 'candlestick';
      Charts.showChartLoading('bseDetailChart');
      const nseSymbol = NSE_MAP[_selected] || _selected;
      const hist = await API.getHistory(nseSymbol, range, interval);
      Charts.renderChart('bseDetailChart', hist, type);
    });
  };

  const setupSearch = () => {
    const input = document.getElementById('bseSearch');
    if (!input) return;
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { renderList(STOCKS); return; }
      const filtered = STOCKS.filter(s => {
        const d = s.replace('.BO', '').toLowerCase();
        const name = (_quotes[s]?.name || '').toLowerCase();
        return d.includes(q) || name.includes(q);
      });
      renderList(filtered);
    });
  };

  const refresh = async () => { await loadList(); if (_selected) selectStock(_selected); };

  return { init, refresh };
})();
