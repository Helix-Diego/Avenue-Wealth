#!/usr/bin/env python3
import os
import sys
import socket
import webbrowser
import threading
import time

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)
os.environ["BANK_AGENT_ROOT"] = BASE_DIR

def is_port_in_use(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex(('127.0.0.1', port)) == 0

def find_available_port(start_port: int = 8000) -> int:
    port = start_port
    while is_port_in_use(port):
        port += 1
    return port

def open_browser_delayed(url: str, delay: float = 1.5):
    time.sleep(delay)
    try:
        webbrowser.open(url)
    except Exception as e:
        print(f"No se pudo abrir el navegador automáticamente: {e}")

def main():
    import uvicorn
    from backend.app import app
    from backend.seed_data import seed_initial_data
    
    # Ensure database and seed data are ready
    try:
        seed_initial_data()
    except Exception as e:
        print(f"Aviso al verificar datos iniciales: {e}")

    preferred_port = int(os.environ.get("PORT", 8000))
    port = find_available_port(preferred_port)
    url = f"http://localhost:{port}"

    print("=" * 60)
    print("🏦 Spend Agent — Control Financiero e IA")
    print(f"🚀 Servidor disponible en: {url}")
    print("💡 Pulsa Ctrl+C para detener el servidor")
    print("=" * 60)

    # Save PID file for easy process management
    pid_file = os.path.join(BASE_DIR, ".bank_agent.pid")
    try:
        with open(pid_file, "w") as f:
            f.write(f"{os.getpid()}:{port}")
    except Exception:
        pass

    # Open browser in a separate thread if enabled
    if os.environ.get("OPEN_BROWSER", "1") == "1":
        threading.Thread(target=open_browser_delayed, args=(url, 1.2), daemon=True).start()

    try:
        uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
    finally:
        if os.path.exists(pid_file):
            try:
                os.remove(pid_file)
            except Exception:
                pass

if __name__ == "__main__":
    main()
