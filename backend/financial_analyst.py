"""
Financial Intelligence and Analytics Engine for Diego Hernández's Bank Agent.
Provides multi-month aggregation, recurring subscription detection, merchant analysis,
reimbursement tracking, and emergency fund / investment capacity calculations.
"""

import sqlite3
import unicodedata
from datetime import datetime
from collections import defaultdict
from typing import Dict, Any, List, Optional, Tuple
from backend.database import get_connection
from backend.portfolio import get_portfolio_summary

def strip_accents(text: str) -> str:
    """Removes accents and converts to uppercase for robust matching."""
    if not text:
        return ""
    nfkd = unicodedata.normalize('NFKD', text)
    return "".join([c for c in nfkd if not unicodedata.combining(c)]).upper()

def get_multi_month_trends() -> List[Dict[str, Any]]:
    """
    Computes a 6-month historical overview of income, personal expenses,
    reimbursable company outlays, and net savings rate.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN amount > 0 AND category = 'Sueldo' THEN amount ELSE 0 END) as salary,
        SUM(CASE WHEN amount > 0 AND category NOT IN ('Sueldo', 'Gastos de Empresa', 'Traspaso entre cuentas', 'Liquidación Tarjetas', 'Deudas y créditos') AND description NOT LIKE '%reembolso%' THEN amount ELSE 0 END) as other_income,
        SUM(CASE WHEN amount < 0 AND is_reimbursable = 0 AND category NOT IN ('Deudas y créditos', 'Inversiones y ahorros', 'Liquidación Tarjetas', 'Traspaso entre cuentas') THEN ABS(amount) ELSE 0 END) as personal_expenses,
        SUM(CASE WHEN amount < 0 AND is_reimbursable = 1 THEN ABS(amount) ELSE 0 END) as reimbursable_outlay,
        SUM(CASE WHEN amount > 0 AND (category = 'Gastos de Empresa' OR description LIKE '%reembolso%') THEN amount ELSE 0 END) as reimbursements_received,
        SUM(CASE WHEN category = 'Inversiones y ahorros' AND amount < 0 THEN ABS(amount) ELSE 0 END) as investments,
        SUM(CASE WHEN category IN ('Liquidación Tarjetas', 'Deudas y créditos') AND amount < 0 THEN ABS(amount) ELSE 0 END) as card_settlements,
        SUM(CASE WHEN category = 'Traspaso entre cuentas' AND amount < 0 THEN ABS(amount) ELSE 0 END) as internal_transfers,
        COUNT(*) as total_txs
    FROM transactions
    GROUP BY month
    ORDER BY month ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    trends = []
    for r in rows:
        month = r[0]
        salary = round(r[1] or 0.0, 2)
        other_inc = round(r[2] or 0.0, 2)
        total_income = round(salary + other_inc, 2)
        personal_exp = round(r[3] or 0.0, 2)
        reimb_outlay = round(r[4] or 0.0, 2)
        reimb_received = round(r[5] or 0.0, 2)
        investments = round(r[6] or 0.0, 2)
        card_settlements = round(r[7] or 0.0, 2)
        internal_transfers = round(r[8] or 0.0, 2)
        tx_count = r[9]

        # Net savings = (Salary + Other Income) - Personal Expenses
        net_savings = round(total_income - personal_exp, 2)
        savings_rate = round((net_savings / total_income * 100) if total_income > 0 else 0.0, 1)

        trends.append({
            "month": month,
            "salary": salary,
            "other_income": other_inc,
            "total_income": total_income,
            "personal_expenses": personal_exp,
            "reimbursable_outlay": reimb_outlay,
            "reimbursements_received": reimb_received,
            "investments": investments,
            "card_settlements": card_settlements,
            "internal_transfers": internal_transfers,
            "net_savings": net_savings,
            "savings_rate": savings_rate,
            "tx_count": tx_count
        })

    return trends

def get_category_matrix() -> Dict[str, Any]:
    """
    Computes a month-over-month category breakdown matrix.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT 
        category,
        strftime('%Y-%m', date) as month,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE -amount END) as total_spent,
        COUNT(*) as count
    FROM transactions
    WHERE is_reimbursable = 0 
      AND category NOT IN ('Deudas y créditos', 'Prestamos familiares', 'Inversiones y ahorros', 'Liquidación Tarjetas', 'Traspaso entre cuentas', 'Sueldo', 'Ingresos / Nómina', 'Otros ingresos', 'Gastos de Empresa')
    GROUP BY category, month
    ORDER BY category, month
    """)
    rows = cursor.fetchall()
    conn.close()

    months = sorted(list(set(r[1] for r in rows)))
    matrix = defaultdict(lambda: {m: 0.0 for m in months})
    cat_totals = defaultdict(float)

    for cat, month, spent, _ in rows:
        matrix[cat][month] = round(spent, 2)
        cat_totals[cat] += spent

    sorted_categories = sorted(cat_totals.items(), key=lambda x: x[1], reverse=True)

    result = []
    for cat, total in sorted_categories:
        avg_monthly = total / len(months) if months else 0.0
        result.append({
            "category": cat,
            "total": round(total, 2),
            "monthly_average": round(avg_monthly, 2),
            "by_month": {m: matrix[cat][m] for m in months}
        })

    return {"months": months, "categories": result}

def get_monthly_balance_matrix() -> Dict[str, Any]:
    """
    Computes a complete spreadsheet-style (Excel / Notion) financial balance matrix.
    Includes:
      1. Income (Sueldo BMC, Otros Ingresos, Total)
      2. Real Personal Expenses by Category (net of Bizum repayments, no double-counting)
      3. Credit Card Settlements (Iberia Cards, Amex, Santander - deduplicated, informative)
      4. Reimbursable Work Expenses (BMC)
      5. Results & Net Worth Progression
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT DISTINCT substr(date, 1, 7) as m FROM transactions ORDER BY m ASC")
    months = [r[0] for r in cursor.fetchall() if r[0]]
    if not months:
        conn.close()
        return {
            "months": [],
            "income": {
                "rows": [],
                "total": {"name": "Total Ingresos", "by_month": {}, "total": 0.0, "average": 0.0}
            },
            "personal_expenses": {
                "rows": [],
                "total": {"name": "Total Gastos Personales", "by_month": {}, "total": 0.0, "average": 0.0}
            },
            "card_settlements": {
                "rows": [],
                "total": {"name": "Total Liquidaciones Tarjetas", "by_month": {}, "total": 0.0, "average": 0.0}
            },
            "internal_transfers": {
                "rows": [],
                "total": {"name": "Total Traspasos Entre Cuentas", "by_month": {}, "total": 0.0, "average": 0.0}
            },
            "company_reimbursements": {
                "has_data": False,
                "outlays": {"name": "Gastos Reembolsables Pagados", "by_month": {}, "total": 0.0},
                "received": {"name": "Reembolsos Cobrados", "by_month": {}, "total": 0.0}
            },
            "results": {
                "net_savings": {"name": "Ahorro Neto Real", "by_month": {}, "total": 0.0, "average": 0.0},
                "savings_rate": {"name": "Tasa de Ahorro (%)", "by_month": {}, "average": 0.0},
                "wealth_evolution": []
            }
        }

    # 1. Income rows (strictly true income, never Bizums repaying dinner/expenses)
    cursor.execute("""
    SELECT 
        CASE 
            WHEN category = 'Sueldo' THEN 'Nómina / Salario'
            WHEN category = 'Impuestos y tasas' THEN 'Devoluciones Tributarias / Hacienda'
            WHEN category = 'Otros ingresos' THEN 'Otros Ingresos'
            ELSE 'Otros Ingresos'
        END as inc_type,
        substr(date, 1, 7) as m,
        SUM(amount)
    FROM transactions
    WHERE amount > 0 
      AND category IN ('Sueldo', 'Ingresos / Nómina', 'Otros ingresos', 'Impuestos y tasas')
      AND is_reimbursable = 0
    GROUP BY inc_type, m
    """)
    inc_rows = cursor.fetchall()

    income_by_type = defaultdict(lambda: {m: 0.0 for m in months})
    for itype, m, val in inc_rows:
        income_by_type[itype][m] = round(val or 0.0, 2)

    total_income_by_month = {m: sum(income_by_type[it][m] for it in income_by_type) for m in months}
    
    income_rows = []
    # Prioritize Nómina first, then others, only if total > 0
    ordered_inc_types = ["Nómina / Salario", "Devoluciones Tributarias / Hacienda", "Otros Ingresos"]
    for itype in ordered_inc_types:
        if itype in income_by_type:
            m_vals = income_by_type[itype]
            tot = sum(m_vals.values())
            if tot > 0:
                income_rows.append({
                    "name": itype,
                    "by_month": m_vals,
                    "total": round(tot, 2),
                    "average": round(tot / len(months), 2)
                })

    tot_inc_sum = sum(total_income_by_month.values())
    total_income_row = {
        "name": "Total Ingresos",
        "by_month": {m: round(total_income_by_month[m], 2) for m in months},
        "total": round(tot_inc_sum, 2),
        "average": round(tot_inc_sum / len(months), 2)
    }

    # 2. Personal Consumption Expenses (net of Bizum repayments and returns)
    cursor.execute("""
    SELECT 
        category,
        substr(date, 1, 7) as m,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE -amount END)
    FROM transactions
    WHERE is_reimbursable = 0 
      AND category NOT IN ('Liquidación Tarjetas', 'Inversiones y ahorros', 'Deudas y créditos', 'Prestamos familiares', 'Traspaso entre cuentas', 'Sueldo', 'Ingresos / Nómina', 'Otros ingresos', 'Gastos de Empresa')
    GROUP BY category, m
    """)
    exp_rows = cursor.fetchall()

    exp_by_cat = defaultdict(lambda: {m: 0.0 for m in months})
    cat_grand_totals = defaultdict(float)
    for cat, m, val in exp_rows:
        val_rounded = round(max(0.0, val or 0.0), 2)
        exp_by_cat[cat][m] = val_rounded
        cat_grand_totals[cat] += val_rounded

    total_exp_by_month = {m: sum(exp_by_cat[c][m] for c in exp_by_cat) for m in months}
    tot_exp_sum = sum(total_exp_by_month.values())

    expense_rows = []
    for cat, tot in sorted(cat_grand_totals.items(), key=lambda x: x[1], reverse=True):
        if tot > 0:
            m_vals = exp_by_cat[cat]
            expense_rows.append({
                "name": cat,
                "category": cat,
                "by_month": m_vals,
                "total": round(tot, 2),
                "average": round(tot / len(months), 2),
                "percentage": round((tot / tot_exp_sum * 100) if tot_exp_sum > 0 else 0.0, 1)
            })

    total_expense_row = {
        "name": "Total Gastos Personales",
        "by_month": {m: round(total_exp_by_month[m], 2) for m in months},
        "total": round(tot_exp_sum, 2),
        "average": round(tot_exp_sum / len(months), 2)
    }

    # 3. Credit Card Settlements (Recibos domiciliados mensuales - deduplicado)
    cursor.execute("""
    SELECT 
        CASE 
            WHEN description LIKE '%IBERIA CARDS%' OR description LIKE '%2366%' THEN 'Recibos Tarjeta Iberia Cards (*2366)'
            WHEN description LIKE '%AMERICAN EXPRESS%' OR description LIKE '%AMEX%' THEN 'Recibos Tarjeta American Express'
            ELSE 'Liquidación Tarjetas Santander (*3012)'
        END as card_provider,
        substr(date, 1, 7) as m,
        SUM(ABS(amount))
    FROM transactions
    WHERE category = 'Liquidación Tarjetas' AND amount < 0
    GROUP BY card_provider, m
    """)
    card_rows = cursor.fetchall()

    card_by_prov = defaultdict(lambda: {m: 0.0 for m in months})
    for prov, m, val in card_rows:
        card_by_prov[prov][m] = round(val or 0.0, 2)

    total_cards_by_month = {m: sum(card_by_prov[p][m] for p in card_by_prov) for m in months}
    tot_cards_sum = sum(total_cards_by_month.values())

    card_rows_list = []
    for prov in sorted(card_by_prov.keys()):
        m_vals = card_by_prov[prov]
        tot = sum(m_vals.values())
        if tot > 0:
            card_rows_list.append({
                "name": prov,
                "by_month": m_vals,
                "total": round(tot, 2),
                "average": round(tot / len(months), 2)
            })

    total_cards_row = {
        "name": "Total Recibos Tarjetas Domiciliados",
        "by_month": {m: round(total_cards_by_month[m], 2) for m in months},
        "total": round(tot_cards_sum, 2),
        "average": round(tot_cards_sum / len(months), 2),
        "note": "Recibos domiciliados cargados en cuenta 3012. Excluidos del gasto de consumo personal para evitar duplicar las compras de los extractos."
    }

    # 4. Traspasos entre cuentas y envíos a Amex (Informativo, 0 impacto en gasto personal)
    cursor.execute("""
    SELECT 
        CASE 
            WHEN description LIKE '%AMERICAN EXPRESS%' OR description LIKE '%AMEX%' THEN 'Traspasos / Transferencias a Amex'
            WHEN description LIKE '%1842%' OR description LIKE '%AHORRO%' THEN 'Traspasos Cuentas Propias (Santander *1842 Ahorro)'
            WHEN description LIKE '%N26%' THEN 'Traspasos N26'
            ELSE 'Traspasos Cuentas Propias'
        END as tr_type,
        substr(date, 1, 7) as m,
        SUM(ABS(amount))
    FROM transactions
    WHERE category = 'Traspaso entre cuentas' AND amount < 0
    GROUP BY tr_type, m
    """)
    tr_rows = cursor.fetchall()
    tr_by_type = defaultdict(lambda: {m: 0.0 for m in months})
    for trt, m, val in tr_rows:
        tr_by_type[trt][m] = round(val or 0.0, 2)

    total_tr_by_month = {m: sum(tr_by_type[t][m] for t in tr_by_type) for m in months}
    tot_tr_sum = sum(total_tr_by_month.values())

    transfer_rows_list = []
    for trt in sorted(tr_by_type.keys()):
        m_vals = tr_by_type[trt]
        tot = sum(m_vals.values())
        if tot > 0:
            transfer_rows_list.append({
                "name": trt,
                "by_month": m_vals,
                "total": round(tot, 2),
                "average": round(tot / len(months), 2)
            })

    total_transfers_row = {
        "name": "Total Traspasos Entre Cuentas / Amex",
        "by_month": {m: round(total_tr_by_month[m], 2) for m in months},
        "total": round(tot_tr_sum, 2),
        "average": round(tot_tr_sum / len(months), 2),
        "note": "Movimientos de liquidez interna entre tus cuentas o enviados a American Express. 0 impacto en gasto ni en ingresos."
    }

    # 5. Reimbursable Work Expenses (if any)
    cursor.execute("""
    SELECT 
        substr(date, 1, 7) as m,
        SUM(CASE WHEN is_reimbursable = 1 AND amount < 0 THEN ABS(amount) ELSE 0 END) as outlays,
        SUM(CASE WHEN amount > 0 AND (category = 'Gastos de Empresa' OR description LIKE '%reembolso%') THEN amount ELSE 0 END) as received
    FROM transactions
    GROUP BY m
    """)
    reimb_m_rows = cursor.fetchall()
    reimb_outlays_by_m = {m: 0.0 for m in months}
    reimb_rcvd_by_m = {m: 0.0 for m in months}
    for m, out, rcv in reimb_m_rows:
        if m in reimb_outlays_by_m:
            reimb_outlays_by_m[m] = round(out or 0.0, 2)
            reimb_rcvd_by_m[m] = round(rcv or 0.0, 2)

    tot_reimb_outlays = round(sum(reimb_outlays_by_m.values()), 2)
    tot_reimb_received = round(sum(reimb_rcvd_by_m.values()), 2)

    # 6. Net Savings & Wealth Evolution
    net_savings_by_month = {}
    savings_rate_by_month = {}
    cumulative = 0.0
    wealth_evolution = []

    # Get investments / savings transferred (strictly from transactions)
    cursor.execute("""
    SELECT substr(date, 1, 7) as m, SUM(ABS(amount))
    FROM transactions
    WHERE category = 'Inversiones y ahorros' AND amount < 0
    GROUP BY m
    """)
    inv_by_m = {m: 0.0 for m in months}
    for m, val in cursor.fetchall():
        if m in inv_by_m:
            inv_by_m[m] = round(val or 0.0, 2)

    conn.close()

    for m in months:
        inc = total_income_by_month[m]
        exp = total_exp_by_month[m]
        sav = inc - exp
        rate = round((sav / inc * 100) if inc > 0 else 0.0, 1)
        cumulative += sav

        net_savings_by_month[m] = round(sav, 2)
        savings_rate_by_month[m] = rate
        wealth_evolution.append({
            "month": m,
            "income": round(inc, 2),
            "expenses": round(exp, 2),
            "net_savings": round(sav, 2),
            "savings_rate": rate,
            "investments": round(inv_by_m[m], 2),
            "cumulative_savings": round(cumulative, 2)
        })

    tot_sav = sum(net_savings_by_month.values())
    avg_rate = round(sum(savings_rate_by_month.values()) / len(months), 1)
    tot_inv = round(sum(inv_by_m.values()), 2)

    results_dict = {
        "net_savings": {
            "name": "Ahorro Neto Personal (Ingresos - Gastos)",
            "by_month": net_savings_by_month,
            "total": round(tot_sav, 2),
            "average": round(tot_sav / len(months), 2)
        },
        "savings_rate": {
            "name": "Tasa de Ahorro (%)",
            "by_month": savings_rate_by_month,
            "average": avg_rate
        },
        "wealth_evolution": wealth_evolution
    }

    if tot_inv > 0:
        results_dict["investments"] = {
            "name": "Inversiones y Fondos de Ahorro",
            "by_month": inv_by_m,
            "total": tot_inv,
            "average": round(tot_inv / len(months), 2)
        }

    return {
        "months": months,
        "income": {
            "rows": income_rows,
            "total": total_income_row
        },
        "personal_expenses": {
            "rows": expense_rows,
            "total": total_expense_row
        },
        "card_settlements": {
            "rows": card_rows_list,
            "total": total_cards_row
        },
        "internal_transfers": {
            "rows": transfer_rows_list,
            "total": total_transfers_row
        },
        "company_reimbursements": {
            "has_data": (tot_reimb_outlays > 0 or tot_reimb_received > 0),
            "outlays": {
                "name": "Gastos Reembolsables Adelantados",
                "by_month": reimb_outlays_by_m,
                "total": tot_reimb_outlays
            },
            "received": {
                "name": "Reembolsos Cobrados",
                "by_month": reimb_rcvd_by_m,
                "total": tot_reimb_received
            }
        },
        "results": results_dict
    }


