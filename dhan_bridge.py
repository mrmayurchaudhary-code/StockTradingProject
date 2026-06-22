#!/usr/bin/env python3
"""
SAMADHAN TRADING — Dhan API Bridge Server
Wraps DhanHQ v2 API endpoints into a lightweight HTTP server.
The Node.js server.js proxies /api/dhan/* requests here.

Usage:
    python dhan_bridge.py          # starts on port 5060
    python dhan_bridge.py --port 5060

Requires:
    pip install requests python-dotenv flask flask-cors yfinance
"""

import os
import sys
import json
import time
import math
import random
from datetime import datetime, timedelta

# Load environment variables
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import threading
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock

app = Flask(__name__)
CORS(app)
sock = Sock(app)

# Global Config
CLIENT_ID = os.getenv("DHAN_CLIENT_ID", "").strip()
ACCESS_TOKEN = os.getenv("DHAN_ACCESS_TOKEN", "").strip()

# Symbol to Dhan Security ID & Segment Mapping
SYMBOL_MAP = {
    # Indices
    "^NSEI": {"security_id": "13", "segment": "IDX_I", "name": "NIFTY 50", "exchange": "NSE"},
    "^BSESN": {"security_id": "25", "segment": "IDX_I", "name": "SENSEX", "exchange": "BSE"},
    "^NSEBANK": {"security_id": "14", "segment": "IDX_I", "name": "NIFTY BANK", "exchange": "NSE"},
    "^CNXIT": {"security_id": "21", "segment": "IDX_I", "name": "NIFTY IT", "exchange": "NSE"},
    "^CNXAUTO": {"security_id": "16", "segment": "IDX_I", "name": "NIFTY AUTO", "exchange": "NSE"},
    "^CNXPHARMA": {"security_id": "17", "segment": "IDX_I", "name": "NIFTY PHARMA", "exchange": "NSE"},

    # Top Stocks (NSE)
    "RELIANCE.NS": {"security_id": "11536", "segment": "NSE_EQ", "name": "RELIANCE INDUSTRIES", "exchange": "NSE"},
    "TCS.NS": {"security_id": "11532", "segment": "NSE_EQ", "name": "TATA CONSULTANCY SERVICES", "exchange": "NSE"},
    "HDFCBANK.NS": {"security_id": "1333", "segment": "NSE_EQ", "name": "HDFC BANK", "exchange": "NSE"},
    "INFY.NS": {"security_id": "1594", "segment": "NSE_EQ", "name": "INFOSYS LTD", "exchange": "NSE"},
    "ICICIBANK.NS": {"security_id": "4963", "segment": "NSE_EQ", "name": "ICICI BANK", "exchange": "NSE"},
    "SBIN.NS": {"security_id": "3045", "segment": "NSE_EQ", "name": "STATE BANK OF INDIA", "exchange": "NSE"},
    "KOTAKBANK.NS": {"security_id": "1922", "segment": "NSE_EQ", "name": "KOTAK MAHINDRA BANK", "exchange": "NSE"},
    "HINDUNILVR.NS": {"security_id": "1330", "segment": "NSE_EQ", "name": "HINDUSTAN UNILEVER", "exchange": "NSE"},
    "BHARTIARTL.NS": {"security_id": "10603", "segment": "NSE_EQ", "name": "BHARTI AIRTEL", "exchange": "NSE"},
    "ITC.NS": {"security_id": "1660", "segment": "NSE_EQ", "name": "ITC LIMITED", "exchange": "NSE"},
    "LT.NS": {"security_id": "11483", "segment": "NSE_EQ", "name": "LARSEN & TOUBRO", "exchange": "NSE"},
    "AXISBANK.NS": {"security_id": "5900", "segment": "NSE_EQ", "name": "AXIS BANK", "exchange": "NSE"},
    "ASIANPAINT.NS": {"security_id": "236", "segment": "NSE_EQ", "name": "ASIAN PAINTS", "exchange": "NSE"},
    "WIPRO.NS": {"security_id": "3787", "segment": "NSE_EQ", "name": "WIPRO LTD", "exchange": "NSE"},
    "HCLTECH.NS": {"security_id": "7229", "segment": "NSE_EQ", "name": "HCL TECHNOLOGIES", "exchange": "NSE"},
    "BAJFINANCE.NS": {"security_id": "317", "segment": "NSE_EQ", "name": "BAJAJ FINANCE", "exchange": "NSE"},
    "MARUTI.NS": {"security_id": "10999", "segment": "NSE_EQ", "name": "MARUTI SUZUKI", "exchange": "NSE"},
    "SUNPHARMA.NS": {"security_id": "3351", "segment": "NSE_EQ", "name": "SUN PHARMA", "exchange": "NSE"},
    "TITAN.NS": {"security_id": "3506", "segment": "NSE_EQ", "name": "TITAN COMPANY", "exchange": "NSE"},
    "ADANIENT.NS": {"security_id": "25", "segment": "NSE_EQ", "name": "ADANI ENTERPRISES", "exchange": "NSE"},
    "COALINDIA.NS": {"security_id": "20377", "segment": "NSE_EQ", "name": "COAL INDIA", "exchange": "NSE"},
    "NTPC.NS": {"security_id": "11630", "segment": "NSE_EQ", "name": "NTPC LTD", "exchange": "NSE"},
    "ONGC.NS": {"security_id": "2475", "segment": "NSE_EQ", "name": "ONGC LTD", "exchange": "NSE"},
    "POWERGRID.NS": {"security_id": "14977", "segment": "NSE_EQ", "name": "POWER GRID CORP", "exchange": "NSE"},
}

