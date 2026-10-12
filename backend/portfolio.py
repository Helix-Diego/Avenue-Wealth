import urllib.request
import urllib.parse
import ssl
import json
import re
import os
from datetime import datetime
from backend.database import get_connection, sync_realtime_account_balances

FINNHUB_TOKEN = os.environ.get("FINNHUB_API_KEY", "d9n40r9r01qlajg3bjugd9n40r9r01qlajg3bjv0")

def get_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

# =========================================================================
# 1. LIVE FINNHUB STOCKS (SEARCH, QUOTES & HOLDINGS)
# =========================================================================

def search_stocks_finnhub(query: str) -> list:
    """
    Searches ticker symbols and company names in real-time using Finnhub API.
    Returns list of dicts: [{"symbol": "AAPL", "display_symbol": "AAPL", "description": "Apple Inc", "type": "Common Stock"}]
    """
    if not query or len(query.strip()) < 1:
        return []
    try:
        clean_q = urllib.parse.quote(query.strip())
        url = f"https://finnhub.io/api/v1/search?q={clean_q}&token={FINNHUB_TOKEN}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=6) as res:
            data = json.loads(res.read().decode('utf-8'))
            results = []
            for item in data.get("result", []):
                sym = item.get("symbol", "").strip()
                disp_sym = item.get("displaySymbol", sym).strip()
                desc = item.get("description", "").strip()
                stype = item.get("type", "Common Stock")
                if sym and desc:
                    results.append({
                        "symbol": sym,
                        "display_symbol": disp_sym,
                        "description": desc,
                        "type": stype
                    })
            return results[:15]
    except Exception as e:
        print("Finnhub search error:", e)
        return []

def fetch_live_stock_quote(ticker: str) -> dict:
    """
    Fetches real-time stock price and 24h change using Finnhub API with user key.
    Falls back gracefully to Yahoo Finance or benchmark prices.
    """
    clean_ticker = ticker.strip().upper()
    # 1. Finnhub API
    try:
        url = f"https://finnhub.io/api/v1/quote?symbol={urllib.parse.quote(clean_ticker)}&token={FINNHUB_TOKEN}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=5) as res:
            data = json.loads(res.read().decode('utf-8'))
            current_price = data.get("c", 0.0)
            if current_price and current_price > 0:
                change_pct = data.get("dp", 0.0) or 0.0
                return {
                    "symbol": clean_ticker,
                    "price": round(float(current_price), 3),
                    "change_pct": round(float(change_pct), 2),
                    "currency": "USD",
                    "provider": "Finnhub",
                    "high": round(float(data.get("h", current_price)), 2),
                    "low": round(float(data.get("l", current_price)), 2),
                    "prev_close": round(float(data.get("pc", current_price)), 2)
                }
    except Exception as e:
        print(f"Finnhub quote fetch notice for {clean_ticker}:", e)

    # 2. Yahoo Finance fallback
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(clean_ticker)}?interval=1d&range=1d"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=5) as res:
            data = json.loads(res.read().decode('utf-8'))
            meta = data["chart"]["result"][0]["meta"]
            price = meta.get("regularMarketPrice", 0.0)
            prev_close = meta.get("chartPreviousClose", price)
            change_pct = ((price - prev_close) / prev_close * 100) if prev_close else 0.0
            return {
                "symbol": clean_ticker,
                "price": round(price, 3),
                "change_pct": round(change_pct, 2),
                "currency": meta.get("currency", "USD"),
                "provider": "Yahoo"
            }
    except Exception:
        pass

    return {
        "symbol": clean_ticker,
        "price": 0.0,
        "change_pct": 0.0,
        "currency": "USD",
        "provider": "Offline"
    }

def fetch_eur_usd_rate() -> float:
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

