import os
import re
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from backend.database import get_connection, init_db, backup_db, sync_realtime_account_balances
from backend.bank_parser import parse_csv_content, parse_excel_content
from backend.categorizer import (
    categorize_transaction, learn_rule_and_retroactively_apply, CATEGORIES,
    extract_merchant_pattern, find_transfer_counterpart, pair_transfers,
    unpair_transfer, auto_pair_internal_transfers
)
from backend.portfolio import sync_google_sheet_portfolio, get_portfolio_summary, fetch_msci_nav, record_fund_subscription_from_statement
from backend.forecast import calculate_monthly_forecast, get_habits_and_goals_analysis
from backend.knowledge_base import init_knowledge_base
from backend.deepseek_service import chat_financial_assistant
from backend.financial_analyst import (
    build_llm_financial_context, get_comprehensive_financial_profile,
    get_monthly_balance_matrix, get_advanced_analytics
)

app = FastAPI(title="Diego Bank Agent API", version="2.1.0")

# Enable CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup
@app.on_event("startup")
def on_startup():
    init_db()
    init_knowledge_base()

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

# --- API Endpoints ---

@app.get("/api/summary")
def get_summary(year: Optional[int] = None, month: Optional[int] = None):
    now = datetime.now()
    y = year or now.year
    m = month or now.month

    forecast = calculate_monthly_forecast(y, m)
    portfolio = get_portfolio_summary()

    conn = get_connection()
    cursor = conn.cursor()

    # Doubts count
    cursor.execute("SELECT COUNT(*) FROM transactions WHERE needs_clarification = 1")
    pending_doubts_count = cursor.fetchone()[0]

    # Available distinct months in DB
    cursor.execute("SELECT DISTINCT substr(date, 1, 7) as ym FROM transactions ORDER BY ym DESC")
    available_months = [r["ym"] for r in cursor.fetchall() if r["ym"]]

    # Available distinct accounts in DB
    cursor.execute("SELECT DISTINCT account FROM transactions ORDER BY account ASC")
    available_accounts = [r["account"] for r in cursor.fetchall() if r["account"]]

    conn.close()

    return {
        "current_month": f"{y:04d}-{m:02d}",
        "available_months": available_months if available_months else [f"{y:04d}-{m:02d}"],
        "available_accounts": available_accounts,
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
    limit: int = 400
):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    SELECT t.*, l.name as loan_name, l.loan_type as loan_type
    FROM transactions t
    LEFT JOIN loans l ON t.loan_id = l.id
    WHERE 1=1
    """
    params = []

    if month and month != "all":
        query += " AND t.date LIKE ?"
        params.append(f"{month}%")
    if account and account != "all":
        query += " AND t.account = ?"
        params.append(account)
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

    return {"transactions": rows, "count": len(rows)}

@app.post("/api/transactions")
def create_transaction(tx: TransactionCreate):
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
        date, account, description, raw_description, amount, currency,
        category, is_reimbursable, reimbursement_status, needs_clarification,
        clarification_question, confidence, notes
    ) VALUES (?, ?, ?, ?, ?, 'EUR', ?, ?, ?, ?, ?, ?, ?)
    """, (tx.date, tx.account, tx.description, tx.description, tx.amount, cat, is_reimb, reimb_status, needs_clarif, question, confidence, tx.notes))

    tx_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {"id": tx_id, "status": "created", "category": cat, "is_reimbursable": is_reimb}

