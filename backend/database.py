import sqlite3
import os
import json
from datetime import datetime

import sys

ROOT_DIR = os.environ.get("BANK_AGENT_ROOT")
if not ROOT_DIR:
    cwd = os.getcwd()
    if os.path.exists(os.path.join(cwd, "data")) or os.path.exists(os.path.join(cwd, "backend")):
        ROOT_DIR = cwd
    else:
        ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if getattr(sys, 'frozen', False):
            curr = os.path.dirname(sys.executable)
            for _ in range(4):
                if os.path.exists(os.path.join(curr, "data")) or os.path.exists(os.path.join(curr, "backend")):
                    ROOT_DIR = curr
                    break
                curr = os.path.dirname(curr)

DB_PATH = os.path.join(ROOT_DIR, "data", "bank_agent.db")

def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA busy_timeout = 30000")
    try:
        conn.execute("PRAGMA journal_mode = WAL")
    except Exception:
        pass
    return conn

def backup_db():
    """
    Creates an atomic rolling backup of bank_agent.db to data/backups/
    """
    backup_dir = os.path.join(os.path.dirname(DB_PATH), "backups")
    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"bank_agent_{timestamp}.db")
    try:
        conn = get_connection()
        backup_conn = sqlite3.connect(backup_file)
        conn.backup(backup_conn)
        backup_conn.close()
        conn.close()
        return backup_file
    except Exception as e:
        print("Backup error:", e)
        return None

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Transactions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        account TEXT NOT NULL,
        description TEXT NOT NULL,
        raw_description TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'EUR',
        category TEXT NOT NULL,
        is_reimbursable INTEGER DEFAULT 0,
        reimbursement_status TEXT DEFAULT 'none',
        needs_clarification INTEGER DEFAULT 0,
        clarification_question TEXT,
        suggested_category TEXT,
        confidence REAL DEFAULT 1.0,
        notes TEXT,
        parent_id INTEGER DEFAULT NULL,
        linked_tx_id INTEGER DEFAULT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 2. Categorization Rules & Learned Rules
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS category_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT NOT NULL UNIQUE,
        category TEXT NOT NULL,
        is_reimbursable INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 3. Stock Portfolio Positions (Synced from Google Sheet)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS portfolio_stocks (
        symbol TEXT PRIMARY KEY,
        shares REAL NOT NULL,
        avg_price REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        current_price REAL DEFAULT 0.0,
        price_change_24h REAL DEFAULT 0.0,
        last_updated TEXT
    )
    """)

    # 4. MSCI World Fund (IE00BYX5P602) Holding & Contributions
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fund_contributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        shares REAL NOT NULL,
        invested_amount REAL NOT NULL,
        nav_price REAL NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fund_info (
        isin TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        total_shares REAL DEFAULT 0.0,
        latest_nav REAL DEFAULT 0.0,
        currency TEXT DEFAULT 'EUR',
        last_updated TEXT
    )
    """)

    # 5. User Settings & API Keys
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    # 6. Supported Banks Configuration
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS supported_banks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        description TEXT,
        file_formats TEXT,
        badge_color TEXT DEFAULT 'indigo'
    )
    """)

    # 7. Categories Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#64748B',
        icon TEXT DEFAULT 'Tag',
        is_system INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # 8. Bank Accounts & Balance Tracking (up to latest import date)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS bank_accounts (
        account_name TEXT PRIMARY KEY,
        account_type TEXT DEFAULT 'checking',
        current_balance REAL DEFAULT 0.0,
        currency TEXT DEFAULT 'EUR',
        last_transaction_date TEXT,
        last_imported_at TEXT,
        is_credit_card INTEGER DEFAULT 0,
        notes TEXT
    )
    """)

    # Ensure transactions table has balance, parent_id, and linked_tx_id columns
    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN balance REAL")
    except sqlite3.OperationalError:
        pass # Column already exists
    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN parent_id INTEGER DEFAULT NULL")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN linked_tx_id INTEGER DEFAULT NULL")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE transactions ADD COLUMN loan_id INTEGER DEFAULT NULL")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE bank_accounts ADD COLUMN initial_balance REAL DEFAULT 0.0")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE supported_banks ADD COLUMN alias TEXT DEFAULT NULL")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE fund_contributions ADD COLUMN fund_isin TEXT DEFAULT 'IE00BYX5P602'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE fund_contributions ADD COLUMN funding_account TEXT DEFAULT NULL")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE portfolio_stocks ADD COLUMN name TEXT DEFAULT ''")
    except sqlite3.OperationalError:
        pass

    # Ensure loans table has loan_type, financed_item, disbursement_tx_id
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        entity TEXT NOT NULL,
        contract_number TEXT,
        initial_principal REAL NOT NULL,
        interest_rate_pct REAL DEFAULT 6.5,
        monthly_installment REAL DEFAULT 0.0,
        term_months INTEGER DEFAULT 48,
        start_date TEXT,
        end_date TEXT,
        match_pattern TEXT,
        account_name TEXT,
        notes TEXT,
        loan_type TEXT DEFAULT 'loan_disbursement',
        financed_item TEXT,
        disbursement_tx_id INTEGER DEFAULT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)
    try:
        cursor.execute("ALTER TABLE loans ADD COLUMN loan_type TEXT DEFAULT 'loan_disbursement'")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE loans ADD COLUMN financed_item TEXT")
    except sqlite3.OperationalError:
        pass
    try:
        cursor.execute("ALTER TABLE loans ADD COLUMN disbursement_tx_id INTEGER DEFAULT NULL")
    except sqlite3.OperationalError:
        pass

    # Seed default categories if empty
    cursor.execute("SELECT COUNT(*) FROM categories")
    if cursor.fetchone()[0] == 0:
        default_categories = [
            ("Alimentación & Supermercado", "#10B981", "ShoppingCart", 1),
            ("Restaurantes & Ocio", "#F59E0B", "Utensils", 1),
            ("Transporte & Gasolina", "#3B82F6", "Fuel", 1),
            ("Vivienda & Suministros", "#6366F1", "Home", 1),
            ("Suscripciones & Servicios", "#8B5CF6", "Tv", 1),
            ("Compras & Ropa", "#EC4899", "ShoppingBag", 1),
            ("Salud & Bienestar", "#14B8A6", "HeartPulse", 1),
            ("Viajes & Alojamiento", "#06B6D4", "Plane", 1),
            ("Deporte & Gimnasio", "#F97316", "Dumbbell", 1),
            ("Educación", "#84CC16", "GraduationCap", 1),
            ("Deudas y créditos", "#EF4444", "CreditCard", 1),
            ("Sueldo / Ingresos", "#22C55E", "Banknote", 1),
            ("Inversiones y ahorros", "#0EA5E9", "TrendingUp", 1),
            ("Traspaso entre cuentas", "#94A3B8", "ArrowLeftRight", 1),
            ("Gastos de Empresa", "#38BDF8", "Briefcase", 1),
            ("Liquidación Tarjetas", "#A855F7", "Receipt", 1),
            ("Otras compras", "#64748B", "Package", 1),
        ]
        cursor.executemany("""
        INSERT OR IGNORE INTO categories (name, color, icon, is_system)
        VALUES (?, ?, ?, ?)
        """, default_categories)

    # Seed default supported banks
    default_banks = [
        ("santander", "Banco Santander", 1, "Cuentas corrientes y tarjetas de crédito/débito", "CSV, Excel (.xlsx, .xls)", "red"),
        ("caixabank", "CaixaBank", 1, "Cuentas corrientes y tarjetas CaixaBank (formato con saldo y divisa)", "CSV, Excel (.xlsx, .xls)", "blue"),
        ("revolut", "Revolut", 1, "Cuentas Revolut multidivisa (EUR, CHF, USD) y pagos con tarjeta", "CSV, Excel (.xlsx, .xls)", "teal"),
        ("ing", "ING Direct", 1, "Cuentas corrientes, nómina y tarjetas ING (F. VALOR, IMPORTE)", "CSV, Excel (.xlsx, .xls)", "orange"),
        ("bbva", "BBVA", 1, "Cuentas y tarjetas BBVA", "CSV, Excel (.xlsx, .xls)", "indigo"),
        ("openbank", "Openbank", 1, "Cuentas corrientes y tarjetas Openbank", "CSV, Excel (.xlsx, .xls)", "rose"),
        ("amex", "American Express", 1, "Tarjetas Amex (Platinum, Gold, etc.) con normalización de signos", "CSV, Excel (.xlsx, .xls)", "blue"),
        ("iberia_cards", "Iberia Cards", 1, "Tarjetas Iberia Icon Visa / Mastercard", "CSV, Excel (.xlsx, .xls)", "amber"),
        ("n26", "N26", 1, "Cuentas bancarias N26 (fechas seriales y multidivisa)", "CSV, Excel (.xlsx, .xls)", "teal"),
        ("myinvestor", "MyInvestor", 1, "Cuentas de inversión, fondos indexados y efectivo", "CSV, Excel (.xlsx, .xls)", "purple"),
        ("generic", "Formato Genérico", 1, "Cualquier extracto con columnas Fecha, Concepto e Importe", "CSV, Excel (.xlsx, .xls)", "gray"),
    ]
    cursor.executemany("""
    INSERT OR IGNORE INTO supported_banks (id, name, enabled, description, file_formats, badge_color)
    VALUES (?, ?, ?, ?, ?, ?)
    """, default_banks)

    # Default general user settings
    default_settings = [
        ("user_name", "Mi Espacio"),
        ("enable_company_expenses", "1"),
        ("company_name", ""),
        ("currency", "EUR"),
        ("deepseek_model", "deepseek-chat"),
        ("ai_enabled", "1"),
        ("starting_cash", "0.0"),
        ("onboarding_completed", "0")
    ]
    cursor.executemany("""
    INSERT OR IGNORE INTO user_settings (key, value) VALUES (?, ?)
    """, default_settings)

    # If env var has DEEPSEEK_API_KEY, seed it into user_settings if not present
    env_ds_key = os.environ.get("DEEPSEEK_API_KEY", "")
    if env_ds_key:
        cursor.execute("INSERT OR IGNORE INTO user_settings (key, value) VALUES ('deepseek_api_key', ?)", (env_ds_key,))

    # Populate default rules if empty
    cursor.execute("SELECT COUNT(*) FROM category_rules")
    if cursor.fetchone()[0] == 0:
        default_rules = [
            ("MERCADONA", "Alimentación & Supermercado", 0, 10),
            ("CARREFOUR", "Alimentación & Supermercado", 0, 10),
            ("LIDL", "Alimentación & Supermercado", 0, 10),
            ("DIA", "Alimentación & Supermercado", 0, 10),
            ("ALCAMPO", "Alimentación & Supermercado", 0, 10),
            ("EROSKI", "Alimentación & Supermercado", 0, 10),
            ("SUPERCOR", "Alimentación & Supermercado", 0, 10),
            ("BONPREU", "Alimentación & Supermercado", 0, 10),
            ("CONDIS", "Alimentación & Supermercado", 0, 10),
            ("REPSOL", "Transporte & Gasolina", 0, 5),
            ("CEPSA", "Transporte & Gasolina", 0, 5),
            ("BP OLEO", "Transporte & Gasolina", 0, 5),
            ("SHELL", "Transporte & Gasolina", 0, 5),
            ("GALP", "Transporte & Gasolina", 0, 5),
            ("UBER", "Transporte & Gasolina", 0, 5),
            ("CABIFY", "Transporte & Gasolina", 0, 5),
            ("RENFE", "Transporte & Gasolina", 0, 5),
            ("METRO DE MADRID", "Transporte & Gasolina", 0, 10),
            ("EMT MADRID", "Transporte & Gasolina", 0, 10),
            ("BIP&DRIVE", "Transporte & Gasolina", 0, 10),
            ("PEAJE", "Transporte & Gasolina", 0, 5),
            ("NETFLIX", "Suscripciones & Servicios", 0, 10),
            ("SPOTIFY", "Suscripciones & Servicios", 0, 10),
            ("APPLE.COM", "Suscripciones & Servicios", 0, 10),
            ("AMAZON PRIME", "Suscripciones & Servicios", 0, 10),
            ("GOOGLE STORAGE", "Suscripciones & Servicios", 0, 10),
            ("OPENAI", "Suscripciones & Servicios", 0, 10),
            ("CHATGPT", "Suscripciones & Servicios", 0, 10),
            ("GITHUB", "Suscripciones & Servicios", 0, 10),
            ("IBERDROLA", "Vivienda & Suministros", 0, 10),
            ("ENDESA", "Vivienda & Suministros", 0, 10),
            ("NATURGY", "Vivienda & Suministros", 0, 10),
            ("CANAL ISABEL II", "Vivienda & Suministros", 0, 10),
            ("VODAFONE", "Vivienda & Suministros", 0, 10),
            ("MOVISTAR", "Vivienda & Suministros", 0, 10),
            ("ORANGE", "Vivienda & Suministros", 0, 10),
            ("COMUNIDAD PROPIETARIOS", "Vivienda & Suministros", 0, 10),
            ("ALQUILER", "Vivienda & Suministros", 0, 10),
            ("ZARA", "Compras & Ropa", 0, 10),
            ("MANGO", "Compras & Ropa", 0, 10),
            ("MASSIMO DUTTI", "Compras & Ropa", 0, 10),
            ("EL CORTE INGLES", "Compras & Ropa", 0, 8),
            ("AMAZON", "Compras & Ropa", 0, 5),
            ("IKEA", "Vivienda & Suministros", 0, 10),
            ("LEROY MERLIN", "Vivienda & Suministros", 0, 10),
            ("FARMACIA", "Salud & Bienestar", 0, 10),
            ("SANITAS", "Salud & Bienestar", 0, 10),
            ("ADESLAS", "Salud & Bienestar", 0, 10),
            ("IBERIA", "Viajes & Alojamiento", 0, 10),
            ("VUELING", "Viajes & Alojamiento", 0, 10),
            ("BOOKING", "Viajes & Alojamiento", 0, 10),
            ("AIRBNB", "Viajes & Alojamiento", 0, 10),
            ("HOTEL", "Viajes & Alojamiento", 0, 10),
            ("NOMINA", "Sueldo / Ingresos", 0, 10),
            ("REEMBOLSO GASTOS", "Gastos de Empresa", 0, 10),
            ("MYINVESTOR", "Inversiones y ahorros", 0, 10),
            ("TRADE REPUBLIC", "Inversiones y ahorros", 0, 10),
            ("DEGIRO", "Inversiones y ahorros", 0, 10),
            ("FIDELITY", "Inversiones y ahorros", 0, 10),
        ]
        cursor.executemany(
            "INSERT OR IGNORE INTO category_rules (pattern, category, is_reimbursable, priority) VALUES (?, ?, ?, ?)",
            default_rules
        )

    # Initialize fund info for IE00BYX5P602
    cursor.execute("""
    INSERT OR IGNORE INTO fund_info (isin, name, total_shares, latest_nav, currency, last_updated)
    VALUES (?, ?, ?, ?, ?, ?)
    """, ("IE00BYX5P602", "Fidelity MSCI World Index Fund P-ACC-EUR", 0.0, 12.10, "EUR", datetime.now().isoformat()))

    conn.commit()
    conn.close()