def canonical_merchant(desc: str) -> Tuple[str, str]:
    """Normalizes descriptions into clear merchant names and category groups."""
    d = strip_accents(desc)
    
    if "AGUSTIN" in d and ("FUENTE" in d or "ALQUILER" in d):
        return "Alquiler Piso (Agustín De La Fuente)", "Vivienda Fija"
    if "ALCAMPO" in d:
        return "Alcampo", "Supermercados"
    if "MERCADONA" in d:
        return "Mercadona", "Supermercados"
    if "CARREFOUR" in d:
        return "Carrefour", "Supermercados"
    if "UBER *ONE" in d or "UBER.COM" in d:
        return "Uber One Suscripción", "Suscripciones Digitales"
    if "UBER" in d:
        return "Uber / Uber Eats", "Transporte & Ocio"
    if "GLOVO" in d:
        return "Glovo Delivery", "Restauración & Delivery"
    if "GO FIT" in d or "GOFIT" in d:
        return "Go Fit Gimnasio", "Deporte & Salud"
    if "FUENCARRAL" in d and ("PADEL" in d or "TENIS" in d):
        return "Club Pádel & Tenis Fuencarral", "Deporte & Salud"
    if "PLAYTOMIC" in d:
        return "Playtomic Pádel", "Deporte & Salud"
    if "LEGALITAS" in d:
        return "Legalitas Asistencia Legal", "Servicios Legales"
    if "APPLE" in d:
        return "Apple (iCloud / Apps)", "Suscripciones Digitales"
    if "PLAYSTATION" in d or "SONY" in d:
        return "PlayStation Network", "Entretenimiento Digital"
    if "SPOTIFY" in d:
        return "Spotify", "Suscripciones Digitales"
    if "NETFLIX" in d:
        return "Netflix", "Suscripciones Digitales"
    if "BARBERIA" in d:
        return "Barbería Cuidado Personal", "Cuidado Personal"
    if "ENDESA" in d:
        return "Endesa Suministros (Luz)", "Suministros Vivienda"
    if "REPSOL" in d:
        return "Repsol Gasolinera", "Gasolina & Transporte"
    if "CEPSA" in d:
        return "Cepsa Gasolinera", "Gasolina & Transporte"
    if "IBERIA CARDS" in d:
        return "Tarjeta Iberia Cards", "Tarjetas & Deudas"
    if "AMERICAN EXPRESS" in d or "AMEX" in d:
        return "Tarjeta American Express", "Tarjetas & Deudas"
    if "LIQUIDACION DE LAS TARJETAS" in d:
        return "Liquidación Tarjetas Santander", "Tarjetas & Deudas"
    if "CAJERO" in d or "EFECTIVO" in d:
        return "Retirada Efectivo Cajero", "Efectivo"
    if "GASTOS COMUNES PISO" in d:
        return "Gastos Comunes Piso", "Gastos Vivienda"
    if "INVERSION" in d or "INVERSION" in d:
        return "Aportación Inversión / Ahorro", "Inversión & Ahorro"
    if "AHORRO COCHE" in d:
        return "Ahorro Coche", "Ahorro"
    if "MAMA" in d:
        return "Familia (Mamá)", "Préstamos Familiares"
    if "ELISA TCACH" in d:
        return "Elisa Tcach (Familia)", "Préstamos Familiares"
    
    # Generic cleanup
    clean = desc
    for p in ["COMPRA EN ", "RECIBO DE ", "PAGO EN ", "BIZUM A FAVOR DE ", "TRANSFERENCIA INMEDIATA A FAVOR DE ", "TRANSFERENCIA A FAVOR DE ", "TARJETA DEBITO ", "PAGO MOVIL EN "]:
        if clean.upper().startswith(p):
            clean = clean[len(p):]
    clean = clean.split(',')[0].split(' CONCEPTO')[0].strip()
    return clean[:30].title(), "Otros"

