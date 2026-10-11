# 🏦 Spend Agent — Guía de Inicio Rápido

¡Bienvenido a **Spend Agent**! Un gestor financiero local asistido por Inteligencia Artificial diseñado para darte control total sobre tus finanzas personales y profesionales con máxima privacidad.

---

## 🚀 Cómo Iniciar la Aplicación

Puedes iniciar **Spend Agent** de dos formas sencillas en tu Mac:

### Opción 1 (Recomendada): Aplicación Nativa Mac
- Haz **doble clic** en **`Spend Agent.app`**.
- Se abrirá una ventana de aplicación nativa. La primera vez preparará el entorno automáticamente en unos segundos.

### Opción 2: Iniciador con Terminal y Navegador
- Haz **doble clic** en **`Iniciar Spend Agent.command`** (o ejecuta `./run.sh` desde tu terminal).
- Iniciará el servidor local y abrirá automáticamente tu navegador web.

---

## 🛡️ Seguridad de macOS (Primera Apertura / Gatekeeper)

Al descomprimir un archivo descargado de internet en macOS, el sistema operativo activa la protección Gatekeeper para aplicaciones no notarizadas:

- **Si macOS muestra el aviso de "desarrollador no identificado" o "no se puede abrir":**
  1. Haz **clic derecho** (o `Control` + clic) sobre **`Spend Agent.app`** (o `Iniciar Spend Agent.command`).
  2. Selecciona **Abrir** en el menú contextual.
  3. En la ventana emergente, pulsa en el botón **Abrir**.
- **O mediante Terminal (opcional):**
  Abre Terminal en la carpeta descomprimida y ejecuta:
  ```bash
  xattr -cr "Spend Agent.app"
  chmod +x *.command *.sh
  ```

---

## 🔌 Búsqueda Automática de Puertos

No te preocupes si tienes otros servidores o aplicaciones en ejecución:
- Tanto `Spend Agent.app` como `Iniciar Spend Agent.command` **comprueban automáticamente la disponibilidad de puertos**.
- Si el puerto `8000` está ocupado, buscarán de forma automática el siguiente disponible (`8001`, `8002`, `8003`...) y conectarán la interfaz directamente sin que tengas que configurar nada.

---

## 🛑 Cómo Detener la Aplicación
- Haz doble clic en **`Detener Spend Agent.app`** o **`Detener Spend Agent.command`**.
- O si estás usando la terminal, pulsa `Ctrl + C`.

---

## ⚙️ Configuración Inicial (Primera Apertura)

La primera vez que abras **Spend Agent**, la aplicación te llevará automáticamente a la pantalla de **Ajustes** para configurar tu espacio:

1. **Modelo de IA (DeepSeek)**:
   - Introduce tu **API Key de DeepSeek** (puedes obtenerla en [platform.deepseek.com](https://platform.deepseek.com)).
   - Selecciona el modelo que prefieras (`deepseek-chat` o `deepseek-reasoner`).
   - Pulsa **"Probar Conexión"** para verificar que funciona.
2. **Bancos y Cuentas**:
   - Activa los bancos que utilizas (CaixaBank, Revolut, ING, Santander, BBVA, American Express, Iberia Cards, N26, MyInvestor, etc.).
   - Puedes personalizar los **alias** de cada banco (ej. *"Nómina"*, *"Gastos diarios"*, *"Ahorro"*), y esos alias se reflejarán en todos los filtros.
3. **Categorías**:
   - Revisa las categorías de gasto por defecto, elimina las que no uses o añade tus propias categorías con la paleta de colores Notion.
4. **Comenzar**:
   - Pulsa en **"Guardar y Comenzar"**. La aplicación recordará tu configuración y en próximas ocasiones entrará directamente a tu panel principal.

---

## 📥 Cómo Importar tus Extractos

1. Dirígete a la pestaña **"Importar Extractos"**.
2. Selecciona tu banco o déjalo en **"✨ Auto-detectar Banco"**.
3. Arrastra uno o varios extractos bancarios en formato **CSV, XLSX o XLS**.
4. El sistema procesará los movimientos, vinculará automáticamente traspasos entre tus cuentas y te avisará si hay movimientos dudosos en **"Dudas del Agente"** para clasificarlos con un solo clic.

---

## 🔒 Privacidad y Seguridad Local

- **100% Local**: Tu base de datos SQLite se almacena exclusivamente en tu ordenador (`data/bank_agent.db`).
- **Tus credenciales**: Tu clave de DeepSeek se guarda en tu base de datos local y nunca se comparte con terceros.
- **Sin rastreadores**: Cero analíticas y cero telemetría externa.

