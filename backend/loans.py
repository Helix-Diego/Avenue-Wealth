import sqlite3
import re
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from backend.database import get_connection

def compute_monthly_installment(principal: float, annual_rate_pct: float, term_months: int) -> float:
    """
    Computes exact monthly payment using the standard French amortization formula.
    If interest rate is 0%, simply divides principal by term_months.
    """
    if principal <= 0 or term_months <= 0:
        return 0.0
    r = (annual_rate_pct / 100.0) / 12.0
    if r > 0:
        try:
            payment = principal * (r * ((1 + r) ** term_months)) / (((1 + r) ** term_months) - 1)
        except ZeroDivisionError:
            payment = principal / term_months
    else:
        payment = principal / term_months
    return round(payment, 2)

def calculate_french_schedule(principal: float, annual_rate_pct: float, term_months: int, start_date: str) -> List[Dict[str, Any]]:
    """
    Computes a standard French amortization schedule (cuota constante).
    """
    if principal <= 0 or term_months <= 0:
        return []

    r = (annual_rate_pct / 100.0) / 12.0
    monthly_payment = compute_monthly_installment(principal, annual_rate_pct, term_months)

    schedule = []
    current_balance = principal

    try:
        cur_dt = datetime.strptime(start_date, "%Y-%m-%d")
    except Exception:
        cur_dt = datetime.now()

    for m_idx in range(1, term_months + 1):
        month_num = cur_dt.month + 1
        year_num = cur_dt.year
        if month_num > 12:
            month_num = 1
            year_num += 1
        day_num = min(cur_dt.day, 28)
        cur_dt = datetime(year_num, month_num, day_num)
        date_str = cur_dt.strftime("%Y-%m-%d")

        interest = current_balance * r if r > 0 else 0.0
        principal_part = monthly_payment - interest
        if principal_part > current_balance or m_idx == term_months:
            principal_part = current_balance
            monthly_payment = principal_part + interest

        current_balance = max(0.0, current_balance - principal_part)

        schedule.append({
            "month_index": m_idx,
            "date": date_str,
            "payment": round(monthly_payment, 2),
            "principal": round(principal_part, 2),
            "interest": round(interest, 2),
            "remaining_balance": round(current_balance, 2)
        })

        if current_balance <= 0:
            break

    return schedule

