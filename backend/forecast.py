import calendar
from datetime import datetime
from backend.database import get_connection, get_all_settings

def calculate_monthly_forecast(year: int = None, month: int = None, user_id: str = "00000000-0000-0000-0000-000000000000"):
    now = datetime.now()
    if year is None:
        year = now.year
    if month is None:
        month = now.month

    conn = get_connection()
    cursor = conn.cursor()

    # Total days in this month
    _, num_days = calendar.monthrange(year, month)
    days_elapsed = now.day if (year == now.year and month == now.month) else num_days
    days_remaining = max(1, num_days - days_elapsed)

    # Fetch all transactions for this month isolated by user_id
    month_prefix = f"{year:04d}-{month:02d}%"
    cursor.execute("""
    SELECT * FROM transactions
    WHERE date LIKE ? AND user_id = ?
    ORDER BY date ASC
    """, (month_prefix, user_id))
    txs = cursor.fetchall()

    # Read user-configured forecast settings from database isolated by user_id
    settings_map = get_all_settings(user_id=user_id)
    expected_income = float(settings_map.get("forecast_expected_income", 0.0) or 0.0)
    target_savings = float(settings_map.get("forecast_target_savings", 0.0) or 0.0)
    budget_max = float(settings_map.get("forecast_budget_max", 0.0) or 0.0)
    enable_comp = settings_map.get("enable_company_expenses", "1") != "0"

    # Check if user has registered any mutual funds
    cursor.execute("SELECT isin, name FROM fund_info LIMIT 1")
    first_fund = cursor.fetchone()

    tx_count = len(txs)
    has_data = tx_count > 0
    has_targets = (expected_income > 0 or target_savings > 0 or budget_max > 0)

    # If no transactions in this month
    if not has_data:
        conn.close()
        daily_safe = (budget_max / num_days) if budget_max > 0 else ((expected_income * 0.70 / num_days) if expected_income > 0 else 0.0)
        proj_exp = budget_max if budget_max > 0 else 0.0
        proj_sav = target_savings if target_savings > 0 else (max(0.0, expected_income - budget_max) if expected_income > 0 and budget_max > 0 else 0.0)
        proj_rate = round((proj_sav / expected_income * 100), 1) if expected_income > 0 else 0.0

        return {
            "month": f"{year:04d}-{month:02d}",
            "days_elapsed": days_elapsed,
            "days_total": num_days,
            "days_remaining": days_remaining,
            "has_data": False,
            "has_targets": has_targets,
            "tx_count": 0,
            "expected_income": round(expected_income, 2),
            "target_savings": round(target_savings, 2),
            "budget_max": round(budget_max, 2),
            "total_income": 0.0,
            "gross_expenses": 0.0,
            "company_reimbursable_expenses": 0.0,
            "company_reimbursements_received": 0.0,
            "card_settlements_total": 0.0,
            "investments_savings_total": 0.0,
            "personal_expenses": 0.0,
            "fixed_expenses": 0.0,
            "variable_expenses": 0.0,
            "daily_burn_rate": 0.0,
            "projected_total_expenses": round(proj_exp, 2),
            "projected_net_savings": round(proj_sav, 2),
            "projected_savings_rate": proj_rate,
            "daily_safe_spend": round(daily_safe, 2),
            "category_breakdown": [],
            "recommendations": []
        }

    # Calculations with real transactions
    total_income = 0.0
    gross_expenses = 0.0
    company_reimbursable_expenses = 0.0
    company_reimbursements_received = 0.0
    card_settlements_total = 0.0
    investments_savings_total = 0.0
    category_spending = {}
    fixed_categories = ["Vivienda", "Gastos Vivienda", "Servicios/Suscripciones", "Impuestos y tasas"]
    fixed_expenses = 0.0
    variable_expenses = 0.0

    for t in txs:
        amt = t["amount"]
        cat = t["category"]
        is_reimb = t["is_reimbursable"]

        if amt > 0:
            if cat == "Gastos de Empresa" or "reembolso" in t["description"].lower():
                company_reimbursements_received += amt
            elif cat in ["Traspaso entre cuentas", "Liquidación Tarjetas"]:
                # Internal transfer or card settlement refund - NOT income
                pass
            elif cat in ["Sueldo", "Ingresos / Nómina", "Otros ingresos"]:
                total_income += amt
            else:
                category_spending[cat] = category_spending.get(cat, 0.0) - amt
                if cat in fixed_categories:
                    fixed_expenses -= amt
                else:
                    variable_expenses -= amt
        else:
            abs_amt = abs(amt)
            gross_expenses += abs_amt

            if is_reimb == 1:
                company_reimbursable_expenses += abs_amt
            elif cat in ["Liquidación Tarjetas", "Deudas y créditos"]:
                card_settlements_total += abs_amt
            elif cat == "Traspaso entre cuentas":
                pass
            elif cat == "Inversiones y ahorros":
                investments_savings_total += abs_amt
            else:
                category_spending[cat] = category_spending.get(cat, 0.0) + abs_amt
                if cat in fixed_categories:
                    fixed_expenses += abs_amt
                else:
                    variable_expenses += abs_amt

    # Net personal expenses strictly reflects real consumption (net of Bizum repayments)
    personal_expenses = sum(max(0.0, v) for v in category_spending.values())
    variable_expenses = max(0.0, variable_expenses)
    fixed_expenses = max(0.0, fixed_expenses)

    # Forecast variable spending to end of month
    velocity = (variable_expenses / days_elapsed) if days_elapsed > 0 else 0.0
    projected_variable = velocity * num_days
    projected_total_expenses = fixed_expenses + projected_variable

    # Base income: actual income if present, else user configured expected_income (or 0)
    assumed_income = total_income if total_income > 0 else expected_income
    projected_net_savings = assumed_income - projected_total_expenses if assumed_income > 0 else 0.0
    projected_savings_rate = (projected_net_savings / assumed_income * 100) if assumed_income > 0 else 0.0

    # Daily safe to spend based on budget_max if set, else 70% of assumed income
    effective_budget = budget_max if budget_max > 0 else (assumed_income * 0.70 if assumed_income > 0 else 0.0)
    remaining_budget = max(0.0, effective_budget - personal_expenses)
    daily_safe_spend = (remaining_budget / days_remaining) if days_remaining > 0 else 0.0

    # Generate Recommendations
    recommendations = []

    # 1. Company Reimbursements Insight (Only if enabled)
    if enable_comp and company_reimbursable_expenses > 0:
        recommendations.append({
            "type": "company_expense",
            "icon": "💼",
            "title": "Gastos de Empresa Adelantados",
            "description": f"Has pagado {company_reimbursable_expenses:.2f}€ con tu tarjeta personal. Han sido excluidos de tus gastos personales para no distorsionar tu presupuesto.",
            "impact": f"+{company_reimbursable_expenses:.2f}€ a recuperar",
            "severity": "info"
        })

    # 2. Spending Velocity Insight
    if days_elapsed > 5 and assumed_income > 0:
        threshold = budget_max if budget_max > 0 else (assumed_income * 0.85)
        if projected_total_expenses > threshold:
            recommendations.append({
                "type": "burn_rate",
                "icon": "⚠️",
                "title": "Ritmo de Gasto Elevado",
                "description": f"A este ritmo ({velocity:.1f}€/día en gastos variables), proyectas gastar {projected_total_expenses:.2f}€ a final de mes. Te recomendamos limitar el gasto discrecional a {daily_safe_spend:.1f}€/día.",
                "impact": f"Objetivo: <{daily_safe_spend:.1f}€/día",
                "severity": "warning"
            })
        elif projected_net_savings > 0:
            recommendations.append({
                "type": "burn_rate",
                "icon": "✅",
                "title": "Ritmo de Gasto Saludable",
                "description": f"Mantienes un ritmo óptimo de gasto ({velocity:.1f}€/día). Proyectas cerrar el mes con {projected_net_savings:.2f}€ de ahorro ({projected_savings_rate:.1f}% de tu renta).",
                "impact": f"{projected_net_savings:.2f}€ de ahorro proyectado",
                "severity": "success"
            })

    # 3. Investment Opportunity: ONLY if user has a registered fund in fund_info!
    if first_fund and projected_net_savings > 150:
        fund_name = first_fund["name"] or first_fund["isin"]
        potential_contrib = max(50.0, round(projected_net_savings * 0.40 / 50) * 50)
        recommendations.append({
            "type": "investment",
            "icon": "📈",
            "title": f"Aportación Sugerida a {fund_name}",
            "description": f"Tu capacidad de ahorro proyectada te permite realizar una aportación periódica recomendada de {potential_contrib:.0f}€ a tu fondo {fund_name}, manteniendo liquidez suficiente para imprevistos.",
            "impact": f"Aportación sugerida: {potential_contrib:.0f}€",
            "severity": "primary"
        })

    # 4. Category breakdown insights (e.g. Restaurants or Supermarkets)
    restaurants = category_spending.get("Restaurantes & Ocio", 0.0)
    if restaurants > 350:
        recommendations.append({
            "type": "category_alert",
            "icon": "🍽️",
            "title": "Optimización en Restaurantes & Ocio",
            "description": f"El gasto en ocio y restaurantes acumula {restaurants:.2f}€ este mes. Reducir un par de comidas fuera podría generarte un ahorro directo de ~80€ para inversión.",
            "impact": f"Gasto actual: {restaurants:.2f}€",
            "severity": "neutral"
        })

    # Sorted category breakdown
    breakdown = []
    palette = {
        "Alimentación & Supermercado": "#10B981",
        "Restaurantes & Ocio": "#F59E0B",
        "Transporte & Gasolina": "#3B82F6",
        "Vivienda & Suministros": "#6366F1",
        "Suscripciones & Servicios": "#8B5CF6",
        "Viajes & Alojamiento": "#EC4899",
        "Compras & Ropa": "#F43F5E",
        "Salud & Bienestar": "#14B8A6",
        "Gastos de Empresa": "#0EA5E9",
        "Inversión & Ahorro": "#84CC16",
        "Otros / Sin Clasificar": "#6B7280"
    }

    for cat, val in sorted(category_spending.items(), key=lambda x: x[1], reverse=True):
        breakdown.append({
            "category": cat,
            "amount": round(val, 2),
            "percentage": round((val / personal_expenses * 100) if personal_expenses > 0 else 0.0, 1),
            "color": palette.get(cat, "#94A3B8")
        })

    conn.close()

    return {
        "month": f"{year:04d}-{month:02d}",
        "days_elapsed": days_elapsed,
        "days_total": num_days,
        "days_remaining": days_remaining,
        "has_data": True,
        "has_targets": has_targets,
        "tx_count": tx_count,
        "expected_income": round(expected_income, 2),
        "target_savings": round(target_savings, 2),
        "budget_max": round(budget_max, 2),
        "total_income": round(total_income, 2),
        "gross_expenses": round(gross_expenses, 2),
        "company_reimbursable_expenses": round(company_reimbursable_expenses, 2),
        "company_reimbursements_received": round(company_reimbursements_received, 2),
        "card_settlements_total": round(card_settlements_total, 2),
        "investments_savings_total": round(investments_savings_total, 2),
        "personal_expenses": round(personal_expenses, 2),
        "fixed_expenses": round(fixed_expenses, 2),
        "variable_expenses": round(variable_expenses, 2),
        "daily_burn_rate": round(velocity, 2),
        "projected_total_expenses": round(projected_total_expenses, 2),
        "projected_net_savings": round(projected_net_savings, 2),
        "projected_savings_rate": round(projected_savings_rate, 1),
        "daily_safe_spend": round(daily_safe_spend, 2),
        "category_breakdown": breakdown,
        "recommendations": recommendations
    }

