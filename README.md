# 🏦 Spend Agent — Asistente Financiero & Control de Capital Inteligente

Aplicación local con agente inteligente para el control financiero, categorización bancaria multi-cuenta, gestión de gastos de empresa reembolsables, seguimiento de cartera de acciones en tiempo real vía **Finnhub** y fondos de inversión indexados y activos por código **ISIN**.

Diseñado con una estética **Notion minimalista**, rápido, configurable y 100% privado en tu ordenador.

---

## 🚀 Inicio Rápido (Local)

Abre tu terminal en la carpeta del proyecto y ejecuta:

```bash
./run.sh
```

El script se encargará automáticamente de:
1. Activar el entorno virtual Python y sus dependencias (`FastAPI`, `Uvicorn`, etc.).
2. Sincronizar cotizaciones en vivo y datos iniciales en la base de datos local SQLite.
3. Servir la aplicación web en **http://localhost:8000** y abrirla en tu navegador por defecto.
4. Si es la primera vez que abres la aplicación, te recibirá el asistente de configuración inicial para personalizar tus bancos, alias, categorías e IA.

---

## 🌟 Funcionalidades Principales

### 1. ⚙️ Ajustes de Bancos & Alias Personalizados
- **Activación/Desactivación de Bancos**: Soporte para Banco Santander, BBVA, CaixaBank, Openbank, American Express, Iberia Cards, N26 y formato genérico.
- **Alias Personalizados**: Asigna a cualquier banco un alias personalizado (por ejemplo, `Banco Santander` → *"Santander Nómina"* o *"Cuenta Conjunta"*).
- **Reflejo Automático**: Los alias se sincronizan instantáneamente en los filtros por cuenta de las transacciones, etiquetas de extractos y selectores de aportaciones.

### 2. 🤖 Agente Inteligente & Conexión con Modelos (DeepSeek)
- Configuración de proveedor de IA en la pestaña de Ajustes (compatible de forma nativa con **DeepSeek** y otros proveedores).
- Análisis conversacional de tus finanzas, desglose por categorías y detección inteligente de gastos ambiguos.
- **Cola de Dudas**: Resuelve con un solo clic si un gasto es personal o reembolsable por tu empresa, con aprendizaje automático de reglas.

### 3. 📈 Cartera de Acciones en Tiempo Real (Finnhub API)
- **Búsqueda en Vivo**: Busca cualquier activo global en tiempo real mediante el buscador conectado a la API de **Finnhub** (Apple, Microsoft, Tesla, Santander, etc.).
- **Gestión de Posiciones**: Registra número de acciones, precio medio de compra y divisa (USD / EUR).
- **Cotizaciones en Directo**: Precios en vivo, variación en 24h, valoración total en euros y cálculo de P&L (ganancia/pérdida no realizada).

### 4. 🌍 Fondos de Inversión Genéricos por Código ISIN
- **Cualquier Fondo del Mercado**: Registra cualquier fondo indexado o de gestión activa utilizando su código ISIN de referencia (ej. `IE00BYX5P602`, `LU0996177134`, `ES0152769032`).
- **Consulta Automática de NAV**: Obtiene el nombre y valor liquidativo en tiempo real a través de Financial Times Markets y Yahoo Finance.
- **Historial de Aportaciones**: Registra tus suscripciones periódicas asociando la cuenta origen (con alias de banco), calculando automáticamente las participaciones suscritas.

### 5. 🛡️ Gastos de Empresa & Devoluciones
- Aísla los gastos de trabajo que adelantas con tus tarjetas personales.
- Control en tiempo real del saldo pendiente de reembolso por parte de tu empresa sin inflar tu coste de vida personal.

### 6. 🔮 Simulador de Interés Compuesto & Planificador de Objetivos
- Proyección de ahorro y libertad financiera adaptada a tus hábitos de gasto reales de los últimos meses.
- Simulador de interés compuesto con aportaciones periódicas y rentabilidad estimada.

---

## 🛠️ Estructura del Proyecto

```
Spend Agent / Bank Agent/
├── backend/
│   ├── app.py                   # Servidor API FastAPI y servicio estático
│   ├── database.py              # Modelos SQLite, migraciones y persistencia
│   ├── categorizer.py           # Motor inteligente de categorización y detección de dudas
│   ├── bank_parser.py           # Parsers específicos (Santander, BBVA, Amex, Iberia Cards, N26)
│   ├── portfolio.py             # Finnhub API en directo y scraping NAV de fondos por ISIN
│   ├── forecast.py              # Motor de pronósticos de gasto y recomendaciones
│   └── financial_analyst.py     # Integración con DeepSeek y agente analista financiero
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx              # Navegación estilo Notion
│   │   │   ├── DashboardView.jsx        # KPIs, gráficos y avisos
│   │   │   ├── SettingsView.jsx         # Ajustes de bancos, alias, categorías e IA
│   │   │   ├── TransactionsView.jsx     # Tabla base de datos con filtros por alias
│   │   │   ├── PortfolioView.jsx        # Cartera Finnhub y Fondos de Inversión ISIN
│   │   │   ├── FundContributionModal.jsx# Modal de aportación a fondos con alias bancarios
│   │   │   └── ImportView.jsx           # Importador multi-banco drag & drop
│   │   └── index.css                    # Estilos Notion con Tailwind v4
│   └── dist/                            # Bundle de producción servido por FastAPI
├── data/
│   └── bank_agent.db                    # Base de datos SQLite local
├── run.sh                               # Script de arranque en 1 clic
└── README.md
```

---

## 🎨 Modo Claro / Modo Oscuro
Dispone de selector de tema accesible en la barra lateral, respetando los contrastes y paleta cromática minimalista de Notion (`#fbfbfa` en claro y `#191919` en oscuro).