@app.put("/api/transactions/{tx_id}")
def update_transaction(tx_id: int, update: TransactionUpdate):
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

    params.append(tx_id)
    cursor.execute(f"UPDATE transactions SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()
    conn.close()

    return {"status": "updated", "id": tx_id}

@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted", "id": tx_id}

@app.post("/api/transactions/find-similar")
def find_similar_transactions(req: FindSimilarRequest):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (req.transaction_id,))
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
      AND category != ?
      AND (
        UPPER(description) LIKE UPPER(?)
        OR UPPER(raw_description) LIKE UPPER(?)
      )
    ORDER BY date DESC
    LIMIT 60
    """, (req.transaction_id, req.new_category, search_term, search_term))

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
def batch_update_category(req: BatchUpdateCategoryRequest):
    if not req.transaction_ids:
        return {"status": "no transactions provided", "updated_count": 0, "previous_states": []}

    conn = get_connection()
    cursor = conn.cursor()

    placeholders = ",".join("?" for _ in req.transaction_ids)
    
    # 1. Capture previous states for undo functionality
    cursor.execute(f"""
        SELECT id, category, is_reimbursable, reimbursement_status, notes, loan_id 
        FROM transactions 
        WHERE id IN ({placeholders})
    """, req.transaction_ids)
    previous_states = [dict(r) for r in cursor.fetchall()]

    is_company = 1 if req.new_category == "Gastos de Empresa" else 0
    reimb_status = "pending" if is_company else "none"

    sql_updates = [
        "category = ?",
        "is_reimbursable = CASE WHEN ? = 'Gastos de Empresa' THEN 1 ELSE is_reimbursable END",
        "reimbursement_status = CASE WHEN ? = 'Gastos de Empresa' THEN 'pending' ELSE reimbursement_status END",
        "needs_clarification = 0",
        "notes = 'Categoría actualizada por Diego (por lote)'"
    ]
    sql_params = [req.new_category, req.new_category, req.new_category]
    if req.loan_id is not None:
        sql_updates.append("loan_id = ?")
        sql_params.append(req.loan_id if req.loan_id > 0 else None)

    cursor.execute(f"""
    UPDATE transactions
    SET {', '.join(sql_updates)}
    WHERE id IN ({placeholders})
    """, sql_params + req.transaction_ids)
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
            VALUES (?, ?, 0, 'Confirmado por Diego en lote', 2)
            ON CONFLICT(pattern) DO UPDATE SET
                category = excluded.category,
                notes = 'Actualizado por Diego en lote'
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
def batch_update_reimbursable(req: BatchUpdateReimbursableRequest):
    if not req.transaction_ids:
        return {"status": "no transactions provided", "updated_count": 0, "previous_states": []}

    conn = get_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" for _ in req.transaction_ids)

    # 1. Capture previous states for undo functionality
    cursor.execute(f"""
        SELECT id, category, is_reimbursable, reimbursement_status, notes, loan_id 
        FROM transactions 
        WHERE id IN ({placeholders})
    """, req.transaction_ids)
    previous_states = [dict(r) for r in cursor.fetchall()]

    status = req.reimbursement_status if req.reimbursement_status else ("pending" if req.is_reimbursable == 1 else "none")

    cursor.execute(f"""
    UPDATE transactions
    SET is_reimbursable = ?,
        reimbursement_status = ?
    WHERE id IN ({placeholders})
    """, [req.is_reimbursable, status] + req.transaction_ids)
    updated_count = cursor.rowcount
    conn.commit()
    conn.close()

    return {
        "status": "ok", 
        "updated_count": updated_count,
        "previous_states": previous_states
    }

@app.post("/api/transactions/batch-delete")
def batch_delete_transactions(req: BatchDeleteRequest):
    if not req.transaction_ids:
        return {"status": "no transactions provided", "deleted_count": 0, "deleted_transactions": []}

    conn = get_connection()
    cursor = conn.cursor()
    placeholders = ",".join("?" for _ in req.transaction_ids)

    # 1. Capture full transaction rows before deletion for undo
    cursor.execute(f"SELECT * FROM transactions WHERE id IN ({placeholders})", req.transaction_ids)
    deleted_transactions = [dict(r) for r in cursor.fetchall()]

    cursor.execute(f"DELETE FROM transactions WHERE id IN ({placeholders})", req.transaction_ids)
    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()

    return {
        "status": "ok", 
        "deleted_count": deleted_count,
        "deleted_transactions": deleted_transactions
    }

@app.post("/api/transactions/batch-undo")
def batch_undo_action(req: BatchUndoRequest):
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
            WHERE id = ?
            """, (
                prev.get("category"),
                prev.get("is_reimbursable", 0),
                prev.get("reimbursement_status", "none"),
                prev.get("notes"),
                prev.get("loan_id"),
                tx_id
            ))
            restored_count += cursor.rowcount

        # If a rule pattern was learned as part of this batch, delete it so it doesn't linger
        if req.rule_pattern and len(req.rule_pattern.strip()) >= 3:
            clean_pat = req.rule_pattern.strip().upper()
            cursor.execute("DELETE FROM category_rules WHERE pattern = ?", (clean_pat,))
            cursor.execute("DELETE FROM knowledge_base WHERE pattern = ?", (clean_pat,))

    elif req.action_type == "delete" and req.deleted_transactions:
        for tx in req.deleted_transactions:
            cursor.execute("""
            INSERT OR REPLACE INTO transactions (id, date, account, description, amount, category, is_reimbursable, reimbursement_status, notes, needs_clarification, loan_id, balance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tx.get("id"),
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
    sync_realtime_account_balances(conn)
    conn.close()

    return {"status": "ok", "restored_count": restored_count}

# --- Transfer Pairing & Split Endpoints ---

@app.post("/api/transactions/find-transfer-pair")
def api_find_transfer_pair(req: FindTransferPairRequest):
    res = find_transfer_counterpart(req.transaction_id)
    if not res:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    return res

@app.post("/api/transactions/pair-transfers")
def api_pair_transfers(req: PairTransfersRequest):
    res = pair_transfers(req.tx_id_1, req.tx_id_2)
    return res

@app.post("/api/transactions/unpair-transfer")
def api_unpair_transfer(req: UnpairTransferRequest):
    res = unpair_transfer(req.transaction_id)
    return res

@app.get("/api/transactions/{tx_id}/linked-pair")
def api_get_linked_pair(tx_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
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
        
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (linked_id,))
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
def api_split_transaction(req: SplitTransactionRequest):
    if len(req.splits) < 2:
        raise HTTPException(status_code=400, detail="El desglose requiere al menos 2 partes.")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (req.transaction_id,))
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
    WHERE id = ?
    """, (s0.amount, s0.category, s0_is_reimb, s0_status, s0_notes_full, orig["id"]))

    created_ids = [orig["id"]]

    # 2. Insert rows for splits 1..N
    for i, s in enumerate(req.splits[1:], start=2):
        s_is_reimb = 1 if s.is_reimbursable else 0
        s_status = "pending" if s_is_reimb else "none"
        s_notes = s.notes or orig.get("notes") or ""
        s_notes_full = f"{s_notes} [Desglose {i}/{len(req.splits)}]".strip()

        cursor.execute("""
        INSERT INTO transactions (
            date, account, description, raw_description, amount, currency,
            category, is_reimbursable, reimbursement_status, needs_clarification,
            confidence, notes, parent_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1.0, ?, ?)
        """, (
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
def get_clarifications():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM transactions
    WHERE needs_clarification = 1
    ORDER BY date DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "pending_doubts": rows,
        "count": len(rows),
        "available_categories": CATEGORIES
    }

@app.post("/api/clarifications/resolve")
def resolve_clarification(req: ResolveClarificationRequest):
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (req.transaction_id,))
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
        notes = coalesce(notes, '') || ' [Confirmado por Diego]'
    WHERE id = ?
    """, (req.category, is_reimb_int, reimb_status, req.transaction_id))

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
def get_company_expenses():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT * FROM transactions
    WHERE is_reimbursable = 1
    ORDER BY date DESC
    """)
    reimbursable_txs = [dict(r) for r in cursor.fetchall()]

    cursor.execute("""
    SELECT * FROM transactions
    WHERE amount > 0 AND (category = 'Gastos de Empresa' OR description LIKE '%reembolso%' OR description LIKE '%expenses%' OR description LIKE '%meeting%')
    ORDER BY date DESC
    """)
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
def settle_all_company_expenses():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE transactions
    SET reimbursement_status = 'reimbursed'
    WHERE is_reimbursable = 1 AND reimbursement_status = 'pending'
    """)
    updated = cursor.rowcount
    conn.commit()
    conn.close()
    return {"status": "settled", "count": updated}

@app.get("/api/company-expenses/pending-expenses")
def get_pending_company_expenses():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM transactions
    WHERE is_reimbursable = 1 AND reimbursement_status = 'pending'
    ORDER BY date DESC
    """)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"pending_expenses": rows, "count": len(rows)}

