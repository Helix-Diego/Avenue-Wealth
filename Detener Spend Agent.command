#!/usr/bin/env bash
# ==============================================================================
# Detener Spend Agent — Terminal
# ==============================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

PID_FILE=".bank_agent.pid"
if [ -f "$PID_FILE" ]; then
    PID=$(cut -d: -f1 "$PID_FILE" 2>/dev/null || cat "$PID_FILE")
    if [ -n "$PID" ] && ps -p "$PID" >/dev/null 2>&1; then
        echo "🛑 Deteniendo Spend Agent (PID $PID)..."
        kill "$PID" 2>/dev/null || kill -9 "$PID" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
fi

pkill -f "run_server.py" 2>/dev/null || true

echo "✅ Servidor Spend Agent detenido."
sleep 1