def sync_discovered_loans():
    """
    Scans transactions for known credit patterns and ensures they exist in the `loans` table.
    Only seeds if the loans table is empty, preserving all user modifications.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Ensure table schema
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

    cursor.execute("SELECT COUNT(*) FROM loans")
    if cursor.fetchone()[0] > 0:
        conn.close()
        return

    # 1. Search for Santander 0001557 Loan Disbursement (+8,910 €)
    cursor.execute("""
    SELECT id, date, amount, description FROM transactions
    WHERE (description LIKE '%0001557%' OR description LIKE '%Prestamo 0001557%') AND amount > 0
    ORDER BY date ASC LIMIT 1
    """)
    row_loan = cursor.fetchone()
    if row_loan:
        cursor.execute("""
        INSERT INTO loans (name, entity, contract_number, initial_principal, interest_rate_pct, monthly_installment, term_months, start_date, match_pattern, account_name, notes, loan_type, financed_item, disbursement_tx_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "Préstamo Santander Personal / Vehículo",
            "Banco Santander",
            "0001557 143",
            float(row_loan["amount"]),
            4.78,
            compute_monthly_installment(float(row_loan["amount"]), 4.78, 48),
            48,
            row_loan["date"],
            "0001557",
            "Santander (*3012)",
            "Financiación concedida por Banco Santander. Liquidaciones periódicas automáticas.",
            "loan_disbursement",
            "Vehículo / Coche",
            row_loan["id"]
        ))

    # 2. Search for Santander Fraccionamiento de Compra (191 € / mes)
    cursor.execute("""
    SELECT MIN(date) as min_d, ABS(amount) as cuota, COUNT(*) as cnt FROM transactions
    WHERE description LIKE '%CUOTA FRACCIONAR COMPRA%' OR description LIKE '%Cuota Fraccionar Compra%'
    """)
    row_frac = cursor.fetchone()
    if row_frac and row_frac["cnt"] and row_frac["cnt"] > 0:
        cuota = float(row_frac["cuota"] or 191.0)
        cursor.execute("""
        INSERT INTO loans (name, entity, contract_number, initial_principal, interest_rate_pct, monthly_installment, term_months, start_date, match_pattern, account_name, notes, loan_type, financed_item)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "Fraccionamiento Compra Tarjeta",
            "Santander Consumer",
            "FRAC-191",
            round(cuota * 6, 2),
            0.0,
            cuota,
            6,
            row_frac["min_d"] or "2026-07-30",
            "FRACCIONAR COMPRA",
            "Santander Tarjeta (*0871)",
            "Compra fraccionada en tarjeta de crédito. Financiación en cuotas sin intereses.",
            "installment_purchase",
            "Compras Varias en Tarjeta"
        ))

    # 3. Search for Unicaja Crédito Comercio (146.25 € / mes)
    cursor.execute("""
    SELECT MIN(date) as min_d, ABS(amount) as cuota, COUNT(*) as cnt FROM transactions
    WHERE description LIKE '%UNICAJA BANCO S.A. FPV-CREDITO%' OR description LIKE '%Unicaja Banco S.a. Fpv-credito%'
    """)
    row_unicaja = cursor.fetchone()
    if row_unicaja and row_unicaja["cnt"] and row_unicaja["cnt"] > 0:
        cuota = float(row_unicaja["cuota"] or 146.25)
        cursor.execute("""
        INSERT INTO loans (name, entity, contract_number, initial_principal, interest_rate_pct, monthly_installment, term_months, start_date, match_pattern, account_name, notes, loan_type, financed_item)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            "Crédito FPV Unicaja Comercio",
            "Unicaja Banco",
            "991700273155",
            round(cuota * 3, 2), # 3 cuotas de 146.25 = 438.75 €
            0.0,
            cuota,
            3,
            row_unicaja["min_d"] or "2026-08-05",
            "FPV-CREDITO",
            "Santander (*3012)",
            "Recibo de crédito al consumo Unicaja Banco. Compra financiada.",
            "installment_purchase",
            "Financiación Comercio FPV"
        ))

    conn.commit()
    conn.close()

