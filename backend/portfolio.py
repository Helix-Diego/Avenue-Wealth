import urllib.request
import ssl
import csv
import json
import re
from datetime import datetime
from backend.database import get_connection, sync_realtime_account_balances

import os

SHEET_BASE_URL = "https://docs.google.com/spreadsheets/d/1t5XvfCTcJuwpyTsuJyqj_BBE88u5OOobwsUe9Mp7BCY/export?format=csv"
RESUMEN_GID = "16589626"
TRANSACTIONS_GID = "465665352"
FINNHUB_TOKEN = os.environ.get("FINNHUB_API_KEY", "d9n40r9r01qlajg3bjugd9n40r9r01qlajg3bjv0")

def get_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def fetch_live_stock_quote(ticker: str):
    """
    Fetches real-time stock price and 24h change using Finnhub API with user key.
    Falls back gracefully to Yahoo Finance or benchmark prices.
    """
    # 1. Finnhub API
    try:
        url = f"https://finnhub.io/api/v1/quote?symbol={ticker}&token={FINNHUB_TOKEN}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=5) as res:
            data = json.loads(res.read().decode('utf-8'))
            current_price = data.get("c", 0.0)
            if current_price and current_price > 0:
                change_pct = data.get("dp", 0.0) or 0.0
                return {
                    "price": round(float(current_price), 3),
                    "change_pct": round(float(change_pct), 2),
                    "currency": "USD",
                    "provider": "Finnhub",
                    "high": round(float(data.get("h", current_price)), 2),
                    "low": round(float(data.get("l", current_price)), 2),
                    "prev_close": round(float(data.get("pc", current_price)), 2)
                }
    except Exception as e:
        print(f"Finnhub quote fetch notice for {ticker}:", e)

    # 2. Yahoo Finance fallback
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=1d"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=5) as res:
            data = json.loads(res.read().decode('utf-8'))
            meta = data["chart"]["result"][0]["meta"]
            price = meta.get("regularMarketPrice", 0.0)
            prev_close = meta.get("chartPreviousClose", price)
            change_pct = ((price - prev_close) / prev_close * 100) if prev_close else 0.0
            return {
                "price": round(price, 3),
                "change_pct": round(change_pct, 2),
                "currency": meta.get("currency", "USD"),
                "provider": "Yahoo"
            }
    except Exception:
        pass

    # 3. Benchmark fallbacks
    fallbacks = {
        "UPST": 23.00,
        "INTC": 115.73,
        "SMCI": 42.01,
        "OKLO": 37.31,
        "FLNC": 7.58,
        "EURUSD=X": 1.137
    }
    fallback_price = fallbacks.get(ticker, 50.0)
    return {"price": fallback_price, "change_pct": 0.0, "currency": "USD", "provider": "Benchmark"}

def fetch_eur_usd_rate():
    # 1. ExchangeRate API
    try:
        url = "https://open.er-api.com/v6/latest/EUR"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=4) as res:
            data = json.loads(res.read().decode('utf-8'))
            usd_rate = data.get("rates", {}).get("USD")
            if usd_rate and usd_rate > 0.5:
                return round(float(usd_rate), 4)
    except Exception:
        pass

    # 2. Yahoo fallback
    try:
        q = fetch_live_stock_quote("EURUSD=X")
        rate = q.get("price", 1.137)
        if rate > 0.5:
            return round(rate, 4)
    except Exception:
        pass

    return 1.137

def fetch_msci_nav():
    """
    Fetches NAV for Fidelity MSCI World Fund IE00BYX5P602.
    """
    try:
        url = "https://markets.ft.com/data/funds/tearsheet/summary?s=IE00BYX5P602:EUR"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=5) as res:
            html = res.read().decode('utf-8', errors='ignore')
            m = re.search(r'class="mod-ui-data-list__value">([0-9.,]+)</span>', html)
            if m:
                val = float(m.group(1).replace(',', ''))
                return val
    except Exception:
        pass

    try:
        url = "https://query1.finance.yahoo.com/v8/finance/chart/FEPE.MU?interval=1d&range=1d"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=5) as res:
            data = json.loads(res.read().decode('utf-8'))
            return round(data["chart"]["result"][0]["meta"]["regularMarketPrice"], 3)
    except Exception:
        pass

    return 12.10

