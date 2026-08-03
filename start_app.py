import os
import sys
import site
import subprocess
import time

# Adicionar site-packages do usuário e do venv no sys.path
user_site = site.getusersitepackages()
if user_site not in sys.path:
    sys.path.append(user_site)


def check_and_install_dependencies():
    required_packages = ["fastapi", "uvicorn", "sqlalchemy", "pydantic"]
    missing = []
    
    for pkg in required_packages:
        try:
            __import__(pkg)
        except ImportError:
            missing.append(pkg)
            
    if missing:
        print(f"[AirLLM Setup] Instalando dependencias necessarias: {', '.join(missing)}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install"] + missing)
        print("[AirLLM Setup] Dependencias instaladas com sucesso!")

def main():
    print("=" * 70)
    print("🚀 INICIALIZANDO AIRLLM ENTERPRISE PLATFORM (PORTA 8000)")
    print("=" * 70)
    print("📌 Backend API: http://localhost:8000/api")
    print("📌 Frontend UI/UX: http://localhost:8000/")
    print("📌 Banco de Dados: SQLite (airllm.db)")
    print("=" * 70)

    check_and_install_dependencies()

    # Garantir PYTHONPATH
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

    import uvicorn
    uvicorn.run("app.backend.main:app", host="127.0.0.1", port=8000, reload=True)

if __name__ == "__main__":
    main()
