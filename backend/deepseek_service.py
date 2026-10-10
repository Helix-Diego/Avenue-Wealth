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
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions"
MODEL_NAME = "deepseek-chat"

def get_ssl_context():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

def call_deepseek(messages: List[Dict[str, str]], temperature: float = 0.3, max_tokens: int = 4096) -> str:
    payload = {
        "model": MODEL_NAME,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    req = urllib.request.Request(
        DEEPSEEK_API_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
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
    Uses DeepSeek to classify ambiguous or unseen transactions based on Diego's categories and few-shots.
    """
    few_shots_text = "\n".join([
        f"- '{fs['concept']}' ({fs['amount']}€) -> Categoría: {fs['category']}"
        for fs in few_shots[:25]
    ])

    prompt = f"""Eres el agente financiero personal de Diego Hernández.
Tu tarea es clasificar la siguiente transacción bancaria en la categoría más precisa y determinar si puede ser un gasto de empresa reembolsable por BMC Software (empresa de Diego).

REGLAS DE DIEGO:
1. Diego trabaja en BMC Software y a veces adelanta con su tarjeta personal gasolina (Repsol, Cepsa, etc.), peajes o comidas de trabajo que luego su empresa le reembolsa. Si el concepto es de gasolina o viaje laboral y no se especifica si es personal o trabajo, debes indicar 'needs_clarification': true.
2. Si es nómina de BMC Software, la categoría es 'Sueldo'.
3. Préstamos familiares y compras compartidas con familiares (Javier Hernandez Porras, Elisa Tcach, Alejandra Hernandez Tcach, cuotas Endesa) se categorizan como 'Prestamos familiares'.
4. Go Fit, Padel, Playtomic es 'Deporte/Gimnasio'.
5. Alquiler de Agustín De La Fuente Martínez es 'Vivienda'.
6. Gastos comunes con Diego Hernández Tcach o ajustes de luz/gas es 'Gastos Vivienda'.
7. Inversión mensual o Fidelity MSCI World es 'Inversiones y ahorros'.

CATEGORÍAS DISPONIBLES:
{json.dumps(categories, ensure_ascii=False)}

EJEMPLOS DE REFERENCIA DE LA KNOWLEDGE BASE DE DIEGO:
{few_shots_text}

TRANSACCIÓN A CLASIFICAR:
- Concepto: "{description}"
- Importe: {amount} €

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{{
  "category": "nombre exacto de una de las categorías disponibles",
  "is_reimbursable": 0 o 1,
  "needs_clarification": true o false,
  "clarification_question": "pregunta para Diego si hay duda, o null si está seguro",
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
        # Clean response
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
        print(f"DeepSeek categorization fallback: {e}")
        return {
            "category": "Otras compras",
            "is_reimbursable": 0,
            "needs_clarification": True,
            "clarification_question": f"No se pudo categorizar con certeza: {description}",
            "confidence": 0.5,
            "explanation": "Fallback por timeout o error de análisis"
        }

def chat_financial_assistant(
    messages: List[Dict[str, str]],
    context_text: str,
    selected_month: Optional[str] = None
) -> str:
    """
    Interactive financial intelligence chat with DeepSeek V3 (Light).
    Has full access to Diego's multi-month transactions, bank accounts, portfolio,
    subscriptions, top merchants, and reimbursable company expenses.
    """
    system_prompt = f"""Eres el Asistente de Inteligencia Financiera Personal de Diego Hernández.
Esta aplicación es para la gestión patrimonial y financiera estrictamente PERSONAL de Diego.

Tienes acceso completo a la base de datos de movimientos bancarios (550 transacciones reales), cuentas (Santander *3012, Santander Ahorro *1842, Iberia Cards *2366, N26 *7089, Amex Platinum), cartera de inversión en Fidelity MSCI World y acciones en Google Sheets cotizadas en tiempo real con Finnhub.

=======================================================
PANORAMA FINANCIERO Y DATOS DE LA BASE DE DATOS DE DIEGO:
=======================================================
{context_text}
=======================================================

REGLAS FUNDAMENTALES Y DIRECTRICES DE ANÁLISIS:
1. GASTOS REEMBOLSABLES DE BMC SOFTWARE:
   - Diego a veces paga gastos de trabajo (gasolina Repsol/Cepsa, dietas, viajes laborales) con sus tarjetas personales.
   - Estos gastos son REEMBOLSABLES y NUNCA deben computar como gasto personal ni inflar su gasto mensual. Son un crédito a favor de Diego pendiente de liquidar por parte de BMC Software.

2. GASTOS FIJOS Y SUSCRIPCIONES:
   - Identifica con precisión sus compromisos fijos: Alquiler de Agustín De La Fuente (~654 €/mes), Go Fit Gimnasio (~69,95 €/mes), Pádel Fuencarral (~42,72 €/mes), Apple (~7,24 €/mes), Legalitas, etc.

3. FONDO INDEXADO MSCI WORLD (IE00BYX5P602):
   - Fidelity MSCI World Index Fund P-ACC-EUR.
   - Tiene 1.436,51 participaciones valoradas en >17.300 € (+20,8% de revalorización histórica).
   - Cuando se hable de ahorro o inversión periódica, simula aportaciones a este fondo indexado.

4. ESTILO Y FORMATO DE RESPUESTA:
   - Responde SIEMPRE en español de España con un tono cercano, analítico, riguroso y profesional (estilo Copilot Money, Notion y banca privada).
   - Usa siempre FORMATO MARKDOWN ENRIQUECIDO:
     * Tablas markdown para comparar meses, desglosar gastos por categoría o comercio, y simular escenarios.
     * Cifras en negrita con dos decimales y el símbolo € (ej. **1.233,19 €**).
     * Destaca recomendaciones y alertas clave con bloques de cita o badges:
       > 💡 **Recomendación Proactiva**: ...
       > 💼 **Gastos Reembolsables BMC**: ...
       > ⚠️ **Atención / Money Leak**: ...
   - Si Diego te pide simulaciones de inversión (ej. "qué pasa si aporto 300€ al mes al MSCI World"), calcula proyecciones matemáticas compuestas a 5, 10 y 15 años considerando rentabilidades medias históricas del 7% y 8% anual.
   - Sé proactivo: además de responder a la pregunta concreta, detecta patrones interesantes, posibles fugas de dinero (gastos que han subido sin motivo) y oportunidades de optimización.
"""

    api_messages = [{"role": "system", "content": system_prompt}] + messages
    return call_deepseek(api_messages, temperature=0.25, max_tokens=4096)