def detect_recurring_subscriptions() -> List[Dict[str, Any]]:
    """
    Detects recurring fixed expenses and subscriptions based on cadence,
    frequency across multiple months, and typical merchant names.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT date, description, raw_description, amount, category 
    FROM transactions 
    WHERE amount < 0 AND category NOT IN ('Deudas y créditos', 'Liquidación Tarjetas', 'Traspaso entre cuentas')
    ORDER BY date ASC
    """)
    rows = cursor.fetchall()
    conn.close()

    grouped = defaultdict(list)
    for dt, desc, raw, amt, cat in rows:
        canonical, sub_type = canonical_merchant(desc or raw or "")
        grouped[(canonical, sub_type)].append((dt, abs(amt), cat))

    subscriptions = []
    for (name, sub_type), items in grouped.items():
        months = sorted(list(set(item[0][:7] for item in items)))
        # Filter for recurring: appears in at least 2 distinct months or at least 3 occurrences
        if len(months) >= 2 or len(items) >= 3:
            total_spent = sum(item[1] for item in items)
            avg_amount = total_spent / len(items)
            category = items[0][2]

            subscriptions.append({
                "name": name,
                "type": sub_type,
                "category": category,
                "occurrences": len(items),
                "months_count": len(months),
                "months": months,
                "average_amount": round(avg_amount, 2),
                "total_amount": round(total_spent, 2),
                "estimated_monthly_cost": round(avg_amount if len(months) >= 2 else (total_spent / max(1, len(months))), 2)
            })

    subscriptions.sort(key=lambda x: x["total_amount"], reverse=True)
    return subscriptions

