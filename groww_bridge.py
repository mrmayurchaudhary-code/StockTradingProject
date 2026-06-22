#!/usr/bin/env python3
"""
SAMADHAN TRADING — Groww API Bridge Server
Wraps the growwapi Python SDK into a lightweight HTTP server.
The Node.js server.js proxies /api/groww/* requests here.

Usage:
    python groww_bridge.py          # starts on port 5050
    python groww_bridge.py --port 5055

Requires:
    pip install growwapi python-dotenv flask flask-cors
"""

import os
import sys
import json
import time
import threading
import traceback
from datetime import datetime, timedelta

# ── Load environment ──
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv is optional; env vars can be set directly

from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Groww SDK ──
try:
    from growwapi import GrowwAPI
    GROWW_SDK_AVAILABLE = True
except ImportError:
    GROWW_SDK_AVAILABLE = False
    print("[GrowwBridge] ⚠️  growwapi package not installed. Run: pip install growwapi")

# ── App Setup ──
app = Flask(__name__)
CORS(app)

# ── Global State ──
groww = None
access_token = None
auth_error = None
instrument_cache = {}  # symbol -> instrument details
CACHE_TTL = 10  # seconds
_quote_cache = {}


# ============================================================
#  AUTHENTICATION
# ============================================================

def authenticate():
    """Authenticate with Groww API using credentials from .env"""
    global groww, access_token, auth_error

    if not GROWW_SDK_AVAILABLE:
        auth_error = "growwapi package not installed"
        return False

    api_key = os.getenv("GROWW_API_KEY", "").strip()
    api_secret = os.getenv("GROWW_API_SECRET", "").strip()
    totp_token = os.getenv("GROWW_TOTP_TOKEN", "").strip()
    totp_secret = os.getenv("GROWW_TOTP_SECRET", "").strip()

    # Try API Key + Secret flow first
    if api_key and api_secret:
        try:
            print(f"[GrowwBridge] Authenticating with API Key flow...")
            access_token = GrowwAPI.get_access_token(api_key=api_key, secret=api_secret)
            groww = GrowwAPI(access_token)
            auth_error = None
            print(f"[GrowwBridge] ✅ Authenticated successfully (API Key flow)")
            return True
        except Exception as e:
            auth_error = f"API Key auth failed: {str(e)}"
            print(f"[GrowwBridge] ❌ {auth_error}")

    # Try TOTP flow
    if totp_token and totp_secret:
        try:
            import pyotp
            totp = pyotp.TOTP(totp_secret)
            otp = totp.now()
            print(f"[GrowwBridge] Authenticating with TOTP flow...")
            access_token = GrowwAPI.get_access_token(
                api_key=totp_token,
                totp=otp
            )
            groww = GrowwAPI(access_token)
            auth_error = None
            print(f"[GrowwBridge] ✅ Authenticated successfully (TOTP flow)")
            return True
        except ImportError:
            auth_error = "pyotp package not installed for TOTP flow"
            print(f"[GrowwBridge] ❌ {auth_error}")
        except Exception as e:
            auth_error = f"TOTP auth failed: {str(e)}"
            print(f"[GrowwBridge] ❌ {auth_error}")

    if not api_key and not totp_token:
        auth_error = "No credentials found. Set GROWW_API_KEY/GROWW_API_SECRET or GROWW_TOTP_TOKEN/GROWW_TOTP_SECRET in .env"
        print(f"[GrowwBridge] ❌ {auth_error}")

    return False


# ============================================================
#  SYMBOL MAPPING
# ============================================================