def add_or_update_stock_holding(symbol: str, name: str, shares: float, avg_price: float, currency: str = "USD") -> dict:
    """
    Adds or updates a stock position in the user's local portfolio.
    Immediately fetches latest live quote from Finnhub.
    """
    clean_sym = symbol.strip().upper()
    quote = fetch_live_stock_quote(clean_sym)
    curr_price = quote["price"] if quote["price"] > 0 else avg_price
    chg_24h = quote["change_pct"]
    now = datetime.now().isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO portfolio_stocks (symbol, name, shares, avg_price, currency, current_price, price_change_24h, last_updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(symbol) DO UPDATE SET
        name = coalesce(nullif(excluded.name, ''), portfolio_stocks.name),
        shares = excluded.shares,
        avg_price = excluded.avg_price,
        currency = excluded.currency,
        current_price = case when excluded.current_price > 0 then excluded.current_price else portfolio_stocks.current_price end,
        price_change_24h = excluded.price_change_24h,
        last_updated = excluded.last_updated
    """, (clean_sym, name.strip(), float(shares), float(avg_price), currency, curr_price, chg_24h, now))
    conn.commit()
    conn.close()

    return {
        "symbol": clean_sym,
        "name": name,
        "shares": shares,
        "avg_price": avg_price,
        "current_price": curr_price,
        "price_change_24h": chg_24h,
        "currency": currency
    }

def delete_stock_holding(symbol: str) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM portfolio_stocks WHERE symbol = ?", (symbol.strip().upper(),))
    conn.commit()
    conn.close()
    return {"status": "deleted", "symbol": symbol}

def refresh_all_stock_quotes() -> list:
    """
    Refreshes Finnhub live quotes for all user stocks in portfolio_stocks table.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT symbol FROM portfolio_stocks WHERE shares > 0")
    symbols = [r["symbol"] for r in cursor.fetchall()]

    updated = []
    now = datetime.now().isoformat()
    for sym in symbols:
        q = fetch_live_stock_quote(sym)
        if q["price"] > 0:
            cursor.execute("""
            UPDATE portfolio_stocks
            SET current_price = ?, price_change_24h = ?, last_updated = ?
            WHERE symbol = ?
            """, (q["price"], q["change_pct"], now, sym))
            updated.append(q)

    conn.commit()
    conn.close()
    return updated

# =========================================================================
# 2. GENERIC MUTUAL FUNDS (FONDOS DE INVERSIÓN)
# =========================================================================

def fetch_fund_nav_and_name(isin: str) -> dict:
    """
    Fetches real-time / latest Net Asset Value (NAV / Valor liquidativo) and fund name
    for ANY mutual fund using its ISIN or reference code (e.g. IE00BYX5P602, LU0996177134, ES0152769032).
    Scrapes Financial Times tearsheet summary, with Yahoo Finance fallback.
    """
    clean_isin = isin.strip().upper()
    found_nav = None
    found_name = ""

    # 1. Financial Times Fund Tearsheet
    try:
        url = f"https://markets.ft.com/data/funds/tearsheet/summary?s={clean_isin}:EUR"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=6) as res:
            html = res.read().decode('utf-8', errors='ignore')
            # Extract NAV
            m = re.search(r'class="mod-ui-data-list__value">([0-9.,]+)</span>', html)
            if m:
                found_nav = round(float(m.group(1).replace(',', '')), 4)

            # Extract Fund Name from H1 or Title
            m_h1 = re.search(r'<h1[^>]*>([^<]+)</h1>', html)
            if m_h1:
                found_name = m_h1.group(1).strip()
            else:
                m_title = re.search(r'<title>([^<,]+)', html)
                if m_title:
                    found_name = m_title.group(1).strip()
    except Exception as e:
        print(f"FT tearsheet fetch notice for {clean_isin}:", e)

    # 2. Yahoo Finance fallback for NAV if FT didn't return NAV
    if not found_nav or found_nav <= 0:
        for ticker_suffix in [".MU", ".DE", ".F", ""]:
            try:
                y_ticker = f"{clean_isin}{ticker_suffix}"
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{y_ticker}?interval=1d&range=1d"
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                with urllib.request.urlopen(req, context=get_ssl_context(), timeout=4) as res:
                    data = json.loads(res.read().decode('utf-8'))
                    meta = data["chart"]["result"][0]["meta"]
                    price = meta.get("regularMarketPrice", 0.0)
                    if price and price > 0:
                        found_nav = round(float(price), 4)
                        if not found_name:
                            found_name = meta.get("shortName") or meta.get("longName") or clean_isin
                        break
            except Exception:
                continue

    # Default name fallback
    if not found_name:
        found_name = f"Fondo de Inversión ({clean_isin})"

    return {
        "isin": clean_isin,
        "name": found_name,
        "nav": found_nav or 0.0,
        "currency": "EUR"
    }