def get_top_merchants(limit: int = 15) -> List[Dict[str, Any]]:
    """
    Ranks top payees and merchants by total spend across personal categories.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT description, amount, category, date
    FROM transactions
    WHERE amount < 0 AND is_reimbursable = 0 AND category NOT IN ('Deudas y créditos', 'Inversiones y ahorros', 'Liquidación Tarjetas', 'Traspaso entre cuentas')
    """)
    rows = cursor.fetchall()
    conn.close()

    merchants = defaultdict(lambda: {"count": 0, "total": 0.0, "category_group": "", "categories": set()})

    for desc, amt, cat, dt in rows:
        m_name, group = canonical_merchant(desc or "")
        merchants[m_name]["count"] += 1
        merchants[m_name]["total"] += abs(amt)
        merchants[m_name]["category_group"] = group
        merchants[m_name]["categories"].add(cat)

    sorted_m = sorted(merchants.items(), key=lambda x: x[1]["total"], reverse=True)

    result = []
    for name, data in sorted_m[:limit]:
        result.append({
            "name": name,
            "group": data["category_group"],
            "count": data["count"],
            "total": round(data["total"], 2),
            "average": round(data["total"] / data["count"], 2),
            "categories": list(data["categories"])
        })

    return result

def get_reimbursement_audit() -> Dict[str, Any]:
    """
    Audits reimbursable work expenses (BMC Software): pending items, amounts recovered,
    and net balance awaiting reimbursement.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Pending outlays
    cursor.execute("""
    SELECT id, date, account, description, amount, notes
    FROM transactions
    WHERE is_reimbursable = 1 AND reimbursement_status = 'pending'
    ORDER BY date DESC
    """)
    pending_rows = cursor.fetchall()

    # Reimbursed or resolved outlays
    cursor.execute("""
    SELECT SUM(ABS(amount))
    FROM transactions
    WHERE is_reimbursable = 1 AND reimbursement_status = 'reimbursed'
    """)
    reimbursed_total = cursor.fetchone()[0] or 0.0

    # Inflows marked as work reimbursement
    cursor.execute("""
    SELECT SUM(amount)
    FROM transactions
    WHERE amount > 0 AND (category = 'Gastos de Empresa' OR description LIKE '%reembolso%')
    """)
    received_total = cursor.fetchone()[0] or 0.0

    conn.close()

    pending_items = []
    pending_total = 0.0
    for r in pending_rows:
        amt = abs(r[4])
        pending_total += amt
        pending_items.append({
            "id": r[0],
            "date": r[1],
            "account": r[2],
            "description": r[3],
            "amount": round(amt, 2),
            "notes": r[5] or ""
        })

    return {
        "pending_total": round(pending_total, 2),
        "pending_count": len(pending_items),
        "pending_items": pending_items,
        "reimbursed_total": round(reimbursed_total, 2),
        "received_inflows_total": round(received_total, 2),
        "net_pending_recovery": round(pending_total, 2)
    }

def get_financial_health_and_emergency_fund() -> Dict[str, Any]:
    """
    Calculates Diego's liquid emergency buffer in months of average burn rate,
    and recommends a safe monthly contribution amount to the MSCI World fund.
    """
    portfolio = get_portfolio_summary()
    liquid_cash = portfolio.get("liquid_cash", 0.0)

    trends = get_multi_month_trends()
    if trends:
        avg_burn = sum(t["personal_expenses"] for t in trends) / len(trends)
        avg_income = sum(t["total_income"] for t in trends) / len(trends)
        avg_savings = sum(t["net_savings"] for t in trends) / len(trends)
    else:
        avg_burn = 2500.0
        avg_income = 3200.0
        avg_savings = 700.0

    emergency_months = (liquid_cash / avg_burn) if avg_burn > 0 else 0.0

    target_buffer_3m = avg_burn * 3
    target_buffer_6m = avg_burn * 6

    # Recommended MSCI monthly allocation: 40-50% of monthly average savings, minimum 200€
    recommended_msci_monthly = max(200.0, round((avg_savings * 0.45) / 50) * 50)

    return {
        "liquid_cash": round(liquid_cash, 2),
        "avg_monthly_burn": round(avg_burn, 2),
        "avg_monthly_income": round(avg_income, 2),
        "avg_monthly_savings": round(avg_savings, 2),
        "emergency_buffer_months": round(emergency_months, 1),
        "target_buffer_3m": round(target_buffer_3m, 2),
        "target_buffer_6m": round(target_buffer_6m, 2),
        "recommended_msci_monthly": round(recommended_msci_monthly, 2),
        "msci_current_value": round(portfolio.get("fund", {}).get("total_value_eur", 0.0), 2),
        "stocks_current_value": round(portfolio.get("stocks", {}).get("total_value_eur", 0.0), 2),
        "capital_global": round(portfolio.get("capital_global", 0.0), 2)
    }

def search_transactions(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    """
    Search transactions by merchant, description, category or account.
    """
    conn = get_connection()
    cursor = conn.cursor()

    pattern = f"%{query}%"
    cursor.execute("""
    SELECT date, account, description, amount, category, is_reimbursable
    FROM transactions
    WHERE description LIKE ? OR category LIKE ? OR account LIKE ?
    ORDER BY date DESC
    LIMIT ?
    """, (pattern, pattern, pattern, limit))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        results.append({
            "date": r[0],
            "account": r[1],
            "description": r[2],
            "amount": round(r[3], 2),
            "category": r[4],
            "is_reimbursable": bool(r[5])
        })
    return results

def get_day_of_week_analysis(month: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    query = """
    SELECT 
        strftime('%w', date) as dow,
        COUNT(*) as tx_count,
        SUM(CASE WHEN amount < 0 AND is_reimbursable = 0 AND category NOT IN ('Deudas y créditos', 'Inversiones y ahorros', 'Liquidación Tarjetas', 'Traspaso entre cuentas') THEN ABS(amount) ELSE 0 END) as total_spent
    FROM transactions
    WHERE 1=1
    """
    params = []
    if month and month != "all":
        query += " AND date LIKE ?"
        params.append(f"{month}%")
    query += " GROUP BY dow ORDER BY dow ASC"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    day_names = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    day_short = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    res_map = {str(i): {"count": 0, "spent": 0.0} for i in range(7)}
    for dow_str, cnt, spent in rows:
        if dow_str in res_map:
            res_map[dow_str]["count"] = cnt
            res_map[dow_str]["spent"] = round(spent or 0.0, 2)

    ordered_indices = [1, 2, 3, 4, 5, 6, 0] # Lunes a Domingo
    total_week_spent = sum(res_map[str(i)]["spent"] for i in range(7))
    result = []
    for idx in ordered_indices:
        val = res_map[str(idx)]
        spent = val["spent"]
        pct = round((spent / total_week_spent * 100) if total_week_spent > 0 else 0.0, 1)
        result.append({
            "day_index": idx,
            "day_name": day_names[idx],
            "day_short": day_short[idx],
            "is_weekend": idx in [6, 0],
            "tx_count": val["count"],
            "total_spent": spent,
            "percentage": pct
        })
    return result

def get_budget_50_30_20(month: Optional[str] = None) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
    SELECT category, amount, is_reimbursable
    FROM transactions
    WHERE 1=1
    """
    params = []
    if month and month != "all":
        query += " AND date LIKE ?"
        params.append(f"{month}%")
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    needs_cats = {"Vivienda", "Gastos Vivienda", "Alimentación", "Gasolina", "Coche", "Servicios/Suscripciones", "Salud/Farmacia", "Salud/Farmancia", "Educación", "Impuestos y tasas"}
    wants_cats = {"Restaurantes", "Parking/Peajes/Ubers", "Entretenimiento", "Gastos Viajes", "Vuelos", "Compra Ropa", "Deporte/Gimnasio", "Otras compras", "Prestamos familiares"}

    total_income = 0.0
    needs_spent = 0.0
    wants_spent = 0.0
    savings_transferred = 0.0

    for cat, amt, is_reimb in rows:
        if is_reimb == 1:
            continue
        if amt > 0:
            if cat in ["Sueldo", "Ingresos / Nómina", "Otros ingresos"]:
                total_income += amt
        else:
            abs_amt = abs(amt)
            if cat in needs_cats:
                needs_spent += abs_amt
            elif cat in wants_cats:
                wants_spent += abs_amt
            elif cat == "Inversiones y ahorros":
                savings_transferred += abs_amt

    assumed_income = total_income if total_income > 0 else (needs_spent + wants_spent + savings_transferred)
    total_spent = needs_spent + wants_spent
    net_savings = max(0.0, assumed_income - total_spent)
    total_savings = net_savings + savings_transferred

    base = assumed_income if assumed_income > 0 else 1.0
    needs_pct = round(needs_spent / base * 100, 1)
    wants_pct = round(wants_spent / base * 100, 1)
    savings_pct = round(total_savings / base * 100, 1)

    return {
        "assumed_income": round(assumed_income, 2),
        "needs": {
            "name": "Necesidades Básicas (50%)",
            "spent": round(needs_spent, 2),
            "percentage": needs_pct,
            "target_pct": 50,
            "status": "ok" if needs_pct <= 55 else "warning"
        },
        "wants": {
            "name": "Deseos y Ocio (30%)",
            "spent": round(wants_spent, 2),
            "percentage": wants_pct,
            "target_pct": 30,
            "status": "ok" if wants_pct <= 35 else "warning"
        },
        "savings": {
            "name": "Ahorro e Inversión (20%)",
            "saved": round(total_savings, 2),
            "percentage": savings_pct,
            "target_pct": 20,
            "status": "ok" if savings_pct >= 18 else "warning"
        }
    }

