import os
from datetime import datetime
from backend.database import get_connection, init_db
from backend.portfolio import sync_google_sheet_portfolio, fetch_msci_nav
from backend.knowledge_base import init_knowledge_base

def seed_initial_data():
    """
    Initializes database schema, knowledge base, real MSCI World fund position,
    and syncs Google Sheet stocks. Does NOT insert any fake or mock transactions.
    """
    init_db()
    init_knowledge_base()
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Sync real stocks from Google Sheet (UPST, INTC, SMCI, OKLO, FLNC)
    try:
        sync_google_sheet_portfolio()
    except Exception as e:
        print("Google Sheet sync notice:", e)

    # 2. Ensure real MSCI World Fund position is recorded (from Diego's statement)
    cursor.execute("SELECT COUNT(*) FROM fund_contributions")
    if cursor.fetchone()[0] == 0:
        cursor.execute("""
        INSERT INTO fund_contributions (date, shares, invested_amount, nav_price, notes)
        VALUES ('2026-09-25', 1436.51, 14390.85, 10.0179, 'Posición consolidada según extracto MyInvestor')
        """)

    cursor.execute("""
    UPDATE fund_info
    SET total_shares = 1436.51,
        latest_nav = 12.1018,
        name = 'Fidelity MSCI World Index Fund P-ACC-EUR',
        last_updated = ?
    WHERE isin = 'IE00BYX5P602'
    """, (datetime.now().isoformat(),))

    # User starting cash settings
    cursor.execute("INSERT OR REPLACE INTO user_settings (key, value) VALUES ('starting_cash', '0.0')")

    conn.commit()
    conn.close()
    print("Database ready. Transactions table is clean and waiting for user imports.")

if __name__ == "__main__":
    seed_initial_data()