# --- Settings & Categories Helper Functions ---

def get_setting(key: str, default: str = None) -> str:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM user_settings WHERE key = ?", (key,))
    row = cursor.fetchone()
    conn.close()
    return row[0] if row else default

def set_setting(key: str, value: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO user_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (key, str(value)))
    conn.commit()
    conn.close()

def get_all_settings() -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT key, value FROM user_settings")
    rows = cursor.fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}

def get_categories_list() -> list:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT c.*, COUNT(t.id) as tx_count
    FROM categories c
    LEFT JOIN transactions t ON t.category = c.name
    GROUP BY c.id
    ORDER BY c.name ASC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def add_category(name: str, color: str = "#64748B", icon: str = "Tag") -> dict:
    clean_name = name.strip()
    if not clean_name:
        raise ValueError("El nombre de la categoría no puede estar vacío.")
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO categories (name, color, icon, is_system)
    VALUES (?, ?, ?, 0)
    """, (clean_name, color, icon))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return {"id": new_id, "name": clean_name, "color": color, "icon": icon, "is_system": 0}

def update_category(old_name: str, new_name: str, color: str = None, icon: str = None) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    updates = []
    params = []
    if new_name and new_name.strip() != old_name:
        updates.append("name = ?")
        params.append(new_name.strip())
    if color:
        updates.append("color = ?")
        params.append(color)
    if icon:
        updates.append("icon = ?")
        params.append(icon)
    if updates:
        params.append(old_name)
        cursor.execute(f"UPDATE categories SET {', '.join(updates)} WHERE name = ?", params)
        if new_name and new_name.strip() != old_name:
            cursor.execute("UPDATE transactions SET category = ? WHERE category = ?", (new_name.strip(), old_name))
            cursor.execute("UPDATE category_rules SET category = ? WHERE category = ?", (new_name.strip(), old_name))
    conn.commit()
    conn.close()
    return {"status": "updated", "old_name": old_name, "new_name": new_name or old_name}

def delete_category(name: str, fallback_category: str = "Otras compras") -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    # Check if category exists
    cursor.execute("SELECT id FROM categories WHERE name = ?", (name,))
    cat = cursor.fetchone()
    if not cat:
        conn.close()
        raise ValueError(f"La categoría '{name}' no existe.")

    # Reassign existing transactions to fallback category
    cursor.execute("UPDATE transactions SET category = ? WHERE category = ?", (fallback_category, name))
    reassigned_count = cursor.rowcount
    cursor.execute("DELETE FROM category_rules WHERE category = ?", (name,))
    cursor.execute("DELETE FROM categories WHERE name = ?", (name,))
    conn.commit()
    conn.close()
    return {"status": "deleted", "name": name, "reassigned_transactions": reassigned_count}

def get_supported_banks() -> list:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM supported_banks ORDER BY id ASC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

def update_bank_enabled(bank_id: str, enabled: bool) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE supported_banks SET enabled = ? WHERE id = ?", (1 if enabled else 0, bank_id))
    conn.commit()
    conn.close()
    return {"bank_id": bank_id, "enabled": enabled}

def update_bank_alias(bank_id: str, alias: str) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    clean_alias = alias.strip() if alias and alias.strip() else None
    cursor.execute("UPDATE supported_banks SET alias = ? WHERE id = ?", (clean_alias, bank_id))
    conn.commit()
    conn.close()
    return {"bank_id": bank_id, "alias": clean_alias}

def update_bank_details(bank_id: str, enabled: bool = None, alias: str = None) -> dict:
    conn = get_connection()
    cursor = conn.cursor()
    updates = []
    params = []
    if enabled is not None:
        updates.append("enabled = ?")
        params.append(1 if enabled else 0)
    if alias is not None:
        clean_alias = alias.strip() if alias.strip() else None
        updates.append("alias = ?")
        params.append(clean_alias)
    if updates:
        params.append(bank_id)
        cursor.execute(f"UPDATE supported_banks SET {', '.join(updates)} WHERE id = ?", params)
        conn.commit()
    cursor.execute("SELECT * FROM supported_banks WHERE id = ?", (bank_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else {"bank_id": bank_id}

def get_bank_alias_map() -> dict:
    """
    Returns mappings from bank_id and bank_name to custom alias if configured.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, alias FROM supported_banks")
    rows = cursor.fetchall()
    conn.close()
    alias_map = {}
    for r in rows:
        alias = r["alias"]
        if alias and alias.strip():
            alias_map[r["id"].lower()] = alias.strip()
            alias_map[r["name"].lower()] = alias.strip()
            # Also partial names
            if "santander" in r["id"].lower():
                alias_map["santander"] = alias.strip()
                alias_map["banco santander"] = alias.strip()
            if "amex" in r["id"].lower():
                alias_map["amex"] = alias.strip()
                alias_map["american express"] = alias.strip()
            if "iberia" in r["id"].lower():
                alias_map["iberia cards"] = alias.strip()
            if "n26" in r["id"].lower():
                alias_map["n26"] = alias.strip()
            if "myinvestor" in r["id"].lower():
                alias_map["myinvestor"] = alias.strip()
    return alias_map

