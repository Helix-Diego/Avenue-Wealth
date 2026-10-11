# 🏦 Spend Agent — Guía de Inicio Rápido

¡Bienvenido a **Spend Agent**! Un gestor financiero local asistido por Inteligencia Artificial diseñado para darte control total sobre tus finanzas personales y profesionales con máxima privacidad.

---

## 🚀 Cómo Iniciar la Aplicación

Puedes iniciar **Spend Agent** de dos formas sencillas en tu Mac:

### Opción 1 (Recomendada): Aplicación Nativa Mac
- Haz **doble clic** en **`Spend Agent.app`**.
- Se abrirá una ventana de aplicación nativa. La primera vez preparará el entorno en unos segundos.

### Opción 2: Iniciador con Terminal y Navegador
- Haz **doble clic** en **`Iniciar Spend Agent.command`** (o ejecuta `./run.sh` desde tu terminal).
- Iniciará el servidor local y abrirá automáticamente tu navegador web en `http://localhost:8000`.

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
2. **Bancos Soportados**:
   - Activa o desactiva con los interruptores los bancos que utilizas (Santander, American Express, Iberia Cards, N26, MyInvestor, Formato Genérico).
3. **Categorías**:
   - Revisa las categorías de gasto por defecto o añade tus propias categorías con la paleta de colores Notion.
4. **Perfil del Espacio**:
   - Personaliza el nombre de tu espacio (ej. *"Mis Finanzas"*) y tu divisa.
5. **Comenzar**:
   - Pulsa en **"Guardar y Comenzar"** o **"Comenzar a usar Spend Agent"**. La aplicación recordará tu configuración y en próximas ocasiones entrará directamente a tu panel principal.

---

## 📥 Cómo Importar tus Extractos

1. Dirígete a la pestaña **"Importar Extractos"**.
2. Selecciona tu banco o déjalo en **"✨ Auto-detectar Banco"**.
3. Arrastra uno o varios archivos CSV o Excel (puedes soltar extractos de diferentes bancos a la vez).
4. El sistema procesará la cola, descartará duplicados existentes y te avisará si hay movimientos dudosos en la pestaña **"Dudas del Agente"** para que los clasifiques con un clic.

---

## 🔒 Privacidad y Seguridad Local

- **100% Local**: Tu base de datos SQLite se almacena exclusivamente en tu ordenador (`data/bank_agent.db`).
- **Tus credenciales**: Tu clave de DeepSeek se guarda en tu base de datos local y nunca se comparte con terceros.
- **Sin rastreadores**: No hay analíticas ni telemetría externa.
