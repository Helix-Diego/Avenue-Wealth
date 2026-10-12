# 🏛️ Avenue Wealth — Plataforma de Control Patrimonial & Finanzas Inteligentes

Plataforma financiera y patrimonial con agente inteligente para el control financiero, categorización bancaria multi-cuenta, gestión de gastos reembolsables, seguimiento de cartera de acciones en tiempo real vía **Finnhub** y fondos de inversión indexados y activos por código **ISIN**.

Repositorio oficial: [https://github.com/Helix-Diego/Avenue-Wealth.git](https://github.com/Helix-Diego/Avenue-Wealth.git)

---

## 🔒 Arquitectura de Seguridad & Multi-Tenant (RBAC & RLS)

Avenue Wealth implementa una arquitectura cloud multi-inquilino de alta seguridad:

1. **Aislamiento Criptográfico de Datos (Row-Level Security - RLS):**
   - Base de datos relacional PostgreSQL en **Supabase** (`eu-west-1`, Irlanda, cumplimiento estricto del RGPD).
   - Políticas RLS a nivel de motor de base de datos: cada consulta SQL está aislada por `auth.uid() = user_id`. Ningún inquilino puede acceder a datos de otro bajo ninguna circunstancia.
   - Script de aprovisionamiento listo en [`supabase_schema_rls.sql`](file:///Users/diegohernandeztcach/Library/CloudStorage/OneDrive-BMCHelix/Documentos/Proyectos/Avenue%20Wealth/Avenue%20Wealth/supabase_schema_rls.sql).

2. **Control de Acceso Basado en Roles (RBAC):**
   - Roles soportados:
     * `admin`: Acceso completo a administración, métricas globales (`/api/admin/system-stats`), gestión y auditoría de usuarios (`/api/admin/users`).
     * `user`: Inquilino estándar con control total y aislado de sus propias finanzas y transacciones.
     * `advisor`: Planificador financiero con permisos de consulta y recomendación.
     * `auditor`: Rol de auditoría y cumplimiento normativo.

3. **Procesamiento de Extractos 100% en Memoria RAM (Zero-Disk):**
   - Los ficheros CSV y Excel se procesan mediante streams de bytes en RAM (`UploadFile.read()`, `io.BytesIO`, `io.StringIO`).
   - Límite de seguridad de 25 MB por archivo para evitar ataques de denegación de servicio.
   - Ningún extracto bancario se almacena en disco temporal ni permanente. El buffer en RAM se destruye inmediatamente tras la extracción y deduplicación.

4. **Cabeceras de Seguridad y Protección contra Inyecciones/IDOR:**
   - Middleware de cabeceras de seguridad activas: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`.
   - Protección contra IDOR en todos los endpoints de modificación y eliminación (`WHERE id = ? AND user_id = ?`).

---

## 🚀 Inicio Rápido (Local)

Para ejecutar la aplicación localmente en tu ordenador:

```bash
./run.sh
```

El script se encargará automáticamente de:
1. Activar el entorno virtual Python y sus dependencias (`FastAPI`, `Uvicorn`, etc.).
2. Inicializar la base de datos local SQLite con las migraciones multi-tenant y roles por defecto.
3. Servir la API y aplicación web en **http://localhost:8001** (o puerto configurado) y abrirla en tu navegador.

---

## 🧪 Pruebas Automatizadas

El proyecto incluye dos suites de tests completas:

```bash
# Ejecutar todas las pruebas unitarias y de integración
venv/bin/python -m unittest discover -s tests -p "test_*.py"

# Suite específica de RBAC y aislamiento multi-tenant
venv/bin/python -m unittest tests/test_rbac_and_multitenant.py

# Suite de ciclo de vida completo de usuario (E2E)
venv/bin/python -m unittest tests/test_full_user_journey.py
```

---

## 🛠️ Estructura del Proyecto

```
Avenue Wealth/
├── backend/
│   ├── app.py                   # Servidor API FastAPI 3.0 con middleware de seguridad y RBAC
│   ├── auth.py                  # Módulo de autenticación JWT y dependencias RBAC
│   ├── database.py              # Modelos SQLite/Postgres, migraciones multi-tenant y RBAC
│   ├── categorizer.py           # Motor inteligente de categorización y detección de dudas
│   ├── bank_parser.py           # Parsers en memoria RAM (Santander, BBVA, Caixa, Amex, N26, etc.)
│   ├── portfolio.py             # Finnhub API en directo y scraping NAV de fondos por ISIN
│   ├── forecast.py              # Motor de pronósticos de gasto y recomendaciones
│   ├── loans.py                 # Detección y gestión de préstamos y cuotas
│   └── financial_analyst.py     # Integración con IA analista financiera
├── frontend/
│   ├── src/                     # Interfaz React 19 + Tailwind v4 + Recharts estilo Notion
│   └── dist/                    # Bundle de producción
├── tests/
│   ├── test_rbac_and_multitenant.py  # Tests de aislamiento multi-tenant y roles
│   └── test_full_user_journey.py     # Tests de viaje de usuario y categorización
├── supabase_schema_rls.sql      # Schema PostgreSQL para Supabase con RLS y RBAC
├── requirements.txt             # Dependencias Python
├── run.sh                       # Script de arranque en 1 clic
└── README.md
```