@app.post("/api/company-expenses/link-reimbursement")
def link_reimbursement(req: LinkReimbursementRequest):
    if not req.expense_ids:
        raise HTTPException(status_code=400, detail="Debes seleccionar al menos un gasto para vincular.")

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM transactions WHERE id = ?", (req.settlement_id,))
    settlement = cursor.fetchone()
    if not settlement:
        conn.close()
        raise HTTPException(status_code=404, detail="Liquidación de reembolso no encontrada.")

    placeholders = ",".join("?" for _ in req.expense_ids)
    cursor.execute(f"""
    UPDATE transactions
    SET reimbursement_status = 'reimbursed',
        linked_tx_id = ?
    WHERE id IN ({placeholders})
    """, [req.settlement_id] + req.expense_ids)
    linked_count = cursor.rowcount

    cursor.execute("""
    UPDATE transactions
    SET notes = coalesce(notes, '') || ' [Gastos vinculados: ' || ? || ']'
    WHERE id = ?
    """, (str(linked_count), req.settlement_id))

    conn.commit()
    conn.close()

    return {
        "status": "linked",
        "settlement_id": req.settlement_id,
        "linked_count": linked_count
    }

# --- Portfolio & Capital Global ---

@app.get("/api/portfolio")
def get_portfolio():
    return get_portfolio_summary()

