'use strict';

/* ============================================================
   SAMADHAN TRADING — TECHNICAL BREAKOUT SCANNER MODULE
   Breakout signals based on WMA alignments, EMA and RSI
   ============================================================ */

const Scanner = (() => {

  // ── DISPLAY MAPS ──
  const SIGNAL_DISPLAY = { BUY: 'LONG', WATCH: 'IN SETUP', FAIL: 'NEUTRAL' };

  const sourceLabel = (s) => {
    if (s === 'yahoo') return 'YFN';
    if (s === 'stooq') return 'STOOQ';
    if (s === 'simulated') return 'SIM';
    return 'ERR';
  };

  // ── STOCK UNIVERSE ──
  const ALL_STOCKS = [
    ["ABDL","Tobacco - Alcohol"],["AKUMS","Pharma"],["APARINDS","Electric Equipments"],["ASIANPAINT","Paints - Pigments"],["AVALON","IT - Hardware"],["BOSCHLTD","Auto Ancillary"],["CAPLIPOINT","Pharma"],["CERA","Ceramics"],["CGCL","Finance - Investment - Management"],["CUPID","FMCG"],["DATAPATTNS","Defence"],["EQUITASBNK","Banks"],["FEDERALBNK","Banks"],["ICIL","Textile"],["IFCI","Finance - Housing - NBFC"],["INOXGREEN","Engineering - Construction"],["J&KBANK","Banks"],["KOTAKBANK","Banks"],["KTKBANK","Banks"],["MAHABANK","Banks"],["NAVINFLUOR","Chemicals"],["NUVAMA","Finance - Investment - Management"],["PARAS","Defence"],["PIDILITIND","Chemicals"],["PIRAMALFIN","Finance - Housing - NBFC"],["PRIVISCL","Chemicals"],["QPOWER","Electric Equipments"],["RBLBANK","Banks"],["SAATVIKGL","IT - Hardware"],["SAILIFE","Pharma"],["SFL","FMCG"],["SOUTHBANK","Banks"],["SPARC","Trading"],["STYL","Finance - Investment - Management"],["SYRMA","IT - Hardware"],["TEJASNET","Telecommunication"],["ABSLAMC","Finance - Investment - Management"],["ACE","Construction"],["ADANIPORTS","Infrastructure"],["AEGISLOG","Trading"],["AEGISVOPAK","Trading"],["AIIL","Finance - Investment - Management"],["ANTHEM","Pharma"],["APOLLOHOSP","Hospital - Healthcare Services"],["APTUS","Finance - Housing - NBFC"],["ASTERDM","Hospital - Healthcare Services"],["ASTRAMICRO","Defence"],["AXISBANK","Banks"],["BANCOINDIA","Auto Ancillary"],["BLUEJET","Pharma"],["CHAMBLFERT","Fertilizers - Pesticides"],["CONCORDBIO","Pharma"],["DEEPAKFERT","Chemicals"],["DIACABS","Cable"],["ELECON","Engg - Industrial Equipments"],["FIEMIND","Auto Ancillary"],["GAIL","Oil - Gas"],["GMRAIRPORT","Travel"],["GROWW","Finance - Investment - Management"],["HONAUT","Consumer Durables"],["ICICIBANK","Banks"],["IDEA","Telecommunication"],["IDFCFIRSTB","Banks"],["IIFL","Finance - Housing - NBFC"],["INDHOTEL","Hotels"],["INDIGO","Travel"],["IXIGO","Travel"],["JBCHEPHARM","Pharma"],["JSWINFRA","Infrastructure"],["KIRLOSBROS","Engg - Industrial Equipments"],["KRBL","Food"],["KRN","Engg - Industrial Equipments"],["MOTHERSON","Auto Ancillary"],["MSTCLTD","Trading"],["NBCC","Construction"],["NEOGEN","Chemicals"],["NETWEB","IT - Hardware"],["POWERMECH","Engineering - Construction"],["PRUDENT","Finance - Investment - Management"],["QUESS","IT - BPO - ITeS"],["RATEGAIN","IT - Software"],["RBA","Hotels"],["SHRIPISTON","Auto Ancillary"],["SMLMAH","Auto"],["SUPRIYA","Pharma"],["SWSOLAR","Engineering - Construction"],["TBOTEK","Travel"],["THANGAMAYL","Diamond - Jewellery"],["AAVAS","Finance - Housing - NBFC"],["AETHER","Chemicals"],["AJANTPHARM","Pharma"],["ALKYLAMINE","Chemicals"],["AUBANK","Banks"],["BANKBARODA","Banks"],["BELRISE","Auto Ancillary"],["BORORENEW","Manufacturing"],["CHOLAFIN","Finance - Housing - NBFC"],["COROMANDEL","Fertilizers - Pesticides"],["EPL","Packaging"],["FORTIS","Hospital - Healthcare Services"],["HCC","Engineering - Construction"],["HOMEFIRST","Finance - Housing - NBFC"],["HYUNDAI","Auto"],["IFBIND","Consumer Durables"],["INTELLECT","IT - Software"],["JBMA","Auto Ancillary"],["KEI","Cable"],["KPIL","Engineering - Construction"],["KSB","Engg - Industrial Equipments"],["MARKSANS","Pharma"],["MMTC","Trading"],["MOTILALOFS","Finance - Stock Broking"],["NEULANDLAB","Pharma"],["NYKAA","Retail"],["OSWALPUMPS","Engg - Industrial Equipments"],["PAGEIND","Textile"],["RKFORGE","Forgings"],["SHAKTIPUMP","Engg - Industrial Equipments"],["SURYAROSNI","Metals - Steel - Iron Products"],["TATACAP","Finance - Housing - NBFC"],["THELEELA","Hotels"],["AADHARHFC","Finance - Housing - NBFC"],["ARVIND","Textile"],["ASHOKA","Engineering - Construction"],["ATHERENERG","Auto"],["AUROPHARMA","Pharma"],["BALAMINES","Chemicals"],["BANKINDIA","Banks"],["BIKAJI","Food"],["CUB","Banks"],["EICHERMOT","Auto"],["HONASA","Trading"],["HSCL","Chemicals"],["IDBI","Banks"],["INDIANB","Banks"],["INDIGOPNTS","Paints - Pigments"],["JYOTICNC","Engg - Industrial Equipments"],["KIMS","Hospital - Healthcare Services"],["KIRLOSENG","Engg - Industrial Equipments"],["MEDANTA","Hospital - Healthcare Services"],["MIDHANI","Metals - Steel - Iron Products"],["NAM-INDIA","Finance - Investment - Management"],["NAZARA","IT - Software"],["OLECTRA","Auto"],["PARADEEP","Fertilizers - Pesticides"],["PNB","Banks"],["POLYMED","Hospital - Healthcare Services"],["PTCIL","Forgings"],["RAIN","Chemicals - Petrochem"],["RAYMONDLSL","Textile"],["RELAXO","Footwear"],["SANSERA","Auto Ancillary"],["SHYAMMETL","Metals - Steel - Iron Products"],["SKIPPER","Engg - Industrial Equipments"],["SRF","Chemicals"],["STAR","Pharma"],["TATATECH","IT - Software"],["360ONE","Finance - Stock Broking"],["ABCAPITAL","Finance - Housing - NBFC"],["ANGELONE","Finance - Stock Broking"],["APOLLOTYRE","Tyres"],["BANDHANBNK","Banks"],["BHARATFORG","Forgings"],["CANFINHOME","Finance - Housing - NBFC"],["CARBORUNIV","Manufacturing"],["CEATLTD","Tyres"],["CHOLAHLDNG","Finance - Investment - Management"],["CRAMC","Finance - Investment - Management"],["CREDITACC","Finance - Housing - NBFC"],["CSBBANK","Banks"],["DCBBANK","Banks"],["DIXON","Consumer Durables"],["DOMS","Paper - Printing"],["ELGIEQUIP","Engg - Industrial Equipments"],["EMCURE","Pharma"],["ERIS","Pharma"],["GABRIEL","Auto Ancillary"],["GAEL","Chemicals"],["GOKULAGRO","Food"],["GREAVESCOT","Engg - Industrial Equipments"],["GVT&D","Electric Equipments"],["IGIL","Trading"],["IKS","IT - BPO - ITeS"],["INDIAGLYCO","Tobacco - Alcohol"],["INDIASHLTR","Finance - Housing - NBFC"],["ITI","Telecommunication"],["JAMNAAUTO","Auto Ancillary"],["JSWSTEEL","Metals - Steel - Iron Products"],["JUBLPHARMA","Pharma"],["JUSTDIAL","Trading"],["KARURVYSYA","Banks"],["KPRMILL","Textile"],["LICHSGFIN","Finance - Housing - NBFC"],["LLOYDSENGG","Engg - Industrial Equipments"],["LLOYDSME","Metals - Steel - Iron Products"],["M&MFIN","Finance - Housing - NBFC"],["MAHSEAMLES","Metals - Steel - Iron Products"],["MAXHEALTH","Hospital - Healthcare Services"],["MINDACORP","Auto Ancillary"],["MTARTECH","Engineering"],["NIACL","Insurance"],["NIVABUPA","Insurance"],["POLYCAB","Cable"],["RADICO","Tobacco - Alcohol"],["RECLTD","Finance - Housing - NBFC"],["RELIGARE","Finance - Investment - Management"],["RRKABEL","Cable"],["SAREGAMA","Media"],["SBIN","Banks"],["SHARDACROP","Fertilizers - Pesticides"],["SHRIRAMFIN","Finance - Housing - NBFC"],["SYNGENE","Trading"],["TATACOMM","Telecommunication"],["TEGA","Engg - Industrial Equipments"],["ANANDRATHI","Finance - Investment - Management"],["ANUP","Engg - Industrial Equipments"],["ASHOKLEY","Auto"],["AZAD","Engg - Industrial Equipments"],["BAJFINANCE","Finance - Housing - NBFC"],["BECTORFOOD","Food"],["BERGEPAINT","Paints - Pigments"],["BPCL","Oil - Gas"],["BRIGADE","Construction"],["BSE","Finance - Investment - Management"],["CGPOWER","Electric Equipments"],["CRAFTSMAN","Auto Ancillary"],["DATAMATICS","IT - Software"],["EIEL","Engineering - Construction"],["ENGINERSIN","Engineering"],["ENRIN","Electric Equipments"],["EXIDEIND","Batteries"],["FACT","Fertilizers - Pesticides"],["FLUOROCHEM","Chemicals"],["GLAND","Pharma"],["GODFRYPHLP","Tobacco - Alcohol"],["GRASIM","Trading"],["HEROMOTOCO","Auto"],["HFCL","Telecommunication"],["IGL","Oil - Gas"],["INOXWIND","Electric Equipments"],["IOC","Oil - Gas"],["JSL","Metals - Steel - Iron Products"],["KEC","Engineering - Construction"],["LT","Engineering - Construction"],["LXCHEM","Chemicals"],["MANAPPURAM","Finance - Housing - NBFC"],["MARICO","Food"],["MARUTI","Auto"],["MRPL","Oil - Gas"],["NSLNISP","Metals - Steel - Iron Products"],["OLAELEC","Auto"],["PCBL","Chemicals"],["PIIND","Fertilizers - Pesticides"],["POONAWALLA","Finance - Housing - NBFC"],["PRESTIGE","Construction"],["RAINBOW","Hospital - Healthcare Services"],["RCF","Fertilizers - Pesticides"],["REDINGTON","Trading"],["ROUTE","IT - Software"],["SCI","Ship - Ship Building"],["SHILPAMED","Pharma"],["STLTECH","Cable"],["SUZLON","Electric Equipments"],["THERMAX","Engg - Industrial Equipments"],["THOMASCOOK","Travel"],["THYROCARE","Hospital - Healthcare Services"],["AARTIPHARM","Pharma"],["ADANIGREEN","Power"],["ADVENZYMES","Pharma"],["ANANTRAJ","Construction"],["BALRAMCHIN","Sugar"],["BIOCON","Pharma"],["BLS","Trading"],["CAMS","Finance - Investment - Management"],["CANBK","Banks"],["CENTRALBK","Banks"],["COLPAL","FMCG"],["DBREALTY","Construction"],["DLF","Construction"],["FINCABLES","Cable"],["GNFC","Chemicals"],["GODREJCP","FMCG"],["GRANULES","Pharma"],["GRAVITA","Metals - Non Ferrous"],["HDFCBANK","Banks"],["HINDUNILVR","FMCG"],["IIFLCAPS","Finance - Stock Broking"],["INDIACEM","Cement"],["INDIAMART","Retail"],["INDUSINDBK","Banks"],["INOXINDIA","Engg - Industrial Equipments"],["IRCON","Engineering - Construction"],["JINDALSAW","Metals - Steel - Iron Products"],["JMFINANCIL","Finance - Investment - Management"],["JSWCEMENT","Cement"],["LTFOODS","Food"],["LUPIN","Pharma"],["MCX","Finance - Stock Broking"],["MEDPLUS","Retail"],["NCC","Engineering - Construction"],["NMDC","Mining"],["PAYTM","Finance - Investment - Management"],["PETRONET","Chemicals"],["PNBHOUSING","Finance - Housing - NBFC"],["POLICYBZR","Finance - Investment - Management"],["RAMCOCEM","Cement"],["RATNAMANI","Metals - Steel - Iron Products"],["SANDUMA","Mining"],["SUNDARMFIN","Finance - Housing - NBFC"],["TATAINVEST","Finance - Housing - NBFC"],["TDPOWERSYS","Electric Equipments"],["ABBOTINDIA","Pharma"],["ADANIPOWER","Power"],["AFCONS","Engineering - Construction"],["AMBUJACEM","Cement"],["ATGL","Oil - Gas"],["AURIONPRO","IT - Software"],["AVANTIFEED","Agriculture"],["AWL","Food"],["BBTC","Agriculture"],["BDL","Defence"],["BEML","Construction"],["BHARTIARTL","Telecommunication"],["CARTRADE","Auto"],["CDSL","Finance - Investment - Management"],["CHOICEIN","Finance - Stock Broking"],["CIEINDIA","Auto Ancillary"],["CYIENT","IT - Software"],["DBL","Construction"],["EDELWEISS","Finance - Housing - NBFC"],["FEDFINA","Finance - Housing - NBFC"],["FIVESTAR","Finance - Housing - NBFC"],["FORCEMOT","Auto"],["GMDCLTD","Mining"],["GODREJIND","Chemicals"],["GODREJPROP","Construction"],["GRSE","Ship - Ship Building"],["HBLENGINE","Batteries"],["HINDPETRO","Oil - Gas"],["IONEXCHANG","Water Treatment"],["IPCALAB","Pharma"],["IRB","Engineering - Construction"],["JIOFIN","Finance - Housing - NBFC"],["JKTYRE","Tyres"],["JPPOWER","Power"],["JWL","Railway"],["KAJARIACER","Ceramics"],["KANSAINER","Paints - Pigments"],["LALPATHLAB","Hospital - Healthcare Services"],["LATENTVIEW","Trading"],["LICI","Insurance"],["LTTS","IT - Software"],["MANKIND","Pharma"],["MAZDOCK","Ship - Ship Building"],["METROPOLIS","Hospital - Healthcare Services"],["MRF","Tyres"],["NETWORK18","Media"],["NFL","Fertilizers - Pesticides"],["NH","Hospital - Healthcare Services"],["PGEL","Consumer Durables"],["PHOENIXLTD","Construction"],["POWERINDIA","Electric Equipments"],["RAILTEL","Telecommunication"],["REDTAPE","Retail"],["RVNL","Engineering - Construction"],["SCHAEFFLER","Bearings"],["SJVN","Power"],["SOBHA","Construction"],["SONACOMS","Auto Ancillary"],["SUBROS","Auto Ancillary"],["SUDARSCHEM","Chemicals - Dyes - Pigments"],["SUMICHEM","Fertilizers - Pesticides"],["SUNPHARMA","Pharma"],["SUNTECK","Construction"],["SUNTV","Media"],["TANLA","IT - Software"],["TATACHEM","Chemicals"],["ACC","Cement"],["ACMESOLAR","Power"],["ADANIENSOL","Power"],["ALOKINDS","Textile"],["APLAPOLLO","Metals - Steel - Iron Products"],["APLLTD","Pharma"],["BAJAJHLDNG","Finance - Housing - NBFC"],["BIRLACORPN","Cement"],["CCL","Tea - Coffee"],["CIPLA","Pharma"],["CUMMINSIND","Engg - Industrial Equipments"],["DIVISLAB","Pharma"],["ECLERX","IT - BPO - ITeS"],["EIHOTEL","Hotels"],["ETHOSLTD","Retail"],["FINPIPE","Plastic"],["GRAPHITE","Manufacturing"],["GSFC","Fertilizers - Pesticides"],["HDBFS","Finance - Housing - NBFC"],["HGINFRA","Engineering - Construction"],["HUDCO","Finance - Housing - NBFC"],["IRFC","Finance - Housing - NBFC"],["JLHL","Hospital - Healthcare Services"],["KNRCON","Engineering - Construction"],["KPIGREEN","Engineering - Construction"],["LAURUSLABS","Pharma"],["LINDEINDIA","Chemicals"],["LUMAXTECH","Auto Ancillary"],["MANYAVAR","Textile"],["MGL","Oil - Gas"],["MUTHOOTFIN","Finance - Housing - NBFC"],["NEWGEN","IT - Software"],["NLCINDIA","Power"],["OBEROIRLTY","Construction"],["ORIENTCEM","Cement"],["RENUKA","Sugar"],["RITES","Engineering"],["RPOWER","Power"],["SBICARD","Finance - Housing - NBFC"],["SENCO","Diamond - Jewellery"],["SHREECEM","Cement"],["SWIGGY","Retail"],["AARTIDRUGS","Pharma"],["AARTIIND","Chemicals"],["ABFRL","Retail"],["ASTRAL","Plastic"],["BAJAJFINSV","Finance - Investment - Management"],["BAJAJHFL","Finance - Housing - NBFC"],["BATAINDIA","Footwear"],["BHEL","Engg - Industrial Equipments"],["BLUEDART","Logistics"],["BLUESTARCO","Consumer Durables"],["BLUESTONE","Diamond - Jewellery"],["BRITANNIA","Food"],["CAMPUS","Footwear"],["CANHLIFE","Insurance"],["CLEAN","Chemicals"],["CONCOR","Logistics"],["DEEPAKNTR","Chemicals"],["DELHIVERY","Logistics"],["DRREDDY","Pharma"],["ETERNAL","Retail"],["GPIL","Metals - Steel - Iron Products"],["HDFCAMC","Finance - Investment - Management"],["HEG","Manufacturing"],["IEX","Power"],["INDUSTOWER","Telecommunication"],["IOB","Banks"],["IREDA","Finance - Housing - NBFC"],["ITC","Tobacco - Alcohol"],["ITCHOTELS","Hotels"],["JINDALSTEL","Metals - Steel - Iron Products"],["KALYANKJIL","Diamond - Jewellery"],["M&M","Auto"],["MOIL","Mining"],["NHPC","Power"],["PATANJALI","Food"],["PURVA","Construction"],["RELIANCE","Oil - Gas"],["SAIL","Metals - Steel - Iron Products"],["SCHNEIDER","Electric Equipments"],["STARHEALTH","Insurance"],["ABREL","Construction"],["ASHOKLEY","Auto"],["BHARTIHEXA","Telecommunication"],["CASTROLIND","Oil - Gas"],["CHENNPETRO","Oil - Gas"],["COCHINSHIP","Ship - Ship Building"],["DABUR","FMCG"],["DALBHARAT","Cement"],["EMAMILTD","FMCG"],["GODIGIT","Insurance"],["GODREJAGRO","Agriculture"],["HAPPSTMNDS","IT - Software"],["HAVELLS","Electric Equipments"],["HCG","Hospital - Healthcare Services"],["HINDCOPPER","Metals - Non Ferrous"],["HINDZINC","Metals - Non Ferrous"],["IRCTC","Travel"],["JKCEMENT","Cement"],["KAYNES","IT - Hardware"],["KPITTECH","IT - Software"],["MAPMYINDIA","IT - Software"],["MPHASIS","IT - Software"],["NATCOPHARM","Pharma"],["NAUKRI","IT - BPO - ITeS"],["PFC","Finance - Housing - NBFC"],["PFIZER","Pharma"],["PNCINFRA","Engineering - Construction"],["SKFINDIA","Bearings"],["3MINDIA","Trading"],["ABB","Electric Equipments"],["ADANIENT","Trading"],["AIAENG","Forgings"],["AMBER","Consumer Durables"],["BEL","Defence"],["CRISIL","Finance - Investment - Management"],["DEVYANI","Food"],["EIDPARRY","Sugar"],["ENDURANCE","Auto Ancillary"],["FIRSTCRY","Retail"],["GHCL","Chemicals"],["HERITGFOOD","Food"],["JAIBALAJI","Metals - Steel - Iron Products"],["JKLAKSHMI","Cement"],["JSWENERGY","Power"],["JUBLFOOD","Food"],["JUBLINGREA","Chemicals"],["JYOTHYLAB","FMCG"],["KFINTECH","Finance - Investment - Management"],["LEMONTREE","Hotels"],["MFSL","Finance - Investment - Management"],["NATIONALUM","Metals - Non Ferrous"],["NAVA","Power"],["NESTLEIND","Food"],["PRAJIND","Engg - Industrial Equipments"],["SANOFICONR","Pharma"],["SAPPHIRE","Food"],["STYRENIX","Chemicals"],["TCS","IT - Software"],["AFFLE","IT - BPO - ITeS"],["BAJAJ-AUTO","Auto"],["BALKRISIND","Tyres"],["BSOFT","IT - Software"],["COALINDIA","Mining"],["CROMPTON","Consumer Durables"],["ESCORTS","Auto"],["FSL","IT - BPO - ITeS"],["GESHIP","Ship - Ship Building"],["GICRE","Insurance"],["GILLETTE","FMCG"],["HAL","Defence"],["HDFCLIFE","Insurance"],["ICICIPRULI","Insurance"],["MSUMI","Auto Ancillary"],["NTPCGREEN","Power"],["OFSS","IT - Software"],["PVRINOX","Media"],["SARDAEN","Metals - Steel - Iron Products"],["SBFC","Finance - Housing - NBFC"],["SIEMENS","Electric Equipments"],["SUPREMEIND","Plastic"],["TATAELXSI","IT - Software"],["ALKEM","Pharma"],["GLAXO","Pharma"],["HINDALCO","Metals - Non Ferrous"],["NTPC","Power"],["ONESOURCE","Pharma"],["SOLARINDS","Chemicals"],["SONATSOFTW","IT - Software"],["TATAPOWER","Power"],["TATASTEEL","Metals - Steel - Iron Products"],["ATUL","Chemicals"],["CENTURYPLY","Manufacturing"],["CESC","Power"],["COFORGE","IT - Software"],["DMART","Retail"],["ICICIGI","Insurance"],["INFY","IT - Software"],["MASTEK","IT - Software"],["OIL","Oil - Gas"],["ONGC","Oil - Gas"],["PERSISTENT","IT - Software"],["POWERGRID","Power"],["TATACONSUM","Tea - Coffee"],["TECHM","IT - Software"],["HCLTECH","IT - Software"],["SBILIFE","Insurance"],["TIINDIA","Auto Ancillary"],["TIMKEN","Bearings"],["TITAGARH","Railway"],["TITAN","Diamond - Jewellery"],["TMB","Banks"],["TVSMOTOR","Auto"],["TORNTPHARM","Pharma"],["TORNTPOWER","Power"],["TRIDENT","Textile - Spinning - Weaving"],["TRIVENI","Sugar"],["UBL","Tobacco - Alcohol"],["UCOBANK","Banks"],["UJJIVANSFB","Banks"],["ULTRACEMCO","Cement"],["UNIONBANK","Banks"],["UNOMINDA","Auto Ancillary"],["UPL","Fertilizers - Pesticides"],["USHAMART","Metals - Steel - Iron Products"],["UTIAMC","Finance - Investment - Management"],["VAIBHAVGBL","Diamond - Jewellery"],["VBL","Food"],["VEDL","Metals - Non Ferrous"],["VGUARD","Electric Equipments"],["VIJAYA","Hospital - Healthcare Services"],["VOLTAS","Consumer Durables"],["WAAREEENER","Electric Equipments"],["WABAG","Water Treatment"],["WELCORP","Metals - Steel - Iron Products"],["WELSPUNLIV","Textile"],["WHIRLPOOL","Consumer Durables"],["WIPRO","IT - Software"],["WOCKPHARMA","Pharma"],["YATHARTH","Hospital - Healthcare Services"],["YESBANK","Banks"],["ZAGGLE","IT - Software"],["ZEEL","Media"],["ZENSARTECH","IT - Software"],["ZENTEC","Defence"],["ZFCVINDIA","Auto Ancillary"],["ZYDUSLIFE","Pharma"],["ZYDUSWELL","Food"]
  ];

  const NIFTY50_SYMS = ["ASIANPAINT","KOTAKBANK","ADANIPORTS","AXISBANK","ICICIBANK","INDIGO","EICHERMOT","JSWSTEEL","MAXHEALTH","SBIN","SHRIRAMFIN","BAJFINANCE","GRASIM","MARUTI","SUNPHARMA","CIPLA","BAJAJFINSV","DRREDDY","ITC","M&M","RELIANCE","BHARTIARTL","JIOFIN","ADANIENT","BEL","TCS","BAJAJ-AUTO","COALINDIA","HDFCLIFE","HINDALCO","NTPC","TATAPOWER","TATASTEEL","INFY","POWERGRID","TATACONSUM","TECHM","HCLTECH","SBILIFE","TITAN","TVSMOTOR","ULTRACEMCO","WIPRO"];
  const NIFTY100_SYMS = [...NIFTY50_SYMS,"BOSCHLTD","PIDILITIND","GAIL","MOTHERSON","BANKBARODA","CHOLAFIN","HYUNDAI","PNB","RECLTD","BPCL","CGPOWER","ENRIN","IOC","ADANIGREEN","CANBK","DLF","GODREJCP","ADANIPOWER","AMBUJACEM","LICI","MAZDOCK","ADANIENSOL","BAJAJHLDNG","DIVISLAB","IRFC","SHREECEM","JINDALSTEL","HAVELLS","HINDZINC","NAUKRI","PFC","ABB","JSWENERGY","SIEMENS","SOLARINDS","DMART","ICICIGI","TORNTPHARM","VBL","VEDL","ZYDUSLIFE"];
  const NIFTY500_SYMS = [...NIFTY100_SYMS,"APARINDS","FEDERALBNK","MAHABANK","GMRAIRPORT","HONAUT","IDEA","IDFCFIRSTB","JSWINFRA","AJANTPHARM","AUBANK","COROMANDEL","FORTIS","KEI","MOTILALOFS","NYKAA","PAGEIND","AUROPHARMA","BANKINDIA","IDBI","INDIANB","MEDANTA","NAM-INDIA","SRF","TATATECH","360ONE","ABCAPITAL","APOLLOTYRE","BHARATFORG","DIXON","GVT&D","KPRMILL","LICHSGFIN","LLOYDSME","M&MFIN","NIACL","POLYCAB","BERGEPAINT","BSE","EXIDEIND","FACT","FLUOROCHEM","GODFRYPHLP","HEROMOTOCO","IGL","JSL","MARICO","PIIND","PRESTIGE","SUZLON","THERMAX","BIOCON","COLPAL","INDUSINDBK","LUPIN","NMDC","PAYTM","PETRONET","POLICYBZR","SUNDARMFIN","TATAINVEST","ABBOTINDIA","ATGL","AWL","BDL","IRB","LTTS","MANKIND","MRF","PHOENIXLTD","POWERINDIA","RVNL","SCHAEFFLER","SJVN","SONACOMS","ACC","APLAPOLLO","CUMMINSIND","DALBHARAT","HUDCO","LINDEINDIA","MUTHOOTFIN","NLCINDIA","OBEROIRLTY","SBICARD","SWIGGY","ASTRAL","BHEL","BLUESTARCO","CONCOR","DEEPAKNTR","HDFCAMC","INDUSTOWER","IOB","IREDA","ITCHOTELS","NHPC","PATANJALI","SAIL","BHARTIHEXA","COCHINSHIP","DABUR","IRCTC","JKCEMENT","KPITTECH","MPHASIS","3MINDIA","AIAENG","CRISIL","ENDURANCE","BALKRISIND","ESCORTS","GICRE","ICICIPRULI","NTPCGREEN","OFSS","SUPREMEIND","TATAELXSI","ALKEM","GLAXO","COFORGE","OIL","PERSISTENT","TIINDIA","TORNTPOWER","UBL","UCOBANK","UNIONBANK","UNOMINDA","UPL","VOLTAS","WAAREEENER","YESBANK"];
  const MIDCAP150_SYMS = ["APARINDS","FEDERALBNK","MAHABANK","GMRAIRPORT","HONAUT","IDEA","IDFCFIRSTB","JSWINFRA","AJANTPHARM","AUBANK","COROMANDEL","FORTIS","KEI","MOTILALOFS","NYKAA","PAGEIND","AUROPHARMA","BANKINDIA","IDBI","INDIANB","MEDANTA","NAM-INDIA","SRF","TATATECH","360ONE","ABCAPITAL","APOLLOTYRE","BHARATFORG","DIXON","GVT&D","KPRMILL","LICHSGFIN","LLOYDSME","M&MFIN","NIACL","POLYCAB","ASHOKLEY","BERGEPAINT","BSE","EXIDEIND","FACT","FLUOROCHEM","GODFRYPHLP","HEROMOTOCO","IGL","JSL","MARICO","PIIND","PRESTIGE","SUZLON","THERMAX","BIOCON","COLPAL","LUPIN","NMDC","PAYTM","PETRONET","POLICYBZR","SUNDARMFIN","TATAINVEST","ABBOTINDIA","ATGL","AWL","BDL","IRB","LTTS","MANKIND","MRF","PHOENIXLTD","POWERINDIA","RVNL","SCHAEFFLER","SJVN","SONACOMS","ACC","APLAPOLLO","CUMMINSIND","DALBHARAT","HUDCO","LINDEINDIA","MUTHOOTFIN","NLCINDIA","OBEROIRLTY","SBICARD","SWIGGY","ASTRAL","BHEL","BLUESTARCO","CONCOR","DEEPAKNTR","HDFCAMC","INDUSTOWER","IOB","IREDA","ITCHOTELS","NHPC","PATANJALI","SAIL","BHARTIHEXA","COCHINSHIP","DABUR","IRCTC","JKCEMENT","KPITTECH","MPHASIS","3MINDIA","AIAENG","CRISIL","ENDURANCE","BALKRISIND","ESCORTS","GICRE","ICICIPRULI","NTPCGREEN","OFSS","SUPREMEIND","TATAELXSI","ALKEM","GLAXO","COFORGE","OIL","PERSISTENT","TIINDIA","TORNTPOWER","UBL","UCOBANK","UNIONBANK","UNOMINDA","UPL","VOLTAS","WAAREEENER","YESBANK"];
  const SMALLCAP250_SYMS = ["AKUMS","CAPLIPOINT","CERA","CGCL","IFCI","J&KBANK","NAVINFLUOR","NUVAMA","PIRAMALFIN","RBLBANK","SAILIFE","SYRMA","TEJASNET","ABSLAMC","ACE","AEGISLOG","AEGISVOPAK","AIIL","APTUS","ASTERDM","BLUEJET","CHAMBLFERT","CONCORDBIO","DEEPAKFERT","ELECON","JBCHEPHARM","KIRLOSBROS","NBCC","NETWEB","TBOTEK","AAVAS","ALKYLAMINE","HOMEFIRST","INTELLECT","JBMA","KPIL","KSB","MMTC","NEULANDLAB","RKFORGE","THELEELA","AADHARHFC","ATHERENERG","BIKAJI","CUB","HONASA","HSCL","JYOTICNC","KIMS","KIRLOSENG","OLECTRA","POLYMED","PTCIL","SHYAMMETL","ANGELONE","BANDHANBNK","CANFINHOME","CARBORUNIV","CEATLTD","CHOLAHLDNG","CREDITACC","DOMS","ELGIEQUIP","EMCURE","ERIS","IGIL","IKS","ITI","JUBLPHARMA","KARURVYSYA","MAHSEAMLES","MINDACORP","NIVABUPA","RADICO","RRKABEL","SAREGAMA","ANANDRATHI","BRIGADE","CRAFTSMAN","ENGINERSIN","GLAND","INOXWIND","KEC","MANAPPURAM","NSLNISP","OLAELEC","PCBL","POONAWALLA","RAINBOW","RCF","REDINGTON","SCI","ANANTRAJ","BALRAMCHIN","BLS","CAMS","DBREALTY","FINCABLES","GRANULES","GRAVITA","INDIACEM","INDIAMART","INOXINDIA","IRCON","JINDALSAW","JMFINANCIL","LTFOODS","MCX","NCC","PNBHOUSING","RAMCOCEM","AFCONS","BBTC","BEML","CDSL","CHOICEIN","CYIENT","FIVESTAR","FORCEMOT","GMDCLTD","GRSE","HBLENGINE","JKTYRE","JPPOWER","JWL","KAJARIACER","LALPATHLAB","LATENTVIEW","METROPOLIS","NH","PGEL","RAILTEL","SOBHA","SUMICHEM","SUNTV","TATACHEM","ACMESOLAR","ALOKINDS","APLLTD","CCL","ECLERX","EIHOTEL","FINPIPE","GRAPHITE","LAURUSLABS","MANYAVAR","MGL","NEWGEN","RITES","RPOWER","AARTIIND","ABFRL","BATAINDIA","BLUEDART","CAMPUS","CLEAN","DELHIVERY","GPIL","HEG","IEX","SCHNEIDER","STARHEALTH","CASTROLIND","EMAMILTD","GODIGIT","GODREJAGRO","HAPPSTMNDS","HINDCOPPER","KAYNES","MAPMYINDIA","NATCOPHARM","PFIZER","AMBER","DEVYANI","EIDPARRY","FIRSTCRY","JUBLINGREA","KFINTECH","LEMONTREE","NAVA","PRAJIND","SAPPHIRE","AFFLE","BSOFT","CROMPTON","FSL","GESHIP","GILLETTE","PVRINOX","SARDAEN","SBFC","ATUL","CENTURYPLY","CESC","TIMKEN","TITAGARH","TRIDENT","USHAMART","UTIAMC","VGUARD","VIJAYA","WELCORP","WELSPUNLIV","WHIRLPOOL","WOCKPHARMA","ZEEL","ZENSARTECH","ZENTEC","ZFCVINDIA"];
  const LIQUID_SYMS = ALL_STOCKS.map(s => s[0]);

  const SECTOR_MAP = Object.fromEntries(ALL_STOCKS.map(s => [s[0], s[1]]));
  const UNIQUE_SECTORS = [...new Set(ALL_STOCKS.map(s => s[1]).filter(s => s && s !== '-'))].sort();
  const PALETTE = ['#4f8ef7', '#00c8d8', '#20d472', '#f5a623', '#9d6fff', '#f97316', '#ec4899', '#84cc16', '#14b8a6', '#eab308', '#fb923c', '#6366f1', '#8b5cf6', '#0ea5e9', '#a3e635'];
  const SECTOR_COLORS = {};
  UNIQUE_SECTORS.forEach((s, i) => { SECTOR_COLORS[s] = PALETTE[i % PALETTE.length]; });

  // ── TECHNICAL PARAMETER FORMULAS ──
  const calcWMA = (data, p) => {
    const res = Array(data.length).fill(null), denom = p * (p + 1) / 2;
    for (let i = p - 1; i < data.length; i++) {
      let s = 0;
      for (let j = 0; j < p; j++) s += data[i - (p - 1 - j)] * (j + 1);
      res[i] = s / denom;
    }
    return res;
  };

  const calcEMA = (data, p) => {
    const res = Array(data.length).fill(null), k = 2 / (p + 1);
    let sum = 0, cnt = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] == null) continue;
      if (cnt < p) {
        sum += data[i];
        cnt++;
        if (cnt === p) res[i] = sum / p;
      } else {
        res[i] = data[i] * k + res[i - 1] * (1 - k);
      }
    }
    return res;
  };

  const calcRSI = (data, p = 14) => {
    const res = Array(data.length).fill(null);
    if (data.length < p + 1) return res;
    let ag = 0, al = 0;
    for (let i = 1; i <= p; i++) {
      const d = data[i] - data[i - 1];
      if (d > 0) ag += d; else al -= d;
    }
    ag /= p; al /= p;
    res[p] = 100 - 100 / (1 + ag / (al || 0.0001));
    for (let i = p + 1; i < data.length; i++) {
      const d = data[i] - data[i - 1];
      ag = (ag * (p - 1) + (d > 0 ? d : 0)) / p;
      al = (al * (p - 1) + (d < 0 ? -d : 0)) / p;
      res[i] = 100 - 100 / (1 + ag / (al || 0.0001));
    }
    return res;
  };

  const calcSMA = (data, p) => {
    const res = Array(data.length).fill(null);
    for (let i = p - 1; i < data.length; i++) {
      let s = 0;
      for (let j = i - p + 1; j <= i; j++) s += data[j];
      res[i] = s / p;
    }
    return res;
  };

  // ── DATA FETCH (CORS PROXIES) ──
  const CORS_PROXIES = [
    'https://corsproxy.io/?',
    'https://api.allorigins.win/raw?url='
  ];

  const fetchStooq = async (sym, days) => {
    const to = new Date(), from = new Date();
    from.setDate(from.getDate() - days);
    const fmt = d => d.toISOString().split('T')[0].replace(/-/g, '');
    const url = `https://stooq.com/q/d/l/?s=${sym.toLowerCase()}.in&d1=${fmt(from)}&d2=${fmt(to)}&i=d`;
    
    for (const proxy of CORS_PROXIES) {
      try {
        const fullUrl = `${proxy}${encodeURIComponent(url)}`;
        const res = await fetch(fullUrl, { signal: AbortSignal.timeout(9000) });
        if (!res.ok) continue;
        const text = await res.text();
        if (text.includes('No data') || text.trim().length < 50) continue;
        return parseStooqCSV(text);
      } catch (e) {}
    }
    throw new Error('Stooq failed');
  };

  const fetchYahoo = async (sym, days) => {
    const to = Math.floor(Date.now() / 1000), from = to - days * 86400;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}.NS?interval=1d&period1=${from}&period2=${to}`;
    
    for (const proxy of CORS_PROXIES) {
      try {
        const fullUrl = `${proxy}${encodeURIComponent(url)}`;
        const res = await fetch(fullUrl, { signal: AbortSignal.timeout(9000) });
        if (!res.ok) continue;
        const json = await res.json();
        const q = json?.chart?.result?.[0];
        if (!q) continue;
        const ts = q.timestamp || [];
        const ohlcv = q.indicators.quote[0];
        const rows = [];
        for (let i = 0; i < ts.length; i++) {
          const o = ohlcv.open[i], h = ohlcv.high[i], l = ohlcv.low[i], c = ohlcv.close[i], v = ohlcv.volume[i];
          if ([o, h, l, c].some(x => x == null || isNaN(x))) continue;
          rows.push({ o, h, l, c, v: v || 0 });
        }
        if (rows.length < 10) continue;
        return rows;
      } catch (e) {}
    }
    throw new Error('Yahoo failed');
  };

  const parseStooqCSV = (text) => {
    const lines = text.trim().split('\n');
    const start = isNaN(+lines[0].split(',')[1]) ? 1 : 0;
    const rows = [];
    for (let i = start; i < lines.length; i++) {
      const c = lines[i].split(',');
      if (c.length < 6) continue;
      const o = +c[1], h = +c[2], l = +c[3], cl = +c[4], v = +c[5];
      if ([o, h, l, cl].some(isNaN) || cl === 0) continue;
      rows.push({ o, h, l, c: cl, v: isNaN(v) ? 0 : v });
    }
    return rows.length >= 10 ? rows : null;
  };

  // ── CORE STOCK ANALYZER ──
  const fetchStock = async (sym, days) => {
    // 1. Try Yahoo Finance
    try {
      const r = await fetchYahoo(sym, days);
      if (r && r.length >= 10) return { rows: r, source: 'yahoo' };
    } catch (e) {}
    // 2. Try Stooq
    try {
      const r = await fetchStooq(sym, days);
      if (r && r.length >= 10) return { rows: r, source: 'stooq' };
    } catch (e) {}
    // 3. Fallback to Simulated Daily Price History (ensures the dashboard is always alive)
    try {
      // Check if FALLBACK is available
      if (window.FALLBACK && typeof window.FALLBACK.getHistory === 'function') {
        const hist = window.FALLBACK.getHistory(sym + '.NS', '1y');
        if (hist && hist.length >= 10) {
          const rows = hist.map(row => ({
            o: row.open,
            h: row.high,
            l: row.low,
            c: row.close,
            v: row.volume
          }));
          return { rows, source: 'simulated' };
        }
      }
    } catch (e) {}
    return null;
  };

  const screenStock = (sym, rows, source) => {
    const closes = rows.map(r => r.c), vols = rows.map(r => r.v), last = rows.length - 1;
    const wma42 = calcWMA(closes, 42), wma84 = calcWMA(closes, 84), wma30 = calcWMA(closes, 30), wma60 = calcWMA(closes, 60);
    const wma12d = calcWMA(closes, 12), wma20d = calcWMA(closes, 20);
    const ema20 = calcEMA(closes, 20), volSMA = calcSMA(vols, 20), rsiArr = calcRSI(closes, 14);

    const close = closes[last], prev = closes[last - 1] || close, chg = ((close - prev) / prev) * 100;
    const v42 = wma42[last], v84 = wma84[last], v30 = wma30[last], v60 = wma60[last];
    const v12lag4 = wma12d[Math.max(0, last - 4)], v20lag2 = wma20d[Math.max(0, last - 2)];
    const e20 = ema20[last], rsi = rsiArr[last], vSMA = volSMA[last];

    if (!v42 || !v84 || !v30 || !v60 || !v12lag4 || !v20lag2 || !e20) return null;

    const weeklyVol = vols.slice(Math.max(0, last - 4), last + 1).reduce((a, b) => a + b, 0);
    const volRat = vSMA > 0 ? vols[last] / vSMA : 0;
    const ema20dist = Math.abs((close - e20) / e20) * 100, aboveEma20 = close > e20;

    const priceMin = +document.getElementById('sc_priceMin').value || 25;
    const priceMax = +document.getElementById('sc_priceMax').value || 100000;
    const minVol = +document.getElementById('sc_minVol').value || 100000;
    const maxEd = +document.getElementById('sc_ema20dist').value || 3;
    const mustAbove = document.getElementById('sc_c9above').checked;
    const rsiMin = +document.getElementById('sc_rsiMin').value || 40;
    const rsiMax = +document.getElementById('sc_rsiMax').value || 75;

    const conds = {
      c1: close > v42 + 1,
      c2: v42 > v84 + 2,
      c3: close > v30 + 2,
      c4: v30 > v60 + 2,
      c5: close > v12lag4 + 2,
      c6: close > v20lag2 + 2,
      c7: close >= priceMin && close <= priceMax,
      c8: weeklyVol >= minVol,
      c9: ema20dist <= maxEd && (mustAbove ? aboveEma20 : true),
      c10: rsi !== null && rsi >= rsiMin && rsi <= rsiMax
    };

    const keys = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10'];
    let passed = 0, required = 0;
    const results = {};

    for (const k of keys) {
      const el = document.getElementById('sc_' + k);
      if (el && el.checked) {
        required++;
        results[k] = conds[k];
        if (conds[k]) passed++;
      }
    }

    const allPassed = required > 0 && passed === required;
    const wmaAligned = conds.c1 && conds.c2 && conds.c3 && conds.c4;
    let signal = 'FAIL';
    if (allPassed) signal = 'BUY';
    else if (wmaAligned && passed >= required - 2) signal = 'WATCH';

    return {
      sym,
      sector: SECTOR_MAP[sym] || '—',
      close,
      chg,
      signal,
      source,
      ema20: e20,
      ema20dist,
      aboveEma20,
      wma42: v42,
      wma84: v84,
      wma30: v30,
      wma60: v60,
      volRat,
      weeklyVol,
      rsi,
      conds,
      results,
      passed,
      required,
      allPassed,
      wmaAligned,
      passCount: passed,
      history: rows,
      ema20arr: ema20,
      wma42arr: wma42,
      wma84arr: wma84
    };
  };

  // ── WATCHLIST ──
  let watchlist = new Set();
  let wlFilterActive = false;

  const loadWL = () => {
    watchlist = new Set(JSON.parse(localStorage.getItem('samadhan_scanner_watchlist') || '[]'));
  };

  const saveWL = () => {
    localStorage.setItem('samadhan_scanner_watchlist', JSON.stringify([...watchlist]));
    // Update main application watchlist count badge if applicable
    const badge = document.getElementById('sc_wlCount');
    if (badge) badge.textContent = watchlist.size;
    renderWLPanel();
    updateStats();
    applyFilter();
  };

  const toggleWL = (sym) => {
    if (watchlist.has(sym)) watchlist.delete(sym); else watchlist.add(sym);
    saveWL();
  };

  const clearWatchlist = () => {
    watchlist.clear();
    saveWL();
  };

  const toggleWLPanel = () => {
    const p = document.getElementById('sc_wlPanel');
    if (p) {
      p.classList.toggle('show');
      renderWLPanel();
    }
  };

  const toggleWlFilter = () => {
    wlFilterActive = !wlFilterActive;
    const btn = document.getElementById('sc_wlFilterBtn');
    if (btn) btn.classList.toggle('active-filter', wlFilterActive);
    applyFilter();
  };

  const renderWLPanel = () => {
    const container = document.getElementById('sc_wlChips');
    if (!container) return;
    if (!watchlist.size) {
      container.innerHTML = '<span style="color:var(--text-muted);font-size:0.75rem;">No tracked securities. Click ⭐ in any row to track.</span>';
      return;
    }
    container.innerHTML = [...watchlist].map(sym => {
      const r = screenResults.find(x => x.sym === sym);
      const chgStr = r ? ` <span style="color:${r.chg >= 0 ? 'var(--color-positive)' : 'var(--color-negative)'};">${r.chg >= 0 ? '+' : ''}${r.chg.toFixed(1)}%</span>` : '';
      return `<div class="scan-wl-chip">${sym}${chgStr}<span class="rm" onclick="Scanner.toggleWL('${sym}')">✕</span></div>`;
    }).join('');
  };

  // ── EXECUTION & STATE ──
  let screenResults = [];
  let sortCol = null;
  let sortDir = 1;
  let scanning = false;
  let activeChartInstances = [];

  const getSymsForUniverse = () => {
    const u = document.getElementById('sc_universe').value;
    if (u === 'nifty50') return NIFTY50_SYMS;
    if (u === 'nifty100') return NIFTY100_SYMS;
    if (u === 'nifty500') return NIFTY500_SYMS;
    if (u === 'midcap150') return MIDCAP150_SYMS;
    if (u === 'smallcap250') return SMALLCAP250_SYMS;
    return LIQUID_SYMS;
  };

  const getFilteredSyms = () => {
    const sec = document.getElementById('sc_sectorFilter').value;
    let base = getSymsForUniverse();
    if (sec !== 'all') base = base.filter(s => SECTOR_MAP[s] === sec);
    return [...new Set(base)];
  };

  const updateCount = () => {
    const syms = getFilteredSyms();
    const lbl = document.getElementById('sc_stockCount');
    if (lbl) lbl.textContent = `${syms.length} securities`;
    buildChips();
  };

  const buildChips = () => {
    const container = document.getElementById('sc_sectorChips');
    if (!container) return;
    container.innerHTML = '';
    const activeSec = document.getElementById('sc_sectorFilter').value;

    const allChip = document.createElement('span');
    allChip.className = 'schip' + (activeSec === 'all' ? ' active' : '');
    allChip.innerHTML = `All <span class="cnt">${getSymsForUniverse().length}</span>`;
    allChip.onclick = () => {
      document.getElementById('sc_sectorFilter').value = 'all';
      updateCount();
    };
    container.appendChild(allChip);

    UNIQUE_SECTORS.forEach(s => {
      const cnt = getSymsForUniverse().filter(sym => SECTOR_MAP[sym] === s).length;
      if (!cnt) return;
      const chip = document.createElement('span');
      chip.className = 'schip' + (activeSec === s ? ' active' : '');
      chip.innerHTML = `${s} <span class="cnt">${cnt}</span>`;
      chip.onclick = () => {
        document.getElementById('sc_sectorFilter').value = s;
        updateCount();
      };
      container.appendChild(chip);
    });
  };

  const onSectorDropdown = () => {
    updateCount();
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const runAll = async () => {
    const syms = getFilteredSyms();
    if (!syms.length) {
      if (window.AppState && typeof window.AppState.toast === 'function') {
        window.AppState.toast('No securities in selected universe/sector', 'warning');
      } else {
        alert('No securities in selected universe/sector.');
      }
      return;
    }
    const days = +document.getElementById('sc_period').value;
    const concurrency = +document.getElementById('sc_concurrency').value;

    scanning = true;
    screenResults = [];

    const runBtn = document.getElementById('sc_runBtn');
    const stopBtn = document.getElementById('sc_stopBtn');
    const progressCard = document.getElementById('sc_progressCard');
    const progGrid = document.getElementById('sc_progGrid');
    const progFill = document.getElementById('sc_progFill');
    const progNums = document.getElementById('sc_progNums');

    if (runBtn) { runBtn.disabled = true; runBtn.textContent = '⏳ Scan Running...'; }
    if (stopBtn) stopBtn.style.display = 'inline-flex';
    if (progressCard) progressCard.classList.add('show');
    if (progGrid) progGrid.innerHTML = '';
    if (progFill) progFill.style.width = '0%';
    if (progNums) progNums.textContent = `0 / ${syms.length}`;

    let done = 0;
    const addLog = (sym, ok, src) => {
      done++;
      const pct = Math.round((done / syms.length) * 100);
      if (progFill) progFill.style.width = pct + '%';
      if (progNums) progNums.textContent = `${done} / ${syms.length}`;

      if (progGrid) {
        const el = document.createElement('div');
        el.className = 'prog-log-item ' + (ok ? 'ok' : 'err');
        el.textContent = (ok ? '✓ ' : '✗ ') + sym + (src ? ` · ${sourceLabel(src)}` : '');
        progGrid.appendChild(el);
        progGrid.scrollTop = progGrid.scrollHeight;
      }
    };

    for (let i = 0; i < syms.length; i += concurrency) {
      if (!scanning) break;
      const batch = syms.slice(i, i + concurrency);
      await Promise.all(batch.map(async sym => {
        if (!scanning) return;
        try {
          const res = await fetchStock(sym, days);
          if (!res) throw new Error('no data');
          const r = screenStock(sym, res.rows, res.source);
          if (!r) throw new Error('insufficient data');
          screenResults.push(r);
          addLog(sym, true, res.source);
        } catch (e) {
          screenResults.push({
            sym, sector: SECTOR_MAP[sym] || '—', close: 0, chg: 0, signal: 'ERR', source: 'error',
            ema20: 0, ema20dist: 0, aboveEma20: false, wma42: 0, wma84: 0, volRat: 0, weeklyVol: 0,
            rsi: null, conds: {}, results: {}, passed: 0, required: 0, allPassed: false, wmaAligned: false, passCount: 0, history: [], ema20arr: [], wma42arr: [], wma84arr: []
          });
          addLog(sym, false, '');
        }
      }));
      renderResults();
      if (i + concurrency < syms.length) await sleep(200);
    }

    if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = '<i class="ri-flashlight-fill"></i> Deploy Scan'; }
    if (stopBtn) stopBtn.style.display = 'none';
    scanning = false;

    const timeLabel = document.getElementById('sc_scanTimeLabel');
    if (timeLabel) timeLabel.textContent = 'Last scan: ' + new Date().toLocaleTimeString();
    renderResults();

    if (window.AppState && typeof window.AppState.toast === 'function') {
      window.AppState.toast(`Scan complete! Loaded ${screenResults.filter(r => r.signal !== 'ERR').length} results.`, 'success');
    }
  };

  const stopScan = () => {
    scanning = false;
    const runBtn = document.getElementById('sc_runBtn');
    const stopBtn = document.getElementById('sc_stopBtn');
    if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = '<i class="ri-flashlight-fill"></i> Deploy Scan'; }
    if (stopBtn) stopBtn.style.display = 'none';
    if (window.AppState && typeof window.AppState.toast === 'function') {
      window.AppState.toast('Scan aborted', 'info');
    }
  };

  // ── VIEW TABS ──
  let activeTab = 'table';
  const switchTab = (viewId) => {
    activeTab = viewId;
    document.querySelectorAll('.scan-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === viewId);
    });
    const viewTable = document.getElementById('sc_view-table');
    const viewCharts = document.getElementById('sc_view-charts');
    if (viewId === 'table') {
      if (viewTable) viewTable.style.display = 'block';
      if (viewCharts) viewCharts.style.display = 'none';
    } else {
      if (viewTable) viewTable.style.display = 'none';
      if (viewCharts) viewCharts.style.display = 'block';
      renderChartsView();
    }
  };

  const renderResults = () => {
    applyFilter();
    updateStats();
  };

  const applyFilter = () => {
    const sf = document.getElementById('sc_sigFilter')?.value || 'all';
    const sec = document.getElementById('sc_sectorResultFilter')?.value || 'all';
    let data = screenResults.filter(r => r.signal !== 'ERR');

    if (sf !== 'all') data = data.filter(r => r.signal === sf);
    if (sec !== 'all') data = data.filter(r => r.sector === sec);
    if (wlFilterActive) data = data.filter(r => watchlist.has(r.sym));

    if (!sortCol) {
      // Sort by Buy signals first, then Watch, then Fail
      const orders = { BUY: 0, WATCH: 1, FAIL: 2 };
      data.sort((a, b) => (orders[a.signal] || 2) - (orders[b.signal] || 2));
    } else {
      data.sort((a, b) => {
        let av = a[sortCol], bv = b[sortCol];
        if (typeof av === 'string') return av.localeCompare(bv) * sortDir;
        return ((av || 0) - (bv || 0)) * sortDir;
      });
    }

    renderTable(data);
    if (activeTab === 'charts') renderChartsView();
  };

  // ── TABLE RENDERING ──
  const scoreBar = (passed, required) => {
    const segs = Array.from({ length: required }, (_, i) => {
      const on = i < passed;
      const col = passed === required ? 'on-green' : passed >= required * 0.7 ? 'on-amber' : 'on-red';
      return `<div class="score-seg ${on ? col : ''}"></div>`;
    }).join('');

    const textColor = passed === required ? 'var(--color-positive)' : passed >= required * 0.7 ? 'var(--accent-gold)' : 'var(--color-negative)';
    return `<div class="score-bar-wrap">
      <div class="score-segs">${segs}</div>
      <span class="score-text" style="color:${textColor}">${passed}/${required}</span>
    </div>`;
  };

  const condBadges = (results) => {
    if (!results || !Object.keys(results).length) return '—';
    const labels = { c1: 'C>W42', c2: 'W42>84', c3: 'C>W30', c4: 'W30>60', c5: 'Mom12', c6: 'Mom20', c7: 'Price', c8: 'Vol', c9: 'EMA20', c10: 'RSI' };
    return `<div class="cond-details">` + Object.entries(results).map(([k, v]) =>
      `<span class="cond-pill ${v ? 'cond-pass' : 'cond-fail'}">${labels[k] || k}</span>`
    ).join('') + `</div>`;
  };

  const miniSparkline = (sym, history) => {
    if (!history || history.length < 5) return '<span style="color:var(--text-muted);font-size:0.75rem;">—</span>';
    const closes = history.slice(-30).map(r => r.c);
    const min = Math.min(...closes), max = Math.max(...closes), range = max - min || 1;
    const W = 90, H = 32;
    const pts = closes.map((c, i) => `${(i / (closes.length - 1)) * W},${H - ((c - min) / range) * H}`).join(' ');
    const color = closes[closes.length - 1] >= closes[0] ? 'var(--color-positive)' : 'var(--color-negative)';
    return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;">
      <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
  };

  const renderTable = (data) => {
    const body = document.getElementById('sc_resultBody');
    if (!body) return;
    if (!data.length) {
      body.innerHTML = `<tr><td colspan="13">
        <div class="empty-state">
          <i class="ri-radar-line" style="font-size:1.8rem;color:var(--text-muted)"></i>
          <p>No technical signals match the active filters. Adjust your criteria or hit Deploy Scan.</p>
        </div>
      </td></tr>`;
      return;
    }

    let rowNum = 0;
    body.innerHTML = data.map(r => {
      rowNum++;
      const sigClass = { BUY: 'badge-nse', WATCH: 'badge-bse', FAIL: 'badge-etf' }[r.signal] || 'badge-etf'; // map to existing theme badges
      // Let's create custom overrides for scanner specific pills
      const sigStyle = r.signal === 'BUY' ? 'background:var(--color-positive-dim);color:var(--color-positive);border:1px solid rgba(0,217,126,0.3)' :
                       r.signal === 'WATCH' ? 'background:var(--accent-gold-dim);color:var(--accent-gold);border:1px solid rgba(245,158,11,0.3)' :
                       'background:rgba(255,255,255,0.03);color:var(--text-muted);border:1px solid var(--border-primary)';

      const sigLabel = SIGNAL_DISPLAY[r.signal] || r.signal;
      const inWL = watchlist.has(r.sym);
      const rsiColor = r.rsi === null ? 'var(--text-muted)' : r.rsi > 70 ? 'var(--color-negative)' : r.rsi < 30 ? 'var(--accent-gold)' : 'var(--color-positive)';
      const scol = SECTOR_COLORS[r.sector] || '#5a6480';
      const srcCls = r.source === 'stooq' ? 'src-stooq' : r.source === 'yahoo' ? 'src-yahoo' : 'src-stooq';
      const ema20Color = r.aboveEma20 ? 'var(--color-positive)' : 'var(--color-negative)';

      return `<tr class="${inWL ? 'watchlisted' : ''}">
        <td>
          <button class="wl-star-btn ${inWL ? 'active' : ''}" onclick="Scanner.toggleWL('${r.sym}')" title="${inWL ? 'Untrack' : 'Track'} ${r.sym}">⭐</button>
        </td>
        <td class="sym-cell" onclick="AppState.openStockModal('${r.sym}.NS')">
          <div style="font-weight:700;color:var(--accent-cyan)">${r.sym}</div>
          <div style="font-size:0.65rem;color:var(--text-muted)">Row #${rowNum}</div>
        </td>
        <td>
          <span class="segment-badge" style="color:${scol};border-color:${scol}25;background:${scol}10;">${r.sector}</span>
        </td>
        <td style="color:#fff;font-weight:700">₹${FMT.price(r.close)}</td>
        <td style="font-weight:600" class="${r.chg >= 0 ? 'positive' : 'negative'}">${r.chg >= 0 ? '+' : ''}${r.chg.toFixed(2)}%</td>
        <td class="spark-cell">${miniSparkline(r.sym, r.history)}</td>
        <td>
          <span class="segment-badge" style="${sigStyle}">${sigLabel}</span>
        </td>
        <td style="color:${ema20Color};font-weight:600">${r.ema20dist.toFixed(1)}%${r.aboveEma20 ? '↑' : '↓'}</td>
        <td style="color:${rsiColor};font-weight:600">${r.rsi !== null ? r.rsi.toFixed(1) : '—'}</td>
        <td style="font-weight:600" class="${r.volRat >= 1.5 ? 'positive' : r.volRat >= 1.0 ? 'neutral' : 'negative'}">${r.volRat.toFixed(2)}×</td>
        <td>${scoreBar(r.passed, r.required)}</td>
        <td>${condBadges(r.results)}</td>
        <td>
          <span class="src-tag ${srcCls}">${sourceLabel(r.source)}</span>
        </td>
      </tr>`;
    }).join('');
  };

  // ── APEXCHARTS RENDER (TECHNICAL PROFILES) ──
  const renderChartsView = () => {
    const container = document.getElementById('sc_chartsGrid');
    if (!container) return;
    container.innerHTML = '';
    
    // Destroy previous chart instances
    activeChartInstances.forEach(c => { try { c.destroy(); } catch (e) {} });
    activeChartInstances = [];

    const sec = document.getElementById('sc_sectorResultFilter').value;
    let chartData = screenResults.filter(r => r.signal === 'BUY');
    if (sec !== 'all') chartData = chartData.filter(r => r.sector === sec);

    if (!chartData.length) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1; padding: 40px 0;">
          <i class="ri-bar-chart-box-fill" style="font-size:2rem;color:var(--text-muted)"></i>
          <p>No confirmed LONG buy signals to profile. Execute a scan or adjust the sector filter.</p>
        </div>`;
      return;
    }

    chartData.forEach(r => {
      if (!r.history || r.history.length < 20) return;
      const card = document.createElement('div');
      card.className = 'glass-card scan-chart-card';
      const scol = SECTOR_COLORS[r.sector] || '#5a6480';
      const chgColor = r.chg >= 0 ? 'var(--color-positive)' : 'var(--color-negative)';
      const rsiColor = r.rsi === null ? 'var(--text-muted)' : r.rsi > 70 ? 'var(--color-negative)' : r.rsi < 40 ? 'var(--accent-gold)' : 'var(--color-positive)';
      
      const safeId = 'sc_apex_' + r.sym.replace(/[^a-z0-9]/gi, '_');

      card.innerHTML = `
        <div class="scan-chart-header">
          <span class="scan-chart-title">${r.sym}</span>
          <span class="segment-badge" style="color:${scol};border-color:${scol}25;background:${scol}10;">${r.sector}</span>
          <span class="segment-badge" style="background:var(--color-positive-dim);color:var(--color-positive);border:1px solid rgba(0,217,126,0.3)">LONG</span>
          <div class="scan-chart-meta">
            <span>₹<strong style="color:#fff;">${FMT.price(r.close)}</strong></span>
            <span style="color:${chgColor};font-weight:600;">${r.chg >= 0 ? '+' : ''}${r.chg.toFixed(2)}%</span>
            <span>RSI: <span style="color:${rsiColor};font-weight:600">${r.rsi !== null ? r.rsi.toFixed(1) : '—'}</span></span>
            <span>Vol: <span style="font-weight:600">${r.volRat.toFixed(2)}×</span></span>
          </div>
        </div>
        <div id="${safeId}" class="scan-chart-render"></div>
        <div class="scan-chart-indicators">
          <span class="ind-badge"><div class="ind-dot" style="background:var(--color-positive);"></div>EMA20: ₹${FMT.price(r.ema20)}</span>
          <span class="ind-badge"><div class="ind-dot" style="background:var(--accent-cyan);"></div>WMA42: ₹${FMT.price(r.wma42)}</span>
          <span class="ind-badge"><div class="ind-dot" style="background:var(--accent-gold);"></div>WMA84: ₹${FMT.price(r.wma84)}</span>
          <span class="ind-badge" style="margin-left:auto;font-size:0.65rem;color:var(--text-muted)">Confluence: ${r.passed}/${r.required}</span>
        </div>
      `;
      container.appendChild(card);

      const candles = r.history.map((row, idx) => ({ x: idx + 1, y: [row.o, row.h, row.l, row.c] }));
      const ema20line = r.ema20arr.map((v, idx) => ({ x: idx + 1, y: v != null ? +v.toFixed(2) : null })).filter(p => p.y !== null);
      const wma42line = r.wma42arr.map((v, idx) => ({ x: idx + 1, y: v != null ? +v.toFixed(2) : null })).filter(p => p.y !== null);
      const wma84line = r.wma84arr.map((v, idx) => ({ x: idx + 1, y: v != null ? +v.toFixed(2) : null })).filter(p => p.y !== null);

      const options = {
        series: [
          { name: 'Price', type: 'candlestick', data: candles },
          { name: 'EMA20', type: 'line', data: ema20line },
          { name: 'WMA42', type: 'line', data: wma42line },
          { name: 'WMA84', type: 'line', data: wma84line }
        ],
        chart: {
          type: 'candlestick',
          height: '100%',
          background: 'transparent',
          toolbar: { show: false },
          animations: { enabled: false }
        },
        theme: { mode: 'dark' },
        grid: { borderColor: 'rgba(255, 255, 255, 0.05)', strokeDashArray: 3 },
        stroke: { width: [1, 1.5, 1.5, 1.5], curve: 'smooth', dashArray: [0, 0, 4, 6] },
        colors: ['transparent', '#00d97e', '#00d4ff', '#f59e0b'],
        xaxis: {
          labels: { show: false },
          axisBorder: { color: 'rgba(255, 255, 255, 0.05)' },
          axisTicks: { show: false },
          tooltip: { enabled: false }
        },
        yaxis: {
          labels: {
            style: { colors: '#64748b', fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' },
            formatter: val => "₹" + Math.round(val)
          }
        },
        plotOptions: {
          candlestick: {
            colors: { upward: '#00d97e', downward: '#ff4757' },
            wick: { useFillColor: true }
          }
        },
        legend: { show: false },
        tooltip: { theme: 'dark', x: { show: false } }
      };

      const chartEl = document.getElementById(safeId);
      if (chartEl && window.ApexCharts) {
        const chart = new ApexCharts(chartEl, options);
        chart.render();
        activeChartInstances.push(chart);
      }
    });
  };

  // ── STATS UPDATES ──
  const updateStats = () => {
    const d = screenResults.filter(r => r.signal !== 'ERR');
    
    const scannedEl = document.getElementById('sc_st-scanned');
    const buyEl = document.getElementById('sc_st-buy');
    const watchEl = document.getElementById('sc_st-watch');
    const emaEl = document.getElementById('sc_st-ema');
    const wmaEl = document.getElementById('sc_st-wma');
    const wlEl = document.getElementById('sc_st-watchlist');
    const errEl = document.getElementById('sc_st-err');

    if (scannedEl) scannedEl.textContent = d.length || '—';
    if (buyEl) buyEl.textContent = d.filter(r => r.signal === 'BUY').length || '—';
    if (watchEl) watchEl.textContent = d.filter(r => r.signal === 'WATCH').length || '—';
    if (emaEl) emaEl.textContent = d.filter(r => r.results?.c9).length || '—';
    if (wmaEl) wmaEl.textContent = d.filter(r => r.wmaAligned).length || '—';
    if (wlEl) wlEl.textContent = watchlist.size;
    if (errEl) errEl.textContent = screenResults.filter(r => r.signal === 'ERR').length || '0';
  };

  const sortBy = (col) => {
    if (sortCol === col) sortDir *= -1; else { sortCol = col; sortDir = 1; }
    
    // Sort visual indicators
    const thList = document.querySelectorAll('.scan-table th');
    thList.forEach(th => {
      th.classList.remove('asc', 'desc');
      if (th.dataset.sort === col) {
        th.classList.add(sortDir === 1 ? 'asc' : 'desc');
      }
    });

    applyFilter();
  };

  // ── CSV EXPORT ──
  const exportCSV = () => {
    if (!screenResults.length) {
      if (window.AppState && typeof window.AppState.toast === 'function') {
        window.AppState.toast('No scan results to export', 'warning');
      } else {
        alert('No data to export.');
      }
      return;
    }
    const h = ['Security', 'Industry', 'LTP', 'Delta%', 'Setup', 'EMA20', 'EMA20Dist%', 'AboveEMA20', 'WMA42', 'WMA84', 'VolumeRatio', 'RSI14', 'Confluence', 'DataFeed', 'Tracked'];
    const rows = screenResults.map(r => [
      r.sym,
      `"${r.sector}"`,
      r.close.toFixed(2),
      r.chg.toFixed(2),
      SIGNAL_DISPLAY[r.signal] || r.signal,
      r.ema20.toFixed(2),
      r.ema20dist.toFixed(2),
      r.aboveEma20 ? 'YES' : 'NO',
      r.wma42.toFixed(2),
      r.wma84.toFixed(2),
      r.volRat.toFixed(2),
      r.rsi !== null ? r.rsi.toFixed(1) : '',
      `${r.passed}/${r.required}`,
      sourceLabel(r.source),
      watchlist.has(r.sym) ? 'YES' : ''
    ]);
    const csv = [h, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `nse_confluence_signals_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    if (window.AppState && typeof window.AppState.toast === 'function') {
      window.AppState.toast('Exported results to CSV', 'success');
    }
  };

  const clearAll = () => {
    screenResults = [];
    sortCol = null;
    const resultBody = document.getElementById('sc_resultBody');
    if (resultBody) {
      resultBody.innerHTML = `<tr><td colspan="13">
        <div class="empty-state">
          <i class="ri-radar-line" style="font-size:1.8rem;color:var(--text-muted)"></i>
          <p>Scan outputs cleared. Ready for the next analysis.</p>
        </div>
      </td></tr>`;
    }
    const card = document.getElementById('sc_progressCard');
    if (card) card.classList.remove('show');

    ['sc_st-scanned', 'sc_st-buy', 'sc_st-watch', 'sc_st-ema', 'sc_st-wma', 'sc_st-err'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
    const label = document.getElementById('sc_scanTimeLabel');
    if (label) label.textContent = 'Awaiting deployment';

    if (activeTab === 'charts') renderChartsView();
  };

  const toggleCondAccordion = () => {
    const p = document.getElementById('sc_condPanel');
    const chevron = document.getElementById('sc_condChevron');
    if (p) {
      const isVisible = p.classList.toggle('show');
      if (chevron) {
        chevron.className = isVisible ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line';
      }
    }
  };

  // ── INITIALIZATION ──
  const init = () => {
    loadWL();

    // Populate sector selectors in dropdown
    const filterDD = document.getElementById('sc_sectorFilter');
    const resultDD = document.getElementById('sc_sectorResultFilter');
    if (filterDD && resultDD) {
      // Clear previous
      filterDD.innerHTML = '<option value="all">All Sectors</option>';
      resultDD.innerHTML = '<option value="all">All Sectors</option>';
      UNIQUE_SECTORS.forEach(s => {
        [filterDD, resultDD].forEach(dd => {
          const o = document.createElement('option');
          o.value = s; o.textContent = s;
          dd.appendChild(o);
        });
      });
    }

    // Connect event listeners
    document.getElementById('sc_universe')?.addEventListener('change', updateCount);
    document.getElementById('sc_sectorFilter')?.addEventListener('change', onSectorDropdown);
    
    // Sort columns click
    document.querySelectorAll('.scan-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        sortBy(th.dataset.sort);
      });
    });

    updateCount();
    renderWLPanel();
    updateStats();
  };

  const refresh = () => {
    // Refresh Watchlist counts, stats
    loadWL();
    updateStats();
    renderWLPanel();
  };

  // ── EXPOSE MODULE API ──
  return {
    init,
    refresh,
    toggleWL,
    clearWatchlist,
    toggleWLPanel,
    toggleWlFilter,
    runAll,
    stopScan,
    switchTab,
    exportCSV,
    clearAll,
    toggleCondAccordion
  };
})();

// Attach globally
window.Scanner = Scanner;
