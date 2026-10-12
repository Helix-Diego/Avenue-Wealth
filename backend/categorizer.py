import re
from backend.database import get_connection, get_setting
from backend.knowledge_base import match_knowledge_base, get_few_shots_for_ai, DIEGO_CATEGORIES
from backend.deepseek_service import categorize_with_ai

_ACTIVE_CATS_CACHE = None

def get_active_categories() -> list:
    global _ACTIVE_CATS_CACHE
    if _ACTIVE_CATS_CACHE is not None:
        return _ACTIVE_CATS_CACHE
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM categories ORDER BY name ASC")
        rows = [r[0] for r in cursor.fetchall()]
        conn.close()
        if rows:
            _ACTIVE_CATS_CACHE = rows
            return rows
    except Exception:
        pass
    return DIEGO_CATEGORIES

def invalidate_categories_cache():
    global _ACTIVE_CATS_CACHE
    _ACTIVE_CATS_CACHE = None

CATEGORIES = get_active_categories()

def quick_heuristic_match(desc_upper: str, amount: float, account: str = ""):
    """
    Ultra-fast (0.001ms) rule matcher for Spanish & European banking concepts,
    Bizum, Huchas, ATMs, and high-frequency merchants.
    """
    current_cats = get_active_categories()

    # 1. Huchas / Digital Savings / Transfers
    if any(k in desc_upper for k in ["HUCHA DIGI", "HUCHA DIGITAL", "HUCHA"]):
        target_cat = "Inversiones y ahorros" if any(w in desc_upper for w in ["APORTACION", "APORTACIÓN", "AHORRO"]) else "Traspaso entre cuentas"
        return {
            "category": target_cat if target_cat in current_cats else "Traspaso entre cuentas",
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.98,
            "notes": "Hucha digital / Ahorro periódico"
        }

    if "APORTACIÓN A UNA" in desc_upper or "APORTACION A UNA" in desc_upper:
        cat = "Inversiones y ahorros" if "Inversiones y ahorros" in current_cats else "Traspaso entre cuentas"
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.98,
            "notes": "Aportación a hucha o inversión"
        }

    if any(k in desc_upper for k in ["TRANSFER. EN DIV", "TRANSFER INMEDIATA", "TRANSFER.", "TRASPASO ENTRE"]):
        if amount > 500 and any(k in desc_upper for k in ["NOMINA", "HABERES", "SALARIO"]):
            cat = "Sueldo / Ingresos" if "Sueldo / Ingresos" in current_cats else "Sueldo"
            return {
                "category": cat,
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "confidence": 0.95,
                "notes": "Transferencia recibida (Sueldo/Ingreso)"
            }
        return {
            "category": "Traspaso entre cuentas",
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.92,
            "notes": "Traspaso / Transferencia bancaria"
        }

    # 2. Bizum
    if desc_upper.startswith("BIZUM RECIBIDO") or " BIZUM RECIBIDO" in desc_upper:
        return {
            "category": "Traspaso entre cuentas",
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.90,
            "notes": "Bizum recibido"
        }
    if any(k in desc_upper for k in ["BIZUM ENVIADO", "BIZUM A FAVOR", "BIZUM DE "]):
        return {
            "category": "Traspaso entre cuentas",
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.90,
            "notes": "Bizum enviado"
        }

    # 3. ATMs / Cash
    if any(k in desc_upper for k in ["CAJERO", "REINT.CAJERO", "DISPOSICION CAJERO", "EXTRACCION"]):
        return {
            "category": "Otras compras",
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.95,
            "notes": "Retirada de efectivo en cajero"
        }

    # 4. Bank fees / Insurance / Banking services
    if any(k in desc_upper for k in ["CREDIT AGRICOL", "CREDIT AGRICOLE"]):
        cat = "Vivienda & Suministros" if "Vivienda & Suministros" in current_cats else "Otras compras"
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.95,
            "notes": "Servicio bancario / Seguro Crédit Agricole"
        }

    # 5. Food delivery & Coffee / Dining
    if any(k in desc_upper for k in ["UBER * EATS", "UBER EATS", "EATS PEN", "GLOVO", "JUST EAT", "DELIVEROO"]):
        cat = "Restaurantes & Ocio" if "Restaurantes & Ocio" in current_cats else "Restaurantes"
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.98,
            "notes": "Comida a domicilio / Takeaway"
        }

    # Dining, Restaurants, Bars, Cafes
    if any(k in desc_upper for k in [
        "STARBUCKS", "PIZZERIA", "BISTROT", "CAFE", "CAFÉ", "RESTAURANTE", "BURGER",
        "FIVE GUYS", "AMORINO", "DOMINO", "FELLOWS", "MASLOW", "SAVEURS CAFE", "CAFE PIVOINE",
        "L'ETINCELLE", "CHIRINGUITO", "PRAU DE TERENE", "ESCALERA 3 BEACH", "LOUMI'S", "LOUMIS",
        "SC-BELLA ITALIA", "BELLA ITALIA", "CATALINA EL BAR", "GREEN ROOM", "TEMPLE BAR", "TASTE OF SP",
        "BANGKOK DISTRIC", "CLEMENT DELICES", "PANAS", "ARCANE", "SAINT GERVAIS", "SURPRIZ PIGALLE",
        "SOUPJUICE", "PRET A MANGER", "MCDONALD", "KFC", "FOSTER", "TACO BELL", "VIPS", "GINOS",
        "100 MONTADITOS", "POKÉ", "POKE", "SUSHI", "WOK", "TABERNA", "MESON", "CERVECERIA", "BODEGA"
    ]):
        cat = "Restaurantes & Ocio" if "Restaurantes & Ocio" in current_cats else "Restaurantes"
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.98,
            "notes": "Restaurante, bar o cafetería"
        }

    # 6. Groceries & Supermarkets & Bakeries
    if any(k in desc_upper for k in [
        "SERVIDIS", "ALIM 500", "ALIMERKA", "SUPERMERCADOS MAS", "MERCADONA", "CARREFOUR", "DIA ",
        "LIDL", "ALDI", "EROSKI", "CONSUM", "HIPERCOR", "ALCAMPO", "PANADERIA", "PASTELERIA",
        "FLORES GOURMET", "FRUTERIA", "CARNICERIA", "PESCADERIA", "SUPERMERCADO"
    ]):
        cat = "Restaurantes & Ocio" if "Restaurantes & Ocio" in current_cats else "Alimentación"
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.98,
            "notes": "Alimentación y supermercado"
        }

    # 7. Utilities & Telecommunications & Housing
    if desc_upper == "FREE" or any(k in desc_upper for k in [
        "FREE TELECOM", "FREE ", "EDF CLIENTS", "EDF ", "XFERA MOVILES", "YOIGO", "DIGI",
        "VODAFONE", "MOVISTAR", "ORANGE", "O2", "PEPEPHONE", "IBERDROLA", "ENDESA", "NATURGY",
        "TOTALENERGIES", "AGUAS", "CANAL DE ISABEL", "COMUNIDAD DE PROPIETARIOS", "ALQUILER"
    ]):
        cat = "Vivienda & Suministros" if "Vivienda & Suministros" in current_cats else "Hogar"
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.98,
            "notes": "Suministros, telefonía y hogar"
        }

    # 8. Subscriptions & Tech & Software
    if any(k in desc_upper for k in [
        "OPENAI", "CHATGPT", "APPLE.COM", "GOOGLE *GOOGLE", "GOOGLE ONE", "NETFLIX", "SPOTIFY",
        "AMAZON PRIME", "PRIME VIDEO", "DISNEY", "HBO", "MAX", "YOUTUBE", "ICLOUD", "MICROSOFT",
        "DROPBOX", "ADOBE", "CLAUDE.AI", "ANTHROPIC", "GITHUB", "CURSOR"
    ]):
        cat = "Suscripciones & Servicios" if "Suscripciones & Servicios" in current_cats else "Suscripciones"
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.99,
            "notes": "Suscripción digital / Software"
        }

    # 9. Transport & Parking & Tolls & Gas
    if any(k in desc_upper for k in [
        "UBER", "UBR*", "BOLT", "CABIFY", "FREENOW", "RATP", "RENFE", "METRO", "EMT ",
        "TFL TRAVEL", "PARKING", "APARCAMIENTO", "AUTOPISTA", "PEAJE", "ORA LLANES", "ESTACIONAMIENTO",
        "REPSOL", "CEPSA", "BP ", "SHELL", "GALP", "GASOLINERA", "PLENOIL", "PETROPRIX", "BALLENOIL"
    ]):
        cat = "Transporte & Gasolina" if "Transporte & Gasolina" in current_cats else "Transporte"
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.98,
            "notes": "Transporte, combustible o movilidad"
        }

    # 10. Travel & Flights & Accommodation
    if any(k in desc_upper for k in [
        "VOLOTEA", "IBERIA", "VUELING", "RYANAIR", "AIR EUROPA", "AIR FRANCE", "EASYJET",
        "BOOKING.COM", "BOOKING", "AIRBNB", "HOTEL", "HOSTEL", "AVOLTA", "DUTY FREE", "WORLD DUTY FREE",
        "AEROPUERTO", "AEROP."
    ]):
        cat = "Viajes & Alojamiento" if "Viajes & Alojamiento" in current_cats else "Viajes"
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.98,
            "notes": "Vuelo, hotel o viaje"
        }

    # 11. Gym & Sports
    if any(k in desc_upper for k in [
        "BYFIT", "BASIC FIT", "BASIC-FIT", "VIVAGYM", "ALTAFIT", "MCFIT", "FITNESS", "GIMNASIO", "GYM"
    ]):
        cat = "Deporte & Gimnasio" if "Deporte & Gimnasio" in current_cats else ("Salud & Bienestar" if "Salud & Bienestar" in current_cats else "Salud")
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.98,
            "notes": "Gimnasio y actividad deportiva"
        }

    # 12. Health & Pharmacy
    if any(k in desc_upper for k in [
        "FARMACIA", "PARAFARMACIA", "DENTAL", "OPTICA", "CLINICA", "MEDICO", "HOSPITAL", "SANITAS", "ADESLAS"
    ]):
        cat = "Salud & Bienestar" if "Salud & Bienestar" in current_cats else "Salud"
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.98,
            "notes": "Salud y farmacia"
        }

    # 13. Shopping, Clothing & Miscellaneous
    if any(k in desc_upper for k in [
        "ZARA", "MANGO", "BERSHKA", "PULL&BEAR", "STRADIVARIUS", "MASSIMO DUTTI", "H&M", "UNIQLO",
        "PRIMARK", "SNIPES", "VANS", "NEWYORKER", "EL CORTE INGLES", "AMAZON", "SHOPIFY", "ALIEXPRESS",
        "SHEIN", "TEMU", "DECATHLON", "IKEA", "LEROY MERLIN", "BAZAR", "MULTIPRECIO", "ESTANCO",
        "PAPELERIA", "LIBRERIA", "LIBRO", "OH MY CREAM", "BRIKOPEX", "JIE DA", "WOUTICK", "TAL'TICKET",
        "TOUSUNPEUSAUVAGE", "WH SMITH", "NYX*", "PARIS AUDIO"
    ]):
        cat = "Compras & Ropa" if "Compras & Ropa" in current_cats else "Otras compras"
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "confidence": 0.95,
            "notes": "Compra comercial / Ropa / Ocio"
        }

    return None