def get_spending_anomalies(month: Optional[str] = None) -> List[Dict[str, Any]]:
    matrix_data = get_category_matrix()
    categories = matrix_data["categories"]
    months = matrix_data["months"]

    if not months:
        return []

    target_month = month if (month and month in months) else months[-1]

    anomalies = []
    for c in categories:
        cat_name = c["category"]
        hist_avg = c["monthly_average"]
        month_val = c["by_month"].get(target_month, 0.0)

        if hist_avg > 25.0:
            diff = month_val - hist_avg
            pct_change = round((diff / hist_avg * 100) if hist_avg > 0 else 0.0, 1)

            if pct_change >= 25.0 and diff > 30.0:
                anomalies.append({
                    "category": cat_name,
                    "month_amount": round(month_val, 2),
                    "hist_average": round(hist_avg, 2),
                    "difference": round(diff, 2),
                    "pct_change": pct_change,
                    "type": "spike",
                    "severity": "high" if pct_change > 50 else "medium",
                    "message": f"{cat_name} ha subido un +{pct_change}% sobre la media (+{diff:.2f}€)"
                })
            elif pct_change <= -25.0 and diff < -30.0:
                anomalies.append({
                    "category": cat_name,
                    "month_amount": round(month_val, 2),
                    "hist_average": round(hist_avg, 2),
                    "difference": round(diff, 2),
                    "pct_change": pct_change,
                    "type": "saving",
                    "severity": "positive",
                    "message": f"Ahorro en {cat_name}: {pct_change}% respecto a tu media ({diff:.2f}€)"
                })

    anomalies.sort(key=lambda x: abs(x["difference"]), reverse=True)
    return anomalies

