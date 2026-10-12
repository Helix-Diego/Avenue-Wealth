import os
import re
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.auth import User, get_current_user, require_roles
from backend.database import (
    get_connection, init_db, backup_db, restore_db, get_db_path, DB_PATH, sync_realtime_account_balances,
    get_all_settings, get_setting, set_setting, get_categories_list,
    add_category, update_category, delete_category, get_supported_banks,
    update_bank_enabled, update_bank_alias, update_bank_details,
    get_bank_alias_map, clean_all_transactions,
    get_user_by_id, list_users, update_user_role, get_system_stats, upsert_user
)
from backend.bank_parser import parse_csv_content, parse_excel_content
from backend.categorizer import (
    categorize_transaction, learn_rule_and_retroactively_apply, get_active_categories,
    extract_merchant_pattern, find_transfer_counterpart, pair_transfers,
    unpair_transfer, auto_pair_internal_transfers
)
from backend.portfolio import (
    get_portfolio_summary, fetch_msci_nav, record_fund_subscription_from_statement,
    search_stocks_finnhub, fetch_live_stock_quote, add_or_update_stock_holding,
    delete_stock_holding, refresh_all_stock_quotes, fetch_fund_nav_and_name,
    add_or_update_fund, delete_fund, record_fund_contribution,
    delete_fund_contribution, refresh_all_funds_nav
)
from backend.forecast import calculate_monthly_forecast, get_habits_and_goals_analysis
from backend.knowledge_base import init_knowledge_base
from backend.deepseek_service import chat_financial_assistant, test_deepseek_connection, get_deepseek_config
from backend.financial_analyst import (
    build_llm_financial_context, get_comprehensive_financial_profile,
    get_monthly_balance_matrix, get_advanced_analytics
)

app = FastAPI(title="Avenue Wealth API", version="3.0.0")

# Security headers middleware
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

# Configurable CORS for production & development
cors_origins_raw = os.environ.get("CORS_ORIGINS", "")
if cors_origins_raw:
    origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
else:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup
@app.on_event("startup")
def on_startup():
    init_db()
    init_knowledge_base()
    # Purge legacy unassigned or leaked transactions on cloud deployment (Render)
    if os.environ.get("RENDER"):
        try:
            conn = get_connection()
            conn.execute("DELETE FROM transactions WHERE user_id = '00000000-0000-0000-0000-000000000000' OR user_id IS NULL")
            conn.commit()
            conn.close()
            print("Purged legacy transactions with unassigned user_id on Render.")
        except Exception as e:
            print(f"Notice purging legacy transactions: {e}")

# --- Pydantic Models ---
class TransactionCreate(BaseModel):
    date: str
    account: str
    description: str
    amount: float
    category: Optional[str] = None
    is_reimbursable: Optional[int] = 0
    notes: Optional[str] = None

class TransactionUpdate(BaseModel):
    category: Optional[str] = None
    is_reimbursable: Optional[int] = None
    reimbursement_status: Optional[str] = None
    needs_clarification: Optional[int] = None
    notes: Optional[str] = None
    loan_id: Optional[int] = None

class ResolveClarificationRequest(BaseModel):
    transaction_id: int
    category: str
    is_reimbursable: bool
    learn_rule: bool = False
    pattern: Optional[str] = None

class FindSimilarRequest(BaseModel):
    transaction_id: int
    new_category: str

class BatchUpdateCategoryRequest(BaseModel):
    transaction_ids: List[int]
    new_category: str
    save_rule: bool = True
    pattern: Optional[str] = None
    loan_id: Optional[int] = None

class LinkLoanTransactionsRequest(BaseModel):
    transaction_ids: List[int]

class BatchUpdateReimbursableRequest(BaseModel):
    transaction_ids: List[int]
    is_reimbursable: int
    reimbursement_status: Optional[str] = None

class BatchDeleteRequest(BaseModel):
    transaction_ids: List[int]

class BatchUndoRequest(BaseModel):
    action_type: str = "update" # "update" or "delete"
    previous_states: Optional[List[Dict[str, Any]]] = None
    deleted_transactions: Optional[List[Dict[str, Any]]] = None
    rule_pattern: Optional[str] = None

class FindTransferPairRequest(BaseModel):
    transaction_id: int

class PairTransfersRequest(BaseModel):
    tx_id_1: int
    tx_id_2: int

class UnpairTransferRequest(BaseModel):
    transaction_id: int

class SplitPart(BaseModel):
    amount: float
    category: str
    is_reimbursable: bool = False
    notes: Optional[str] = None

class SplitTransactionRequest(BaseModel):
    transaction_id: int
    splits: List[SplitPart]

class LinkReimbursementRequest(BaseModel):
    settlement_id: int
    expense_ids: List[int]

class MSCIContributionRequest(BaseModel):
    date: str
    shares: float
    invested_amount: float
    nav_price: Optional[float] = None
    notes: Optional[str] = None

class AccountBalanceUpdate(BaseModel):
    account_name: str
    balance: float
    notes: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    selected_month: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    color: Optional[str] = "#64748B"
    icon: Optional[str] = "Tag"

class CategoryUpdate(BaseModel):
    new_name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class BankUpdateRequest(BaseModel):
    enabled: Optional[bool] = None
    alias: Optional[str] = None

class StockHoldingRequest(BaseModel):
    symbol: str
    name: Optional[str] = ""
    shares: float
    avg_price: float
    currency: Optional[str] = "USD"

class FundCreateRequest(BaseModel):
    isin: str
    name: Optional[str] = None
    latest_nav: Optional[float] = 0.0
    currency: Optional[str] = "EUR"

class FundContributionRequest(BaseModel):
    date: str
    invested_amount: float
    nav_price: Optional[float] = None
    shares: Optional[float] = None
    funding_account: Optional[str] = "Santander"
    notes: Optional[str] = ""

