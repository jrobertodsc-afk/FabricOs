import uvicorn
import os
import sys

# Garante que o diretório raiz do projeto esteja no Python Path
if getattr(sys, 'frozen', False):
    base_dir = getattr(sys, '_MEIPASS', os.path.abspath(os.path.dirname(__file__)))
    if base_dir not in sys.path:
        sys.path.insert(0, base_dir)
else:
    sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from backend.app.main import app

if __name__ == "__main__":
    print("\n=======================================================")
    print(" Iniciando FabricOS Server (Serviço de Produção Nativo)")
    print("=======================================================")
    print(" Porta: 8000")
    print(" Endereço Local: http://127.0.0.1:8000")
    print("=======================================================\n")
    
    # Inicia uvicorn programaticamente
    uvicorn.run(
        "backend.app.main:app", 
        host="127.0.0.1", 
        port=8000, 
        reload=False, 
        workers=1
    )
