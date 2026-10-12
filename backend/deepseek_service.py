import os
import json
import urllib.request
import ssl
from typing import List, Dict, Any, Optional

def _load_env():
    for p in [os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"), ".env"]:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            os.environ.setdefault(k.strip(), v.strip().strip("'\""))
            except Exception:
                pass

_load_env()

def get_deepseek_config() -> Dict[str, Any]:
    from backend.database import get_connection
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    model = "deepseek-chat"
    ai_enabled = True
    user_name = "Usuario"
    company_name = ""
    company_enabled = True
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT key, value FROM user_settings WHERE key IN ('deepseek_api_key', 'deepseek_model', 'ai_enabled', 'user_name', 'company_name', 'enable_company_expenses')")
        rows = dict(cursor.fetchall())
        conn.close()
        if rows.get("deepseek_api_key"):
            api_key = rows["deepseek_api_key"]
        if rows.get("deepseek_model"):
            model = rows["deepseek_model"]
        if "ai_enabled" in rows:
            ai_enabled = (rows["ai_enabled"] == "1")
        if rows.get("user_name"):
            user_name = rows["user_name"]
        if rows.get("company_name"):
            company_name = rows["company_name"]
        if "enable_company_expenses" in rows:
            company_enabled = (rows["enable_company_expenses"] == "1")
    except Exception as e:
        print("Notice loading deepseek config:", e)

    return {
        "api_key": api_key,
        "model": model,
        "ai_enabled": ai_enabled,
        "user_name": user_name,
        "company_name": company_name,
        "company_enabled": company_enabled
    }

import re

try:
    import certifi
    _DEFAULT_CA_FILE = certifi.where()
except ImportError:
    _DEFAULT_CA_FILE = None

PROMPT_INJECTION_PATTERNS = [
    r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"(?i)disregard\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"(?i)system\s+prompt",
    r"(?i)reveal\s+(the\s+)?(secret|api[_\s-]?key|master\s+key|system\s+instructions)",
    r"(?i)you\s+are\s+now\s+(DAN|unfiltered|jailbroken)",
    r"(?i)DAN\s+mode",
    r"(?i)developer\s+mode",
    r"(?i)act\s+as\s+(an?\s+)?(unfiltered|jailbroken|evil|developer)",
    r"(?i)jailbreak",
    r"(?i)bypass\s+(the\s+)?guardrails?",
    r"(?i)(olvida|desestima|ignora)\s+(todas\s+las\s+)?(reglas|instrucciones|directrices)",
    r"(?i)repite\s+(el\s+)?(system\s+prompt|las\s+instrucciones\s+del\s+sistema)",
    r"(?i)(muestra|revela|dame)\s+(el\s+system\s+prompt|las\s+contraseñas|las\s+claves|las\s+instrucciones)",
]

def sanitize_user_input(text: str) -> str:
    """Sanitizes user prompt inputs against jailbreaks and instruction override attempts."""
    if not text:
        return ""
    clean = text.strip()
    for pattern in PROMPT_INJECTION_PATTERNS:
        if re.search(pattern, clean):
            return "[Consulta rechazada por los guardrails de seguridad de Avenue Wealth: intento de alteración de directrices o extracción del sistema detectado.]"
    return clean[:4000]

DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

def get_ssl_context():
    """Returns secure SSL context with strict hostname verification and Mozilla CA certificates."""
    if _DEFAULT_CA_FILE and os.path.exists(_DEFAULT_CA_FILE):
        return ssl.create_default_context(cafile=_DEFAULT_CA_FILE)
    return ssl.create_default_context()

def test_deepseek_connection(api_key: str = None, model: str = None) -> Dict[str, Any]:
    """
    Tests connection to DeepSeek API with a minimal ping.
    Returns latency and success status.
    """
    import time
    reset_circuit_breaker()
    cfg = get_deepseek_config()
    key_to_use = api_key if (api_key is not None and api_key.strip()) else cfg["api_key"]
    model_to_use = model if (model is not None and model.strip()) else cfg["model"]

    if not key_to_use or not key_to_use.strip():
        return {
            "success": False,
            "message": "No se ha configurado ninguna clave API de DeepSeek.",
            "latency_ms": None
        }

    payload = {
        "model": model_to_use,
        "messages": [
            {"role": "user", "content": "Hola"}
        ],
        "max_tokens": 10
    }

    req = urllib.request.Request(
        DEEPSEEK_API_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {key_to_use.strip()}"
        }
    )

    start_time = time.time()
    try:
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=12) as res:
            data = json.loads(res.read().decode('utf-8'))
            elapsed_ms = int((time.time() - start_time) * 1000)
            if "choices" in data and len(data["choices"]) > 0:
                return {
                    "success": True,
                    "message": f"Conexión exitosa con DeepSeek ({elapsed_ms} ms). Modelo: {model_to_use}",
                    "latency_ms": elapsed_ms,
                    "model": model_to_use
                }
            return {
                "success": False,
                "message": "Respuesta inesperada de la API de DeepSeek.",
                "latency_ms": elapsed_ms
            }
    except urllib.error.HTTPError as e:
        try:
            err_body = json.loads(e.read().decode('utf-8'))
            err_msg = err_body.get("error", {}).get("message", str(e))
        except Exception:
            err_msg = str(e)
        return {
            "success": False,
            "message": f"Error HTTP {e.code}: {err_msg}",
            "latency_ms": None
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Error de conexión: {str(e)}",
            "latency_ms": None
        }