def get_habits_and_goals_analysis(user_id: str = "00000000-0000-0000-0000-000000000000"):
    """
    Analyzes historical spending habits across all categories, separates fixed vs reducible/discretionary
    expenses, and provides customized savings targets and advice to achieve a financial goal.
    """
    conn = get_connection()
    cursor = conn.cursor()

    # Active months with data (last 6 active months)
    cursor.execute("""
    SELECT DISTINCT substr(date, 1, 7) as m
    FROM transactions
    WHERE is_reimbursable = 0 AND user_id = ?
    ORDER BY m DESC
    LIMIT 6
    """, (user_id,))
    recent_months = [r[0] for r in cursor.fetchall() if r[0]]
    recent_months.reverse()

    if not recent_months:
        conn.close()
        return {}

    placeholders = ",".join("?" for _ in recent_months)

    # Monthly average income (salary + other real income)
    cursor.execute(f"""
    SELECT substr(date, 1, 7) as m, SUM(amount)
    FROM transactions
    WHERE substr(date, 1, 7) IN ({placeholders})
      AND amount > 0
      AND category IN ('Sueldo', 'Ingresos / Nómina', 'Otros ingresos')
      AND is_reimbursable = 0
      AND user_id = ?
    GROUP BY m
    """, (*recent_months, user_id))
    inc_by_m = [r[1] for r in cursor.fetchall()]
    avg_income = round(sum(inc_by_m) / len(inc_by_m), 2) if inc_by_m else 3200.0

    # Monthly spending by category
    cursor.execute(f"""
    SELECT 
        category,
        substr(date, 1, 7) as m,
        SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE -amount END) as net_spent,
        COUNT(*) as tx_count
    FROM transactions
    WHERE substr(date, 1, 7) IN ({placeholders})
      AND is_reimbursable = 0
      AND category NOT IN ('Liquidación Tarjetas', 'Inversiones y ahorros', 'Deudas y créditos', 'Prestamos familiares', 'Traspaso entre cuentas', 'Sueldo', 'Ingresos / Nómina', 'Otros ingresos', 'Gastos de Empresa')
      AND user_id = ?
    GROUP BY category, m
    """, (*recent_months, user_id))
    cat_rows = cursor.fetchall()

    # Current capital from portfolio
    from backend.portfolio import get_portfolio_summary
    portfolio = get_portfolio_summary(user_id=user_id)
    current_capital = portfolio.get("capital_global", 0.0)
    current_cash = portfolio.get("liquid_cash", 0.0)

    conn.close()

    from collections import defaultdict
    cat_monthly_sums = defaultdict(list)
    cat_tx_counts = defaultdict(int)

    for cat, m, net_spent, count in cat_rows:
        cat_monthly_sums[cat].append(max(0.0, net_spent or 0.0))
        cat_tx_counts[cat] += count

    REDUCIBLE_INFO = {
        "Restaurantes": {
            "max_reduction_pct": 35,
            "tip": "Evitar 2-3 cenas o comidas fuera al mes y limitar pedidos de delivery",
            "icon": "🍽️"
        },
        "Compra Ropa": {
            "max_reduction_pct": 45,
            "tip": "Retrasar compras no esenciales de moda y aprovechar periodos de rebajas",
            "icon": "🛍️"
        },
        "Otras compras": {
            "max_reduction_pct": 40,
            "tip": "Limitar compras impulsivas online (Amazon, electrónica, caprichos)",
            "icon": "🛒"
        },
        "Servicios/Suscripciones": {
            "max_reduction_pct": 35,
            "tip": "Auditar y cancelar plataformas de streaming, software o cuotas redundantes",
            "icon": "📱"
        },
        "Entretenimiento": {
            "max_reduction_pct": 40,
            "tip": "Alternar planes de fin de semana con actividades de ocio alternativas",
            "icon": "🎟️"
        },
        "Gastos Viajes": {
            "max_reduction_pct": 25,
            "tip": "Planificar escapadas y billetes con mayor antelación",
            "icon": "✈️"
        }
    }

    FIXED_INFO = {
        "Vivienda": {"tip": "Alquiler mensual (coste fijo estructural)", "icon": "🏠"},
        "Gastos Vivienda": {"tip": "Suministros del hogar (luz, agua, gas)", "icon": "💡"},
        "Gasolina": {"tip": "Combustible para desplazamientos habituales", "icon": "⛽"},
        "Coche": {"tip": "Gastos directos del vehículo, mantenimiento y seguro", "icon": "🚗"},
        "Parking/Peajes/Ubers": {"tip": "Movilidad urbana y peajes", "icon": "🅿️"},
        "Salud/Farmancia": {"tip": "Gastos farmacia y salud preventiva", "icon": "💊"},
        "Alimentación": {"tip": "Cesta básica del supermercado", "icon": "🛒"},
        "Deporte/Gimnasio": {"tip": "Cuotas de entrenamiento y gimnasio", "icon": "🏋️"}
    }

    num_m = len(recent_months) if recent_months else 1
    categories_analysis = []
    total_reducible_avg = 0.0
    total_fixed_avg = 0.0

    for cat, values in cat_monthly_sums.items():
        avg_val = round(sum(values) / num_m, 2)
        is_reducible = cat in REDUCIBLE_INFO
        if is_reducible:
            total_reducible_avg += avg_val
            info = REDUCIBLE_INFO[cat]
            potential = round(avg_val * (info["max_reduction_pct"] / 100), 2)
            categories_analysis.append({
                "category": cat,
                "icon": info["icon"],
                "monthly_avg": avg_val,
                "is_reducible": True,
                "max_reduction_pct": info["max_reduction_pct"],
                "potential_savings": potential,
                "tip": info["tip"],
                "tx_count": cat_tx_counts[cat]
            })
        else:
            total_fixed_avg += avg_val
            info = FIXED_INFO.get(cat, {"tip": "Gasto habitual recurrente", "icon": "📋"})
            categories_analysis.append({
                "category": cat,
                "icon": info.get("icon", "📋"),
                "monthly_avg": avg_val,
                "is_reducible": False,
                "tip": info.get("tip", "Gasto básico"),
                "tx_count": cat_tx_counts[cat]
            })

    categories_analysis.sort(key=lambda x: (not x["is_reducible"], -x["monthly_avg"]))

    total_expenses_avg = round(total_reducible_avg + total_fixed_avg, 2)
    current_savings_capacity = round(max(0.0, avg_income - total_expenses_avg), 2)
    current_savings_rate = round((current_savings_capacity / avg_income * 100) if avg_income > 0 else 0.0, 1)

    max_possible_savings = round(sum(c.get("potential_savings", 0.0) for c in categories_analysis if c["is_reducible"]), 2)
    boosted_savings_capacity = round(current_savings_capacity + max_possible_savings, 2)
    boosted_savings_rate = round((boosted_savings_capacity / avg_income * 100) if avg_income > 0 else 0.0, 1)

    return {
        "recent_months": recent_months,
        "current_capital": current_capital,
        "current_cash": current_cash,
        "average_monthly_income": avg_income,
        "average_monthly_expenses": total_expenses_avg,
        "fixed_expenses_avg": round(total_fixed_avg, 2),
        "reducible_expenses_avg": round(total_reducible_avg, 2),
        "current_monthly_savings": current_savings_capacity,
        "current_savings_rate": current_savings_rate,
        "max_potential_monthly_savings": max_possible_savings,
        "boosted_savings_capacity": boosted_savings_capacity,
        "boosted_savings_rate": boosted_savings_rate,
        "categories": categories_analysis
    }