def get_loans_summary(user_id: str = "00000000-0000-0000-0000-000000000000") -> Dict[str, Any]:
    """
    Returns complete dashboard analytics for all active loans and credit facilities.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM loans WHERE user_id = ? ORDER BY id ASC", (user_id,))
    loan_rows = cursor.fetchall()

    loans_data = []
    total_borrowed_global = 0.0
    total_amortized_global = 0.0
    total_interest_fees_global = 0.0
    total_monthly_burden = 0.0

    for l_row in loan_rows:
        l_id = l_row["id"]
        name = l_row["name"]
        entity = l_row["entity"]
        contract_number = l_row["contract_number"] or ""
        initial_principal = float(l_row["initial_principal"] or 0.0)
        interest_rate = float(l_row["interest_rate_pct"] or 0.0)
        monthly_installment = float(l_row["monthly_installment"] or 0.0)
        term_months = int(l_row["term_months"] or 12)
        start_date = l_row["start_date"] or ""
        pattern = (l_row["match_pattern"] or "").strip()
        contract_number = (l_row["contract_number"] or "").strip()
        account_name = l_row["account_name"] or ""
        notes = l_row["notes"] or ""
        loan_type = l_row["loan_type"] or ("loan_disbursement" if ("prestamo" in name.lower() or "préstamo" in name.lower()) else "installment_purchase")
        financed_item = l_row["financed_item"] or ("Vehículo / Coche" if "coche" in name.lower() or "vehículo" in name.lower() else "Compras / Financiación")
        disbursement_tx_id = l_row["disbursement_tx_id"]

        # Find matching transactions (Explicitly linked via loan_id OR matched by non-empty pattern/contract)
        cursor.execute("""
        SELECT id, date, description, amount, category, notes, account, loan_id
        FROM transactions
        WHERE loan_id = ?
        OR (
            loan_id IS NULL
            AND (
                (? != '' AND LENGTH(?) >= 3 AND description LIKE ?)
                OR (? != '' AND LENGTH(?) >= 4 AND description LIKE ?)
            )
        )
        ORDER BY date DESC
        """, (
            l_id,
            pattern, pattern, f"%{pattern}%",
            contract_number, contract_number, f"%{contract_number}%"
        ))
        matching_txs = cursor.fetchall()

        # Categorize matching payments into principal repayment, disbursements, and interest
        amortized_amount = 0.0
        interest_fees_paid = 0.0
        disbursed_amount = 0.0
        payments_history = []

        for tx in matching_txs:
            amt = float(tx["amount"])
            desc = tx["description"].lower()
            tx_data = {
                "id": tx["id"],
                "date": tx["date"],
                "description": tx["description"],
                "amount": amt,
                "account": tx["account"],
                "category": tx["category"],
                "is_manually_linked": bool(tx["loan_id"] == l_id)
            }

            if amt > 0 and ("disposicion" in desc or "disposición" in desc or "prestamo" in desc):
                disbursed_amount += amt
                tx_data["type"] = "disbursement"
            elif "comision" in desc or "comisión" in desc or "interes" in desc or "interés" in desc:
                interest_fees_paid += abs(amt)
                tx_data["type"] = "interest_fee"
            elif abs(amt) <= 10.0 and "liquidacion periodica" in desc:
                # Small periodic settlement (e.g. 2.31 € interest settlement)
                interest_fees_paid += abs(amt)
                tx_data["type"] = "interest_fee"
            else:
                amortized_amount += abs(amt)
                tx_data["type"] = "amortization"

            payments_history.append(tx_data)

        # Strictly respect user-defined initial_principal if set > 0
        effective_principal = initial_principal
        if effective_principal <= 0:
            if disbursed_amount > 0:
                effective_principal = disbursed_amount
            elif monthly_installment > 0 and term_months > 0:
                effective_principal = round(monthly_installment * term_months, 2)
            elif amortized_amount > 0:
                effective_principal = round(amortized_amount, 2)

        # French installment strictly calculated based on TIN and principal/term
        french_installment = compute_monthly_installment(effective_principal, interest_rate, term_months)
        if interest_rate > 0 or monthly_installment <= 0:
            monthly_installment = french_installment

        outstanding_balance = max(0.0, round(effective_principal - amortized_amount, 2))
        progress_pct = round((amortized_amount / effective_principal) * 100, 1) if effective_principal > 0 else 0.0

        # Estimated months remaining
        regular_amortizations_count = len([p for p in payments_history if p["type"] == "amortization"])
        if outstanding_balance <= 0:
            months_remaining = 0
        elif amortized_amount <= 0 or regular_amortizations_count == 0:
            months_remaining = term_months
        else:
            r_mo = (interest_rate / 100.0) / 12.0
            if r_mo > 0 and monthly_installment > (r_mo * outstanding_balance):
                import math
                ratio = 1.0 - (r_mo * outstanding_balance / monthly_installment)
                if ratio > 0:
                    computed_m = math.ceil(-math.log(ratio) / math.log(1.0 + r_mo))
                    months_remaining = max(1, min(term_months, int(computed_m)))
                else:
                    months_remaining = max(0, term_months - regular_amortizations_count)
            elif monthly_installment > 0:
                import math
                months_remaining = max(1, min(term_months, int(math.ceil(outstanding_balance / monthly_installment))))
            else:
                months_remaining = max(0, term_months - regular_amortizations_count)

        # Compute original contract end date and projected completion date
        end_date = ""
        projected_end_date = ""
        try:
            if start_date:
                s_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
                m_end = s_dt.month + term_months
                y_end = s_dt.year + (m_end - 1) // 12
                m_end = ((m_end - 1) % 12) + 1
                d_end = min(s_dt.day, 28)
                end_date = datetime(y_end, m_end, d_end).strftime("%Y-%m-%d")

                if outstanding_balance <= 0:
                    last_pay = max([p["date"] for p in payments_history]) if payments_history else end_date
                    projected_end_date = last_pay
                elif months_remaining >= term_months:
                    projected_end_date = end_date
                else:
                    now_dt = datetime.now()
                    p_m_end = now_dt.month + months_remaining
                    p_y_end = now_dt.year + (p_m_end - 1) // 12
                    p_m_end = ((p_m_end - 1) % 12) + 1
                    p_d_end = min(now_dt.day, 28)
                    projected_end_date = datetime(p_y_end, p_m_end, p_d_end).strftime("%Y-%m-%d")
        except Exception:
            pass

        # French Amortization Schedule
        schedule = calculate_french_schedule(effective_principal, interest_rate, term_months, start_date)

        total_repayable = round(monthly_installment * term_months, 2)
        total_interest_expected = round(max(0.0, total_repayable - effective_principal), 2)

        total_borrowed_global += effective_principal
        total_amortized_global += amortized_amount
        total_interest_fees_global += interest_fees_paid
        if outstanding_balance > 0:
            total_monthly_burden += monthly_installment

        loans_data.append({
            "id": l_id,
            "name": name,
            "entity": entity,
            "contract_number": contract_number,
            "loan_type": loan_type,
            "financed_item": financed_item,
            "disbursement_tx_id": disbursement_tx_id,
            "initial_principal": effective_principal,
            "amortized_amount": round(amortized_amount, 2),
            "outstanding_balance": outstanding_balance,
            "interest_rate_pct": interest_rate,
            "monthly_installment": monthly_installment,
            "term_months": term_months,
            "months_remaining": months_remaining,
            "progress_pct": min(100.0, progress_pct),
            "start_date": start_date,
            "end_date": end_date,
            "projected_end_date": projected_end_date,
            "account_name": account_name,
            "notes": notes,
            "total_repayable": total_repayable,
            "total_interest_expected": total_interest_expected,
            "payments_count": len(payments_history),
            "payments_history": payments_history,
            "amortization_schedule": schedule,
            "total_interest_fees_paid": round(interest_fees_paid, 2)
        })

    # Search for unlinked positive credit/loan disbursements in transactions
    cursor.execute("""
    SELECT id, date, account, description, amount FROM transactions
    WHERE amount > 0 AND (
        category = 'Deudas y créditos'
        OR description LIKE '%prestamo%'
        OR description LIKE '%préstamo%'
        OR description LIKE '%disposicion%'
        OR description LIKE '%disposición%'
    )
    ORDER BY date DESC
    """)
    candidate_disbursements = cursor.fetchall()

    cursor.execute("SELECT disbursement_tx_id, match_pattern, contract_number FROM loans")
    loan_refs = cursor.fetchall()
    linked_tx_ids = {lr["disbursement_tx_id"] for lr in loan_refs if lr["disbursement_tx_id"]}
    known_patterns = [lr["match_pattern"].lower() for lr in loan_refs if lr["match_pattern"]] + \
                     [lr["contract_number"].lower() for lr in loan_refs if lr["contract_number"]]

    unlinked_disbursements = []
    for cd in candidate_disbursements:
        cid = cd["id"]
        cdesc = (cd["description"] or "").lower()
        if cid in linked_tx_ids:
            continue
        if any(p in cdesc for p in known_patterns if len(p) >= 4):
            continue
        unlinked_disbursements.append({
            "id": cd["id"],
            "date": cd["date"],
            "account": cd["account"],
            "description": cd["description"],
            "amount": round(float(cd["amount"]), 2)
        })

    conn.close()

    return {
        "global_kpis": {
            "total_borrowed": round(total_borrowed_global, 2),
            "total_amortized": round(total_amortized_global, 2),
            "outstanding_debt": round(total_borrowed_global - total_amortized_global, 2),
            "total_interest_fees": round(total_interest_fees_global, 2),
            "monthly_burden": round(total_monthly_burden, 2),
            "active_loans_count": len([l for l in loans_data if l["outstanding_balance"] > 0]),
            "global_progress_pct": round((total_amortized_global / total_borrowed_global * 100), 1) if total_borrowed_global > 0 else 0.0
        },
        "loans": loans_data,
        "unlinked_disbursements": unlinked_disbursements
    }