_CIRCUIT_BREAKER_ACTIVE = False

def reset_circuit_breaker():
    global _CIRCUIT_BREAKER_ACTIVE
    _CIRCUIT_BREAKER_ACTIVE = False

def call_deepseek(messages: List[Dict[str, str]], temperature: float = 0.3, max_tokens: int = 4096, timeout: int = 25) -> str:
    global _CIRCUIT_BREAKER_ACTIVE
    if _CIRCUIT_BREAKER_ACTIVE:
        raise ValueError("DeepSeek temporalmente omitido por error 401/403 en la clave.")

    cfg = get_deepseek_config()
    api_key = cfg["api_key"]
    model_name = cfg["model"]

    if not api_key:
        raise ValueError("Clave API de DeepSeek no configurada. Ve a Ajustes para configurarla.")

    payload = {
        "model": model_name,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    req = urllib.request.Request(
        DEEPSEEK_API_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}"
        }
    )

    try:
        with urllib.request.urlopen(req, context=get_ssl_context(), timeout=timeout) as res:
            data = json.loads(res.read().decode('utf-8'))
            return data["choices"][0]["message"]["content"]
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            _CIRCUIT_BREAKER_ACTIVE = True
            print(f"DeepSeek clave inválida o expirada ({e.code}). Activado circuit breaker para evitar esperas.")
        raise