def parse_symbol_param(raw_symbol):
    """
    Convert Yahoo-style symbols to Groww API params.
    Examples:
        'RELIANCE.NS' -> ('RELIANCE', 'NSE', 'CASH')
        '^NSEI'       -> ('NIFTY', 'NSE', 'CASH')
        '^BSESN'      -> ('SENSEX', 'BSE', 'CASH')
        'TCS'         -> ('TCS', 'NSE', 'CASH')
    """
    # Index mappings
    INDEX_MAP = {
        '^NSEI': ('NIFTY', 'NSE', 'CASH'),
        '^BSESN': ('SENSEX', 'BSE', 'CASH'),
        '^NSEBANK': ('BANKNIFTY', 'NSE', 'CASH'),
        '^CNXIT': ('NIFTY IT', 'NSE', 'CASH'),
        '^CNXAUTO': ('NIFTY AUTO', 'NSE', 'CASH'),
        '^CNXPHARMA': ('NIFTY PHARMA', 'NSE', 'CASH'),
    }

    if raw_symbol in INDEX_MAP:
        return INDEX_MAP[raw_symbol]

    # Strip exchange suffixes
    symbol = raw_symbol
    exchange = 'NSE'
    segment = 'CASH'

    if symbol.endswith('.NS'):
        symbol = symbol[:-3]
        exchange = 'NSE'
    elif symbol.endswith('.BO'):
        symbol = symbol[:-3]
        exchange = 'BSE'

    # Commodity / Forex — not supported via Groww equity API
    if '=F' in symbol or '=X' in symbol:
        return (None, None, None)  # not supported

    return (symbol, exchange, segment)


def normalize_quote(groww_response, raw_symbol, trading_symbol):
    """Normalize a Groww get_quote response to the frontend's expected shape."""
    try:
        ohlc = groww_response.get('ohlc', {})
        price = groww_response.get('last_price', ohlc.get('close', 0))
        prev_close = ohlc.get('close', price)  # close from ohlc is prev close
        day_change = groww_response.get('day_change', price - prev_close)
        day_change_pct = groww_response.get('day_change_perc', 0)

        # If day_change_perc is 0 but we have price data, calculate it
        if day_change_pct == 0 and prev_close and prev_close != 0:
            day_change_pct = (day_change / prev_close) * 100

        return {
            'symbol': raw_symbol,
            'name': trading_symbol,
            'price': price,
            'open': ohlc.get('open', price),
            'high': ohlc.get('high', price),
            'low': ohlc.get('low', price),
            'prevClose': prev_close,
            'change': round(day_change, 2),
            'changePct': round(day_change_pct, 2),
            'volume': groww_response.get('volume', 0),
            'marketCap': groww_response.get('market_cap', None),
            'currency': 'INR',
            'exchange': 'NSE',
            'week52High': groww_response.get('week_52_high', None),
            'week52Low': groww_response.get('week_52_low', None),
            'pe': None,
            'bidPrice': groww_response.get('bid_price', None),
            'bidQty': groww_response.get('bid_quantity', None),
            'offerPrice': groww_response.get('offer_price', None),
            'offerQty': groww_response.get('offer_quantity', None),
            'upperCircuit': groww_response.get('upper_circuit_limit', None),
            'lowerCircuit': groww_response.get('lower_circuit_limit', None),
            '_live': True,
            '_source': 'groww',
        }
    except Exception as e:
        print(f"[GrowwBridge] normalize_quote error for {raw_symbol}: {e}")
        return None


# ============================================================
#  YFINANCE FALLBACK
# ============================================================