def record_fund_subscription_from_statement(conn, date_str: str, amount_eur: float, notes: str = ""):
    """
    Records or updates a mutual fund subscription for Fidelity MSCI World Fund (IE00BYX5P602)
    when detected in an imported statement (e.g. MyInvestor).
    Prevents duplicate entries and properly reconciles against consolidated baseline.
    """
    cursor = conn.cursor()
    inv_amount = round(abs(amount_eur), 2)
    if inv_amount <= 0:
        return None

    # Check if this exact contribution is already recorded (date and amount match)
    cursor.execute("""
    SELECT id FROM fund_contributions
    WHERE date = ? AND abs(invested_amount - ?) < 0.02
    """, (date_str, inv_amount))
    if cursor.fetchone():
        return None  # Already recorded

    # Check if there is an existing baseline row
    cursor.execute("""
    SELECT id, date, shares, invested_amount, nav_price FROM fund_contributions
    WHERE notes LIKE '%consolidada%' OR notes LIKE '%acumulada%'
    LIMIT 1
    """)
    baseline = cursor.fetchone()

    # Get current NAV
    cursor.execute("SELECT latest_nav FROM fund_info WHERE isin = 'IE00BYX5P602'")
    fund_info_row = cursor.fetchone()
    current_nav = fund_info_row["latest_nav"] if (fund_info_row and fund_info_row["latest_nav"] > 0) else fetch_msci_nav()

    sub_notes = notes or "Suscripción Fidelity MSCI World Index P-ACC"

    if baseline and date_str <= baseline["date"]:
        # Contribution is prior or equal to the consolidated baseline date
        baseline_price = float(baseline["nav_price"]) if baseline["nav_price"] > 0 else (baseline["invested_amount"] / baseline["shares"] if baseline["shares"] > 0 else current_nav)
        shares = round(inv_amount / baseline_price, 4)

        # Insert individual contribution
        cursor.execute("""
        INSERT INTO fund_contributions (date, shares, invested_amount, nav_price, notes)
        VALUES (?, ?, ?, ?, ?)
        """, (date_str, shares, inv_amount, round(baseline_price, 4), sub_notes))

        # Adjust baseline downwards to maintain exact total
        new_base_amount = max(0.0, round(baseline["invested_amount"] - inv_amount, 2))
        new_base_shares = max(0.0, round(baseline["shares"] - shares, 4))
        cursor.execute("""
        UPDATE fund_contributions
        SET invested_amount = ?, shares = ?
        WHERE id = ?
        """, (new_base_amount, new_base_shares, baseline["id"]))
    else:
        # New contribution after baseline: buy shares at latest NAV
        nav = current_nav if current_nav > 0 else 12.10
        shares = round(inv_amount / nav, 4)
        cursor.execute("""
        INSERT INTO fund_contributions (date, shares, invested_amount, nav_price, notes)
        VALUES (?, ?, ?, ?, ?)
        """, (date_str, shares, inv_amount, round(nav, 4), sub_notes))

    # Recalculate total_shares in fund_info
    cursor.execute("SELECT SUM(shares) FROM fund_contributions")
    total_shares = cursor.fetchone()[0] or 0.0
    cursor.execute("""
    UPDATE fund_info
    SET total_shares = ?, last_updated = ?
    WHERE isin = 'IE00BYX5P602'
    """, (round(total_shares, 4), datetime.now().isoformat()))

    return {"status": "recorded", "shares": shares, "amount": inv_amount}