def clean_all_transactions(keep_settings: bool = True):
    """
    Completely wipes all personal transactions, loans, credit cards,
    and portfolio holdings, giving the user a fresh, clean slate.
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions")
    cursor.execute("DELETE FROM loans")
    cursor.execute("DELETE FROM fund_contributions")
    cursor.execute("DELETE FROM portfolio_stocks")
    cursor.execute("DELETE FROM bank_accounts")
    cursor.execute("UPDATE fund_info SET total_shares = 0.0, last_updated = datetime('now')")
    if not keep_settings:
        cursor.execute("DELETE FROM user_settings WHERE key NOT IN ('deepseek_api_key', 'finnhub_api_key')")
    conn.commit()
    conn.close()


def sync_realtime_account_balances(conn=None) -> list:
    """
    Recalculates real-time balances for all bank accounts dynamically:
    1. For accounts with explicit statement checkpoints (`balance IS NOT NULL` in transactions),
       takes the most recent checkpoint (MAX date, MAX id) and adds all subsequent transaction amounts:
       realtime_balance = checkpoint_balance + sum(subsequent_transactions)
    2. For accounts without statement balance checkpoints (e.g. N26, credit cards, or manual accounts),
       computes: initial_balance + sum(all_transactions_for_this_account).
    3. Updates `bank_accounts` table (`current_balance`, `last_transaction_date`, `last_imported_at`).
    Returns list of updated accounts.
    """
    should_close = False
    if conn is None:
        conn = get_connection()
        should_close = True

    cursor = conn.cursor()

    # Ensure any accounts present in transactions exist in bank_accounts
    cursor.execute("SELECT DISTINCT account FROM transactions WHERE account IS NOT NULL AND account != ''")
    tx_accounts = [r[0] for r in cursor.fetchall()]
    for acc in tx_accounts:
        is_cc = 1 if any(w in acc.lower() for w in ["tarjeta", "amex", "american express", "credit", "iberia cards"]) else 0
        acc_type = "credit_card" if is_cc else ("savings" if "ahorro" in acc.lower() else "checking")
        cursor.execute("""
        INSERT OR IGNORE INTO bank_accounts (account_name, account_type, current_balance, currency, is_credit_card)
        VALUES (?, ?, 0.0, 'EUR', ?)
        """, (acc, acc_type, is_cc))

    cursor.execute("SELECT account_name, account_type, is_credit_card, COALESCE(initial_balance, 0.0) as initial_bal FROM bank_accounts")
    accounts = cursor.fetchall()

    updated = []
    for acc_row in accounts:
        acc_name = acc_row["account_name"]
        init_bal = float(acc_row["initial_bal"] or 0.0)

        # Check for anchor transaction with explicit balance
        cursor.execute("""
            SELECT date, id, balance FROM transactions
            WHERE account = ? AND balance IS NOT NULL
            ORDER BY date DESC, id DESC LIMIT 1
        """, (acc_name,))
        anchor = cursor.fetchone()

        # Get latest transaction date for this account
        cursor.execute("SELECT MAX(date) FROM transactions WHERE account = ?", (acc_name,))
        max_date_row = cursor.fetchone()
        latest_tx_date = max_date_row[0] if max_date_row and max_date_row[0] else None

        if anchor:
            anchor_date = anchor["date"]
            anchor_id = anchor["id"]
            anchor_bal = float(anchor["balance"])

            cursor.execute("""
                SELECT COALESCE(SUM(amount), 0.0) FROM transactions
                WHERE account = ? AND (date > ? OR (date = ? AND id > ?))
            """, (acc_name, anchor_date, anchor_date, anchor_id))
            subsequent_sum = float(cursor.fetchone()[0] or 0.0)
            real_balance = round(anchor_bal + subsequent_sum, 2)
        else:
            cursor.execute("SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE account = ?", (acc_name,))
            tx_sum = float(cursor.fetchone()[0] or 0.0)
            real_balance = round(init_bal + tx_sum, 2)

        cursor.execute("""
        UPDATE bank_accounts
        SET current_balance = ?,
            last_transaction_date = COALESCE(?, last_transaction_date)
        WHERE account_name = ?
        """, (real_balance, latest_tx_date, acc_name))

        updated.append({
            "account_name": acc_name,
            "current_balance": real_balance,
            "last_transaction_date": latest_tx_date
        })

    conn.commit()
    if should_close:
        conn.close()

    return updated

if __name__ == "__main__":
    init_db()
    sync_realtime_account_balances()
    print("Database initialized and real-time account balances synced successfully at", DB_PATH)
