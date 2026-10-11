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

DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"

def get_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def test_deepseek_connection(api_key: str = None, model: str = None) -> Dict[str, Any]:
    """
    Tests connection to DeepSeek API with a minimal ping.
    Returns latency and success status.
    """
    import time
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

def call_deepseek(messages: List[Dict[str, str]], temperature: float = 0.3, max_tokens: int = 4096) -> str:
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

    with urllib.request.urlopen(req, context=get_ssl_context(), timeout=60) as res:
        data = json.loads(res.read().decode('utf-8'))
        return data["choices"][0]["message"]["content"]

def categorize_with_ai(
    description: str,
    amount: float,
    categories: List[str],
    few_shots: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Uses DeepSeek to classify ambiguous or unseen transactions based on categories and few-shots.
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
        for fs in few_shots[:20]
    ])

    user_name = cfg["user_name"]
    company_rule = ""
    if cfg["company_enabled"] and cfg["company_name"]:
        company_rule = f"Si el concepto parece ser un desplazamiento, gasolina o comida por trabajo para {cfg['company_name']}, o si contiene '{cfg['company_name']}', marca 'is_reimbursable': 1 o pide aclaración."

    prompt = f"""Eres el agente financiero personal de {user_name}.
Tu tarea es clasificar la siguiente transacción bancaria en la categoría más adecuada de la lista proporcionada.

DIRECTRICES:
1. Analiza el comercio o concepto bancario.
2. {company_rule}
3. Si el concepto es ambiguo o no estás seguro al 100%, indica 'needs_clarification': true y formula una pregunta clara para el usuario en 'clarification_question'.

CATEGORÍAS DISPONIBLES:
{json.dumps(categories, ensure_ascii=False)}

EJEMPLOS DE REFERENCIA:
{few_shots_text}

TRANSACCIÓN A CLASIFICAR:
- Concepto: "{description}"
- Importe: {amount} €

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{{
  "category": "nombre exacto de una de las categorías disponibles",
  "is_reimbursable": 0 o 1,
  "needs_clarification": true o false,
  "clarification_question": "pregunta para el usuario si hay duda, o null si está seguro",
  "confidence": número entre 0.0 y 1.0,
  "explanation": "breve motivo"
}}"""

    try:
        raw_resp = call_deepseek(
            [
                {"role": "system", "content": "Eres un asistente financiero experto y preciso. Devuelve únicamente JSON válido."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.1,
            max_tokens=250
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
        print(f"DeepSeek categorization note: {e}")
        return {
            "category": "Otras compras",
            "is_reimbursable": 0,
            "needs_clarification": True,
            "clarification_question": f"¿Cómo deseas categorizar '{description}' ({amount:.2f}€)?",
            "confidence": 0.5,
            "explanation": "Fallback por conexión o modelo IA"
        }

def chat_financial_assistant(
    messages: List[Dict[str, str]],
    context_text: str,
    selected_month: Optional[str] = None
) -> str:
    """
    Interactive financial intelligence chat with DeepSeek.
    """
    cfg = get_deepseek_config()
    user_name = cfg["user_name"]

    system_prompt = f"""Eres el Asistente de Inteligencia Financiera Personal de {user_name}.
Tu objetivo es analizar sus finanzas personales, ofrecer recomendaciones proactivas, resolver dudas y ayudar a optimizar el ahorro y la inversión.

=======================================================
PANORAMA FINANCIERO Y DATOS DE LA BASE DE DATOS:
=======================================================
{context_text}
=======================================================

DIRECTRICES DE ANÁLISIS:
1. Responde SIEMPRE en español con un tono cercano, analítico, riguroso y profesional (estilo Copilot Money, Notion y banca privada).
2. Usa FORMATO MARKDOWN ENRIQUECIDO:
   * Tablas markdown para comparar meses o desglosar gastos por categoría y comercio.
   * Cifras en negrita con dos decimales y el símbolo € (ej. **1.233,19 €**).
   * Destaca recomendaciones y alertas clave con bloques de cita o badges:
     > 💡 **Recomendación Proactiva**: ...
     > ⚠️ **Atención**: ...
3. Si el usuario te pide simulaciones de inversión o ahorro, calcula proyecciones matemáticas realistas a 5, 10 y 15 años.
4. Sé proactivo: además de responder a la pregunta concreta, detecta patrones interesantes y oportunidades de optimización.
"""

    api_messages = [{"role": "system", "content": system_prompt}] + messages
    return call_deepseek(api_messages, temperature=0.25, max_tokens=4096)