def sync_google_sheet_portfolio():
    """
    Reads the user's Google Sheet 'Resumen' tab and updates portfolio_stocks table.
    """
    conn = get_connection()
    cursor = conn.cursor()

    url = f"{SHEET_BASE_URL}&gid={RESUMEN_GID}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    
    positions = []
    try:
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=8) as res:
            lines = res.read().decode('utf-8', errors='ignore').splitlines()
            reader = csv.reader(lines)
            
            in_positions = False
            for row in reader:
                if not row or not any(row):
                    continue
                if len(row) >= 3 and row[0].strip().lower() in ["símbolo", "simbolo", "ticker"]:
                    in_positions = True
                    continue
                
                if in_positions and len(row) >= 3:
                    symbol = row[0].strip().upper()
                    if not symbol:
                        continue
                    
                    try:
                        # Parse shares (handle "32,00" or "32")
                        shares_raw = row[1].strip().replace('.', '').replace(',', '.')
                        shares = float(shares_raw)
                        # Parse average price (handle "35,20")
                        price_raw = row[2].strip().replace('$', '').replace('€', '').replace('.', '').replace(',', '.')
                        avg_price = float(price_raw)
                    except ValueError:
                        continue
                    
                    positions.append({
                        "symbol": symbol,
                        "shares": shares,
                        "avg_price": avg_price,
                        "currency": "USD"
                    })
    except Exception as e:
        print("Google Sheet sync error:", e)
        # Use initial seed from sheet if fetch failed
        positions = [
            {"symbol": "UPST", "shares": 32.0, "avg_price": 35.20, "currency": "USD"},
            {"symbol": "INTC", "shares": 8.0, "avg_price": 82.42, "currency": "USD"},
            {"symbol": "SMCI", "shares": 35.0, "avg_price": 33.93, "currency": "USD"},
            {"symbol": "FLNC", "shares": 0.0, "avg_price": 17.86, "currency": "USD"},
            {"symbol": "OKLO", "shares": 8.0, "avg_price": 69.16, "currency": "USD"},
        ]

    # Save to database and fetch live quotes
    eur_usd = fetch_eur_usd_rate()
    synced_stocks = []

    for pos in positions:
        quote = fetch_live_stock_quote(pos["symbol"])
        curr_price = quote["price"]
        chg_24h = quote["change_pct"]
        now = datetime.now().isoformat()

        cursor.execute("""
        INSERT INTO portfolio_stocks (symbol, shares, avg_price, currency, current_price, price_change_24h, last_updated)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
            shares = excluded.shares,
            avg_price = excluded.avg_price,
            current_price = excluded.current_price,
            price_change_24h = excluded.price_change_24h,
            last_updated = excluded.last_updated
        """, (pos["symbol"], pos["shares"], pos["avg_price"], pos["currency"], curr_price, chg_24h, now))

        cost_usd = pos["shares"] * pos["avg_price"]
        value_usd = pos["shares"] * curr_price
        pnl_usd = value_usd - cost_usd
        pnl_pct = (pnl_usd / cost_usd * 100) if cost_usd > 0 else 0.0

        synced_stocks.append({
            "symbol": pos["symbol"],
            "shares": pos["shares"],
            "avg_price": pos["avg_price"],
            "current_price": curr_price,
            "cost_usd": round(cost_usd, 2),
            "value_usd": round(value_usd, 2),
            "cost_eur": round(cost_usd / eur_usd, 2),
            "value_eur": round(value_usd / eur_usd, 2),
            "pnl_usd": round(pnl_usd, 2),
            "pnl_pct": round(pnl_pct, 2),
            "price_change_24h": chg_24h,
            "currency": "USD"
        })

    conn.commit()
    conn.close()

    return {
        "stocks": synced_stocks,
        "eur_usd_rate": eur_usd,
        "last_synced": datetime.now().isoformat()
    }