def get_top_merchants_for_month(month: Optional[str] = None, limit: int = 8) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    SELECT description, amount, category
    FROM transactions
    WHERE amount < 0 AND is_reimbursable = 0 AND category NOT IN ('Deudas y créditos', 'Inversiones y ahorros', 'Liquidación Tarjetas', 'Traspaso entre cuentas')
    """
    params = []
    if month and month != "all":
        query += " AND date LIKE ?"
        params.append(f"{month}%")

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    merchants = defaultdict(lambda: {"count": 0, "total": 0.0, "category": ""})
    total_month_spent = 0.0

    for desc, amt, cat in rows:
        name, _ = canonical_merchant(desc or "")
        merchants[name]["count"] += 1
        abs_amt = abs(amt)
        merchants[name]["total"] += abs_amt
        merchants[name]["category"] = cat
        total_month_spent += abs_amt

    sorted_m = sorted(merchants.items(), key=lambda x: x[1]["total"], reverse=True)
    result = []
    for name, data in sorted_m[:limit]:
        tot = data["total"]
        result.append({
            "name": name,
            "category": data["category"],
            "count": data["count"],
            "total": round(tot, 2),
            "percentage": round((tot / total_month_spent * 100) if total_month_spent > 0 else 0.0, 1)
        })
    return result

def get_advanced_analytics(month: Optional[str] = None) -> Dict[str, Any]:
    return {
        "day_of_week": get_day_of_week_analysis(month),
        "budget_50_30_20": get_budget_50_30_20(month),
        "anomalies": get_spending_anomalies(month),
        "top_merchants_month": get_top_merchants_for_month(month, 8)
    }

def get_comprehensive_financial_profile() -> Dict[str, Any]:
    """
    Consolidates the complete multi-month analytics into a single rich profile
    for DeepSeek financial reasoning.
    """
    from backend.loans import get_loans_summary
    portfolio = get_portfolio_summary()
    trends = get_multi_month_trends()
    category_matrix = get_category_matrix()
    subscriptions = detect_recurring_subscriptions()
    merchants = get_top_merchants(15)
    reimbursements = get_reimbursement_audit()
    health = get_financial_health_and_emergency_fund()
    loans = get_loans_summary()

    return {
        "portfolio": portfolio,
        "trends": trends,
        "category_matrix": category_matrix,
        "subscriptions": subscriptions,
        "merchants": merchants,
        "reimbursements": reimbursements,
        "health": health,
        "loans": loans,
        "day_of_week": get_day_of_week_analysis(),
        "budget_50_30_20": get_budget_50_30_20()
    }

def build_llm_financial_context(user_query: Optional[str] = None) -> str:
    """
    Builds a structured, comprehensive Notion-style markdown context
    containing all multi-month data, subscriptions, portfolio, loans, and relevant transaction queries.
    """
    profile = get_comprehensive_financial_profile()
    portfolio = profile["portfolio"]
    trends = profile["trends"]
    subscriptions = profile["subscriptions"]
    merchants = profile["merchants"]
    reimb = profile["reimbursements"]
    health = profile["health"]
    cat_matrix = profile["category_matrix"]
    loans_data = profile.get("loans", {})
    loans_kpis = loans_data.get("global_kpis", {})

    lines = []

    # 1. Net Worth & Portfolio Snapshot
    lines.append("### 1. PATRIMONIO NETO REAL, ACTIVOS Y LIQUIDEZ GLOBAL")
    net_worth = portfolio.get('net_worth', portfolio['capital_global'])
    gross_cap = portfolio.get('gross_capital', portfolio['capital_global'])
    tot_debt = portfolio.get('total_debt', loans_kpis.get('outstanding_debt', 0.0))
    monthly_debt = portfolio.get('monthly_debt_burden', loans_kpis.get('monthly_burden', 0.0))

    lines.append(f"- **Patrimonio Neto Real (Activos - Deudas)**: **{net_worth:,.2f} €**")
    lines.append(f"  * Activos Brutos Totales: {gross_cap:,.2f} € (Liquidez + Inversiones + Reembolsos pendientes)")
    lines.append(f"  * Deuda Viva en Créditos / Préstamos: **-{tot_debt:,.2f} €**")
    lines.append(f"  * Compromiso Fijo Mensual de Cuotas de Crédito: **{monthly_debt:,.2f} €/mes**")
    lines.append(f"- **Liquidez Bancaria Total**: {portfolio['liquid_cash']:,.2f} € (al {portfolio.get('last_liquidity_date') or 'actual'})")
    for acc in portfolio.get("bank_accounts", []):
        if not acc.get("is_credit_card"):
            lines.append(f"  * {acc['account_name']}: {acc['current_balance']:,.2f} € (último mov: {acc['last_transaction_date'] or 'N/A'})")
        else:
            lines.append(f"  * {acc['account_name']} (Crédito): Ciclo mensual")
    
    fund = portfolio.get("fund", {})
    lines.append(f"- **Fondo Indexado Fidelity MSCI World (IE00BYX5P602)**:")
    lines.append(f"  * Participaciones: {fund.get('total_shares', 0.0):,.2f} | NAV actual: {fund.get('latest_nav', 0.0):,.4f} €")
    lines.append(f"  * Valor de Mercado: {fund.get('total_value_eur', 0.0):,.2f} € | Invertido: {fund.get('invested_eur', 0.0):,.2f} €")
    lines.append(f"  * Ganancia Acumulada: {fund.get('pnl_eur', 0.0):+,.2f} € ({fund.get('pnl_pct', 0.0):+.2f}%)")

    stocks = portfolio.get("stocks", {})
    lines.append(f"- **Cartera de Acciones (Finnhub API)**: {stocks.get('total_value_eur', 0.0):,.2f} €")
    for s in stocks.get("items", []):
        lines.append(f"  * {s['symbol']}: {s['shares']} acciones @ ${s['current_price']:.2f} (Total: {s.get('value_eur', 0.0):,.2f} € / PnL: {s.get('pnl_eur', 0.0):+,.2f} €)")

    # 2. Reimbursable Work Expenses Audit
    lines.append("\n### 2. GASTOS DE TRABAJO A REEMBOLSAR (BMC SOFTWARE)")
    lines.append(f"- Total pendiente de recuperar: **{reimb['pending_total']:,.2f} €** ({reimb['pending_count']} movimientos pendientes)")
    lines.append(f"- Reembolsos ya liquidados históricamente: {reimb['reimbursed_total']:,.2f} €")
    if reimb["pending_items"]:
        lines.append("- Detalle de importes pendientes:")
        for item in reimb["pending_items"][:8]:
            lines.append(f"  * {item['date']} | {item['description']} | {item['amount']:,.2f} € ({item['account']})")

    # 3. Multi-Month Trend Overview (6 Months: Apr-Sep 2026)
    lines.append("\n### 3. EVOLUCIÓN HISTÓRICA MENSUAL (ABRIL - SEPTIEMBRE 2026)")
    lines.append("| Mes | Nómina BMC / Sueldo (€) | Otros Ingresos (€) | Total Ingresos (€) | Gasto Personal (€) | Ahorro Neto (€) | Tasa Ahorro (%) | Movimientos |")
    lines.append("|---|---|---|---|---|---|---|---|")
    for t in trends:
        sal = t.get('salary', 0.0)
        oth = t.get('other_income', 0.0)
        lines.append(f"| {t['month']} | {sal:,.2f} € | {oth:,.2f} € | {t['total_income']:,.2f} € | {t['personal_expenses']:,.2f} € | {t['net_savings']:,.2f} € | {t['savings_rate']:.1f}% | {t['tx_count']} |")
    
    # 4. Recurring Subscriptions & Fixed Commitments Detected
    lines.append("\n### 4. GASTOS FIJOS Y SUSCRIPCIONES RECURRENTES DETECTADAS")
    lines.append("| Concepto | Tipo | Coste Medio (€) | Frecuencia | Total Acumulado (€) |")
    lines.append("|---|---|---|---|---|")
    for sub in subscriptions[:12]:
        lines.append(f"| {sub['name']} | {sub['type']} | {sub['average_amount']:,.2f} € | {sub['occurrences']}x ({sub['months_count']} meses) | {sub['total_amount']:,.2f} € |")

    # 5. Top Merchants & Payees
    lines.append("\n### 5. TOP COMERCIOS Y DESTINATARIOS (GASTO PERSONAL ACUMULADO)")
    lines.append("| Comercio / Destinatario | Grupo | Nº Transacciones | Total Gastado (€) | Gasto Medio (€) |")
    lines.append("|---|---|---|---|---|")
    for m in merchants[:10]:
        lines.append(f"| {m['name']} | {m['group']} | {m['count']} | {m['total']:,.2f} € | {m['average']:,.2f} € |")

    # 6. Category Breakdown Month-over-Month
    lines.append("\n### 6. MATRIZ DE GASTOS POR CATEGORÍA (TOP CATEGORÍAS)")
    month_headers = " | ".join(cat_matrix["months"])
    lines.append(f"| Categoría | Media Mensual (€) | Total 6 Meses (€) | {month_headers} |")
    lines.append(f"|---|---|---|{'---|' * len(cat_matrix['months'])}")
    for cat in cat_matrix["categories"][:8]:
        row_months = " | ".join([f"{cat['by_month'].get(m, 0.0):,.0f}€" for m in cat_matrix["months"]])
        lines.append(f"| {cat['category']} | {cat['monthly_average']:,.2f} € | {cat['total']:,.2f} € | {row_months} |")

    # 7. Financial Health & Emergency Fund
    lines.append("\n### 7. SALUD FINANCIERA Y CAPACIDAD DE APORTACIÓN")
    lines.append(f"- Gasto medio mensual personal (Burn Rate): {health['avg_monthly_burn']:,.2f} €")
    lines.append(f"- Ingreso medio mensual (Nómina BMC + otros): {health['avg_monthly_income']:,.2f} €")
    lines.append(f"- Capacidad media de ahorro mensual: {health['avg_monthly_savings']:,.2f} €")
    lines.append(f"- Colchón de emergencia actual: **{health['emergency_buffer_months']} meses de gastos** ({health['liquid_cash']:,.2f} €)")
    lines.append(f"- Fondo de emergencia objetivo (3 meses): {health['target_buffer_3m']:,.2f} € | (6 meses): {health['target_buffer_6m']:,.2f} €")
    lines.append(f"- **Aportación periódica sugerida a Fidelity MSCI World**: **{health['recommended_msci_monthly']:,.0f} €/mes**")

    # 8. Active Loans, Credits & Financing (Debt and Monthly Obligations)
    active_loans = [l for l in loans_data.get("loans", []) if l.get("outstanding_balance", 0) > 0]
    completed_loans = [l for l in loans_data.get("loans", []) if l.get("outstanding_balance", 0) <= 0]
    lines.append("\n### 8. PRÉSTAMOS, CRÉDITOS Y FINANCIACIONES (DEUDA VIVA Y CUOTAS)")
    lines.append(f"- **Deuda Total Pendiente de Liquidar**: **{loans_kpis.get('outstanding_debt', 0.0):,.2f} €**")
    lines.append(f"- **Carga Mensual Total en Cuotas de Financiación**: **{loans_kpis.get('monthly_burden', 0.0):,.2f} €/mes**")
    lines.append(f"- **Total Capital Amortizado**: {loans_kpis.get('total_amortized', 0.0):,.2f} € ({loans_kpis.get('global_progress_pct', 0.0):.1f}% amortizado)")
    lines.append(f"- **Número de Financiaciones Activas**: {len(active_loans)}")
    for l in active_loans:
        lines.append(f"  * **{l['name']}** ({l['entity']}):")
        lines.append(f"    - Financia: {l.get('financed_item') or 'N/A'}")
        lines.append(f"    - Saldo pendiente (saldo vivo): **{l['outstanding_balance']:,.2f} €** (de {l['initial_principal']:,.2f} € iniciales)")
        lines.append(f"    - Cuota fija mensual: **{l['monthly_installment']:,.2f} €/mes** (TIN: {l['interest_rate_pct']}%)")
        lines.append(f"    - Plazo restante: **{l['months_remaining']} meses** (Fecha final prevista: {l.get('end_date') or l.get('projected_end_date')})")
        lines.append(f"    - Total a pagar estimado: {l.get('total_repayable', 0.0):,.2f} € (Intereses restantes: {l.get('total_interest_expected', 0.0):,.2f} €)")

    if completed_loans:
        lines.append(f"- **Financiaciones Completadas / 100% Saldadas**:")
        for cl in completed_loans:
            lines.append(f"  * {cl['name']} ({cl.get('financed_item')}): Saldado al 100% (Total devuelto: {cl['amortized_amount']:,.2f} €)")

    # 9. Dynamic Search Results for User Specific Query
    if user_query:
        # Check if query contains specific search terms
        keywords = []
        q_upper = strip_accents(user_query)
        loan_keywords = ["PRESTAMO", "CREDITO", "DEUDA", "COCHE", "UNICAJA", "MUTUA", "SEGURO", "FRACCIONAR", "AMORTIZAR", "SANTANDER 0001557", "0001557"]
        salary_keywords = ["NOMINA", "SUELDO", "SALARIO", "BMC", "INGRESOS", "COBRO", "COBRAR", "PAGA", "RETRIBUCION"]
        standard_keywords = ["MERCADONA", "ALCAMPO", "CARREFOUR", "UBER", "GLOVO", "AMEX", "AMERICAN EXPRESS", "IBERIA", "SANTANDER", "N26", "GO FIT", "PADEL", "FUENCARRAL", "ALQUILER", "AGUSTIN", "REPSOL", "CEPSA", "GASOLINA", "APPLE", "PLAYSTATION", "SPOTIFY", "VIAJE", "PARIS", "MENORCA", "MALAGA"]
        for term in loan_keywords + salary_keywords + standard_keywords:
            if term in q_upper:
                keywords.append(term)
        
        if keywords:
            lines.append(f"\n### 9. MOVIMIENTOS ESPECÍFICOS ENCONTRADOS PARA: {', '.join(keywords)}")
            for kw in keywords[:3]:
                results = search_transactions(kw, limit=10)
                if results:
                    lines.append(f"**Búsqueda: '{kw}'**:")
                    lines.append("| Fecha | Cuenta | Descripción | Importe (€) | Categoría |")
                    lines.append("|---|---|---|---|---|")
                    for r in results:
                        lines.append(f"| {r['date']} | {r['account']} | {r['description']} | {r['amount']:,.2f} € | {r['category']} |")

    return "\n".join(lines)