def batch_categorize_with_ai(
    items: List[Dict[str, Any]],
    categories: List[str]
) -> Dict[str, Dict[str, Any]]:
    """
    Classifies a batch of transactions (up to 25 items) in a SINGLE DeepSeek call.
    Returns a dict mapping item key/description to categorization result.
    Enforces a strict 6-second timeout so file imports never hang.
    """
    cfg = get_deepseek_config()
    if not cfg["ai_enabled"] or not cfg["api_key"] or not items:
        return {}

    items_to_send = items[:25]
    prompt_items = [
        {"id": idx, "concepto": it["description"], "importe": it["amount"]}
        for idx, it in enumerate(items_to_send)
    ]

    prompt = f"""Eres un clasificador bancario ultra-rápido. Clasifica las siguientes transacciones bancarias en la categoría más adecuada.

CATEGORÍAS PERMITIDAS:
{json.dumps(categories, ensure_ascii=False)}

TRANSACCIONES:
{json.dumps(prompt_items, ensure_ascii=False)}

Devuelve ÚNICAMENTE un array JSON válido donde cada objeto tenga:
{{"id": número, "category": "categoría exacta", "confidence": 0.0 a 1.0, "is_reimbursable": 0 o 1, "needs_clarification": true o false}}"""

    try:
        raw_resp = call_deepseek(
            [
                {"role": "system", "content": "Devuelve exclusivamente un array JSON válido sin texto adicional."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=900,
            timeout=7
        )
        clean = raw_resp.strip()
        if clean.startswith("```json"):
            clean = clean[7:]
        if clean.startswith("```"):
            clean = clean[3:]
        if clean.endswith("```"):
            clean = clean[:-3]
        parsed = json.loads(clean.strip())
        results = {}
        if isinstance(parsed, list):
            for res in parsed:
                rid = res.get("id")
                if rid is not None and 0 <= rid < len(items_to_send):
                    original_desc = items_to_send[rid]["description"]
                    cat = res.get("category", "Otras compras")
                    if cat not in categories:
                        cat = "Otras compras"
                    conf = float(res.get("confidence", 0.85))
                    needs_c = bool(res.get("needs_clarification", False)) or (conf < 0.85)
                    results[original_desc] = {
                        "category": cat,
                        "confidence": conf,
                        "is_reimbursable": int(res.get("is_reimbursable", 0)),
                        "needs_clarification": 1 if needs_c else 0,
                        "clarification_question": f"¿Es '{cat}' la categoría correcta para '{original_desc}'?" if needs_c else None,
                        "notes": "Clasificado por DeepSeek AI (Lote rápido)"
                    }
        return results
    except Exception as e:
        print(f"Batch DeepSeek categorization note (skipping AI for speed): {e}")
        return {}

def categorize_with_ai(
    description: str,
    amount: float,
    categories: List[str],
    few_shots: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Uses DeepSeek to classify ambiguous or unseen transactions based on categories and few-shots.
    Uses strict 4-second timeout to prevent stalling imports.
    """
    cfg = get_deepseek_config()
    if not cfg["ai_enabled"] or not cfg["api_key"]:
        return {
            "category": "Otras compras",
            "is_reimbursable": 0,
            "needs_clarification": True,
            "clarification_question": f"¿Cómo deseas categorizar '{description}' ({amount:.2f}€)?",
            "confidence": 0.5,
            "explanation": "Modelo IA no configurado o inactivo"
        }

    few_shots_text = "\n".join([
        f"- '{fs['concept']}' ({fs['amount']}€) -> Categoría: {fs['category']}"
        for fs in few_shots[:10]
    ])

    prompt = f"""Eres un agente financiero. Clasifica la transacción:
Concepto: "{description}", Importe: {amount} €
Categorías: {json.dumps(categories, ensure_ascii=False)}
Ejemplos:
{few_shots_text}

Responde SOLO en JSON:
{{"category": "categoría exacta", "is_reimbursable": 0 o 1, "needs_clarification": true o false, "confidence": 0.0 a 1.0, "explanation": "breve motivo"}}"""

    try:
        raw_resp = call_deepseek(
            [
                {"role": "system", "content": "Devuelve exclusivamente JSON válido."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=200,
            timeout=5
        )
        clean_json = raw_resp.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.startswith("```"):
            clean_json = clean_json[3:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
        
        parsed = json.loads(clean_json.strip())
        return parsed
    except Exception as e:
        print(f"DeepSeek single categorization fallback ({e})")
        return {
            "category": "Otras compras",
            "is_reimbursable": 0,
            "needs_clarification": True,
            "clarification_question": f"¿Cómo deseas categorizar '{description}' ({amount:.2f}€)?",
            "confidence": 0.5,
            "explanation": "Fallback rápido por tiempo límite de conexión"
        }

def chat_financial_assistant(
    messages: List[Dict[str, str]],
    context_text: str,
    selected_month: Optional[str] = None
) -> str:
    """
    Interactive financial intelligence chat with DeepSeek for Avenue Wealth.
    """
    cfg = get_deepseek_config()
    clean_name = re.sub(r'[^\w\s\.-]', '', cfg.get("user_name") or "Usuario").strip()[:40] or "Usuario"

    system_prompt = f"""Eres el Asesor de Inteligencia Financiera y Gestión Patrimonial de Avenue Wealth para {clean_name}.
Avenue Wealth es una plataforma premium de banca privada y optimización patrimonial integral. Tu misión es proporcionar asesoramiento financiero de nivel institucional: riguroso, proactivo, claro y adaptado a la realidad del usuario.

=======================================================
ESTADO PATRIMONIAL Y DATOS FINANCIEROS EN TIEMPO REAL:
=======================================================
{context_text}
=======================================================

PRINCIPIOS FUNDAMENTALES DE AVENUE WEALTH:
1. **Patrimonio Neto Holístico (Net Worth)**:
   * Patrimonio Neto Real = Activos Totales (Liquidez bancaria + Fondos indexados + Acciones + Reembolsos pendientes de cobrar) - Pasivos Totales (Deuda viva de préstamos y financiaciones).
   * Distingue con precisión entre liquidez disponible y patrimonio neto consolidado.

2. **Deduplicación Multibanco y Traspasos Internos**:
   * Los traspasos entre cuentas propias y las liquidaciones mensuales de tarjetas de crédito no son gastos de consumo adicionales. Nunca deben duplicarse.
   * Los ingresos por Bizum recibidos de amigos/familiares como compensación amortiguan el gasto neto real de la categoría.

3. **Separación Estricta Empresa vs. Personal**:
   * Los gastos de empresa pagados con tarjetas personales son adelantos pendientes de devolución (un derecho de cobro/activo). NO son gastos personales de vida ni reducen la tasa de ahorro real del usuario.
   * La recepción de la transferencia de liquidación de la empresa NO es salario o renta nueva; es la cancelación de un crédito pendiente.

4. **Optimización de Deuda Viva y Financiaciones**:
   * Analiza continuamente préstamos y créditos (saldo vivo, cuota mensual, TIN/intereses y fecha fin prevista).
   * Prioriza amortizaciones anticipadas cuando el coste financiero (TIN/TAE) supere la rentabilidad neta esperada libre de riesgo.

5. **Estrategia Patrimonial y Aportaciones Periódicas (DCA)**:
   * Regla de oro: Colchón de emergencia intocable de 3 a 6 meses de gastos fijos/operativos (Burn Rate).
   * Aportaciones sistemáticas (DCA) a fondos indexados globales (Fidelity MSCI World / S&P 500) y carteras diversificadas.
   * Si el usuario solicita simulaciones o proyecciones, elabora cálculos matemáticos rigurosos a 5, 10 y 15 años mostrando el impacto del interés compuesto bajo escenarios realistas (conservador 4%, base 7%, optimista 9% neto anual).

DIRECTRICES DE FORMATO Y ESTILO:
1. Responde SIEMPRE en español con tono de banca privada / family office: analítico, ejecutivo, constructivo y fundamentado en números.
2. Formato numérico europeo: siempre con dos decimales y el símbolo € (ej. **1.450,20 €**).
3. Utiliza tablas markdown para desglosar comparativas mensuales, gastos por categoría o planes de amortización.
4. Resalta conclusiones y alertas clave con bloques visuales:
   > 💡 **Recomendación Estratégica Avenue**: ...
   > ⚠️ **Atención / Alerta de Flujo o Deuda**: ...
   > 📊 **Impacto Patrimonial**: ...
5. Sé proactivo: además de resolver la pregunta exacta del usuario, identifica patrones de gasto hormiga, desviaciones respecto a meses previos o ventajas fiscales/patrimoniales en sus cifras.
"""

    sanitized_messages = []
    for m in messages:
        r = m.get("role", "user")
        if r not in ("user", "assistant"):
            r = "user"
        content = sanitize_user_input(str(m.get("content", "")))
        sanitized_messages.append({"role": r, "content": content})

    api_messages = [{"role": "system", "content": system_prompt}] + sanitized_messages
    return call_deepseek(api_messages, temperature=0.25, max_tokens=4096)