def get_portfolio_summary():
    """
    Returns full portfolio breakdown: stocks + MSCI fund + Capital Global.
    """
    conn = get_connection()
    cursor = conn.cursor()

    eur_usd = fetch_eur_usd_rate()

    # 1. Stocks
    cursor.execute("SELECT * FROM portfolio_stocks WHERE shares > 0 ORDER BY (shares * current_price) DESC")
    rows = cursor.fetchall()

    stocks = []
    total_stocks_usd = 0.0
    total_stocks_cost_usd = 0.0

    for r in rows:
        sym = r["symbol"]
        shares = r["shares"]
        avg_price = r["avg_price"]
        curr_price = r["current_price"]
        chg_24h = r["price_change_24h"]

        cost_usd = shares * avg_price
        value_usd = shares * curr_price
        pnl_usd = value_usd - cost_usd
        pnl_pct = (pnl_usd / cost_usd * 100) if cost_usd > 0 else 0.0

        total_stocks_usd += value_usd
        total_stocks_cost_usd += cost_usd

        stocks.append({
            "symbol": sym,
            "shares": shares,
            "avg_price": round(avg_price, 2),
            "current_price": round(curr_price, 2),
            "value_usd": round(value_usd, 2),
            "value_eur": round(value_usd / eur_usd, 2),
            "cost_usd": round(cost_usd, 2),
            "cost_eur": round(cost_usd / eur_usd, 2),
            "pnl_usd": round(pnl_usd, 2),
            "pnl_eur": round(pnl_usd / eur_usd, 2),
            "pnl_pct": round(pnl_pct, 2),
            "change_24h": chg_24h
        })

    total_stocks_eur = total_stocks_usd / eur_usd
    total_stocks_cost_eur = total_stocks_cost_usd / eur_usd
    stocks_pnl_eur = total_stocks_eur - total_stocks_cost_eur
    stocks_pnl_pct = (stocks_pnl_eur / total_stocks_cost_eur * 100) if total_stocks_cost_eur > 0 else 0.0

    # 2. MSCI World Fund (IE00BYX5P602)
    cursor.execute("SELECT * FROM fund_info WHERE isin = 'IE00BYX5P602'")
    fund_row = cursor.fetchone()
    
    cursor.execute("SELECT SUM(shares), SUM(invested_amount) FROM fund_contributions")
    fund_contrib = cursor.fetchone()
    contrib_shares = fund_contrib[0] or 0.0
    contrib_invested = fund_contrib[1] or 0.0

    total_shares = max(fund_row["total_shares"] if fund_row else 0.0, contrib_shares)
    latest_nav = fund_row["latest_nav"] if fund_row and fund_row["latest_nav"] > 0 else fetch_msci_nav()
    fund_value_eur = total_shares * latest_nav
    fund_pnl_eur = fund_value_eur - contrib_invested if contrib_invested > 0 else 0.0
    fund_pnl_pct = (fund_pnl_eur / contrib_invested * 100) if contrib_invested > 0 else 0.0

    cursor.execute("SELECT id, date, shares, invested_amount, nav_price, notes FROM fund_contributions ORDER BY date DESC, id DESC")
    contrib_rows = [dict(r) for r in cursor.fetchall()]

    fund_data = {
        "isin": "IE00BYX5P602",
        "name": "Fidelity MSCI World Index Fund P-ACC-EUR",
        "total_shares": round(total_shares, 4),
        "latest_nav": round(latest_nav, 3),
        "total_value_eur": round(fund_value_eur, 2),
        "invested_eur": round(contrib_invested, 2),
        "pnl_eur": round(fund_pnl_eur, 2),
        "pnl_pct": round(fund_pnl_pct, 2),
        "currency": "EUR",
        "contributions": contrib_rows
    }

    # 3. Real Bank balances & Liquid Cash (dynamically synced in real time)
    sync_realtime_account_balances(conn)
    cursor.execute("SELECT * FROM bank_accounts ORDER BY is_credit_card ASC, current_balance DESC")
    account_rows = cursor.fetchall()

    accounts_list = []
    total_liquid_cash = 0.0
    latest_import_date = None

    for acc in account_rows:
        acc_dict = {
            "account_name": acc["account_name"],
            "account_type": acc["account_type"],
            "current_balance": round(acc["current_balance"], 2),
            "currency": acc["currency"],
            "last_transaction_date": acc["last_transaction_date"],
            "last_imported_at": acc["last_imported_at"],
            "is_credit_card": bool(acc["is_credit_card"]),
            "notes": acc["notes"]
        }
        accounts_list.append(acc_dict)
        if not acc["is_credit_card"]:
            total_liquid_cash += acc["current_balance"]
            if acc["last_transaction_date"] and (not latest_import_date or acc["last_transaction_date"] > latest_import_date):
                latest_import_date = acc["last_transaction_date"]

    liquid_cash = round(total_liquid_cash, 2)

    # 4. Pending Company Reimbursements (Receivable credit)
    cursor.execute("SELECT SUM(ABS(amount)) FROM transactions WHERE is_reimbursable = 1 AND reimbursement_status = 'pending'")
    pending_reimbursements = cursor.fetchone()[0] or 0.0

    conn.close()

    # 5. Outstanding Debt from Loans & Credit Facilities
    from backend.loans import get_loans_summary
    try:
        loans_summary = get_loans_summary()
        loans_kpis = loans_summary.get("global_kpis", {})
        total_debt = round(float(loans_kpis.get("outstanding_debt", 0.0)), 2)
        monthly_debt_burden = round(float(loans_kpis.get("monthly_burden", 0.0)), 2)
        active_loans_count = int(loans_kpis.get("active_loans_count", 0))
    except Exception as e:
        print("Notice when reading loans summary in portfolio:", e)
        total_debt = 0.0
        monthly_debt_burden = 0.0
        active_loans_count = 0

    gross_capital = round(liquid_cash + total_stocks_eur + fund_value_eur + pending_reimbursements, 2)
    net_worth = round(gross_capital - total_debt, 2)

    return {
        "capital_global": net_worth,
        "net_worth": net_worth,
        "gross_capital": gross_capital,
        "total_debt": total_debt,
        "monthly_debt_burden": monthly_debt_burden,
        "active_loans_count": active_loans_count,
        "liquid_cash": round(liquid_cash, 2),
        "bank_accounts": accounts_list,
        "last_liquidity_date": latest_import_date,
        "stocks": {
            "items": stocks,
            "total_value_usd": round(total_stocks_usd, 2),
            "total_value_eur": round(total_stocks_eur, 2),
            "cost_eur": round(total_stocks_cost_eur, 2),
            "pnl_eur": round(stocks_pnl_eur, 2),
            "pnl_pct": round(stocks_pnl_pct, 2),
            "eur_usd_rate": round(eur_usd, 4),
            "provider": "Finnhub"
        },
        "fund": fund_data,
        "pending_company_reimbursements": round(pending_reimbursements, 2),
        "asset_allocation": [
            {"name": "Liquidez & Bancos", "value": round(max(0, liquid_cash), 2), "color": "#10B981"},
            {"name": "Acciones USA (Finnhub)", "value": round(total_stocks_eur, 2), "color": "#6366F1"},
            {"name": "Fondo MSCI World", "value": round(fund_value_eur, 2), "color": "#8B5CF6"},
            {"name": "Reembolsos Empresa (Pendiente)", "value": round(pending_reimbursements, 2), "color": "#0EA5E9"}
        ]
    }