def fetch_yfinance_quote(symbol):
    """Fetch and normalize quote data using yfinance as fallback."""
    try:
        import yfinance as yf
        ticker_name = symbol
        if not symbol.startswith('^') and not symbol.endswith('.NS') and not symbol.endswith('.BO') and not '=' in symbol and not '-' in symbol:
            ticker_name = f"{symbol}.NS"
            
        print(f"[GrowwBridge] yfinance fetching quote for: {ticker_name}")
        ticker = yf.Ticker(ticker_name)
        info = ticker.info
        
        price = info.get('regularMarketPrice') or info.get('currentPrice') or 0
        prev_close = info.get('previousClose') or price
        open_price = info.get('open') or price
        high = info.get('dayHigh') or price
        low = info.get('dayLow') or price
        
        day_change = price - prev_close
        day_change_pct = 0
        if prev_close != 0:
            day_change_pct = (day_change / prev_close) * 100
            
        return {
            'symbol': symbol,
            'name': info.get('longName') or info.get('shortName') or symbol.replace('.NS', '').replace('.BO', ''),
            'price': price,
            'open': open_price,
            'high': high,
            'low': low,
            'prevClose': prev_close,
            'change': round(day_change, 2),
            'changePct': round(day_change_pct, 2),
            'volume': info.get('volume', 0),
            'marketCap': info.get('marketCap', None),
            'currency': info.get('currency', 'INR'),
            'exchange': info.get('exchange', 'NSE'),
            'week52High': info.get('fiftyTwoWeekHigh', None),
            'week52Low': info.get('fiftyTwoWeekLow', None),
            'pe': info.get('trailingPE', None),
            'bidPrice': None,
            'bidQty': None,
            'offerPrice': None,
            'offerQty': None,
            'upperCircuit': None,
            'lowerCircuit': None,
            '_live': True,
            '_source': 'yahoo',
        }
    except Exception as e:
        print(f"[GrowwBridge] yfinance fallback failed for {symbol}: {e}")
        return None


def fetch_yfinance_history(symbol, period='1y', interval='1d'):
    """Fetch and normalize historical data using yfinance as fallback."""
    try:
        import yfinance as yf
        ticker_name = symbol
        if not symbol.startswith('^') and not symbol.endswith('.NS') and not symbol.endswith('.BO') and not '=' in symbol and not '-' in symbol:
            ticker_name = f"{symbol}.NS"
            
        print(f"[GrowwBridge] yfinance fetching history for: {ticker_name} (period={period}, interval={interval})")
        ticker = yf.Ticker(ticker_name)
        hist = ticker.history(period=period, interval=interval)
        
        normalized = []
        for index, row in hist.iterrows():
            epoch_seconds = int(index.timestamp())
            normalized.append({
                'time': epoch_seconds,
                'open': row['Open'],
                'high': row['High'],
                'low': row['Low'],
                'close': row['Close'],
                'volume': int(row['Volume']) if 'Volume' in row else 0
            })
            
        return normalized
    except Exception as e:
        print(f"[GrowwBridge] yfinance history fallback failed for {symbol}: {e}")
        return []


# ============================================================
#  CACHING
# ============================================================

def get_cached_quote(key):
    entry = _quote_cache.get(key)
    if entry and (time.time() - entry['ts']) < CACHE_TTL:
        return entry['data']
    return None


def set_cached_quote(key, data):
    _quote_cache[key] = {'data': data, 'ts': time.time()}


# ============================================================
#  ROUTES
# ============================================================

@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'authenticated': groww is not None,
        'sdk_available': GROWW_SDK_AVAILABLE,
        'auth_error': auth_error,
        'timestamp': int(time.time() * 1000),
        'source': 'groww_bridge',
    })