COMPANY_AMBIGUOUS_KEYWORDS = [
    "REPSOL", "CEPSA", "BP", "SHELL", "GALP", "GASOLINERA", "PETROPRIX", "PLENOIL",
    "PEAJE", "AUTOPISTA", "AP-", "IBERIA", "VUELING", "AIR EUROPA", "HOTEL", "BOOKING",
    "TAXI", "CABIFY", "UBER"
]

AMEX_CATEGORY_MAP = {
    "Transporte-Gasolina": "Gasolina",
    "Entretenimiento-Restaurantes": "Restaurantes",
    "Viajes-Hoteles": "Gastos Viajes",
    "Viajes-Viajes": "Gastos Viajes",
    "Viajes-Agencias de viaje": "Gastos Viajes",
    "Viajes-Aeroléneas": "Vuelos",
    "Viajes-Aerolineas": "Vuelos",
    "Transporte-Alquiler de coche": "Parking/Peajes/Ubers",
    "Transporte-Taxi": "Parking/Peajes/Ubers",
    "Transporte-Tranvéa": "Parking/Peajes/Ubers",
    "Transporte-Tranvia": "Parking/Peajes/Ubers",
    "Transporte-Estacionamiento": "Parking/Peajes/Ubers",
    "Transporte-Otros Transporte": "Parking/Peajes/Ubers",
    "Transporte-Transporte": "Parking/Peajes/Ubers",
    "Productos-Farmacia": "Salud/Farmancia",
    "Productos-Vestimenta": "Compra Ropa",
    "Productos-Arte y joyeréa": "Compra Ropa",
    "Productos-Arte y joyería": "Compra Ropa",
    "Productos-Comestibles": "Alimentación",
    "Entretenimiento-Club": "Deporte/Gimnasio",
    "Entretenimiento-Eventos teatrales": "Entretenimiento",
    "Entretenimiento-Eventos deportivos": "Entretenimiento",
    "Entretenimiento-Otros Entretenimiento": "Entretenimiento",
    "Productos-Compra online": "Otras compras",
    "Productos-Otros Productos": "Otras compras",
    "Productos-Artéculos electrénicos": "Otras compras",
    "Productos-Articulos electronicos": "Otras compras",
    "Productos-Tienda de libros": "Otras compras",
    "Servicios Comerciales-Servicios de Publicidad": "Otras compras",
    "Servicios Comerciales-Insumos de oficina": "Otras compras",
}