@app.post("/api/portfolio/sync-sheets")
def sync_portfolio_from_sheets():
    result = sync_google_sheet_portfolio()
    summary = get_portfolio_summary()
    return {"sync_result": result, "summary": summary}

@app.get("/api/accounts")
def get_accounts():
    conn = get_connection()
    sync_realtime_account_balances(conn)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bank_accounts ORDER BY is_credit_card ASC, current_balance DESC")
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return {"accounts": rows}

@app.post("/api/accounts/balance")
def update_account_balance(req: AccountBalanceUpdate):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    # Calculate initial_balance so that initial_balance + sum(txs) = req.balance
    cursor.execute("SELECT COALESCE(SUM(amount), 0.0) FROM transactions WHERE account = ?", (req.account_name,))
    tx_sum = float(cursor.fetchone()[0] or 0.0)
    adjusted_initial = req.balance - tx_sum
    cursor.execute("""
    UPDATE bank_accounts
    SET initial_balance = ?, current_balance = ?, last_imported_at = ?, notes = coalesce(?, notes)
    WHERE account_name = ?
    """, (adjusted_initial, req.balance, now, req.notes, req.account_name))
    conn.commit()
    sync_realtime_account_balances(conn)
    conn.close()
    return {"status": "updated", "account": req.account_name, "balance": req.balance}

@app.post("/api/portfolio/msci-contribution")
def add_msci_contribution(req: MSCIContributionRequest):
    conn = get_connection()
    cursor = conn.cursor()

    nav = req.nav_price if (req.nav_price and req.nav_price > 0) else fetch_msci_nav()
    shares = req.shares if req.shares > 0 else (req.invested_amount / nav if nav > 0 else 0)

    cursor.execute("""
    INSERT INTO fund_contributions (date, shares, invested_amount, nav_price, notes)
    VALUES (?, ?, ?, ?, ?)
    """, (req.date, shares, req.invested_amount, nav, req.notes))

    cursor.execute("SELECT SUM(shares) FROM fund_contributions")
    total_shares = cursor.fetchone()[0] or 0.0

    cursor.execute("""
    UPDATE fund_info
    SET total_shares = ?, latest_nav = ?, last_updated = ?
    WHERE isin = 'IE00BYX5P602'
    """, (total_shares, nav, datetime.now().isoformat()))

    # Register corresponding outflow in transactions
    cursor.execute("""
    INSERT INTO transactions (
        date, account, description, raw_description, amount, currency,
        category, is_reimbursable, reimbursement_status, needs_clarification,
        confidence, notes
    ) VALUES (?, 'Santander (*3012)', ?, ?, ?, 'EUR', 'Inversiones y ahorros', 0, 'none', 0, 1.0, 'Aportación registrada a Fidelity MSCI World')
    """, (req.date, f"Aportación MSCI World ({shares:.2f} participaciones)", f"Aportación MSCI World ({shares:.2f} participaciones)", -req.invested_amount))

    conn.commit()
    conn.close()

    return {"status": "created", "total_shares": total_shares, "latest_nav": nav}

