#!/usr/bin/env bash
# ==============================================================================
# Iniciar Spend Agent — Terminal Launcher
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "🏦 Spend Agent — Iniciando aplicación local..."
echo "=========================================================="

# 1. Comprobar y cargar dependencias de Python
if ! command -v python3 &>/dev/null; then
    echo "❌ Error: No se detectó Python 3 en tu sistema macOS."
    echo "💡 Puedes descargarlo gratis desde https://www.python.org/downloads/ o con 'xcode-select --install'"
    echo ""
    read -p "Presiona Enter para cerrar esta ventana..."
    exit 1
fi

if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual Python..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
fi

echo "📦 Verificando dependencias Python..."
./venv/bin/pip install -q -r requirements.txt

# 2. Inicializar base de datos y cotizaciones si es necesario
echo "🔍 Comprobando base de datos..."
./venv/bin/python3 -m backend.seed_data

# 3. Comprobar build del frontend
if [ ! -d "frontend/dist" ] && [ ! -d "frontend/dist 2" ]; then
    echo "⚡ Construyendo interfaz web..."
    cd frontend && npm install && npm run build && cd ..
fi

# 4. Encontrar puerto libre
PORT=8000
while lsof -i :$PORT >/dev/null 2>&1; do
    echo "⚠️  El puerto $PORT ya está en uso. Probando el puerto $((PORT+1))..."
    PORT=$((PORT+1))
done

echo "🚀 Servidor listo en: http://localhost:$PORT"
echo "💡 Pulsa Ctrl+C para detener el servidor"

# 5. Abrir navegador automáticamente
(sleep 1.2 && open "http://localhost:$PORT") &

# 6. Ejecutar servidor
export PORT=$PORT
./venv/bin/python3 run_server.py