def categorize_transaction(description: str, amount: float, account: str = "", bank_category: str = ""):
    """
    Two-tier intelligent categorization:
    1. Knowledge Base matching (from Diego's reference PDF) + Banking transfer heuristics
    2. DeepSeek Light model (with few-shot prompts and uncertainty detection)
    """
    desc_upper = description.upper().strip()
    enable_comp = get_setting("enable_company_expenses", "1") == "1"

    # MyInvestor Specific Rules
    # 1. Period remuneration interest
    if desc_upper.startswith("PERIODO ") or "PERIODO 29/" in desc_upper:
        return {
            "category": "Inversiones y ahorros",
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "suggested_category": "Inversiones y ahorros",
            "confidence": 1.0,
            "notes": "Remuneración periódica intereses cuenta MyInvestor"
        }

    # 2. Fidelity MSCI World Fund subscriptions
    if any(kw in desc_upper for kw in ["FIDELITY", "MSCI WORLD", "INDEX P AC"]):
        return {
            "category": "Inversiones y ahorros",
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "suggested_category": "Inversiones y ahorros",
            "confidence": 1.0,
            "notes": "Suscripción fondo de inversión Fidelity MSCI World Index P-ACC (MyInvestor)"
        }

    # 3. Stock purchases and sales (symbol @ quantity)
    if " @ " in desc_upper or any(kw in desc_upper for kw in ["SUPER MICRO COMPUTER", "FLUENCE ENERGY", "ALTC ACQUISITION", "INTEL CORP"]):
        return {
            "category": "Inversiones y ahorros",
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "suggested_category": "Inversiones y ahorros",
            "confidence": 1.0,
            "notes": "Operación de inversión en MyInvestor"
        }

    # 4. MyInvestor transfers
    if "TRANSFERENCIA DESDE MYINVESTOR" in desc_upper or "MYINVESTOR" in desc_upper:
        return {
            "category": "Traspaso entre cuentas",
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "suggested_category": "Traspaso entre cuentas",
            "confidence": 1.0,
            "notes": "Traspaso interno a/desde cuenta MyInvestor"
        }

    if desc_upper in ["INVERSION", "INVERSIÓN", "INVERSION ADICIONAL"]:
        return {
            "category": "Traspaso entre cuentas",
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "suggested_category": "Traspaso entre cuentas",
            "confidence": 1.0,
            "notes": "Traspaso de fondos para inversión (MyInvestor)"
        }

    if "myinvestor" in account.lower():
        if any(kw in desc_upper for kw in ["INVERSION", "INVERSIÓN", "AHORRO", "INVERSUON", "ABONO MYINVESTOR", "CARGO MYINVESTOR", "TRANSFERENCIA"]):
            return {
                "category": "Traspaso entre cuentas",
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Traspaso entre cuentas",
                "confidence": 1.0,
                "notes": "Traspaso entre cuentas propias MyInvestor"
            }

    # Rule 1: Salary and income recognition (General for any user/employer)
    if amount > 0:
        if any(kw in desc_upper for kw in ["NOMINA", "NÓMINA", "SALARIO", "SUELDO", "HABERES"]):
            return {
                "category": "Sueldo",
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Sueldo",
                "confidence": 0.98,
                "notes": "Ingreso por nómina o salario"
            }
        
        # Company reimbursement received check
        if enable_comp and any(kw in desc_upper for kw in ["EXPENSES", "REEMBOLSO", "DIETAS EMPRESA", "LIQUIDACION GASTOS"]):
            return {
                "category": "Gastos de Empresa",
                "is_reimbursable": 0,
                "reimbursement_status": "reimbursed",
                "needs_clarification": 0,
                    "clarification_question": None,
                    "suggested_category": "Gastos de Empresa",
                    "confidence": 0.99,
                    "notes": "Devolución / liquidación de gastos de empresa (BMC Helix)"
                }
        elif any(kw in desc_upper for kw in ["REEMBOLSO", "LIQUIDACION GASTOS", "EXPENSES"]):
            return {
                "category": "Gastos de Empresa",
                "is_reimbursable": 0,
                "reimbursement_status": "reimbursed",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Gastos de Empresa",
                "confidence": 0.98,
                "notes": "Devolución de gastos de empresa detectada"
            }
        elif "MYINVESTOR" in desc_upper:
            return {
                "category": "Traspaso entre cuentas",
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Traspaso entre cuentas",
                "confidence": 0.99,
                "notes": "Traspaso interno desde cuenta de inversión MyInvestor"
            }
        elif any(kw in desc_upper for kw in [
            "ENVIADA DESDE N26", "TRANSFERENCIA DE HERNANDEZ TCACH DIEGO", "TRANSFERENCIA INMEDIATA DE DIEGO HERNANDEZ TCACH",
            "HERNANDEZ TCACH DIEGO", "DIEGO HERNANDEZ TCACH", "ES1300495525532312453012", "ES3000493477382014031842",
            "CARD ENDING IN *0871", "ENDING IN *0871"
        ] + [k for k in [get_setting("user_name", "").upper()] if k and k != "MI ESPACIO"]):
            if not any(w in desc_upper for w in ["LIMPIEZA", "SUAVIZANTE", "DETERGENTE", "GASTOS COMUNES PISO"]):
                return {
                    "category": "Traspaso entre cuentas",
                    "is_reimbursable": 0,
                    "reimbursement_status": "none",
                    "needs_clarification": 0,
                    "clarification_question": None,
                    "suggested_category": "Traspaso entre cuentas",
                    "confidence": 1.0,
                    "notes": "Traspaso entre cuentas propias"
                }
        elif "CARLA GARCIA FAYA" in desc_upper or "CARLA GARCIA" in desc_upper:
            return {
                "category": "Gastos Viajes",
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Gastos Viajes",
                "confidence": 0.95,
                "notes": "Aportación / reembolso de viaje compartido de Carla"
            }
        elif any(kw in desc_upper for kw in ["PAGO RECIBIDO.GRACIAS", "PAGO RECIBIDO", "RECIBO ENVIADO A SU BANCO"]):
            return {
                "category": "Traspaso entre cuentas",
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Traspaso entre cuentas",
                "confidence": 1.0,
                "notes": "Pago / liquidación recibida en tarjeta American Express"
            }

    # Rule 2: Credit card settlement payments and transfers to Amex / internal accounts
    if amount < 0:
        # Direct debits of credit card statements (Recibos domiciliados)
        if any(kw in desc_upper for kw in ["RECIBO IBERIA CARDS", "RECIBO AMERICAN EXPRESS", "LIQUIDACION DE LAS TARJETAS DE CREDITO"]):
            return {
                "category": "Liquidación Tarjetas",
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Liquidación Tarjetas",
                "confidence": 0.99,
                "notes": "Liquidación / recibo de tarjeta de crédito (evita duplicidad con el extracto de tarjeta)"
            }
        
        # Transfers sent to American Express
        if ("AMERICAN EXPRESS" in desc_upper or "AMEX" in desc_upper) and any(kw in desc_upper for kw in ["TRANSFERENCIA", "TRASPASO", "CUOTA AMEX", "COMIDA AMEX", "SMEX", "TRAJE Y AMEX"]):
            return {
                "category": "Traspaso entre cuentas",
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Traspaso entre cuentas",
                "confidence": 0.99,
                "notes": "Transferencia / traspaso a cuenta American Express"
            }

        # Internal transfers between Diego's own accounts
        if desc_upper.startswith("TRASPASO:") or " TRASPASO:" in desc_upper or "N26 TOP-UP" in desc_upper:
            return {
                "category": "Traspaso entre cuentas",
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Traspaso entre cuentas",
                "confidence": 0.99,
                "notes": "Traspaso entre cuentas propias"
            }

        if any(kw in desc_upper for kw in [
            "A FAVOR DE DIEGO HERNANDEZ TCACH", "A FAVOR DE DIEGO HERNÁNDEZ TCACH",
            "DIEGO HERNANDEZ TCACH", "HERNANDEZ TCACH DIEGO", "ENVIADA DESDE N26",
            "ES1300495525532312453012", "ES3000493477382014031842", "ES1215447889726651128615"
        ] + [k for k in [get_setting("user_name", "").upper()] if k and k != "MI ESPACIO"]):
            if not any(w in desc_upper for w in ["GASTOS COMUNES PISO", "GASTO EXTRA PISO", "GASTO EXTRAORDINARIO PISO"]):
                return {
                    "category": "Traspaso entre cuentas",
                    "is_reimbursable": 0,
                    "reimbursement_status": "none",
                    "needs_clarification": 0,
                    "clarification_question": None,
                    "suggested_category": "Traspaso entre cuentas",
                    "confidence": 1.0,
                    "notes": "Traspaso a cuenta propia / ahorro / inversión"
                }

        # N26 card fees
        if any(kw in desc_upper for kw in ["ADDITIONAL CARD FEE", "FOREIGN ATM USAGE MARK-UP FEE", "CARD FEE"]):
            return {
                "category": "Servicios/Suscripciones",
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Servicios/Suscripciones",
                "confidence": 0.99,
                "notes": "Comisión de tarjeta / cajero extranjero N26"
            }

        # Cash withdrawal
        if any(kw in desc_upper for kw in ["RETIRADA DE EFECTIVO", "REINTEGRO"]):
            return {
                "category": "Otras compras",
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Otras compras",
                "confidence": 0.90,
                "notes": "Retirada de efectivo en cajero"
            }

        # Credit card monthly fee
        if "CUOTA MENSUAL DE LA TARJETA" in desc_upper:
            return {
                "category": "Servicios/Suscripciones",
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 0,
                "clarification_question": None,
                "suggested_category": "Servicios/Suscripciones",
                "confidence": 0.99,
                "notes": "Cuota mensual cuota tarjeta American Express Platinum"
            }

    # Step 0: Bank Category matching (e.g. from American Express CSV)
    is_company_enabled = get_setting("enable_company_expenses", "1") == "1"
    company_name = get_setting("company_name", "") or "tu empresa"

    if bank_category and bank_category in AMEX_CATEGORY_MAP:
        cat = AMEX_CATEGORY_MAP[bank_category]
        is_potentially_company = any(kw in desc_upper for kw in COMPANY_AMBIGUOUS_KEYWORDS)
        if is_company_enabled and is_potentially_company and cat in ["Gasolina", "Parking/Peajes/Ubers", "Gastos Viajes", "Vuelos", "Restaurantes"]:
            if any(w in desc_upper for w in ["CLIENTE", "CUSTOMER", "BMC", "TRABAJO"]):
                return {
                    "category": cat,
                    "is_reimbursable": 1,
                    "reimbursement_status": "pending",
                    "needs_clarification": 0,
                    "clarification_question": None,
                    "suggested_category": cat,
                    "confidence": 0.98,
                    "notes": f"Gasto de empresa según extracto: {bank_category}"
                }
        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "suggested_category": cat,
            "confidence": 0.98,
            "notes": f"Categoría detectada de extracto: {bank_category}"
        }

    # Step 0.5: Quick Heuristic Match for common Spanish banks, Bizums, Huchas & Merchants
    q_match = quick_heuristic_match(desc_upper, amount, account)
    if q_match:
        return q_match

    # Step 1: Knowledge Base Match (from Diego's real history)
    kb_match = match_knowledge_base(description)
    is_potentially_company = any(kw in desc_upper for kw in COMPANY_AMBIGUOUS_KEYWORDS)

    if kb_match:
        cat = kb_match["category"]
        if is_company_enabled and is_potentially_company and cat in ["Gasolina", "Parking/Peajes/Ubers", "Gastos Viajes", "Vuelos", "Restaurantes"]:
            if any(w in desc_upper for w in ["CLIENTE", "CUSTOMER", "BMC", "TRABAJO"]):
                return {
                    "category": cat,
                    "is_reimbursable": 1,
                    "reimbursement_status": "pending",
                    "needs_clarification": 0,
                    "clarification_question": None,
                    "suggested_category": cat,
                    "confidence": 0.98,
                    "notes": f"Gasto de empresa detectado automáticamente ({company_name})"
                }
            
            return {
                "category": cat,
                "is_reimbursable": 0,
                "reimbursement_status": "none",
                "needs_clarification": 1,
                "clarification_question": f"Pago de {abs(amount):.2f}€ en '{description}'. ¿Es un gasto personal o corresponde a un desplazamiento a reembolsar por {company_name}?",
                "suggested_category": cat,
                "confidence": 0.70,
                "notes": f"Reconocido en KB como '{cat}', pero puede ser adelanto a {company_name}"
            }

        return {
            "category": cat,
            "is_reimbursable": 0,
            "reimbursement_status": "none",
            "needs_clarification": 0,
            "clarification_question": None,
            "suggested_category": cat,
            "confidence": kb_match["confidence"],
            "notes": kb_match["notes"]
        }

    # Step 2: Unseen / Novel transaction -> Query DeepSeek Light (deepseek-chat)
    few_shots = get_few_shots_for_ai(20)
    current_categories = get_active_categories()
    ai_result = categorize_with_ai(description, amount, current_categories, few_shots)

    chosen_category = ai_result.get("category", "Otras compras")
    if chosen_category not in current_categories:
        chosen_category = "Otras compras"


    is_reimb = ai_result.get("is_reimbursable", 0) if is_company_enabled else 0
    needs_clarif = 1 if ai_result.get("needs_clarification") else 0
    question = ai_result.get("clarification_question")
    confidence = ai_result.get("confidence", 0.75)
    explanation = ai_result.get("explanation", "Clasificado por DeepSeek AI")

    if confidence < 0.85 and not question:
        needs_clarif = 1
        question = f"El agente no está seguro ({int(confidence*100)}% certeza) de clasificar '{description}' como '{chosen_category}'. ¿Es correcto o prefieres otra categoría?"

    return {
        "category": chosen_category,
        "is_reimbursable": is_reimb,
        "reimbursement_status": "pending" if is_reimb else "none",
        "needs_clarification": needs_clarif,
        "clarification_question": question,
        "suggested_category": chosen_category,
        "confidence": confidence,
        "notes": f"DeepSeek AI: {explanation}"
    }

