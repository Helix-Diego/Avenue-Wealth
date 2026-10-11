#!/usr/bin/env bash
# ==============================================================================
# Spend Agent
# Script de inicio rápido para el agente financiero local
# ==============================================================================

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

echo "=========================================================="
echo "🏦 Iniciando Spend Agent..."
echo "=========================================================="

# 1. Verificar entorno virtual de Python
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual Python..."
    python3 -m venv venv
    ./venv/bin/pip install --upgrade pip
    ./venv/bin/pip install fastapi uvicorn pydantic httpx python-multipart openpyxl
fi

# 2. Inicializar base de datos y datos semilla si es necesario
echo "🔍 Comprobando base de datos y cotizaciones..."
./venv/bin/python3 -m backend.seed_data

# 3. Comprobar build del frontend
if [ ! -d "frontend/dist" ]; then
    echo "⚡ Construyendo interfaz web..."
    cd frontend && npm install && npm run build && cd ..
fi

PORT=${PORT:-8000}
while lsof -i :$PORT >/dev/null 2>&1; do
    echo "⚠️  El puerto $PORT ya está en uso. Probando el puerto $((PORT+1))..."
    PORT=$((PORT+1))
done

echo "🚀 Servidor listo en: http://localhost:$PORT"
echo "💡 Pulsa Ctrl+C para detener el servidor"

# Abrir navegador automáticamente en macOS
if [[ "$OSTYPE" == "darwin"* ]]; then
    (sleep 1.5 && open "http://localhost:$PORT") &
fi

# Iniciar servidor Uvicorn
./venv/bin/uvicorn backend.app:app --host 0.0.0.0 --port $PORT --reload