# --- Forecast & Recommendations ---

@app.get("/api/forecast")
def get_forecast(year: Optional[int] = None, month: Optional[int] = None):
    now = datetime.now()
    y = year or now.year
    m = month or now.month
    return calculate_monthly_forecast(y, m)

@app.get("/api/forecast/habits-and-goals")
def get_habits_and_goals():
    return get_habits_and_goals_analysis()

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
def get_loans():
    from backend.loans import get_loans_summary
    return get_loans_summary()

@app.post("/api/loans")
def create_loan(req: LoanCreateRequest):
    from backend.loans import compute_monthly_installment, get_loans_summary
    installment = req.monthly_installment
    if (req.interest_rate_pct and req.interest_rate_pct > 0) or (installment is None or installment <= 0):
        installment = compute_monthly_installment(req.initial_principal, req.interest_rate_pct, req.term_months)

    start_date = req.start_date or datetime.now().strftime("%Y-%m-%d")
    pattern = req.match_pattern or req.name

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO loans (name, entity, contract_number, loan_type, financed_item, initial_principal, interest_rate_pct, monthly_installment, term_months, start_date, match_pattern, account_name, disbursement_tx_id, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
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
    return get_loans_summary()

@app.put("/api/loans/{loan_id}")
def update_loan(loan_id: int, req: LoanUpdateRequest):
    from backend.loans import compute_monthly_installment, get_loans_summary
    conn = get_connection()
    cursor = conn.cursor()

    update_data = req.dict(exclude_unset=True)
    # If principal, rate or term was changed or rate > 0, ensure monthly_installment matches TIN formula
    cursor.execute("SELECT initial_principal, interest_rate_pct, term_months FROM loans WHERE id = ?", (loan_id,))
    cur = cursor.fetchone()
    if cur:
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
        values.append(loan_id)
        cursor.execute(f"UPDATE loans SET {', '.join(fields)} WHERE id = ?", tuple(values))
        conn.commit()
    conn.close()
    return get_loans_summary()

@app.delete("/api/loans/{loan_id}")
def delete_loan(loan_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    # Unlink any transactions assigned to this loan before deletion
    cursor.execute("UPDATE transactions SET loan_id = NULL WHERE loan_id = ?", (loan_id,))
    cursor.execute("DELETE FROM loans WHERE id = ?", (loan_id,))
    conn.commit()
    conn.close()
    from backend.loans import get_loans_summary
    return get_loans_summary()

@app.post("/api/loans/{loan_id}/link")
def link_transactions_to_loan(loan_id: int, req: LinkLoanTransactionsRequest):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM loans WHERE id = ?", (loan_id,))
    loan = cursor.fetchone()
    if not loan:
        conn.close()
        raise HTTPException(status_code=404, detail="Préstamo o crédito no encontrado")

    if req.transaction_ids:
        placeholders = ",".join("?" * len(req.transaction_ids))
        cursor.execute(f"""
            UPDATE transactions 
            SET loan_id = ?, category = 'Deudas y créditos'
            WHERE id IN ({placeholders})
        """, (loan_id, *req.transaction_ids))
        conn.commit()
    conn.close()
    from backend.loans import get_loans_summary
    return get_loans_summary()

@app.post("/api/loans/{loan_id}/unlink")
def unlink_transactions_from_loan(loan_id: int, req: LinkLoanTransactionsRequest):
    conn = get_connection()
    cursor = conn.cursor()
    if req.transaction_ids:
        placeholders = ",".join("?" * len(req.transaction_ids))
        # Setting loan_id = 0 excludes it permanently from both explicit loan_id and pattern matching (loan_id IS NULL)
        cursor.execute(f"""
            UPDATE transactions 
            SET loan_id = 0
            WHERE id IN ({placeholders})
        """, tuple(req.transaction_ids))
        conn.commit()
    conn.close()
    from backend.loans import get_loans_summary
    return get_loans_summary()

@app.get("/api/loans/search-candidates")
def search_loan_candidates(q: str = "", limit: int = 60):
    conn = get_connection()
    cursor = conn.cursor()
    if q and q.strip():
        query = f"%{q.strip()}%"
        cursor.execute("""
            SELECT t.id, t.date, t.account, t.description, t.amount, t.category, t.loan_id, l.name as loan_name
            FROM transactions t
            LEFT JOIN loans l ON t.loan_id = l.id
            WHERE t.description LIKE ? OR t.account LIKE ? OR t.category LIKE ?
            ORDER BY t.date DESC
            LIMIT ?
        """, (query, query, query, limit))
    else:
        cursor.execute("""
            SELECT t.id, t.date, t.account, t.description, t.amount, t.category, t.loan_id, l.name as loan_name
            FROM transactions t
            LEFT JOIN loans l ON t.loan_id = l.id
            WHERE t.category = 'Deudas y créditos'
               OR t.description LIKE '%cuota%'
               OR t.description LIKE '%fraccionar%'
               OR t.description LIKE '%prestamo%'
               OR t.description LIKE '%préstamo%'
               OR t.description LIKE '%credito%'
               OR t.description LIKE '%crédito%'
               OR t.description LIKE '%fpv%'
               OR t.loan_id IS NOT NULL
            ORDER BY t.date DESC
            LIMIT ?
        """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

# --- Multi-Month Batch Upload with Deduplication & Auto Bank Detection ---

@app.post("/api/upload")
async def upload_statement(
    file: UploadFile = File(...),
    account: str = Form("Santander (*3012)")
):
    filename = file.filename or ""
    content_bytes = await file.read()
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

    if not parsed_txs:
        raise HTTPException(status_code=400, detail="No se pudieron extraer transacciones del extracto. Revisa el formato.")

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
                res_fund = record_fund_subscription_from_statement(conn, tx["date"], abs(tx["amount"]), tx["description"])
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
        """, (tx["account"], tx["amount"], tx["date"]))
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
            date, account, description, raw_description, amount, balance, currency,
            category, is_reimbursable, reimbursement_status, needs_clarification,
            clarification_question, confidence, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
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

    # Update account balances dynamically in real time across all accounts
    sync_realtime_account_balances(conn)

    conn.commit()
    conn.close()

    # Auto-pair transfers across newly imported transactions and existing accounts
    paired_transfers, transfer_doubts = auto_pair_internal_transfers(imported_ids if imported_ids else None)

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
        msg += f" {fund_subs_updated} aportaciones sincronizadas con el fondo MSCI World."
    if (flagged_doubts + transfer_doubts) > 0:
        msg += f" {flagged_doubts + transfer_doubts} requieren confirmación."

    return {
        "status": "success",
        "imported_count": imported,
        "duplicates_skipped": duplicates_skipped,
        "flagged_doubts": flagged_doubts + transfer_doubts,
        "paired_transfers": paired_transfers,
        "fund_subscriptions_updated": fund_subs_updated,
        "months_breakdown": months_count,
        "detected_accounts": list(detected_accounts_set),
        "message": msg
    }

# --- DeepSeek Integrated Financial Chat Assistant & Analytics Engine ---

@app.get("/api/analytics/profile")
def get_analytics_profile():
    """
    Returns precomputed multi-month financial analytics: trends, category matrix,
    recurring subscriptions, top merchants, reimbursement audit, and health.
    """
    try:
        return get_comprehensive_financial_profile()
    except Exception as e:
        print("Analytics profile error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/balance-matrix")
def get_analytics_balance_matrix():
    """
    Returns complete Excel / Notion spreadsheet balance matrix with months,
    categories, card settlements deduplicated, work expenses, and wealth evolution.
    """
    try:
        return get_monthly_balance_matrix()
    except Exception as e:
        print("Balance matrix error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/advanced")
def get_analytics_advanced(month: Optional[str] = None):
    """
    Returns advanced dashboard analytics for the specified month or global:
    Day of week spending habits, 50/30/20 budget rule distribution,
    spending anomalies / money leaks, and top merchants.
    """
    try:
        return get_advanced_analytics(month)
    except Exception as e:
        print("Advanced analytics error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_with_agent_endpoint(req: ChatRequest):
    try:
        latest_user_query = req.messages[-1].content if req.messages else None
        context_text = build_llm_financial_context(user_query=latest_user_query)

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