def fetch_msci_nav() -> float:
    """
    Backwards compatibility helper for Fidelity MSCI World Fund (IE00BYX5P602).
    """
    data = fetch_fund_nav_and_name("IE00BYX5P602")
    return data.get("nav") or 12.15

def add_or_update_fund(isin: str, name: str = None, latest_nav: float = 0.0, currency: str = "EUR") -> dict:
    """
    Registers or updates a mutual fund by ISIN.
    If latest_nav is 0 or name is missing, attempts live lookup.
    """
    clean_isin = isin.strip().upper()
    live_info = {}
    if not name or latest_nav <= 0:
        live_info = fetch_fund_nav_and_name(clean_isin)

    fund_name = name.strip() if name and name.strip() else (live_info.get("name") or f"Fondo {clean_isin}")
    nav = latest_nav if latest_nav > 0 else (live_info.get("nav") or 10.0)
    now = datetime.now().isoformat()

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO fund_info (isin, name, total_shares, latest_nav, currency, last_updated)
    VALUES (?, ?, 0.0, ?, ?, ?)
    ON CONFLICT(isin) DO UPDATE SET
        name = excluded.name,
        latest_nav = case when excluded.latest_nav > 0 then excluded.latest_nav else fund_info.latest_nav end,
        currency = excluded.currency,
        last_updated = excluded.last_updated
    """, (clean_isin, fund_name, nav, currency, now))
    conn.commit()
    conn.close()

    return {
        "isin": clean_isin,
        "name": fund_name,
        "latest_nav": nav,
        "currency": currency,
        "last_updated": now
    }

def delete_fund(isin: str) -> dict:
    """
    Deletes a registered fund and its associated contributions.
    """
    clean_isin = isin.strip().upper()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM fund_contributions WHERE fund_isin = ?", (clean_isin,))
    cursor.execute("DELETE FROM fund_info WHERE isin = ?", (clean_isin,))
    conn.commit()
    conn.close()
    return {"status": "deleted", "isin": clean_isin}

def record_fund_contribution(
    isin: str,
    date_str: str,
    invested_amount: float,
    nav_price: float = None,
    shares: float = None,
    notes: str = "",
    funding_account: str = "Santander"
) -> dict:
    """
    Records a contribution / subscription for ANY registered fund.
    Calculates shares if missing, updates fund_info total_shares,
    and inserts corresponding transaction record into transactions.
    """
    clean_isin = isin.strip().upper()
    inv_amount = round(abs(float(invested_amount)), 2)
    if inv_amount <= 0:
        raise ValueError("El importe invertido debe ser mayor que cero.")

    conn = get_connection()
    cursor = conn.cursor()

    # Ensure fund exists in fund_info
    cursor.execute("SELECT * FROM fund_info WHERE isin = ?", (clean_isin,))
    fund_row = cursor.fetchone()
    if not fund_row:
        # Auto-register fund
        conn.close()
        add_or_update_fund(clean_isin)
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM fund_info WHERE isin = ?", (clean_isin,))
        fund_row = cursor.fetchone()

    current_nav = float(fund_row["latest_nav"]) if fund_row and fund_row["latest_nav"] > 0 else 0.0
    final_nav = nav_price if (nav_price and nav_price > 0) else (current_nav if current_nav > 0 else 10.0)
    final_shares = shares if (shares and shares > 0) else round(inv_amount / final_nav, 4)

    fund_title = fund_row["name"] if fund_row else clean_isin
    sub_notes = notes.strip() or f"Aportación {fund_title}"

    # Insert contribution record
    cursor.execute("""
    INSERT INTO fund_contributions (fund_isin, date, shares, invested_amount, nav_price, funding_account, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (clean_isin, date_str, final_shares, inv_amount, round(final_nav, 4), funding_account, sub_notes))
    contrib_id = cursor.lastrowid

    # Recalculate total_shares in fund_info for this fund
    cursor.execute("SELECT SUM(shares) FROM fund_contributions WHERE fund_isin = ?", (clean_isin,))
    total_shares = cursor.fetchone()[0] or 0.0

    now = datetime.now().isoformat()
    cursor.execute("""
    UPDATE fund_info
    SET total_shares = ?, latest_nav = ?, last_updated = ?
    WHERE isin = ?
    """, (round(total_shares, 4), round(final_nav, 4), now, clean_isin))

    # Also register corresponding outflow in transactions
    cursor.execute("""
    INSERT INTO transactions (
        date, account, description, raw_description, amount, currency,
        category, is_reimbursable, reimbursement_status, needs_clarification,
        confidence, notes
    ) VALUES (?, ?, ?, ?, ?, 'EUR', 'Inversiones y ahorros', 0, 'none', 0, 1.0, ?)
    """, (
        date_str,
        funding_account or "Santander",
        f"Aportación {fund_title} ({final_shares:.2f} part.)",
        f"Aportación {fund_title} ({final_shares:.2f} part.)",
        -inv_amount,
        f"Aportación registrada a fondo {clean_isin}"
    ))

    conn.commit()
    conn.close()

    return {
        "status": "created",
        "contribution_id": contrib_id,
        "isin": clean_isin,
        "shares": final_shares,
        "total_shares": round(total_shares, 4),
        "latest_nav": final_nav,
        "invested_amount": inv_amount
    }

