# 🏦 Diego Bank Agent — Asistente Financiero & Control de Capital

Aplicación local con agente inteligente para el control financiero, categorización bancaria multi-cuenta, gestión de gastos de empresa reembolsables, seguimiento de cartera de acciones en tiempo real (Google Sheets) y fondo indexado MSCI World.

Diseñado con una estética **Notion minimalista** con colores acentuados, limpio, rápido y 100% privado en tu Mac.

---

## 🚀 Inicio Rápido (1 solo clic)

Abre tu terminal en la carpeta del proyecto y ejecuta:

```bash
cd "/Users/diegohernandeztcach/Library/CloudStorage/OneDrive-BMCHelix/Documentos/Personal/Bank Agent"
./run.sh
```

El script se encargará automáticamente de:
1. Activar el entorno virtual Python y sus dependencias (`FastAPI`, `Uvicorn`, etc.).
2. Sincronizar cotizaciones en vivo y datos iniciales en la base de datos local SQLite.
3. Levantar la aplicación web en **http://localhost:8000** y abrirla en tu navegador por defecto.

---

## 🌟 Funcionalidades Principales

### 1. 🤖 Agente Inteligente & Cola de Dudas
- Cuando el agente procesa tus extractos bancarios y tiene dudas sobre un movimiento (por ejemplo, una gasolinera como Repsol o Cepsa donde no está claro si es personal o trabajo, un vuelo, comida o un Bizum ambiguo), **lo añade a la pestaña "Dudas del Agente"**.
- En un solo clic puedes responder:
  - *💼 Es Gasto de Empresa (Reembolsable)*
  - *👤 Es Gasto Personal*
- Incluye **aprendizaje continuo**: si marcas la casilla *"Recordar regla"*, el agente aprende el patrón para que no te vuelva a preguntar en futuros extractos.

### 2. 🛡️ Gastos de Empresa & Devoluciones (BMC Helix)
- **Problema resuelto**: Cuando pagas gasolina o comidas de trabajo con tu tarjeta personal de Santander, Amex o Iberia Cards, la empresa te lo devuelve después.
- **Tratamiento especial**: El agente **aísla estos gastos y no los computa en tu coste de vida mensual ni infla tu gasto de gasolina personal**.
- Panel dedicado que muestra:
  - **Total adelantado de tu bolsillo**
  - **Devoluciones cobradas de la empresa**
  - **Saldo pendiente de cobrar** (lo que la empresa te debe en cada momento).
  - Botón de liquidación rápida cuando BMC te transfiere los gastos.

### 3. 📈 Portfolio & Capital Global
- **Conexión en directo con tu Google Sheet**:
  - Lee tu hoja de cálculo: [Google Sheet Acciones](https://docs.google.com/spreadsheets/d/1t5XvfCTcJuwpyTsuJyqj_BBE88u5OOobwsUe9Mp7BCY/edit?usp=sharing)
  - Extrae las posiciones de la pestaña *Resumen*: **UPST, INTC, SMCI, FLNC, OKLO**.
  - Obtiene cotizaciones en tiempo real vía Yahoo Finance y calcula la ganancia/pérdida no realizada en USD y EUR (con conversión de divisa EUR/USD en tiempo real).
- **Fondo Indexado MSCI World (`IE00BYX5P602`)**:
  - Fidelity MSCI World Index Fund P-ACC-EUR.
  - Seguimiento del Valor Liquidativo (NAV) en tiempo real (~12,10 €).
  - Modal interactivo para registrar aportaciones periódicas mensuales o aportaciones puntuales, calculando automáticamente las participaciones adquiridas.
- **Capital Global (Patrimonio Neto Consolidado)**:
  - Liquidez en cuentas (Santander, N26, etc.) + Acciones USA + Fondo MSCI + Crédito pendiente de cobro de BMC.

### 4. 🔮 Pronósticos de Gasto & Recomendaciones
- Cálculo de **velocidad de gasto diario (burn rate)** a lo largo del mes.
- Proyección de gasto total a cierre de mes y **tasa de ahorro neta estimada**.
- **Presupuesto diario seguro** para el resto de días del mes.
- **Recomendaciones dinámicas**: capacidad de aportación sugerida al fondo MSCI, alertas de ocio o avisos de notas de gastos pendientes de pasar a la empresa.

### 5. 📥 Importación Multi-Banco
Soporta arrastrar y soltar extractos en formato CSV y Excel de:
- **Banco Santander**
- **American Express**
- **Iberia Cards**
- **N26**
- **Formato Genérico** (auto-detecta fecha, comercio, importe y divisa).
- Incluye extractos de prueba predefinidos para probar el funcionamiento con un clic.

---

## 🛠️ Estructura del Proyecto

```
Bank Agent/
├── backend/
│   ├── app.py              # Servidor API FastAPI y servicio estático
│   ├── database.py         # Modelos SQLite y persistencia
│   ├── categorizer.py      # Motor inteligente de categorización y detección de dudas
│   ├── bank_parser.py      # Parsers específicos (Santander, Amex, Iberia Cards, N26)
│   ├── portfolio.py        # Sincronización Google Sheets y cotizaciones Yahoo/FT
│   ├── forecast.py         # Motor de pronósticos de gasto y recomendaciones
│   └── seed_data.py        # Generador de datos iniciales y extractos de ejemplo
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx              # Navegación estilo Notion
│   │   │   ├── DashboardView.jsx        # KPIs, gráficos y avisos
│   │   │   ├── ClarificationQueue.jsx   # Cola interactiva de dudas del agente
│   │   │   ├── TransactionsView.jsx     # Tabla base de datos con filtros
│   │   │   ├── CompanyExpensesView.jsx  # Control de gastos reembolsables BMC
│   │   │   ├── PortfolioView.jsx        # Acciones Google Sheets y Fondo MSCI
│   │   │   ├── ForecastView.jsx         # Velocidad de gasto y recomendaciones
│   │   │   ├── ImportView.jsx           # Importador multi-banco drag & drop
│   │   │   ├── NewTransactionModal.jsx  # Modal nuevo movimiento
│   │   │   └── MsciContributionModal.jsx# Modal aportación fondo MSCI
│   │   └── index.css                    # Estilos Notion con Tailwind v4
│   └── dist/                            # Bundle de producción servido por FastAPI
├── data/
│   ├── bank_agent.db                    # Base de datos SQLite
│   └── sample_statements/               # Ficheros de ejemplo (Santander, Amex, etc.)
├── run.sh                               # Script de ejecución en 1 clic
└── README.md
```

---

## 🎨 Modo Claro / Modo Oscuro
Dispone de selector de tema accesible en la barra lateral, respetando los contrastes y paleta cromática minimalista de Notion (`#fbfbfa` en claro y `#191919` en oscuro).