@app.route('/holdings')
def holdings():
    global groww
    if not groww:
        if not authenticate():
            return jsonify({'error': 'Not authenticated with Groww'}), 401
    try:
        res = groww.get_holdings_for_user()
        return jsonify(res)
    except Exception as e:
        print(f"[GrowwBridge] holdings fetch failed: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/quote')
def quote():
    """
    GET /quote?symbol=RELIANCE.NS
    GET /quote?symbol=RELIANCE&exchange=NSE&segment=CASH
    """
    raw_symbol = request.args.get('symbol', '')
    if not raw_symbol:
        return jsonify({'error': 'Missing symbol parameter'}), 400

    # Check cache
    cached = get_cached_quote(f'quote:{raw_symbol}')
    if cached:
        return jsonify(cached)

    # Parse symbol
    exchange = request.args.get('exchange')
    segment = request.args.get('segment')
    trading_symbol = request.args.get('trading_symbol')

    if not exchange or not segment:
        trading_symbol_parsed, exchange, segment = parse_symbol_param(raw_symbol)
        if not trading_symbol_parsed:
            # Try yfinance direct fallback for other symbols
            yf_q = fetch_yfinance_quote(raw_symbol)
            if yf_q:
                set_cached_quote(f'quote:{raw_symbol}', yf_q)
                return jsonify(yf_q)
            return jsonify({'error': f'Unsupported symbol: {raw_symbol}'}), 400
        if not trading_symbol:
            trading_symbol = trading_symbol_parsed

    # Try Groww first if authenticated
    if groww:
        try:
            # Map exchange/segment constants
            exc = getattr(groww, 'EXCHANGE_NSE', 'NSE') if exchange.upper() == 'NSE' else getattr(groww, 'EXCHANGE_BSE', 'BSE')
            seg = getattr(groww, 'SEGMENT_CASH', 'CASH')
            if segment.upper() == 'FNO':
                seg = getattr(groww, 'SEGMENT_FNO', 'FNO')

            result = groww.get_quote(
                exchange=exc,
                segment=seg,
                trading_symbol=trading_symbol or raw_symbol
            )

            normalized = normalize_quote(result, raw_symbol, trading_symbol)
            if normalized:
                normalized['exchange'] = exchange.upper()
                set_cached_quote(f'quote:{raw_symbol}', normalized)
                return jsonify(normalized)
        except Exception as e:
            print(f"[GrowwBridge] Groww quote failed for {raw_symbol}, falling back to yfinance: {e}")

    # Fallback to yfinance
    yf_q = fetch_yfinance_quote(raw_symbol)
    if yf_q:
        set_cached_quote(f'quote:{raw_symbol}', yf_q)
        return jsonify(yf_q)

    return jsonify({'error': 'Failed to fetch quote from both Groww and yfinance fallbacks'}), 500


@app.route('/quotes')
def quotes():
    """
    GET /quotes?symbols=RELIANCE.NS,TCS.NS,HDFCBANK.NS
    Returns array of normalized quotes.
    """
    symbols_str = request.args.get('symbols', '')
    if not symbols_str:
        return jsonify({'error': 'Missing symbols parameter'}), 400

    symbols = [s.strip() for s in symbols_str.split(',') if s.strip()]
    results = []

    for raw_sym in symbols:
        # Check cache first
        cached = get_cached_quote(f'quote:{raw_sym}')
        if cached:
            results.append(cached)
            continue

        trading_symbol, exchange, segment = parse_symbol_param(raw_sym)
        
        # Try Groww first if authenticated and symbol is supported by mapping
        success = False
        if groww and trading_symbol:
            try:
                exc = getattr(groww, 'EXCHANGE_NSE', 'NSE') if exchange == 'NSE' else getattr(groww, 'EXCHANGE_BSE', 'BSE')
                seg = getattr(groww, 'SEGMENT_CASH', 'CASH')

                result = groww.get_quote(
                    exchange=exc,
                    segment=seg,
                    trading_symbol=trading_symbol
                )

                normalized = normalize_quote(result, raw_sym, trading_symbol)
                if normalized:
                    normalized['exchange'] = exchange
                    set_cached_quote(f'quote:{raw_sym}', normalized)
                    results.append(normalized)
                    success = True
            except Exception as e:
                print(f"[GrowwBridge] Batch quote Groww failed for {raw_sym}, falling back: {e}")

        # Fallback to yfinance if Groww failed or was not authenticated
        if not success:
            yf_q = fetch_yfinance_quote(raw_sym)
            if yf_q:
                set_cached_quote(f'quote:{raw_sym}', yf_q)
                results.append(yf_q)
            else:
                results.append({
                    'symbol': raw_sym,
                    'error': 'Failed to fetch quote from both Groww and yfinance',
                    '_live': False,
                })

    return jsonify(results)


@app.route('/history')
def history():
    """
    GET /history?symbol=RELIANCE.NS&range=1y&interval=1d
    GET /history?symbol=RELIANCE&exchange=NSE&segment=CASH&start=2025-01-01 09:15:00&end=2025-06-01 15:30:00&interval=5
    """
    raw_symbol = request.args.get('symbol', '')
    if not raw_symbol:
        return jsonify({'error': 'Missing symbol parameter'}), 400

    trading_symbol, exchange, segment = parse_symbol_param(raw_symbol)
    interval_param = request.args.get('interval', '1d')
    range_param = request.args.get('range', '1y')

    # Try Groww first if authenticated and trading symbol mapping succeeded
    if groww and trading_symbol:
        try:
            # Parse interval
            interval_minutes = 1440  # default: 1 day
            interval_map = {
                '1m': 1, '2m': 1, '3m': 1, '5m': 5, '10m': 10,
                '15m': 15, '30m': 30, '60m': 60, '1h': 60,
                '4h': 240, '1d': 1440, '1wk': 10080, '1w': 10080,
            }

            if interval_param in interval_map:
                interval_minutes = interval_map[interval_param]
            elif interval_param.isdigit():
                interval_minutes = int(interval_param)

            # Parse time range
            start_time = request.args.get('start', '')
            end_time = request.args.get('end', '')

            if not end_time:
                end_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

            if not start_time:
                # Calculate from range
                range_map = {
                    '1d': timedelta(days=1),
                    '5d': timedelta(days=5),
                    '1mo': timedelta(days=30),
                    '3mo': timedelta(days=90),
                    '6mo': timedelta(days=180),
                    '1y': timedelta(days=365),
                    '2y': timedelta(days=730),
                    '5y': timedelta(days=1825),
                }
                delta = range_map.get(range_param, timedelta(days=365))
                start_dt = datetime.now() - delta
                start_time = start_dt.strftime('%Y-%m-%d %H:%M:%S')

            exc = getattr(groww, 'EXCHANGE_NSE', 'NSE') if exchange == 'NSE' else getattr(groww, 'EXCHANGE_BSE', 'BSE')
            seg = getattr(groww, 'SEGMENT_CASH', 'CASH')

            result = groww.get_historical_candle_data(
                trading_symbol=trading_symbol,
                exchange=exc,
                segment=seg,
                start_time=start_time,
                end_time=end_time,
                interval_in_minutes=interval_minutes,
            )

            # Normalize candles: [[timestamp, open, high, low, close, volume], ...]
            candles = result.get('candles', [])
            normalized = []
            for c in candles:
                if len(c) >= 6:
                    normalized.append({
                        'time': c[0],  # epoch seconds
                        'open': c[1],
                        'high': c[2],
                        'low': c[3],
                        'close': c[4],
                        'volume': c[5],
                    })

            return jsonify({
                'candles': normalized,
                'symbol': raw_symbol,
                '_live': True,
                '_source': 'groww',
            })

        except Exception as e:
            print(f"[GrowwBridge] Groww history failed for {raw_symbol}, falling back to yfinance: {e}")

    # Fallback to yfinance
    candles = fetch_yfinance_history(raw_symbol, period=range_param, interval=interval_param)
    if candles:
        return jsonify({
            'candles': candles,
            'symbol': raw_symbol,
            '_live': True,
            '_source': 'yahoo',
        })

    return jsonify({'error': 'Failed to fetch history from both Groww and yfinance fallbacks'}), 500


# ============================================================
#  STARTUP
# ============================================================

if __name__ == '__main__':
    port = int(os.getenv('GROWW_BRIDGE_PORT', '5050'))

    # Try to parse --port from CLI
    for i, arg in enumerate(sys.argv):
        if arg == '--port' and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])

    print('')
    print('  ╔══════════════════════════════════════════════════╗')
    print('  ║     🟢 Groww API Bridge Server                  ║')
    print('  ╠══════════════════════════════════════════════════╣')
    print(f'  ║  Port:   http://localhost:{port}                  ║')
    print('  ║  SDK:    growwapi Python SDK                     ║')
    print('  ║                                                  ║')
    print('  ║  Press Ctrl+C to stop                           ║')
    print('  ╚══════════════════════════════════════════════════╝')
    print('')

    # Authenticate on startup
    authenticate()

    app.run(host='0.0.0.0', port=port, debug=False)