def delete_fund_contribution(contrib_id: int) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT fund_isin FROM fund_contributions WHERE id = ?", (contrib_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        raise ValueError("Aportación no encontrada.")

    fund_isin = row["fund_isin"] or "IE00BYX5P602"
    cursor.execute("DELETE FROM fund_contributions WHERE id = ?", (contrib_id,))

    # Recalculate total_shares
    cursor.execute("SELECT SUM(shares) FROM fund_contributions WHERE fund_isin = ?", (fund_isin,))
    total_shares = cursor.fetchone()[0] or 0.0

    cursor.execute("""
    UPDATE fund_info
    SET total_shares = ?, last_updated = ?
    WHERE isin = ?
    """, (round(total_shares, 4), datetime.now().isoformat(), fund_isin))

    conn.commit()
    conn.close()
    return {"status": "deleted", "contribution_id": contrib_id, "total_shares": total_shares}

def refresh_all_funds_nav() -> list:
    """
    Refreshes NAV in real time for all registered funds.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT isin FROM fund_info")
    isins = [r["isin"] for r in cursor.fetchall()]

    updated = []
    now = datetime.now().isoformat()
    for isin in isins:
        info = fetch_fund_nav_and_name(isin)
        if info.get("nav") and info["nav"] > 0:
            cursor.execute("""
            UPDATE fund_info
            SET latest_nav = ?, last_updated = ?
            WHERE isin = ?
            """, (info["nav"], now, isin))
            updated.append(info)

    conn.commit()
    conn.close()
    return updated

def record_fund_subscription_from_statement(conn, date_str: str, amount_eur: float, notes: str = "", isin: str = "IE00BYX5P602"):
    """
    Records or updates a mutual fund subscription detected in an imported statement (e.g. MyInvestor).
    Prevents duplicate entries.
    """
    cursor = conn.cursor()
    inv_amount = round(abs(amount_eur), 2)
    if inv_amount <= 0:
        return None

    # Check duplicate
    cursor.execute("""
    SELECT id FROM fund_contributions
    WHERE fund_isin = ? AND date = ? AND abs(invested_amount - ?) < 0.02
    """, (isin, date_str, inv_amount))
    if cursor.fetchone():
        return None

    # Get current NAV
    cursor.execute("SELECT latest_nav FROM fund_info WHERE isin = ?", (isin,))
    row = cursor.fetchone()
    current_nav = row["latest_nav"] if (row and row["latest_nav"] > 0) else fetch_msci_nav()

    shares = round(inv_amount / current_nav, 4) if current_nav > 0 else 0.0
    sub_notes = notes or f"Suscripción fondo {isin}"

    cursor.execute("""
    INSERT INTO fund_contributions (fund_isin, date, shares, invested_amount, nav_price, notes)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (isin, date_str, shares, inv_amount, round(current_nav, 4), sub_notes))

    cursor.execute("SELECT SUM(shares) FROM fund_contributions WHERE fund_isin = ?", (isin,))
    total_shares = cursor.fetchone()[0] or 0.0
    cursor.execute("""
    UPDATE fund_info
    SET total_shares = ?, last_updated = ?
    WHERE isin = ?
    """, (round(total_shares, 4), datetime.now().isoformat(), isin))

    return {"status": "recorded", "shares": shares, "amount": inv_amount}