def extract_merchant_pattern(description: str) -> str:
    """
    Extracts the core merchant, person or entity name from transaction description,
    avoiding generic stop words (e.g. BIZUM, PAGO, COMPRA).
    """
    if not description:
        return ""
    s = description.strip()

    # 1. Bizum with person name: "BIZUM A FAVOR DE RAFAEL GALLEGO..." or "BIZUM DE RAFAEL..."
    m = re.search(r'BIZUM\s+(?:A\s+FAVOR\s+DE|DE)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\s+CONCEPTO|\s*[:,]|\s*$)', s, re.IGNORECASE)
    if m:
        name = m.group(1).strip()
        if len(name) >= 3 and name.upper() not in ["UN AMIGO", "OTRO"]:
            return name

    # 2. Transfer with counterparty: "TRANSFERENCIA INMEDIATA A FAVOR DE..." or "DE..."
    m = re.search(r'TRANSFERENCIA(?:\s+INMEDIATA)?\s+(?:A\s+FAVOR\s+DE|DE)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\s+CONCEPTO|\s*[:,]|\s*$)', s, re.IGNORECASE)
    if m:
        name = m.group(1).strip()
        if len(name) >= 3:
            return name

    # 3. Pago móvil / Contactless: "PAGO MOVIL EN T30 ALCAMPO MON, MADRID ES..."
    m = re.search(r'(?:PAGO\s+MOVIL|TRANSACCION\s+CONTACTLESS)\s+EN\s+([^,]+?)(?:,|\s+TARJ|\s*$)', s, re.IGNORECASE)
    if m:
        merch = m.group(1).strip()
        if len(merch) >= 3:
            return merch

    # 4. Compra internet / en: "COMPRA INTERNET EN...", "COMPRA EN WWW.AMAZON...", "COMPRA APPLE.COM/BILL..."
    m = re.search(r'COMPRA(?:\s+INTERNET)?(?:\s+EN)?\s+([^,]+?)(?:,|\s+TARJ|\s*$)', s, re.IGNORECASE)
    if m:
        merch = m.group(1).strip()
        if len(merch) >= 3:
            return merch

    # 5. Recibo: "RECIBO Legalitas...", "RECIBO IBERIA CARDS..."
    m = re.search(r'RECIBO\s+([^,]+?)(?:,|\s+Nº|\s*CONCEPTO|\s*$)', s, re.IGNORECASE)
    if m:
        rec = m.group(1).strip()
        if len(rec) >= 3:
            return rec

    # 6. Fallback: clean trailing card numbers and common suffixes
    cleaned = re.sub(r'TARJ.*$', '', s, flags=re.IGNORECASE)
    cleaned = re.sub(r'PAN:.*$', '', cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip(',.- ')
    generic_words = {"PAGO", "COMPRA", "BIZUM", "TRANSFERENCIA", "RECIBO", "TRANSACCION", "DEVOLUCION", "MOVIMIENTO", "GASTO"}
    if len(cleaned) >= 4 and cleaned.upper() not in generic_words:
        return cleaned[:30].strip()
    return ""

def learn_rule_and_retroactively_apply(pattern: str, category: str, is_reimbursable: int = 0):
    """
    Adds rule to knowledge_base and updates matching transactions retroactively.
    Safeguarded against generic words.
    """
    clean_pat = pattern.strip().upper()
    generic_words = {"PAGO", "COMPRA", "BIZUM", "TRANSFERENCIA", "RECIBO", "TRANSACCION", "DEVOLUCION"}
    if len(clean_pat) < 3 or clean_pat in generic_words:
        return {"pattern": clean_pat, "category": category, "is_reimbursable": is_reimbursable, "updated_transactions": 0}

    conn = get_connection()
    cursor = conn.cursor()

    # Save to knowledge_base
    cursor.execute("""
    INSERT INTO knowledge_base (pattern, category, sample_amount, notes, frequency)
    VALUES (?, ?, 0, 'Aprendido directamente por el usuario', 2)
    ON CONFLICT(pattern) DO UPDATE SET
        category = excluded.category,
        notes = 'Actualizado por el usuario'
    """, (clean_pat, category))

    # Also save to category_rules
    cursor.execute("""
    INSERT INTO category_rules (pattern, category, is_reimbursable, priority)
    VALUES (?, ?, ?, 15)
    ON CONFLICT(pattern) DO UPDATE SET
        category = excluded.category,
        is_reimbursable = excluded.is_reimbursable,
        priority = 15
    """, (clean_pat, category, is_reimbursable))

    # Update existing transactions matching pattern
    status = "pending" if is_reimbursable else "none"
    search_term = f"%{clean_pat}%"

    cursor.execute("""
    UPDATE transactions
    SET category = ?,
        is_reimbursable = ?,
        reimbursement_status = ?,
        needs_clarification = 0,
        confidence = 1.0,
        notes = 'Regla confirmada por el usuario: ' || ?
    WHERE UPPER(description) LIKE ?
    """, (category, is_reimbursable, status, clean_pat, search_term))

    updated_count = cursor.rowcount
    conn.commit()
    conn.close()

    return {
        "pattern": clean_pat,
        "category": category,
        "is_reimbursable": is_reimbursable,
        "updated_transactions": updated_count
    }

def find_transfer_counterpart(tx_id: int):
    """
    Given a transaction ID, searches for reciprocal transfer counterparts in other accounts.
    Criteria:
      1. Different account: account != target.account
      2. Reciprocal amount: abs(candidate.amount + target.amount) < 0.05
      3. Date within 3 calendar days: abs(julianday(cand.date) - julianday(target.date)) <= 3.5
      4. Not already paired with another transaction
    """
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE id = ?", (tx_id,))
    target_row = cursor.fetchone()
    if not target_row:
        conn.close()
        return None
    target = dict(target_row)
    t_amt = target["amount"]
    t_date = target["date"]
    t_acc = target["account"]

    t_user_id = target.get("user_id")

    # Candidate query
    user_filter = "AND user_id = ?" if t_user_id else ""
    params = [t_date, tx_id, t_acc, t_amt, t_date, tx_id]
    if t_user_id:
        params.append(t_user_id)

    cursor.execute(f"""
    SELECT *, abs(julianday(date) - julianday(?)) as day_diff
    FROM transactions
    WHERE id != ?
      AND account != ?
      AND abs(amount + ?) < 0.05
      AND abs(julianday(date) - julianday(?)) <= 3.5
      AND (linked_tx_id IS NULL OR linked_tx_id = ?)
      {user_filter}
    ORDER BY day_diff ASC, id DESC
    """, params)
    candidates = [dict(r) for r in cursor.fetchall()]
    conn.close()

    if not candidates:
        return {
            "target": target,
            "candidate": None,
            "candidates": [],
            "confidence": 0.0,
            "auto_pairable": False,
            "message": "No se encontraron movimientos espejo en otras cuentas dentro de ±3 días."
        }

    scored = []
    target_desc = (target.get("description") or "").upper()
    for c in candidates:
        diff = float(c["day_diff"])
        conf = 0.85
        if diff < 0.5:
            conf = 0.99
        elif diff <= 1.5:
            conf = 0.95
        elif diff <= 2.5:
            conf = 0.90

        # Check concept keyword similarity
        c_desc = (c.get("description") or "").upper()
        t_words = {w for w in re.findall(r'[A-Z0-9]{4,}', target_desc) if w not in {"TRANSFERENCIA", "TRASPASO", "DIEGO", "HERNANDEZ", "TCACH", "FAVOR", "CUENTA", "INMEDIATA"}}
        c_words = {w for w in re.findall(r'[A-Z0-9]{4,}', c_desc) if w not in {"TRANSFERENCIA", "TRASPASO", "DIEGO", "HERNANDEZ", "TCACH", "FAVOR", "CUENTA", "INMEDIATA"}}
        common = t_words.intersection(c_words)
        if common:
            conf = min(1.0, conf + 0.1)

        c["match_confidence"] = round(conf, 2)
        scored.append(c)

    scored.sort(key=lambda x: (x["match_confidence"], -x["day_diff"]), reverse=True)
    best = scored[0]
    auto_pairable = (best["match_confidence"] >= 0.95 and (len(scored) == 1 or scored[0]["match_confidence"] > scored[1]["match_confidence"]))

    return {
        "target": target,
        "candidate": best,
        "candidates": scored,
        "confidence": best["match_confidence"],
        "auto_pairable": auto_pairable,
        "message": f"Encontrado movimiento espejo en {best['account']} ({best['amount']:+.2f}€ el {best['date']})"
    }

def pair_transfers(tx_id_1: int, tx_id_2: int):
    """
    Pairs two transactions as reciprocal sides of an internal transfer.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, date, account, amount, description FROM transactions WHERE id IN (?, ?)", (tx_id_1, tx_id_2))
    rows = cursor.fetchall()
    if len(rows) < 2:
        conn.close()
        return {"status": "error", "message": "Una o ambas transacciones no existen"}

    cursor.execute("""
    UPDATE transactions
    SET linked_tx_id = ?,
        category = 'Traspaso entre cuentas',
        needs_clarification = 0,
        confidence = 1.0,
        notes = coalesce(notes, '') || ' [Emparejado con ID #' || ? || ']'
    WHERE id = ?
    """, (tx_id_2, tx_id_2, tx_id_1))

    cursor.execute("""
    UPDATE transactions
    SET linked_tx_id = ?,
        category = 'Traspaso entre cuentas',
        needs_clarification = 0,
        confidence = 1.0,
        notes = coalesce(notes, '') || ' [Emparejado con ID #' || ? || ']'
    WHERE id = ?
    """, (tx_id_1, tx_id_1, tx_id_2))

    conn.commit()
    conn.close()

    return {"status": "paired", "tx_id_1": tx_id_1, "tx_id_2": tx_id_2}

def unpair_transfer(tx_id: int):
    """
    Unlinks a paired transfer.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT linked_tx_id FROM transactions WHERE id = ?", (tx_id,))
    row = cursor.fetchone()
    if not row or not row[0]:
        conn.close()
        return {"status": "not_paired"}

    other_id = row[0]
    cursor.execute("UPDATE transactions SET linked_tx_id = NULL WHERE id IN (?, ?)", (tx_id, other_id))
    conn.commit()
    conn.close()

    return {"status": "unpaired", "tx_id": tx_id, "other_id": other_id}

def auto_pair_internal_transfers(target_ids: list = None):
    """
    Scans for unpaired transfer transactions and pairs high-confidence matches.
    If target_ids is provided, focuses on those. Otherwise checks all unpaired transfers.
    Returns (paired_count, flagged_count)
    """
    conn = get_connection()
    cursor = conn.cursor()

    if target_ids:
        placeholders = ",".join("?" for _ in target_ids)
        cursor.execute(f"""
        SELECT id FROM transactions
        WHERE id IN ({placeholders})
          AND category = 'Traspaso entre cuentas'
          AND linked_tx_id IS NULL
        ORDER BY date DESC
        """, target_ids)
    else:
        cursor.execute("""
        SELECT id FROM transactions
        WHERE category = 'Traspaso entre cuentas'
          AND linked_tx_id IS NULL
        ORDER BY date DESC
        """)

    unpaired_ids = [r[0] for r in cursor.fetchall()]
    conn.close()

    paired_count = 0
    flagged_count = 0
    already_paired_ids = set()

    for tid in unpaired_ids:
        if tid in already_paired_ids:
            continue
        res = find_transfer_counterpart(tid)
        if not res or not res.get("candidate"):
            continue

        cand = res["candidate"]
        cand_id = cand["id"]
        if cand_id in already_paired_ids:
            continue

        if res.get("auto_pairable"):
            pair_transfers(tid, cand_id)
            already_paired_ids.add(tid)
            already_paired_ids.add(cand_id)
            paired_count += 1
        elif res.get("confidence", 0) >= 0.85:
            conn = get_connection()
            cur = conn.cursor()
            q = f"Posible traspaso con {cand['account']} ({cand['amount']:+.2f}€ el {cand['date']}). ¿Confirmar emparejamiento?"
            cur.execute("""
            UPDATE transactions
            SET needs_clarification = 1,
                suggested_category = 'Traspaso entre cuentas',
                clarification_question = ?
            WHERE id = ? AND linked_tx_id IS NULL
            """, (q, tid))
            conn.commit()
            conn.close()
            flagged_count += 1

    return paired_count, flagged_count