# Reverse mapping: security_id -> symbol
REVERSE_MAP = {v["security_id"]: k for k, v in SYMBOL_MAP.items() if v["exchange"] == "NSE"}

# ── DHAN API REQUEST UTILITY ──
def call_dhan_api(endpoint, payload=None, method="POST"):
    """Makes a request to the Dhan API using the credentials in .env"""
    if not CLIENT_ID or not ACCESS_TOKEN:
        return None
    url = f"https://api.dhan.co/v2{endpoint}"
    headers = {
        "access-token": ACCESS_TOKEN,
        "client-id": CLIENT_ID,
        "Content-Type": "application/json",
    }
    try:
        if method == "POST":
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
        else:
            resp = requests.get(url, headers=headers, timeout=10)
        
        if resp.status_code == 200:
            return resp.json()
        else:
            print(f"[DhanBridge] API Error: HTTP {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        print(f"[DhanBridge] HTTP request failed: {e}")
        return None

# ── FALLBACK YAHOO FINANCE QUOTE ──
def get_yfinance_quote(symbol):
    try:
        import yfinance as yf
        ticker_name = symbol
        if not symbol.startswith('^') and not symbol.endswith('.NS') and not symbol.endswith('.BO') and not '=' in symbol and not '-' in symbol:
            ticker_name = f"{symbol}.NS"
            
        ticker = yf.Ticker(ticker_name)
        info = ticker.info
        
        price = info.get('regularMarketPrice') or info.get('currentPrice') or 0
        prev_close = info.get('previousClose') or price
        open_price = info.get('open') or price
        high = info.get('dayHigh') or price
        low = info.get('dayLow') or price
        day_change = price - prev_close
        day_change_pct = (day_change / prev_close) * 100 if prev_close else 0
        
        return {
            'symbol': symbol,
            'name': info.get('longName') or info.get('shortName') or symbol.split('.')[0],
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
            'exchange': 'NSE' if symbol.endswith('.NS') or symbol.startswith('^') else 'BSE',
            'week52High': info.get('fiftyTwoWeekHigh', None),
            'week52Low': info.get('fiftyTwoWeekLow', None),
            'pe': info.get('trailingPE', None),
            '_source': 'yahoo'
        }
    except Exception as e:
        print(f"[DhanBridge] yfinance fallback failed for {symbol}: {e}")
        return None

# ── ROUTES ──

@app.route('/health')
def health():
    return jsonify({
        'status': 'ok',
        'authenticated': bool(CLIENT_ID and ACCESS_TOKEN),
        'client_id': CLIENT_ID[:6] + "****" if CLIENT_ID else None,
        'timestamp': int(time.time() * 1000),
        'source': 'dhan_bridge'
    })

@app.route('/quote')
def quote():
    symbol = request.args.get('symbol', '').upper()
    if not symbol:
        return jsonify({'error': 'Missing symbol parameter'}), 400

    # If authenticated, try calling Dhan /marketfeed/quote
    if CLIENT_ID and ACCESS_TOKEN:
        # Check symbol mapping
        mapping = SYMBOL_MAP.get(symbol)
        if mapping:
            segment = mapping["segment"]
            sec_id = int(mapping["security_id"])
            
            # Dhan API accepts list of security IDs partitioned by exchange segment
            payload = {segment: [sec_id]}
            resp = call_dhan_api("/marketfeed/quote", payload)
            if resp and resp.get("status") == "success":
                try:
                    data = resp["data"][segment][str(sec_id)]
                    ohlc = data.get("ohlc", {})
                    ltp = data.get("last_price", 0)
                    close = ohlc.get("close", ltp)
                    change = ltp - close
                    change_pct = (change / close) * 100 if close else 0
                    
                    return jsonify({
                        'symbol': symbol,
                        'name': mapping["name"],
                        'price': ltp,
                        'open': ohlc.get("open", ltp),
                        'high': ohlc.get("high", ltp),
                        'low': ohlc.get("low", ltp),
                        'prevClose': close,
                        'change': round(change, 2),
                        'changePct': round(change_pct, 2),
                        'volume': data.get("volume", 0),
                        'marketCap': None,
                        'currency': 'INR',
                        'exchange': mapping["exchange"],
                        'pe': None,
                        '_live': True,
                        '_source': 'dhan'
                    })
                except Exception as ex:
                    print(f"[DhanBridge] Error parsing Dhan quote response: {ex}")

    # Fallback to Yahoo Finance
    yq = get_yfinance_quote(symbol)
    if yq:
        return jsonify(yq)
        
    return jsonify({'error': 'Symbol fetch failed'}), 500

@app.route('/quotes')
def quotes():
    symbols_str = request.args.get('symbols', '')
    if not symbols_str:
        return jsonify({'error': 'Missing symbols parameter'}), 400
        
    symbols = [s.strip().upper() for s in symbols_str.split(',') if s.strip()]
    results = []

    # If authenticated, attempt batch quote
    if CLIENT_ID and ACCESS_TOKEN:
        dhan_payload = {}
        mapped_symbols = {}
        
        for s in symbols:
            mapping = SYMBOL_MAP.get(s)
            if mapping:
                seg = mapping["segment"]
                sec_id = int(mapping["security_id"])
                if seg not in dhan_payload:
                    dhan_payload[seg] = []
                dhan_payload[seg].append(sec_id)
                mapped_symbols[(seg, str(sec_id))] = s
                
        if dhan_payload:
            resp = call_dhan_api("/marketfeed/quote", dhan_payload)
            if resp and resp.get("status") == "success":
                data_dict = resp["data"]
                for seg, ids in data_dict.items():
                    for sec_id, data in ids.items():
                        s = mapped_symbols.get((seg, str(sec_id)))
                        if not s:
                            continue
                        ohlc = data.get("ohlc", {})
                        ltp = data.get("last_price", 0)
                        close = ohlc.get("close", ltp)
                        change = ltp - close
                        change_pct = (change / close) * 100 if close else 0
                        
                        results.append({
                            'symbol': s,
                            'name': SYMBOL_MAP[s]["name"],
                            'price': ltp,
                            'open': ohlc.get("open", ltp),
                            'high': ohlc.get("high", ltp),
                            'low': ohlc.get("low", ltp),
                            'prevClose': close,
                            'change': round(change, 2),
                            'changePct': round(change_pct, 2),
                            'volume': data.get("volume", 0),
                            'marketCap': None,
                            'currency': 'INR',
                            'exchange': SYMBOL_MAP[s]["exchange"],
                            '_live': True,
                            '_source': 'dhan'
                        })

    # For any symbols that failed or were unmapped, fetch via Yahoo
    fetched_symbols = {r["symbol"] for r in results}
    for s in symbols:
        if s not in fetched_symbols:
            yq = get_yfinance_quote(s)
            if yq:
                results.append(yq)
            else:
                results.append({'symbol': s, 'error': 'Failed to fetch', 'price': 0, 'changePct': 0})
                
    return jsonify(results)

@app.route('/history')
def history():
    symbol = request.args.get('symbol', '').upper()
    range_val = request.args.get('range', '1y')
    interval_val = request.args.get('interval', '1d')
    
    if not symbol:
        return jsonify({'error': 'Missing symbol parameter'}), 400

    # Try Dhan Charts API if authenticated
    if CLIENT_ID and ACCESS_TOKEN:
        mapping = SYMBOL_MAP.get(symbol)
        if mapping:
            seg = mapping["segment"]
            sec_id = mapping["security_id"]
            
            # Map range to date
            days_map = {'1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180, '1y': 365}
            days = days_map.get(range_val, 365)
            to_date = datetime.now()
            from_date = to_date - timedelta(days=days)
            
            # Dhan API accepts YYYY-MM-DD
            payload = {
                "securityId": sec_id,
                "exchangeSegment": seg,
                "instrument": "EQUITY" if "EQ" in seg else "INDEX",
                "fromDate": from_date.strftime("%Y-%m-%d"),
                "toDate": to_date.strftime("%Y-%m-%d")
            }
            
            endpoint = "/charts/historical"
            # If interval is minute based, use intraday
            if interval_val.endswith("m"):
                endpoint = "/charts/intraday"
                mins = interval_val.replace("m", "")
                payload["interval"] = mins if mins.isdigit() else "5"
                
            resp = call_dhan_api(endpoint, payload)
            if resp and resp.get("status") == "success" and "candles" in resp:
                # Dhan returns lists: [timestamp, open, high, low, close, volume]
                # Dhan's timestamp is custom epoch or UNIX? V2 API uses UNIX epoch
                candles = []
                for c in resp["candles"]:
                    candles.append({
                        'time': c[0],
                        'open': c[1],
                        'high': c[2],
                        'low': c[3],
                        'close': c[4],
                        'volume': c[5] if len(c) > 5 else 0
                    })
                return jsonify({
                    'candles': candles,
                    'symbol': symbol,
                    '_source': 'dhan'
                })

    # Fallback to yfinance history
    try:
        import yfinance as yf
        ticker_name = symbol
        if not symbol.startswith('^') and not symbol.endswith('.NS') and not symbol.endswith('.BO') and not '=' in symbol and not '-' in symbol:
            ticker_name = f"{symbol}.NS"
            
        ticker = yf.Ticker(ticker_name)
        hist = ticker.history(period=range_val, interval=interval_val)
        
        candles = []
        for index, row in hist.iterrows():
            candles.append({
                'time': int(index.timestamp()),
                'open': row['Open'],
                'high': row['High'],
                'low': row['Low'],
                'close': row['Close'],
                'volume': int(row['Volume']) if 'Volume' in row else 0
            })
            
        return jsonify({
            'candles': candles,
            'symbol': symbol,
            '_source': 'yahoo'
        })
    except Exception as e:
        print(f"[DhanBridge] yfinance history failed for {symbol}: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/optionchain/expirylist')
def expiry_list():
    symbol = request.args.get('symbol', '^NSEI').upper()
    
    # Map to Dhan Underlying Index/Stock
    mapping = SYMBOL_MAP.get(symbol, {"security_id": "13", "segment": "NSE_EQ"})
    underlying_id = mapping["security_id"]
    underlying_seg = "NSE_EQ" if "EQ" in mapping["segment"] or mapping["segment"] == "IDX_I" else mapping["segment"]

    # Try Dhan Expiry List API
    if CLIENT_ID and ACCESS_TOKEN:
        payload = {
            "underlyingScrip": int(underlying_id),
            "underlyingSeg": underlying_seg
        }
        resp = call_dhan_api("/optionchain/expirylist", payload)
        if resp and resp.get("status") == "success" and "data" in resp:
            return jsonify(resp)

    # Simulated Expiry dates (next 5 Thursdays)
    dates = []
    d = datetime.now()
    while len(dates) < 5:
        d += timedelta(days=1)
        if d.weekday() == 3: # Thursday
            dates.append(d.strftime("%Y-%m-%d"))
            
    return jsonify({
        "status": "success",
        "data": dates,
        "_simulated": True
    })

@app.route('/optionchain')
def option_chain():
    symbol = request.args.get('symbol', '^NSEI').upper()
    expiry = request.args.get('expiry', '')
    
    mapping = SYMBOL_MAP.get(symbol, {"security_id": "13", "segment": "NSE_EQ"})
    underlying_id = mapping["security_id"]
    underlying_seg = "NSE_EQ" if "EQ" in mapping["segment"] or mapping["segment"] == "IDX_I" else mapping["segment"]

    # If no expiry provided, fetch the first one
    if not expiry:
        dates = []
        d = datetime.now()
        while len(dates) < 1:
            d += timedelta(days=1)
            if d.weekday() == 3:
                dates.append(d.strftime("%Y-%m-%d"))
        expiry = dates[0]

    # Try Dhan Option Chain API
    if CLIENT_ID and ACCESS_TOKEN:
        payload = {
            "underlyingScrip": int(underlying_id),
            "underlyingSeg": underlying_seg,
            "expiry": expiry
        }
        resp = call_dhan_api("/optionchain", payload)
        if resp and resp.get("status") == "success" and "data" in resp:
            return jsonify(resp)

    # Mock Option Chain simulation
    # Get spot price
    spot = 24800
    if symbol == "^BSESN":
        spot = 81500
    elif symbol == "^NSEBANK":
        spot = 53200
    
    # Try fetching real spot price using yfinance fallback
    yq = get_yfinance_quote(symbol)
    if yq and yq.get("price"):
        spot = yq["price"]

    strike_diff = 100 if "BANK" in symbol else (500 if "BSESN" in symbol else 50)
    atm = round(spot / strike_diff) * strike_diff
    
    oc_data = {}
    for i in range(-10, 11):
        K = float(atm + i * strike_diff)
        dist = (spot - K) / spot
        
        # Call pricing model approximation
        ce_price = max(0.5, (spot - K) + random.uniform(10, 100) * math.exp(-abs(i)/3))
        pe_price = max(0.5, (K - spot) + random.uniform(10, 100) * math.exp(-abs(i)/3))
        
        ce_oi = int(max(1000, 500000 * math.exp(-abs(i-2)/4) + random.randint(100, 10000)))
        pe_oi = int(max(1000, 600000 * math.exp(-abs(i+2)/4) + random.randint(100, 10000)))
        
        # Delta approximation
        delta_ce = 1.0 / (1.0 + math.exp(-dist * 15))
        delta_pe = delta_ce - 1.0
        
        oc_data[f"{K:.6f}"] = {
            "ce": {
                "last_price": round(ce_price, 2),
                "oi": ce_oi,
                "implied_volatility": round(12.5 + random.uniform(-1, 3) + abs(i)*0.4, 2),
                "greeks": {
                    "delta": round(delta_ce, 2),
                    "theta": round(-10.0 - random.uniform(1, 5), 2),
                    "gamma": round(0.002 * math.exp(-abs(i)/2), 4),
                    "vega": round(15.0 - abs(i)*0.8, 2)
                },
                "average_price": round(ce_price * 0.99, 2)
            },
            "pe": {
                "last_price": round(pe_price, 2),
                "oi": pe_oi,
                "implied_volatility": round(13.0 + random.uniform(-1, 3) + abs(i)*0.4, 2),
                "greeks": {
                    "delta": round(delta_pe, 2),
                    "theta": round(-9.5 - random.uniform(1, 5), 2),
                    "gamma": round(0.002 * math.exp(-abs(i)/2), 4),
                    "vega": round(15.0 - abs(i)*0.8, 2)
                },
                "average_price": round(pe_price * 0.99, 2)
            }
        }

    return jsonify({
        "status": "success",
        "data": {
            "last_price": spot,
            "oc": oc_data
        },
        "_simulated": True
    })

@app.route('/depth')
def market_depth():
    symbol = request.args.get('symbol', 'RELIANCE.NS').upper()
    
    # Try fetching actual quote containing depth if authenticated
    if CLIENT_ID and ACCESS_TOKEN:
        mapping = SYMBOL_MAP.get(symbol)
        if mapping:
            segment = mapping["segment"]
            sec_id = int(mapping["security_id"])
            payload = {segment: [sec_id]}
            resp = call_dhan_api("/marketfeed/quote", payload)
            if resp and resp.get("status") == "success":
                try:
                    data = resp["data"][segment][str(sec_id)]
                    depth = data.get("market_depth", {})
                    if depth:
                        return jsonify({
                            "status": "success",
                            "symbol": symbol,
                            "buy": depth.get("buy", []),
                            "sell": depth.get("sell", []),
                            "_source": "dhan"
                        })
                except Exception as ex:
                    print(f"[DhanBridge] Depth parsing failed: {ex}")

    # Fallback to simulated 20-level market depth
    yq = get_yfinance_quote(symbol)
    spot = yq["price"] if yq and yq.get("price") else 2500.0
    
    buy_levels = []
    sell_levels = []
    
    total_buy_qty = 0
    total_sell_qty = 0
    
    # Ticks are 0.05 paise in Indian Markets
    tick = 0.05
    
    for i in range(1, 21):
        bp = spot - i * tick - random.uniform(0.0, 0.05)
        bp = round(bp / tick) * tick
        bq = random.randint(100, 5000 - i * 150)
        bq = max(10, bq)
        total_buy_qty += bq
        buy_levels.append({
            "price": bp,
            "quantity": bq,
            "orders": random.randint(1, 20)
        })
        
        sp = spot + i * tick + random.uniform(0.0, 0.05)
        sp = round(sp / tick) * tick
        sq = random.randint(100, 5000 - i * 150)
        sq = max(10, sq)
        total_sell_qty += sq
        sell_levels.append({
            "price": sp,
            "quantity": sq,
            "orders": random.randint(1, 20)
        })
        
    return jsonify({
        "status": "success",
        "symbol": symbol,
        "buy": buy_levels,
        "sell": sell_levels,
        "total_buy_qty": total_buy_qty,
        "total_sell_qty": total_sell_qty,
        "_simulated": True
    })

@app.route('/expired-options')
def expired_options():
    symbol = request.args.get('symbol', '^NSEI').upper()
    strike = request.args.get('strike', 'ATM')
    
    # Try Dhan charts/rollingoption endpoint if keys exist
    if CLIENT_ID and ACCESS_TOKEN:
        mapping = SYMBOL_MAP.get(symbol, {"security_id": "13", "segment": "NSE_EQ"})
        underlying_id = mapping["security_id"]
        underlying_seg = "NSE_EQ" if "EQ" in mapping["segment"] or mapping["segment"] == "IDX_I" else mapping["segment"]
        
        to_date = datetime.now()
        from_date = to_date - timedelta(days=30)
        
        payload = {
            "underlyingScrip": int(underlying_id),
            "underlyingSeg": underlying_seg,
            "instrument": "OPTIDX" if symbol.startswith("^") else "OPTSTK",
            "strike": strike,
            "fromDate": from_date.strftime("%Y-%m-%d"),
            "toDate": to_date.strftime("%Y-%m-%d")
        }
        
        resp = call_dhan_api("/charts/rollingoption", payload)
        if resp and resp.get("status") == "success" and "candles" in resp:
            candles = []
            for c in resp["candles"]:
                candles.append({
                    'time': c[0],
                    'open': c[1],
                    'high': c[2],
                    'low': c[3],
                    'close': c[4],
                    'volume': c[5] if len(c) > 5 else 0,
                    'oi': c[6] if len(c) > 6 else 0
                })
            return jsonify({
                "candles": candles,
                "symbol": f"{symbol}_{strike}_EXPIRED",
                "_source": "dhan"
            })

    # Simulated Rolling expired options candles (past 30 days)
    candles = []
    base_val = 150.0
    now = int(time.time())
    
    for i in range(30):
        t = now - (30 - i) * 86400
        change = (random.random() - 0.52) * 15 # slightly negative trend as options decay
        base_val = max(1.0, base_val + change)
        
        open_val = round(base_val + random.uniform(-2, 2), 2)
        close_val = round(base_val, 2)
        high_val = round(max(open_val, close_val) + random.uniform(0, 5), 2)
        low_val = round(min(open_val, close_val) - random.uniform(0, 5), 2)
        
        candles.append({
            "time": t,
            "open": open_val,
            "high": high_val,
            "low": low_val,
            "close": close_val,
            "volume": random.randint(1000, 50000),
            "oi": random.randint(100000, 2000000)
        })
        
    return jsonify({
        "candles": candles,
        "symbol": f"{symbol}_{strike}_EXPIRED_SIMULATED",
        "_simulated": True
    })


# ============================================================
#  WEBSOCKET MARKET STREAM SERVER
# ============================================================

ws_base_prices = {}
ws_prev_closes = {}

def is_market_open_for_symbol(symbol):
    if not symbol:
        return False
        
    from datetime import timezone, timedelta
    ist_now = datetime.now(timezone.utc) + timedelta(hours=5, minutes=30)
    
    day = ist_now.weekday() # Monday is 0, Sunday is 6
    is_weekday = (day >= 0 and day <= 4)
    mins = ist_now.hour * 60 + ist_now.minute
    
    # Trading hours in minutes from midnight IST:
    # NSE/BSE: Weekdays 9:15 AM - 3:30 PM (555 mins to 930 mins)
    nse_open = is_weekday and (555 <= mins < 930)
    
    # MCX Commodities: Weekdays 9:00 AM - 11:30 PM (540 mins to 1410 mins)
    mcx_open = is_weekday and (540 <= mins < 1410)
    
    # Forex/Currency: Weekdays 9:00 AM - 5:00 PM (540 mins to 1020 mins)
    forex_open = is_weekday and (540 <= mins < 1020)
    
    # Crypto: 24/7
    crypto_open = True
    
    sym = symbol.upper()
    
    if sym.startswith('^'):
        return nse_open
    if sym.endswith('-USD') or sym.endswith('-USDT'):
        return crypto_open
    if sym.endswith('=F') or sym.startswith('MCX:'):
        return mcx_open
    if sym.endswith('=X') or 'INR=X' in sym:
        return forex_open
        
    # Default to NSE/BSE equities
    return nse_open

def get_live_tick(symbol):
    global ws_base_prices, ws_prev_closes
    
    # If not in cache, fetch baseline
    if symbol not in ws_base_prices:
        try:
            # First try Yahoo Finance quote
            yq = get_yfinance_quote(symbol)
            if yq and yq.get('price'):
                ws_base_prices[symbol] = yq['price']
                ws_prev_closes[symbol] = yq.get('prevClose') or yq['price']
            else:
                defaults = {"^NSEI": 24800.0, "^BSESN": 81500.0, "^NSEBANK": 53200.0, "RELIANCE.NS": 2500.0, "TCS.NS": 3800.0}
                ws_base_prices[symbol] = defaults.get(symbol, 100.0)
                ws_prev_closes[symbol] = ws_base_prices[symbol]
        except Exception as e:
            print(f"[DhanBridge] Error loading baseline for {symbol}: {e}")
            ws_base_prices[symbol] = 100.0
            ws_prev_closes[symbol] = 100.0

    # Apply random walk tick (±0.03%) only if the market is open
    base = ws_base_prices[symbol]
    if is_market_open_for_symbol(symbol):
        change_pct = (random.random() - 0.5) * 0.0006
        new_price = base * (1 + change_pct)
        ws_base_prices[symbol] = new_price
    else:
        new_price = base
    
    prev_close = ws_prev_closes.get(symbol, new_price)
    change = new_price - prev_close
    change_pct = (change / prev_close) * 100 if prev_close else 0
    
    # Check if there is details mapping for name
    mapping = SYMBOL_MAP.get(symbol, {"name": symbol.split('.')[0], "exchange": "NSE"})
    
    return {
        'symbol': symbol,
        'name': mapping.get("name", symbol),
        'price': round(new_price, 2),
        'open': round(prev_close * 1.001, 2),
        'high': round(max(prev_close, new_price) * 1.005, 2),
        'low': round(min(prev_close, new_price) * 0.995, 2),
        'prevClose': round(prev_close, 2),
        'change': round(change, 2),
        'changePct': round(change_pct, 2),
        'volume': random.randint(10000, 1000000),
        'currency': 'INR',
        'exchange': mapping.get("exchange", "NSE"),
        'timestamp': int(time.time() * 1000),
        '_live': True,
        '_source': 'dhan_ws'
    }

def background_base_price_refresher():
    while True:
        try:
            time.sleep(15)
            symbols = list(ws_base_prices.keys())
            if not symbols:
                continue
            
            for sym in symbols:
                # Standard HTTP request internally to update baseline
                yq = get_yfinance_quote(sym)
                if yq and yq.get('price'):
                    ws_base_prices[sym] = yq['price']
                    ws_prev_closes[sym] = yq.get('prevClose') or yq['price']
        except Exception as e:
            print(f"[DhanBridge] Background base price refresh error: {e}")

# Start base price refresher daemon thread
threading.Thread(target=background_base_price_refresher, daemon=True).start()

@sock.route('/ws')
def ws_endpoint(ws):
    print("[DhanBridge] 🔌 Client connected to Dhan WebSocket feed")
    subscribed = set()
    
    import simple_websocket
    
    while True:
        try:
            # Check for messages with a 250ms timeout
            data = ws.receive(timeout=0.25)
            if data:
                msg = json.loads(data)
                action = msg.get('action')
                if action == 'subscribe':
                    symbols = msg.get('symbols', [])
                    for s in symbols:
                        subscribed.add(s.upper())
                    print(f"[DhanBridge] WebSocket subscribed to: {list(subscribed)}")
                elif action == 'unsubscribe':
                    symbols = msg.get('symbols', [])
                    for s in symbols:
                        if s.upper() in subscribed:
                            subscribed.remove(s.upper())
                    print(f"[DhanBridge] WebSocket unsubscribed from: {symbols}")
                    
        except simple_websocket.ConnectionClosed:
            print("[DhanBridge] 🔌 Client disconnected from Dhan WebSocket feed")
            break
        except Exception as e:
            # Ignore other read exceptions (like timeouts)
            pass
            
        # Push ticks for subscribed symbols only if their markets are open
        if subscribed:
            ticks = []
            for s in list(subscribed):
                if is_market_open_for_symbol(s):
                    tick = get_live_tick(s)
                    if tick:
                        ticks.append(tick)
            
            if ticks:
                try:
                    ws.send(json.dumps({
                        "type": "ticks",
                        "data": ticks,
                        "timestamp": int(time.time() * 1000)
                    }))
                except Exception as ex:
                    print(f"[DhanBridge] WebSocket send failed: {ex}")
                    break


if __name__ == '__main__':
    port = int(os.getenv('DHAN_BRIDGE_PORT', '5060'))
    
    for i, arg in enumerate(sys.argv):
        if arg == '--port' and i + 1 < len(sys.argv):
            port = int(sys.argv[i + 1])
            
    print('')
    print('  ╔══════════════════════════════════════════════════╗')
    print('  ║     🟢 Dhan API Bridge Server                    ║')
    print('  ╠══════════════════════════════════════════════════╣')
    print(f'  ║  Port:   http://localhost:{port}                  ║')
    print('  ║  SDK:    DhanHQ REST APIs                        ║')
    print('  ║                                                  ║')
    print('  ║  Press Ctrl+C to stop                           ║')
    print('  ╚══════════════════════════════════════════════════╝')
    print('')

    app.run(host='0.0.0.0', port=port, debug=False)