class AISettingsUpdate(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None
    enabled: Optional[bool] = None

class AITestRequest(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None

class GeneralSettingsUpdate(BaseModel):
    user_name: Optional[str] = None
    company_name: Optional[str] = None
    enable_company_expenses: Optional[bool] = None
    currency: Optional[str] = None
    onboarding_completed: Optional[bool] = None

class ResetDataRequest(BaseModel):
    keep_settings: Optional[bool] = True

# --- API Endpoints ---

# --- Auth & RBAC API Endpoints ---

class ProfileUpdateRequest(BaseModel):
    full_name: str

class RoleUpdateRequest(BaseModel):
    role: str

@app.get("/api/auth/me", tags=["Auth & RBAC"])
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Returns the profile and role of the currently authenticated tenant."""
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "is_active": current_user.is_active,
        "is_admin": current_user.role == "admin"
    }

@app.put("/api/auth/profile", tags=["Auth & RBAC"])
def update_my_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user)
):
    """Updates user display profile name."""
    upsert_user(current_user.id, current_user.email, body.full_name, current_user.role)
    return {"status": "ok", "full_name": body.full_name}

@app.delete("/api/auth/me", tags=["Auth & RBAC"])
def delete_my_account(current_user: User = Depends(get_current_user)):
    """
    Permanently deletes all data associated with the current user or guest:
    transactions, accounts, loans, stocks, mutual funds, rules, settings, and user record.
    """
    conn = get_connection()
    cursor = conn.cursor()
    user_id = current_user.id

    cursor.execute("DELETE FROM transactions WHERE user_id = ?", (user_id,))
    deleted_txs = cursor.rowcount
    cursor.execute("DELETE FROM bank_accounts WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM loans WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM portfolio_stocks WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM fund_contributions WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM category_rules WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM user_settings WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM categories WHERE user_id = ? AND is_system = 0", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))

    conn.commit()
    conn.close()

    return {
        "status": "account_deleted",
        "user_id": user_id,
        "deleted_transactions": deleted_txs,
        "message": "Tu cuenta y todos tus datos han sido eliminados de forma permanente."
    }

@app.get("/api/admin/users", tags=["Admin RBAC"])
def admin_list_users_endpoint(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_roles(["admin"]))
):
    """Admin-only: lists all registered tenants and usage stats."""
    return {"users": list_users(limit=limit, offset=offset)}

@app.put("/api/admin/users/{target_user_id}/role", tags=["Admin RBAC"])
def admin_change_role_endpoint(
    target_user_id: str,
    body: RoleUpdateRequest,
    current_user: User = Depends(require_roles(["admin"]))
):
    """Admin-only: updates tenant role (admin, user, advisor, auditor)."""
    if body.role not in ["admin", "user", "advisor", "auditor"]:
        raise HTTPException(status_code=400, detail="Rol inválido. Opciones válidas: admin, user, advisor, auditor.")
    res = update_user_role(target_user_id, body.role)
    return res

@app.get("/api/admin/system-stats", tags=["Admin RBAC"])
def admin_stats_endpoint(current_user: User = Depends(require_roles(["admin"]))):
    """Admin-only: returns platform-wide metrics and tenant statistics."""
    return get_system_stats()

# --- Categories API ---

@app.get("/api/categories")
def get_categories_endpoint(current_user: User = Depends(get_current_user)):
    return {"categories": get_categories_list(user_id=current_user.id)}

@app.post("/api/categories")
def create_category_endpoint(req: CategoryCreate, current_user: User = Depends(get_current_user)):
    try:
        res = add_category(req.name, req.color or "#64748B", req.icon or "Tag", user_id=current_user.id)
        return {"status": "created", "category": res}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/categories/{category_name}")
def update_category_endpoint(category_name: str, req: CategoryUpdate, current_user: User = Depends(get_current_user)):
    try:
        res = update_category(category_name, req.new_name, req.color, req.icon, user_id=current_user.id)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/categories/{category_name}")
def delete_category_endpoint(category_name: str, fallback_category: str = "Otras compras", current_user: User = Depends(get_current_user)):
    try:
        res = delete_category(category_name, fallback_category, user_id=current_user.id)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- Supported Banks API ---

@app.get("/api/settings/banks")
def get_supported_banks_endpoint():
    return {"banks": get_supported_banks()}

@app.put("/api/settings/banks/{bank_id}")
def update_supported_bank_endpoint(bank_id: str, req: BankUpdateRequest):
    try:
        res = update_bank_details(bank_id, enabled=req.enabled, alias=req.alias)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- AI Configuration & Test API ---

@app.get("/api/settings/ai")
def get_ai_settings_endpoint():
    cfg = get_deepseek_config()
    raw_key = cfg.get("api_key", "")
    masked_key = ""
    if raw_key:
        masked_key = (raw_key[:4] + "..." + raw_key[-4:]) if len(raw_key) > 8 else "****"
    return {
        "provider": "deepseek",
        "has_api_key": bool(raw_key),
        "api_key_masked": masked_key,
        "model": cfg.get("model", "deepseek-chat"),
        "enabled": cfg.get("ai_enabled", True)
    }

@app.post("/api/settings/ai")
def update_ai_settings_endpoint(req: AISettingsUpdate):
    if req.api_key is not None:
        set_setting("deepseek_api_key", req.api_key.strip())
    if req.model is not None:
        set_setting("deepseek_model", req.model.strip())
    if req.enabled is not None:
        set_setting("ai_enabled", "1" if req.enabled else "0")
    
    cfg = get_deepseek_config()
    raw_key = cfg.get("api_key", "")
    masked_key = (raw_key[:4] + "..." + raw_key[-4:]) if len(raw_key) > 8 else "****" if raw_key else ""
    return {
        "status": "updated",
        "has_api_key": bool(raw_key),
        "api_key_masked": masked_key,
        "model": cfg.get("model", "deepseek-chat"),
        "enabled": cfg.get("ai_enabled", True)
    }

@app.post("/api/settings/ai/test")
def test_ai_connection_endpoint(req: AITestRequest):
    res = test_deepseek_connection(req.api_key, req.model)
    return res

# --- General Settings & Wipe API ---

@app.get("/api/settings/general")
def get_general_settings_endpoint():
    settings = get_all_settings()
    return {
        "user_name": settings.get("user_name", "Mi Espacio"),
        "company_name": settings.get("company_name", ""),
        "enable_company_expenses": settings.get("enable_company_expenses", "1") == "1",
        "currency": settings.get("currency", "EUR"),
        "onboarding_completed": settings.get("onboarding_completed", "0") == "1"
    }

@app.put("/api/settings/general")
def update_general_settings_endpoint(req: GeneralSettingsUpdate):
    if req.user_name is not None:
        set_setting("user_name", req.user_name.strip())
    if req.company_name is not None:
        set_setting("company_name", req.company_name.strip())
    if req.enable_company_expenses is not None:
        set_setting("enable_company_expenses", "1" if req.enable_company_expenses else "0")
    if req.currency is not None:
        set_setting("currency", req.currency.strip())
    if req.onboarding_completed is not None:
        set_setting("onboarding_completed", "1" if req.onboarding_completed else "0")
    return {"status": "updated"}

@app.post("/api/settings/reset-data")
def reset_data_endpoint(req: Optional[ResetDataRequest] = None):
    try:
        clean_all_transactions(keep_settings=req.keep_settings if req and req.keep_settings is not None else True)
        return {"status": "success", "message": "Datos de transacciones, cuentas y préstamos eliminados correctamente."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Database Backup & Restore Endpoints ---

@app.get("/api/backup/info")
def get_backup_info():
    """
    Returns database file information: path, size, modification date, and transaction count.
    """
    try:
        conn = get_connection()
        c = conn.cursor()
        c.execute("SELECT count(*) FROM transactions")
        tx_count = c.fetchone()[0]
        conn.close()

        curr_db_path = get_db_path()
        size_bytes = os.path.getsize(curr_db_path) if os.path.exists(curr_db_path) else 0
        mod_time = datetime.fromtimestamp(os.path.getmtime(curr_db_path)).isoformat() if os.path.exists(curr_db_path) else None

        if size_bytes >= 1024 * 1024:
            size_formatted = f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            size_formatted = f"{max(1, size_bytes // 1024)} KB"

        return {
            "db_path": curr_db_path,
            "size_bytes": size_bytes,
            "size_formatted": size_formatted,
            "last_modified": mod_time,
            "transactions_count": tx_count,
            "is_application_support": "Application Support" in curr_db_path or ".spendagent" in curr_db_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/backup/download")
def download_backup():
    """
    Creates an atomic snapshot of the database and downloads it as a .db file.
    """
    try:
        backup_file = backup_db()
        if not backup_file or not os.path.exists(backup_file):
            raise HTTPException(status_code=500, detail="No se pudo crear la copia de seguridad")
        
        filename = f"spend_agent_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
        return FileResponse(
            backup_file,
            filename=filename,
            media_type="application/x-sqlite3",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/backup/restore")
async def restore_backup(file: UploadFile = File(...)):
    """
    Restores the database from an uploaded .db file.
    """
    try:
        content = await file.read()
        if len(content) < 100:
            raise HTTPException(status_code=400, detail="El archivo proporcionado está vacío o no es una base de datos válida.")
        
        restore_db(content)
        return {
            "status": "success",
            "message": "Base de datos restaurada correctamente. Tus transacciones y configuración están actualizadas."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error restaurando base de datos: {str(e)}")


@app.get("/api/summary")
def get_summary(
    year: Optional[int] = None,
    month: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    now = datetime.now()
    y = year or now.year
    m = month or now.month

    forecast = calculate_monthly_forecast(y, m, user_id=current_user.id)
    portfolio = get_portfolio_summary(user_id=current_user.id)

    conn = get_connection()
    cursor = conn.cursor()

    # Doubts count
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE needs_clarification = 1 AND user_id = ?", (current_user.id,))
    pending_doubts_count = cursor.fetchone()[0]

    # Available distinct months in DB
    cursor.execute("SELECT DISTINCT substr(date, 1, 7) as ym FROM transactions WHERE user_id = ? ORDER BY ym DESC", (current_user.id,))
    available_months = [r["ym"] for r in cursor.fetchall() if r["ym"]]

    # Available distinct accounts in DB
    cursor.execute("SELECT DISTINCT account FROM transactions WHERE user_id = ? ORDER BY account ASC", (current_user.id,))
    available_accounts = [r["account"] for r in cursor.fetchall() if r["account"]]

    cursor.execute("SELECT id, name, alias, enabled FROM supported_banks ORDER BY name ASC")
    supported_banks = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "current_month": f"{y:04d}-{m:02d}",
        "available_months": available_months if available_months else [f"{y:04d}-{m:02d}"],
        "available_accounts": available_accounts,
        "banks": supported_banks,
        "pending_doubts_count": pending_doubts_count,
        "forecast": forecast,
        "portfolio": portfolio
    }

@app.get("/api/transactions")
def get_transactions(
    month: Optional[str] = None,
    account: Optional[str] = None,
    category: Optional[str] = None,
    is_reimbursable: Optional[int] = None,
    needs_clarification: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = 400,
    current_user: User = Depends(get_current_user)
):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    SELECT t.*, l.name as loan_name, l.loan_type as loan_type
    FROM transactions t
    LEFT JOIN loans l ON t.loan_id = l.id
    WHERE t.user_id = ?
    """
    params = [current_user.id]

    alias_map = get_bank_alias_map()

    if month and month != "all":
        query += " AND t.date LIKE ?"
        params.append(f"{month}%")
    if account and account != "all":
        # Check if the requested account filter is a bank alias or matches bank
        matched_keys = [account]
        for b_key, b_alias in alias_map.items():
            if b_alias and (b_alias.lower() == account.lower() or account.lower() in b_alias.lower()):
                matched_keys.append(b_key)
                if "santander" in b_key:
                    matched_keys.extend(["Banco Santander", "Santander", "Santander (*3012)", "Santander Ahorro (*1842)", "Santander Tarjeta (*0871)"])
                elif "amex" in b_key:
                    matched_keys.extend(["American Express", "Amex", "American Express Platinum"])
                elif "iberia" in b_key:
                    matched_keys.extend(["Iberia Cards", "Iberia Cards (*2366)"])
                elif "n26" in b_key:
                    matched_keys.extend(["N26", "N26 (*7089)"])
                elif "myinvestor" in b_key:
                    matched_keys.extend(["MyInvestor"])

        unique_matches = list(set(matched_keys))
        placeholders = ", ".join(["?"] * len(unique_matches))
        query += f" AND (t.account IN ({placeholders}) OR t.account LIKE ?)"
        params.extend(unique_matches)
        params.append(f"%{account}%")

    if category and category != "all":
        query += " AND t.category = ?"
        params.append(category)
    if is_reimbursable is not None:
        query += " AND t.is_reimbursable = ?"
        params.append(is_reimbursable)
    if needs_clarification is not None:
        query += " AND t.needs_clarification = ?"
        params.append(needs_clarification)
    if search:
        query += " AND (t.description LIKE ? OR t.notes LIKE ?)"
        term = f"%{search}%"
        params.extend([term, term])

    query += " ORDER BY t.date DESC, t.id DESC LIMIT ?"
    params.append(limit)

    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # Decorate rows with bank alias
    for r in rows:
        acc_raw = (r.get("account") or "").lower()
        r["account_alias"] = None
        for b_key, b_alias in alias_map.items():
            if b_key in acc_raw or acc_raw in b_key:
                r["account_alias"] = b_alias
                break

    return {"transactions": rows, "count": len(rows)}

@app.post("/api/transactions")
def create_transaction(tx: TransactionCreate, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    cat = tx.category
    is_reimb = tx.is_reimbursable
    needs_clarif = 0
    question = None
    confidence = 1.0

    if not cat:
        analysis = categorize_transaction(tx.description, tx.amount, tx.account)
        cat = analysis["category"]
        is_reimb = analysis["is_reimbursable"]
        needs_clarif = analysis["needs_clarification"]
        question = analysis["clarification_question"]
        confidence = analysis["confidence"]

    reimb_status = "pending" if is_reimb else "none"

    cursor.execute("""
    INSERT INTO transactions (
        user_id, date, account, description, raw_description, amount, currency,
        category, is_reimbursable, reimbursement_status, needs_clarification,
        clarification_question, confidence, notes
    ) VALUES (?, ?, ?, ?, ?, ?, 'EUR', ?, ?, ?, ?, ?, ?, ?)
    """, (current_user.id, tx.date, tx.account, tx.description, tx.description, tx.amount, cat, is_reimb, reimb_status, needs_clarif, question, confidence, tx.notes))

    tx_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {"id": tx_id, "status": "created", "category": cat, "is_reimbursable": is_reimb}

@app.put("/api/transactions/{tx_id}")
def update_transaction(tx_id: int, update: TransactionUpdate, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    updates = []
    params = []

    if update.category is not None:
        updates.append("category = ?")
        params.append(update.category)
        if update.category == "Gastos de Empresa" and update.is_reimbursable is None:
            updates.append("is_reimbursable = ?")
            params.append(1)
            updates.append("reimbursement_status = ?")
            params.append("pending")
    if update.is_reimbursable is not None:
        updates.append("is_reimbursable = ?")
        params.append(update.is_reimbursable)
        if update.reimbursement_status is None:
            updates.append("reimbursement_status = ?")
            params.append("pending" if update.is_reimbursable else "none")
    if update.reimbursement_status is not None:
        updates.append("reimbursement_status = ?")
        params.append(update.reimbursement_status)
    if update.needs_clarification is not None:
        updates.append("needs_clarification = ?")
        params.append(update.needs_clarification)
    if update.notes is not None:
        updates.append("notes = ?")
        params.append(update.notes)
    if update.loan_id is not None:
        updates.append("loan_id = ?")
        params.append(update.loan_id if update.loan_id > 0 else None)

    if not updates:
        conn.close()
        return {"status": "no change"}

    params.extend([tx_id, current_user.id])
    cursor.execute(f"UPDATE transactions SET {', '.join(updates)} WHERE id = ? AND user_id = ?", params)
    conn.commit()
    conn.close()

    return {"status": "updated", "id": tx_id}

@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: int, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (tx_id, current_user.id))
    conn.commit()
    conn.close()
    return {"status": "deleted", "id": tx_id}

@app.post("/api/transactions/find-similar")
def find_similar_transactions(req: FindSimilarRequest, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (req.transaction_id, current_user.id))
    target_row = cursor.fetchone()
    if not target_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Transacción no encontrada")

    target_tx = dict(target_row)
    pattern = extract_merchant_pattern(target_tx.get("description") or target_tx.get("raw_description") or "")
    
    if not pattern or len(pattern.strip()) < 3:
        conn.close()
        return {
            "pattern": "",
            "transaction_id": req.transaction_id,
            "new_category": req.new_category,
            "matches_count": 0,
            "matches": []
        }

    search_term = f"%{pattern.strip()}%"
    cursor.execute("""
    SELECT id, date, description, amount, category, account, is_reimbursable, reimbursement_status
    FROM transactions
    WHERE id != ?
      AND user_id = ?
      AND category != ?
      AND (
        UPPER(description) LIKE UPPER(?)
        OR UPPER(raw_description) LIKE UPPER(?)
      )
    ORDER BY date DESC
    LIMIT 60
    """, (req.transaction_id, current_user.id, req.new_category, search_term, search_term))

    matches = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "pattern": pattern.strip(),
        "transaction_id": req.transaction_id,
        "new_category": req.new_category,
        "matches_count": len(matches),
        "matches": matches
    }

@app.post("/api/transactions/batch-update-category")
def batch_update_category(req: BatchUpdateCategoryRequest, current_user: User = Depends(get_current_user)):
    if not req.transaction_ids:
        return {"status": "no transactions provided", "updated_count": 0, "previous_states": []}

    conn = get_connection()
    cursor = conn.cursor()

    placeholders = ",".join("?" for _ in req.transaction_ids)
    
    # 1. Capture previous states for undo functionality
    cursor.execute(f"""
        SELECT id, category, is_reimbursable, reimbursement_status, notes, loan_id 
        FROM transactions 
        WHERE id IN ({placeholders}) AND user_id = ?
    """, req.transaction_ids + [current_user.id])
    previous_states = [dict(r) for r in cursor.fetchall()]

    is_company = 1 if req.new_category == "Gastos de Empresa" else 0
    reimb_status = "pending" if is_company else "none"

    sql_updates = [
        "category = ?",
        "is_reimbursable = CASE WHEN ? = 'Gastos de Empresa' THEN 1 ELSE is_reimbursable END",
        "reimbursement_status = CASE WHEN ? = 'Gastos de Empresa' THEN 'pending' ELSE reimbursement_status END",
        "needs_clarification = 0",
        "notes = 'Categoría actualizada por el usuario (por lote)'"
    ]
    sql_params = [req.new_category, req.new_category, req.new_category]
    if req.loan_id is not None:
        sql_updates.append("loan_id = ?")
        sql_params.append(req.loan_id if req.loan_id > 0 else None)

    cursor.execute(f"""
    UPDATE transactions
    SET {', '.join(sql_updates)}
    WHERE id IN ({placeholders}) AND user_id = ?
    """, sql_params + req.transaction_ids + [current_user.id])
    updated_count = cursor.rowcount

    # If save_rule is true and we have a valid pattern
    if req.save_rule and req.pattern and len(req.pattern.strip()) >= 3:
        clean_pat = req.pattern.strip().upper()
        generic_words = {"PAGO", "COMPRA", "BIZUM", "TRANSFERENCIA", "RECIBO", "TRANSACCION", "DEVOLUCION"}
        if clean_pat not in generic_words:
            cursor.execute("""
            INSERT INTO category_rules (pattern, category, is_reimbursable, priority)
            VALUES (?, ?, ?, 15)
            ON CONFLICT(pattern) DO UPDATE SET
                category = excluded.category,
                is_reimbursable = excluded.is_reimbursable,
                priority = 15
            """, (clean_pat, req.new_category, is_company))
            cursor.execute("""
            INSERT INTO knowledge_base (pattern, category, sample_amount, notes, frequency)
            VALUES (?, ?, 0, 'Confirmado por el usuario en lote', 2)
            ON CONFLICT(pattern) DO UPDATE SET
                category = excluded.category,
                notes = 'Actualizado por el usuario en lote'
            """, (clean_pat, req.new_category))

    conn.commit()
    conn.close()

    return {
        "status": "ok",
        "updated_count": updated_count,
        "category": req.new_category,
        "pattern": req.pattern,
        "previous_states": previous_states
    }

@app.post("/api/transactions/batch-update-reimbursable")
def batch_update_reimbursable(req: BatchUpdateReimbursableRequest, current_user: User = Depends(get_current_user)):
    if not req.transaction_ids:
        return {"status": "no transactions provided", "updated_count": 0, "previous_states": []}

    conn = get_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" for _ in req.transaction_ids)

    # 1. Capture previous states for undo functionality
    cursor.execute(f"""
        SELECT id, category, is_reimbursable, reimbursement_status, notes, loan_id 
        FROM transactions 
        WHERE id IN ({placeholders}) AND user_id = ?
    """, req.transaction_ids + [current_user.id])
    previous_states = [dict(r) for r in cursor.fetchall()]

    status = req.reimbursement_status if req.reimbursement_status else ("pending" if req.is_reimbursable == 1 else "none")

    cursor.execute(f"""
    UPDATE transactions
    SET is_reimbursable = ?,
        reimbursement_status = ?
    WHERE id IN ({placeholders}) AND user_id = ?
    """, [req.is_reimbursable, status] + req.transaction_ids + [current_user.id])
    updated_count = cursor.rowcount
    conn.commit()
    conn.close()

    return {
        "status": "ok", 
        "updated_count": updated_count,
        "previous_states": previous_states
    }

@app.post("/api/transactions/batch-delete")
def batch_delete_transactions(req: BatchDeleteRequest, current_user: User = Depends(get_current_user)):
    if not req.transaction_ids:
        return {"status": "no transactions provided", "deleted_count": 0, "deleted_transactions": []}

    conn = get_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" for _ in req.transaction_ids)

    # 1. Capture full transaction rows before deletion for undo
    cursor.execute(f"SELECT * FROM transactions WHERE id IN ({placeholders}) AND user_id = ?", req.transaction_ids + [current_user.id])
    deleted_transactions = [dict(r) for r in cursor.fetchall()]

    cursor.execute(f"DELETE FROM transactions WHERE id IN ({placeholders}) AND user_id = ?", req.transaction_ids + [current_user.id])
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()

    return {
        "status": "ok", 
        "deleted_count": deleted_count,
        "deleted_transactions": deleted_transactions
    }

@app.post("/api/transactions/batch-undo")
def batch_undo_action(req: BatchUndoRequest, current_user: User = Depends(get_current_user)):
    """
    Rolls back batch modifications or bulk recommendation applications.
    """
    conn = get_connection()
    cursor = conn.cursor()
    restored_count = 0

    if req.action_type == "update" and req.previous_states:
        for prev in req.previous_states:
            tx_id = prev.get("id")
            if not tx_id:
                continue
            cursor.execute("""
            UPDATE transactions
            SET category = ?,
                is_reimbursable = ?,
                reimbursement_status = ?,
                notes = ?,
                loan_id = ?
            WHERE id = ? AND user_id = ?
            """, (
                prev.get("category"),
                prev.get("is_reimbursable", 0),
                prev.get("reimbursement_status", "none"),
                prev.get("notes"),
                prev.get("loan_id"),
                tx_id,
                current_user.id
            ))
            restored_count += cursor.rowcount

        # If a rule pattern was learned as part of this batch, delete it so it doesn't linger
        if req.rule_pattern and len(req.rule_pattern.strip()) >= 3:
            clean_pat = req.rule_pattern.strip().upper()
            cursor.execute("DELETE FROM category_rules WHERE pattern = ? AND user_id = ?", (clean_pat, current_user.id))
            cursor.execute("DELETE FROM knowledge_base WHERE pattern = ?", (clean_pat,))

    elif req.action_type == "delete" and req.deleted_transactions:
        for tx in req.deleted_transactions:
            cursor.execute("""
            INSERT OR REPLACE INTO transactions (id, user_id, date, account, description, amount, category, is_reimbursable, reimbursement_status, notes, needs_clarification, loan_id, balance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tx.get("id"),
                current_user.id,
                tx.get("date"),
                tx.get("account"),
                tx.get("description"),
                tx.get("amount"),
                tx.get("category"),
                tx.get("is_reimbursable", 0),
                tx.get("reimbursement_status", "none"),
                tx.get("notes"),
                tx.get("needs_clarification", 0),
                tx.get("loan_id"),
                tx.get("balance")
            ))
            restored_count += 1

    conn.commit()
    sync_realtime_account_balances(conn, user_id=current_user.id)
    conn.close()

    return {"status": "ok", "restored_count": restored_count}

# --- Transfer Pairing & Split Endpoints ---

@app.post("/api/transactions/find-transfer-pair")
def api_find_transfer_pair(req: FindTransferPairRequest, current_user: User = Depends(get_current_user)):
    res = find_transfer_counterpart(req.transaction_id, user_id=current_user.id)
    if not res:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    return res

@app.post("/api/transactions/pair-transfers")
def api_pair_transfers(req: PairTransfersRequest, current_user: User = Depends(get_current_user)):
    res = pair_transfers(req.tx_id_1, req.tx_id_2, user_id=current_user.id)
    return res

@app.post("/api/transactions/unpair-transfer")
def api_unpair_transfer(req: UnpairTransferRequest, current_user: User = Depends(get_current_user)):
    res = unpair_transfer(req.transaction_id, user_id=current_user.id)
    return res

@app.get("/api/transactions/{tx_id}/linked-pair")
def api_get_linked_pair(tx_id: int, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (tx_id, current_user.id))
    tx_row = cursor.fetchone()
    if not tx_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    
    tx1 = dict(tx_row)
    linked_id = tx1.get("linked_tx_id")
    if not linked_id:
        conn.close()
        return {
            "is_paired": False,
            "target": tx1,
            "counterpart": None,
            "message": "Esta transacción no está vinculada a ningún traspaso."
        }
        
    cursor.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (linked_id, current_user.id))
    linked_row = cursor.fetchone()
    conn.close()

    if not linked_row:
        return {
            "is_paired": False,
            "is_orphaned": True,
            "target": tx1,
            "counterpart": None,
            "message": f"El movimiento vinculado (#{linked_id}) ya no existe o fue eliminado."
        }

    tx2 = dict(linked_row)
    # Identify source (negative amount / origin) and destination (positive amount / destination)
    if tx1["amount"] <= tx2["amount"]:
        source_tx = tx1
        dest_tx = tx2
    else:
        source_tx = tx2
        dest_tx = tx1

    net_diff = round(source_tx["amount"] + dest_tx["amount"], 2)
    is_balanced = abs(net_diff) < 0.05
    transfer_amount = abs(source_tx["amount"])

    return {
        "is_paired": True,
        "is_balanced": is_balanced,
        "net_difference": net_diff,
        "transfer_amount": transfer_amount,
        "source_tx": source_tx,
        "dest_tx": dest_tx,
        "current_tx_id": tx_id
    }


@app.post("/api/transactions/split")
def api_split_transaction(req: SplitTransactionRequest, current_user: User = Depends(get_current_user)):
    if len(req.splits) < 2:
        raise HTTPException(status_code=400, detail="El desglose requiere al menos 2 partes.")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (req.transaction_id, current_user.id))
    tx_row = cursor.fetchone()
    if not tx_row:
        conn.close()
        raise HTTPException(status_code=404, detail="Transacción no encontrada.")

    orig = dict(tx_row)
    orig_amount = orig["amount"]
    total_split_amount = sum(s.amount for s in req.splits)

    # Validate sum equals original amount within 0.01
    if abs(total_split_amount - orig_amount) > 0.01:
        conn.close()
        raise HTTPException(
            status_code=400,
            detail=f"La suma del desglose ({total_split_amount:.2f}€) no coincide con el importe original ({orig_amount:.2f}€)."
        )

    # Validate signs are consistent
    for s in req.splits:
        if (orig_amount > 0 and s.amount < 0) or (orig_amount < 0 and s.amount > 0):
            conn.close()
            raise HTTPException(
                status_code=400,
                detail="Todas las partes del desglose deben tener el mismo signo que la transacción original."
            )

    # 1. Update original transaction with split 0
    s0 = req.splits[0]
    s0_is_reimb = 1 if s0.is_reimbursable else 0
    s0_status = "pending" if s0_is_reimb else "none"
    s0_notes = s0.notes or orig.get("notes") or ""
    s0_notes_full = f"{s0_notes} [Desglose 1/{len(req.splits)}]".strip()

    cursor.execute("""
    UPDATE transactions
    SET amount = ?,
        category = ?,
        is_reimbursable = ?,
        reimbursement_status = ?,
        needs_clarification = 0,
        notes = ?
    WHERE id = ? AND user_id = ?
    """, (s0.amount, s0.category, s0_is_reimb, s0_status, s0_notes_full, orig["id"], current_user.id))

    created_ids = [orig["id"]]

    # 2. Insert rows for splits 1..N
    for i, s in enumerate(req.splits[1:], start=2):
        s_is_reimb = 1 if s.is_reimbursable else 0
        s_status = "pending" if s_is_reimb else "none"
        s_notes = s.notes or orig.get("notes") or ""
        s_notes_full = f"{s_notes} [Desglose {i}/{len(req.splits)}]".strip()

        cursor.execute("""
        INSERT INTO transactions (
            user_id, date, account, description, raw_description, amount, currency,
            category, is_reimbursable, reimbursement_status, needs_clarification,
            confidence, notes, parent_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1.0, ?, ?)
        """, (
            current_user.id,
            orig["date"],
            orig["account"],
            f"{orig['description']} (Desglose {i}/{len(req.splits)})",
            orig.get("raw_description"),
            s.amount,
            orig.get("currency", "EUR"),
            s.category,
            s_is_reimb,
            s_status,
            s_notes_full,
            orig["id"]
        ))
        created_ids.append(cursor.lastrowid)

    conn.commit()
    conn.close()

    return {
        "status": "split_completed",
        "original_id": orig["id"],
        "parts_count": len(req.splits),
        "transaction_ids": created_ids
    }

# --- Agent Clarifications Queue ---

@app.get("/api/clarifications")
def get_clarifications(current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM transactions
    WHERE needs_clarification = 1 AND user_id = ?
    ORDER BY date DESC
    """, (current_user.id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "pending_doubts": rows,
        "count": len(rows),
        "available_categories": get_active_categories()
    }

@app.post("/api/clarifications/resolve")
def resolve_clarification(req: ResolveClarificationRequest, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (req.transaction_id, current_user.id))
    tx = cursor.fetchone()
    if not tx:
        conn.close()
        raise HTTPException(status_code=404, detail="Transacción no encontrada")

    is_reimb_int = 1 if req.is_reimbursable else 0
    reimb_status = "pending" if req.is_reimbursable else "none"

    cursor.execute("""
    UPDATE transactions
    SET category = ?,
        is_reimbursable = ?,
        reimbursement_status = ?,
        needs_clarification = 0,
        confidence = 1.0,
        notes = coalesce(notes, '') || ' [Confirmado por el usuario]'
    WHERE id = ? AND user_id = ?
    """, (req.category, is_reimb_int, reimb_status, req.transaction_id, current_user.id))

    conn.commit()
    conn.close()

    rule_result = None
    if req.learn_rule:
        pattern = req.pattern if req.pattern else tx["description"].split()[0]
        rule_result = learn_rule_and_retroactively_apply(pattern, req.category, is_reimb_int)

    prev_state = {
        "id": tx["id"],
        "category": tx["category"],
        "is_reimbursable": tx["is_reimbursable"],
        "reimbursement_status": tx["reimbursement_status"],
        "notes": tx["notes"],
        "loan_id": tx["loan_id"]
    }

    return {
        "status": "resolved",
        "transaction_id": req.transaction_id,
        "learned_rule": rule_result,
        "previous_state": prev_state
    }

# --- Company Expenses & Reimbursements ---

@app.get("/api/company-expenses")
def get_company_expenses(current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM transactions
    WHERE is_reimbursable = 1 AND user_id = ?
    ORDER BY date DESC
    """, (current_user.id,))
    reimbursable_txs = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
    SELECT * FROM transactions
    WHERE amount > 0 AND user_id = ? AND (category = 'Gastos de Empresa' OR description LIKE '%reembolso%' OR description LIKE '%expenses%' OR description LIKE '%meeting%')
    ORDER BY date DESC
    """, (current_user.id,))
    settlement_txs = [dict(r) for r in cursor.fetchall()]

    total_paid_out = sum(abs(t["amount"]) for t in reimbursable_txs)
    total_reimbursed_received = sum(t["amount"] for t in settlement_txs)
    pending_balance = sum(abs(t["amount"]) for t in reimbursable_txs if t["reimbursement_status"] == "pending")

    conn.close()

    return {
        "total_paid_out": round(total_paid_out, 2),
        "total_reimbursed_received": round(total_reimbursed_received, 2),
        "pending_balance": round(pending_balance, 2),
        "reimbursable_transactions": reimbursable_txs,
        "settlements": settlement_txs
    }

@app.post("/api/company-expenses/settle-all")
def settle_all_company_expenses(current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE transactions
    SET reimbursement_status = 'reimbursed'
    WHERE is_reimbursable = 1 AND reimbursement_status = 'pending' AND user_id = ?
    """, (current_user.id,))
    updated = cursor.rowcount
    conn.commit()
    conn.close()
    return {"status": "settled", "count": updated}

@app.get("/api/company-expenses/pending-expenses")
def get_pending_company_expenses(current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM transactions
    WHERE is_reimbursable = 1 AND reimbursement_status = 'pending' AND user_id = ?
    ORDER BY date DESC
    """, (current_user.id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"pending_expenses": rows, "count": len(rows)}

@app.post("/api/company-expenses/link-reimbursement")
def link_reimbursement(req: LinkReimbursementRequest, current_user: User = Depends(get_current_user)):
    if not req.expense_ids:
        raise HTTPException(status_code=400, detail="Debes seleccionar al menos un gasto para vincular.")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transactions WHERE id = ? AND user_id = ?", (req.settlement_id, current_user.id))
    settlement = cursor.fetchone()
    if not settlement:
        conn.close()
        raise HTTPException(status_code=404, detail="Liquidación de reembolso no encontrada.")

    placeholders = ",".join("?" for _ in req.expense_ids)
    cursor.execute(f"""
    UPDATE transactions
    SET reimbursement_status = 'reimbursed',
        linked_tx_id = ?
    WHERE id IN ({placeholders}) AND user_id = ?
    """, [req.settlement_id] + req.expense_ids + [current_user.id])
    linked_count = cursor.rowcount

    cursor.execute("""
    UPDATE transactions
    SET notes = coalesce(notes, '') || ' [Gastos vinculados: ' || ? || ']'
    WHERE id = ? AND user_id = ?
    """, (str(linked_count), req.settlement_id, current_user.id))

    conn.commit()
    conn.close()

    return {
        "status": "linked",
        "settlement_id": req.settlement_id,
        "linked_count": linked_count
    }

# --- Portfolio & Capital Global ---

@app.get("/api/portfolio")
def get_portfolio(current_user: User = Depends(get_current_user)):
    return get_portfolio_summary(user_id=current_user.id)

# --- Stocks (Finnhub Live Search, Quotes & Positions) ---

@app.get("/api/stocks/search")
def search_stocks_endpoint(q: str):
    return {"results": search_stocks_finnhub(q)}

@app.get("/api/stocks/quote")
def get_stock_quote_endpoint(symbol: str):
    return fetch_live_stock_quote(symbol)

@app.post("/api/stocks")
def add_or_update_stock_endpoint(req: StockHoldingRequest, current_user: User = Depends(get_current_user)):
    try:
        return add_or_update_stock_holding(
            symbol=req.symbol,
            name=req.name or "",
            shares=req.shares,
            avg_price=req.avg_price,
            currency=req.currency or "USD",
            user_id=current_user.id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/stocks/{symbol}")
def delete_stock_endpoint(symbol: str, current_user: User = Depends(get_current_user)):
    try:
        return delete_stock_holding(symbol, user_id=current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/stocks/refresh")
def refresh_stocks_endpoint(current_user: User = Depends(get_current_user)):
    updated = refresh_all_stock_quotes(user_id=current_user.id)
    summary = get_portfolio_summary(user_id=current_user.id)
    return {"updated": updated, "summary": summary}

# --- Generic Mutual Funds (Fondos de Inversión) ---

@app.get("/api/portfolio/funds")
def list_funds_endpoint(current_user: User = Depends(get_current_user)):
    summary = get_portfolio_summary(user_id=current_user.id)
    return {"funds": summary.get("funds", []), "summary": summary.get("funds_summary", {})}

@app.get("/api/portfolio/funds/lookup")
def lookup_fund_endpoint(isin: str):
    return fetch_fund_nav_and_name(isin)

@app.post("/api/portfolio/funds")
def create_fund_endpoint(req: FundCreateRequest):
    try:
        return add_or_update_fund(
            isin=req.isin,
            name=req.name,
            latest_nav=req.latest_nav or 0.0,
            currency=req.currency or "EUR"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/portfolio/funds/{isin}")
def delete_fund_endpoint(isin: str):
    try:
        return delete_fund(isin)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/portfolio/funds/{isin}/contribution")
def add_fund_contribution_endpoint(isin: str, req: FundContributionRequest, current_user: User = Depends(get_current_user)):
    try:
        return record_fund_contribution(
            isin=isin,
            date_str=req.date,
            invested_amount=req.invested_amount,
            nav_price=req.nav_price,
            shares=req.shares,
            notes=req.notes or "",
            funding_account=req.funding_account or "Santander",
            user_id=current_user.id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/portfolio/funds/contributions/{contrib_id}")
def delete_fund_contribution_endpoint(contrib_id: int, current_user: User = Depends(get_current_user)):
    try:
        return delete_fund_contribution(contrib_id, user_id=current_user.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/portfolio/funds/refresh-all")
def refresh_funds_endpoint(current_user: User = Depends(get_current_user)):
    updated = refresh_all_funds_nav()
    summary = get_portfolio_summary(user_id=current_user.id)
    return {"updated": updated, "summary": summary}

@app.post("/api/portfolio/msci-contribution")
def add_msci_contribution_legacy(req: MSCIContributionRequest, current_user: User = Depends(get_current_user)):
    return record_fund_contribution(
        isin="IE00BYX5P602",
        date_str=req.date,
        invested_amount=req.invested_amount,
        nav_price=req.nav_price,
        shares=req.shares,
        notes=req.notes or "Aportación Fidelity MSCI World",
        funding_account="Santander",
        user_id=current_user.id
    )

@app.get("/api/accounts")
def get_accounts(current_user: User = Depends(get_current_user)):
    conn = get_connection()
    sync_realtime_account_balances(conn, user_id=current_user.id)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bank_accounts WHERE user_id = ? ORDER BY is_credit_card ASC, current_balance DESC", (current_user.id,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"accounts": rows}

@app.post("/api/accounts/balance")
def update_account_balance(req: AccountBalanceUpdate, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE account = ? AND user_id = ?", (req.account_name, current_user.id))
    tx_sum = float(cursor.fetchone()[0] or 0.0)
    adjusted_initial = req.balance - tx_sum
    cursor.execute("""
    UPDATE bank_accounts
    SET initial_balance = ?, current_balance = ?, last_imported_at = ?, notes = coalesce(?, notes)
    WHERE account_name = ? AND user_id = ?
    """, (adjusted_initial, req.balance, now, req.notes, req.account_name, current_user.id))
    conn.commit()
    sync_realtime_account_balances(conn, user_id=current_user.id)
    conn.close()
    return {"status": "updated", "account": req.account_name, "balance": req.balance}

# --- Forecast & Recommendations ---

class ForecastSettingsUpdate(BaseModel):
    expected_income: Optional[float] = None
    target_savings: Optional[float] = None
    budget_max: Optional[float] = None

@app.get("/api/forecast/settings")
def get_forecast_settings_endpoint(current_user: User = Depends(get_current_user)):
    settings = get_all_settings(user_id=current_user.id)
    return {
        "expected_income": float(settings.get("forecast_expected_income", 0.0) or 0.0),
        "target_savings": float(settings.get("forecast_target_savings", 0.0) or 0.0),
        "budget_max": float(settings.get("forecast_budget_max", 0.0) or 0.0),
    }

@app.post("/api/forecast/settings")
def update_forecast_settings_endpoint(req: ForecastSettingsUpdate, current_user: User = Depends(get_current_user)):
    if req.expected_income is not None:
        set_setting("forecast_expected_income", str(req.expected_income), user_id=current_user.id)
    if req.target_savings is not None:
        set_setting("forecast_target_savings", str(req.target_savings), user_id=current_user.id)
    if req.budget_max is not None:
        set_setting("forecast_budget_max", str(req.budget_max), user_id=current_user.id)
    settings = get_all_settings(user_id=current_user.id)
    return {
        "status": "updated",
        "expected_income": float(settings.get("forecast_expected_income", 0.0) or 0.0),
        "target_savings": float(settings.get("forecast_target_savings", 0.0) or 0.0),
        "budget_max": float(settings.get("forecast_budget_max", 0.0) or 0.0),
    }

@app.get("/api/forecast")
def get_forecast(year: Optional[int] = None, month: Optional[int] = None, current_user: User = Depends(get_current_user)):
    now = datetime.now()
    y = year or now.year
    m = month or now.month
    return calculate_monthly_forecast(y, m, user_id=current_user.id)

@app.get("/api/forecast/habits-and-goals")
def get_habits_and_goals(current_user: User = Depends(get_current_user)):
    return get_habits_and_goals_analysis(user_id=current_user.id)

# --- Loans & Credit Facilities ---

class LoanUpdateRequest(BaseModel):
    name: Optional[str] = None
    entity: Optional[str] = None
    contract_number: Optional[str] = None
    loan_type: Optional[str] = None
    financed_item: Optional[str] = None
    initial_principal: Optional[float] = None
    interest_rate_pct: Optional[float] = None
    monthly_installment: Optional[float] = None
    term_months: Optional[int] = None
    start_date: Optional[str] = None
    match_pattern: Optional[str] = None
    account_name: Optional[str] = None
    disbursement_tx_id: Optional[int] = None
    notes: Optional[str] = None

class LoanCreateRequest(BaseModel):
    name: str
    entity: str = "Banco"
    contract_number: Optional[str] = ""
    loan_type: str = "loan_disbursement" # 'loan_disbursement' or 'installment_purchase'
    financed_item: Optional[str] = None
    initial_principal: float
    interest_rate_pct: float = 0.0
    monthly_installment: Optional[float] = None
    term_months: int = 12
    start_date: Optional[str] = None
    match_pattern: Optional[str] = ""
    account_name: str = "Santander (*3012)"
    disbursement_tx_id: Optional[int] = None
    notes: Optional[str] = None

@app.get("/api/loans")
def get_loans(current_user: User = Depends(get_current_user)):
    from backend.loans import get_loans_summary
    return get_loans_summary(user_id=current_user.id)

@app.post("/api/loans")
def create_loan(req: LoanCreateRequest, current_user: User = Depends(get_current_user)):
    from backend.loans import compute_monthly_installment, get_loans_summary
    installment = req.monthly_installment
    if (req.interest_rate_pct and req.interest_rate_pct > 0) or (installment is None or installment <= 0):
        installment = compute_monthly_installment(req.initial_principal, req.interest_rate_pct, req.term_months)

    start_date = req.start_date or datetime.now().strftime("%Y-%m-%d")
    pattern = req.match_pattern or req.name

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO loans (user_id, name, entity, contract_number, loan_type, financed_item, initial_principal, interest_rate_pct, monthly_installment, term_months, start_date, match_pattern, account_name, disbursement_tx_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        current_user.id,
        req.name,
        req.entity,
        req.contract_number or "",
        req.loan_type,
        req.financed_item or req.name,
        req.initial_principal,
        req.interest_rate_pct,
        installment,
        req.term_months,
        start_date,
        pattern,
        req.account_name,
        req.disbursement_tx_id,
        req.notes or ""
    ))
    conn.commit()
    conn.close()
    return get_loans_summary(user_id=current_user.id)

@app.put("/api/loans/{loan_id}")
def update_loan(loan_id: int, req: LoanUpdateRequest, current_user: User = Depends(get_current_user)):
    from backend.loans import compute_monthly_installment, get_loans_summary
    conn = get_connection()
    cursor = conn.cursor()

    update_data = req.dict(exclude_unset=True)
    # If principal, rate or term was changed or rate > 0, ensure monthly_installment matches TIN formula
    cursor.execute("SELECT initial_principal, interest_rate_pct, term_months FROM loans WHERE id = ? AND user_id = ?", (loan_id, current_user.id))
    cur = cursor.fetchone()
    if not cur:
        conn.close()
        raise HTTPException(status_code=404, detail="Préstamo o crédito no encontrado")

    p = update_data.get("initial_principal", cur["initial_principal"])
    r = update_data.get("interest_rate_pct", cur["interest_rate_pct"])
    t = update_data.get("term_months", cur["term_months"])
    if (r and r > 0) or ("monthly_installment" in update_data and (update_data["monthly_installment"] is None or update_data["monthly_installment"] <= 0)):
        update_data["monthly_installment"] = compute_monthly_installment(p, r, t)

    fields = []
    values = []
    for k, v in update_data.items():
        if v is not None:
            fields.append(f"{k} = ?")
            values.append(v)
    if fields:
        values.extend([loan_id, current_user.id])
        cursor.execute(f"UPDATE loans SET {', '.join(fields)} WHERE id = ? AND user_id = ?", tuple(values))
        conn.commit()
    conn.close()
    return get_loans_summary(user_id=current_user.id)

@app.delete("/api/loans/{loan_id}")
def delete_loan(loan_id: int, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    # Unlink any transactions assigned to this loan before deletion
    cursor.execute("UPDATE transactions SET loan_id = NULL WHERE loan_id = ? AND user_id = ?", (loan_id, current_user.id))
    cursor.execute("DELETE FROM loans WHERE id = ? AND user_id = ?", (loan_id, current_user.id))
    conn.commit()
    conn.close()
    from backend.loans import get_loans_summary
    return get_loans_summary(user_id=current_user.id)

@app.post("/api/loans/{loan_id}/link")
def link_transactions_to_loan(loan_id: int, req: LinkLoanTransactionsRequest, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM loans WHERE id = ? AND user_id = ?", (loan_id, current_user.id))
    loan = cursor.fetchone()
    if not loan:
        conn.close()
        raise HTTPException(status_code=404, detail="Préstamo o crédito no encontrado")

    if req.transaction_ids:
        placeholders = ",".join("?" * len(req.transaction_ids))
        cursor.execute(f"""
            UPDATE transactions 
            SET loan_id = ?, category = 'Deudas y créditos'
            WHERE id IN ({placeholders}) AND user_id = ?
        """, (loan_id, *req.transaction_ids, current_user.id))
        conn.commit()
    conn.close()
    from backend.loans import get_loans_summary
    return get_loans_summary(user_id=current_user.id)

@app.post("/api/loans/{loan_id}/unlink")
def unlink_transactions_from_loan(loan_id: int, req: LinkLoanTransactionsRequest, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    if req.transaction_ids:
        placeholders = ",".join("?" * len(req.transaction_ids))
        # Setting loan_id = 0 excludes it permanently from both explicit loan_id and pattern matching (loan_id IS NULL)
        cursor.execute(f"""
            UPDATE transactions 
            SET loan_id = 0
            WHERE id IN ({placeholders}) AND user_id = ?
        """, (*req.transaction_ids, current_user.id))
        conn.commit()
    conn.close()
    from backend.loans import get_loans_summary
    return get_loans_summary(user_id=current_user.id)

@app.get("/api/loans/search-candidates")
def search_loan_candidates(q: str = "", limit: int = 60, current_user: User = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor()
    if q and q.strip():
        query = f"%{q.strip()}%"
        cursor.execute("""
            SELECT t.id, t.date, t.account, t.description, t.amount, t.category, t.loan_id, l.name as loan_name
            FROM transactions t
            LEFT JOIN loans l ON t.loan_id = l.id
            WHERE t.user_id = ? AND (t.description LIKE ? OR t.account LIKE ? OR t.category LIKE ?)
            ORDER BY t.date DESC
            LIMIT ?
        """, (current_user.id, query, query, query, limit))
    else:
        cursor.execute("""
            SELECT t.id, t.date, t.account, t.description, t.amount, t.category, t.loan_id, l.name as loan_name
            FROM transactions t
            LEFT JOIN loans l ON t.loan_id = l.id
            WHERE t.user_id = ? AND (
               t.category = 'Deudas y créditos'
               OR t.description LIKE '%cuota%'
               OR t.description LIKE '%fraccionar%'
               OR t.description LIKE '%prestamo%'
               OR t.description LIKE '%préstamo%'
               OR t.description LIKE '%credito%'
               OR t.description LIKE '%crédito%'
               OR t.description LIKE '%fpv%'
               OR t.loan_id IS NOT NULL
            )
            ORDER BY t.date DESC
            LIMIT ?
        """, (current_user.id, limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- Multi-Month Batch Upload with Deduplication & Auto Bank Detection ---

@app.post("/api/upload")
async def upload_statement(
    file: UploadFile = File(...),
    account: str = Form("Auto"),
    current_user: User = Depends(get_current_user)
):
    MAX_UPLOAD_SIZE = 25 * 1024 * 1024  # 25 MB RAM guard limit
    filename = file.filename or ""
    try:
        content_bytes = await file.read()
    except Exception:
        content_bytes = b""

    if len(content_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail="El archivo excede el tamaño máximo permitido de 25 MB para procesamiento seguro en memoria RAM."
        )

    target_account = account if (account and account != "Auto") else "Auto"

    fn_lower = filename.lower()
    is_excel = (
        any(fn_lower.endswith(ext) for ext in [".xlsx", ".xls", ".xslx", ".xlsm", ".xltx", ".ods"])
        or content_bytes.startswith(b'PK\x03\x04')
        or content_bytes.startswith(b'\xd0\xcf\x11\xe0')
    )

    parsed_txs = []
    if is_excel:
        parsed_txs = parse_excel_content(content_bytes, default_account=target_account, filename=filename)
        # If excel extraction produced 0 transactions, fallback to text/csv decoding
        if not parsed_txs:
            for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252", "iso-8859-1"]:
                try:
                    content_str = content_bytes.decode(enc)
                    fallback_txs = parse_csv_content(content_str, default_account=target_account, filename=filename)
                    if fallback_txs:
                        parsed_txs = fallback_txs
                        break
                except Exception:
                    continue
    else:
        # Robust encoding detection
        content_str = None
        for enc in ["utf-8-sig", "utf-8", "latin-1", "cp1252", "iso-8859-1"]:
            try:
                content_str = content_bytes.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        if content_str is None:
            content_str = content_bytes.decode("utf-8", errors="ignore")

        parsed_txs = parse_csv_content(content_str, default_account=target_account, filename=filename)
        # If CSV extraction produced 0 transactions, fallback to Excel parser
        if not parsed_txs:
            parsed_txs = parse_excel_content(content_bytes, default_account=target_account, filename=filename)

    # In-memory processing cleanup: free raw byte buffer
    del content_bytes

    if not parsed_txs:
        raise HTTPException(status_code=400, detail="No se pudieron extraer transacciones del extracto. Revisa el formato.")

    # Check if the detected or specified bank is supported; auto-enable it if user uploaded it
    try:
        supported_map = {b["id"]: b for b in get_supported_banks()}
        check_acc = (target_account if target_account != "Auto" else (parsed_txs[0]["account"] if parsed_txs else "")).lower()
        matched_bank_id = None
        if "santander" in check_acc:
            matched_bank_id = "santander"
        elif "caixa" in check_acc or "imagin" in check_acc:
            matched_bank_id = "caixabank"
        elif "revolut" in check_acc:
            matched_bank_id = "revolut"
        elif "ing" in check_acc:
            matched_bank_id = "ing"
        elif "bbva" in check_acc:
            matched_bank_id = "bbva"
        elif "openbank" in check_acc:
            matched_bank_id = "openbank"
        elif "amex" in check_acc or "american express" in check_acc:
            matched_bank_id = "amex"
        elif "iberia" in check_acc:
            matched_bank_id = "iberia_cards"
        elif "n26" in check_acc:
            matched_bank_id = "n26"
        elif "myinvestor" in check_acc:
            matched_bank_id = "myinvestor"

        if matched_bank_id and matched_bank_id in supported_map:
            if not supported_map[matched_bank_id].get("enabled"):
                update_bank_enabled(matched_bank_id, 1)
    except Exception as e:
        print(f"Bank auto-enable note: {e}")

    conn = get_connection()
    cursor = conn.cursor()

    imported = 0
    duplicates_skipped = 0
    flagged_doubts = 0
    fund_subs_updated = 0
    months_count = {}
    detected_accounts_set = set()
    imported_ids = []
    matched_db_ids = set()

    for tx in parsed_txs:
        detected_accounts_set.add(tx["account"])
        month_key = tx["date"][:7] if len(tx["date"]) >= 7 else "Desconocido"

        # Check if transaction is a mutual fund subscription to update Fidelity MSCI World
        desc_up = (tx["description"] or "").upper()
        if any(kw in desc_up for kw in ["FIDELITY", "MSCI WORLD", "INDEX P AC"]):
            try:
                res_fund = record_fund_subscription_from_statement(conn, tx["date"], abs(tx["amount"]), tx["description"], user_id=current_user.id)
                if res_fund:
                    fund_subs_updated += 1
            except Exception as e:
                print(f"Error updating fund subscription: {e}")

        # Deduplication check: accounts for 1-day differences between Fecha Operación and Fecha Valor
        norm_desc = re.sub(r'\s+', ' ', tx["description"] or "").strip().lower()
        norm_desc_compact = re.sub(r'[^a-z0-9]', '', norm_desc)
        tx_bal = tx.get("balance")

        cursor.execute("""
        SELECT id, description, date, balance FROM transactions
        WHERE account = ? 
          AND abs(amount - ?) < 0.01
          AND abs(julianday(date) - julianday(?)) <= 1.5
          AND user_id = ?
        """, (tx["account"], tx["amount"], tx["date"], current_user.id))
        candidates = cursor.fetchall()

        is_duplicate = False
        for cand in candidates:
            cand_id = cand["id"]
            if cand_id in matched_db_ids:
                continue
            cand_bal = cand["balance"]
            cand_norm = re.sub(r'\s+', ' ', cand["description"] or "").strip().lower()
            cand_norm_compact = re.sub(r'[^a-z0-9]', '', cand_norm)

            # 1. Exact balance match confirms the exact same ledger transaction even if date shifts by 1 day
            if tx_bal is not None and cand_bal is not None and abs(tx_bal - cand_bal) < 0.01:
                matched_db_ids.add(cand_id)
                is_duplicate = True
                break

            # 2. Matching normalized description within ±1.5 days
            if cand_norm_compact == norm_desc_compact or (
                len(cand_norm_compact) > 12 and len(norm_desc_compact) > 12 and (
                    cand_norm_compact.startswith(norm_desc_compact[:15]) or 
                    norm_desc_compact.startswith(cand_norm_compact[:15])
                )
            ):
                # If balances are both present and differ significantly, they are different transactions
                if tx_bal is not None and cand_bal is not None and abs(tx_bal - cand_bal) >= 0.01:
                    continue
                matched_db_ids.add(cand_id)
                is_duplicate = True
                break

        if is_duplicate:
            duplicates_skipped += 1
            continue

        months_count[month_key] = months_count.get(month_key, 0) + 1

        analysis = categorize_transaction(tx["description"], tx["amount"], tx["account"], bank_category=tx.get("bank_category", ""))

        cursor.execute("""
        INSERT INTO transactions (
            user_id, date, account, description, raw_description, amount, balance, currency,
            category, is_reimbursable, reimbursement_status, needs_clarification,
            clarification_question, confidence, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            current_user.id,
            tx["date"],
            tx["account"],
            tx["description"],
            tx["raw_description"],
            tx["amount"],
            tx.get("balance"),
            tx.get("currency", "EUR"),
            analysis["category"],
            analysis["is_reimbursable"],
            analysis.get("reimbursement_status", "none"),
            analysis["needs_clarification"],
            analysis["clarification_question"],
            analysis["confidence"],
            analysis.get("notes")
        ))
        imported_ids.append(cursor.lastrowid)
        imported += 1
        if analysis["needs_clarification"]:
            flagged_doubts += 1

    # Update account balances dynamically in real time across accounts for this tenant
    sync_realtime_account_balances(conn, user_id=current_user.id)

    conn.commit()
    conn.close()

    # Auto-pair transfers across newly imported transactions and existing accounts
    paired_transfers, transfer_doubts = auto_pair_internal_transfers(imported_ids if imported_ids else None, user_id=current_user.id)

    # Trigger automatic rolling snapshot
    try:
        backup_db()
    except Exception:
        pass

    months_summary = ", ".join([f"{m} ({c} mov.)" for m, c in sorted(months_count.items())])
    accounts_summary = ", ".join(detected_accounts_set)

    msg = f"Se han procesado {imported + duplicates_skipped} movimientos para [{accounts_summary}]."
    if imported > 0:
        msg += f" {imported} nuevos importados ({months_summary})."
    if duplicates_skipped > 0:
        msg += f" {duplicates_skipped} movimientos ya existentes omitidos."
    if paired_transfers > 0:
        msg += f" {paired_transfers} traspasos entre cuentas emparejados automáticamente."
    if fund_subs_updated > 0:
        msg += f" {fund_subs_updated} aportaciones a fondos de inversión o acciones sincronizadas."
    if (flagged_doubts + transfer_doubts) > 0:
        msg += f" {flagged_doubts + transfer_doubts} requieren confirmación."

    most_freq_m = sorted(months_count.items(), key=lambda x: x[1], reverse=True)[0][0] if months_count else None
    detected_list = list(detected_accounts_set)
    first_detected = detected_list[0] if detected_list else target_account

    return {
        "status": "success",
        "imported": imported,
        "imported_count": imported,
        "duplicates_skipped": duplicates_skipped,
        "flagged_doubts": flagged_doubts + transfer_doubts,
        "paired_transfers": paired_transfers,
        "fund_subscriptions_updated": fund_subs_updated,
        "months_breakdown": months_count,
        "breakdown_by_month": months_count,
        "detected_accounts": detected_list,
        "account_detected": first_detected,
        "most_frequent_month": most_freq_m,
        "message": msg
    }

# --- DeepSeek Integrated Financial Chat Assistant & Analytics Engine ---

@app.get("/api/analytics/profile")
def get_analytics_profile(current_user: User = Depends(get_current_user)):
    """
    Returns precomputed multi-month financial analytics: trends, category matrix,
    recurring subscriptions, top merchants, reimbursement audit, and health.
    """
    try:
        return get_comprehensive_financial_profile(user_id=current_user.id)
    except Exception as e:
        print("Analytics profile error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/balance-matrix")
def get_analytics_balance_matrix(current_user: User = Depends(get_current_user)):
    """
    Returns complete Excel / Notion spreadsheet balance matrix with months,
    categories, card settlements deduplicated, work expenses, and wealth evolution.
    """
    try:
        return get_monthly_balance_matrix(user_id=current_user.id)
    except Exception as e:
        print("Balance matrix error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/advanced")
def get_analytics_advanced(month: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """
    Returns advanced dashboard analytics for the specified month or global:
    Day of week spending habits, 50/30/20 budget rule distribution,
    spending anomalies / money leaks, and top merchants.
    """
    try:
        return get_advanced_analytics(month, user_id=current_user.id)
    except Exception as e:
        print("Advanced analytics error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_agent_endpoint(req: ChatRequest, current_user: User = Depends(get_current_user)):
    try:
        latest_user_query = req.messages[-1].content if req.messages else None
        context_text = build_llm_financial_context(user_query=latest_user_query, user_id=current_user.id)

        messages_dicts = [{"role": msg.role, "content": msg.content} for msg in req.messages]
        reply = chat_financial_assistant(
            messages=messages_dicts,
            context_text=context_text,
            selected_month=req.selected_month
        )
        return {"response": reply}
    except Exception as e:
        print("Chat error:", e)
        raise HTTPException(status_code=500, detail=f"Error al comunicar con DeepSeek: {str(e)}")

# Serve static frontend with robust OneDrive conflict handling
import sys
ROOT_DIR = os.environ.get("BANK_AGENT_ROOT")
if not ROOT_DIR:
    cwd = os.getcwd()
    if os.path.exists(os.path.join(cwd, "frontend")):
        ROOT_DIR = cwd
    else:
        ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        if getattr(sys, 'frozen', False):
            curr = os.path.dirname(sys.executable)
            for _ in range(4):
                if os.path.exists(os.path.join(curr, "frontend")):
                    ROOT_DIR = curr
                    break
                curr = os.path.dirname(curr)

def get_frontend_dist():
    for name in ["dist", "dist 2"]:
        p = os.path.join(ROOT_DIR, "frontend", name)
        if os.path.isdir(p):
            return p
    return os.path.join(ROOT_DIR, "frontend", "dist")

FRONTEND_DIST = get_frontend_dist()

@app.get("/app_assets/{file_path:path}")
async def serve_app_assets(file_path: str):
    candidate_dirs = [
        os.path.join(ROOT_DIR, "frontend", "dist", "app_assets"),
        os.path.join(ROOT_DIR, "frontend", "dist", "app_assets 2"),
        os.path.join(ROOT_DIR, "frontend", "dist 2", "app_assets"),
        os.path.join(ROOT_DIR, "frontend", "dist 2", "app_assets 2"),
        os.path.join(ROOT_DIR, "frontend", "dist", "assets"),
        os.path.join(ROOT_DIR, "frontend", "dist 2", "assets"),
    ]
    for d in candidate_dirs:
        full_path = os.path.join(d, file_path)
        if os.path.isfile(full_path):
            media_type = None
            if file_path.endswith(".js"):
                media_type = "application/javascript"
            elif file_path.endswith(".css"):
                media_type = "text/css"
            return FileResponse(full_path, media_type=media_type)
    raise HTTPException(status_code=404, detail=f"Asset {file_path} not found")

@app.get("/")
async def serve_index():
    candidates = [
        os.path.join(ROOT_DIR, "frontend", "dist", "index.html"),
        os.path.join(ROOT_DIR, "frontend", "dist 2", "index.html"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return FileResponse(c)
    raise HTTPException(status_code=404, detail="index.html not found")

if os.path.exists(FRONTEND_DIST):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app:app", host="0.0.0.0", port=8000, reload=True)