# =========================================================================
# 3. CONSOLIDATED PORTFOLIO SUMMARY
# =========================================================================

def get_portfolio_summary(user_id: str = "00000000-0000-0000-0000-000000000000") -> dict:
    """
    Returns full portfolio breakdown:
    - Real-time stock portfolio via Finnhub
    - All registered mutual funds with their live NAV & contributions
    - Real-time bank account balances
    - Global net worth and capital allocation
    """
    conn = get_connection()
    cursor = conn.cursor()

    eur_usd = fetch_eur_usd_rate()

    # 1. Stocks
    cursor.execute("SELECT * FROM portfolio_stocks WHERE shares > 0 AND user_id = ? ORDER BY (shares * current_price) DESC", (user_id,))
    stock_rows = cursor.fetchall()

    stocks = []
    total_stocks_usd = 0.0
    total_stocks_cost_usd = 0.0

    for r in stock_rows:
        sym = r["symbol"]
        name = r["name"] if ("name" in r.keys() and r["name"]) else sym
        shares = r["shares"]
        avg_price = r["avg_price"]
        curr_price = r["current_price"]
        chg_24h = r["price_change_24h"]
        curr = r["currency"] or "USD"

        if curr == "EUR":
            cost_usd = shares * avg_price * eur_usd
            value_usd = shares * curr_price * eur_usd
            cost_eur = shares * avg_price
            value_eur = shares * curr_price
        else:
            cost_usd = shares * avg_price
            value_usd = shares * curr_price
            cost_eur = cost_usd / eur_usd
            value_eur = value_usd / eur_usd

        pnl_usd = value_usd - cost_usd
        pnl_eur = value_eur - cost_eur
        pnl_pct = (pnl_usd / cost_usd * 100) if cost_usd > 0 else 0.0

        total_stocks_usd += value_usd
        total_stocks_cost_usd += cost_usd

        stocks.append({
            "symbol": sym,
            "name": name,
            "shares": shares,
            "avg_price": round(avg_price, 2),
            "current_price": round(curr_price, 2),
            "value_usd": round(value_usd, 2),
            "value_eur": round(value_eur, 2),
            "cost_usd": round(cost_usd, 2),
            "cost_eur": round(cost_eur, 2),
            "pnl_usd": round(pnl_usd, 2),
            "pnl_eur": round(pnl_eur, 2),
            "pnl_pct": round(pnl_pct, 2),
            "change_24h": chg_24h,
            "currency": curr
        })

    total_stocks_eur = total_stocks_usd / eur_usd
    total_stocks_cost_eur = total_stocks_cost_usd / eur_usd
    stocks_pnl_eur = total_stocks_eur - total_stocks_cost_eur
    stocks_pnl_pct = (stocks_pnl_eur / total_stocks_cost_eur * 100) if total_stocks_cost_eur > 0 else 0.0

    # 2. Mutual Funds (All registered funds)
    cursor.execute("SELECT * FROM fund_info ORDER BY isin ASC")
    all_funds_rows = cursor.fetchall()

    funds_list = []
    total_funds_value_eur = 0.0
    total_funds_invested_eur = 0.0

    for f_row in all_funds_rows:
        f_isin = f_row["isin"]
        f_name = f_row["name"]
        f_nav = float(f_row["latest_nav"] or 0.0)

        # Get contributions for this fund
        cursor.execute("""
        SELECT SUM(shares), SUM(invested_amount)
        FROM fund_contributions
        WHERE (fund_isin = ? OR (fund_isin IS NULL AND ? = 'IE00BYX5P602')) AND user_id = ?
        """, (f_isin, f_isin, user_id))
        contrib_sums = cursor.fetchone()
        contrib_shares = float(contrib_sums[0] or 0.0)
        contrib_invested = float(contrib_sums[1] or 0.0)

        tot_shares = max(float(f_row["total_shares"] or 0.0), contrib_shares)
        f_val = tot_shares * f_nav
        f_pnl = f_val - contrib_invested if contrib_invested > 0 else 0.0
        f_pnl_pct = (f_pnl / contrib_invested * 100) if contrib_invested > 0 else 0.0

        # Contributions list
        cursor.execute("""
        SELECT id, date, shares, invested_amount, nav_price, funding_account, notes
        FROM fund_contributions
        WHERE (fund_isin = ? OR (fund_isin IS NULL AND ? = 'IE00BYX5P602')) AND user_id = ?
        ORDER BY date DESC, id DESC
        """, (f_isin, f_isin, user_id))
        c_rows = [dict(c) for c in cursor.fetchall()]

        total_funds_value_eur += f_val
        total_funds_invested_eur += contrib_invested

        funds_list.append({
            "isin": f_isin,
            "name": f_name,
            "total_shares": round(tot_shares, 4),
            "latest_nav": round(f_nav, 4),
            "total_value_eur": round(f_val, 2),
            "invested_eur": round(contrib_invested, 2),
            "pnl_eur": round(f_pnl, 2),
            "pnl_pct": round(f_pnl_pct, 2),
            "currency": f_row["currency"] or "EUR",
            "last_updated": f_row["last_updated"],
            "contributions": c_rows
        })

    total_funds_pnl_eur = total_funds_value_eur - total_funds_invested_eur
    total_funds_pnl_pct = (total_funds_pnl_eur / total_funds_invested_eur * 100) if total_funds_invested_eur > 0 else 0.0

    # Backwards-compatible single fund pointer (first fund or fallback)
    primary_fund = funds_list[0] if funds_list else {
        "isin": "IE00BYX5P602",
        "name": "Fondo de Inversión",
        "total_shares": 0.0,
        "latest_nav": 12.15,
        "total_value_eur": 0.0,
        "invested_eur": 0.0,
        "pnl_eur": 0.0,
        "pnl_pct": 0.0,
        "currency": "EUR",
        "contributions": []
    }

    # 3. Real Bank balances & Liquid Cash
    sync_realtime_account_balances(conn, user_id=user_id)
    cursor.execute("SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY is_credit_card ASC, current_balance DESC", (user_id,))
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

    # 4. Pending Company Reimbursements
    cursor.execute("SELECT SUM(ABS(amount)) FROM transactions WHERE is_reimbursable = 1 AND reimbursement_status = 'pending' AND user_id = ?", (user_id,))
    pending_reimbursements = cursor.fetchone()[0] or 0.0

    conn.close()

    # 5. Outstanding Debt
    from backend.loans import get_loans_summary
    try:
        loans_summary = get_loans_summary(user_id=user_id)
        loans_kpis = loans_summary.get("global_kpis", {})
        total_debt = round(float(loans_kpis.get("outstanding_debt", 0.0)), 2)
        monthly_debt_burden = round(float(loans_kpis.get("monthly_burden", 0.0)), 2)
        active_loans_count = int(loans_kpis.get("active_loans_count", 0))
    except Exception as e:
        print("Notice when reading loans summary in portfolio:", e)
        total_debt = 0.0
        monthly_debt_burden = 0.0
        active_loans_count = 0

    gross_capital = round(liquid_cash + total_stocks_eur + total_funds_value_eur + pending_reimbursements, 2)
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
        "funds": funds_list,
        "funds_summary": {
            "total_value_eur": round(total_funds_value_eur, 2),
            "invested_eur": round(total_funds_invested_eur, 2),
            "pnl_eur": round(total_funds_pnl_eur, 2),
            "pnl_pct": round(total_funds_pnl_pct, 2)
        },
        "fund": primary_fund,
        "pending_company_reimbursements": round(pending_reimbursements, 2),
        "asset_allocation": [
            {"name": "Liquidez & Bancos", "value": round(max(0, liquid_cash), 2), "color": "#10B981"},
            {"name": "Acciones (Finnhub)", "value": round(total_stocks_eur, 2), "color": "#6366F1"},
            {"name": "Fondos de Inversión", "value": round(total_funds_value_eur, 2), "color": "#8B5CF6"},
            {"name": "Reembolsos Empresa (Pendiente)", "value": round(pending_reimbursements, 2), "color": "#0EA5E9"}
        ]
    }
