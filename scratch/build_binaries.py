import os
import shutil
import subprocess
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend")
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
SCRATCH_DIR = os.path.join(ROOT_DIR, "scratch")
DIST_OUT_DIR = os.path.join(ROOT_DIR, "FabricOS-Enterprise")

def print_header(title):
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def run_command(args, cwd, name, env=None):
    print(f"\n--> Executando: {name}...")
    res = subprocess.run(args, cwd=cwd, shell=True, env=env)
    if res.returncode != 0:
        print(f"\n[X] ERRO: Falha ao executar {name} (Exit code: {res.returncode})")
        sys.exit(1)
    print(f"[OK] {name} concluído com sucesso.")

def main():
    print_header("AUTOMATION BUILD PIPELINE: FABRICOS ENTERPRISE")
    
    # 1. Compilação do Frontend SPA (Vite + React)
    print_header("PASSO 1: COMPILANDO FE ESTÁTICO (NPM RUN BUILD)")
    # Injeta VITE_FABRICOS_MODE=production para eliminar Backoffice estaticamente via tree-shaking
    vite_env = os.environ.copy()
    vite_env["VITE_FABRICOS_MODE"] = "production"
    run_command(["npm", "run", "build"], cwd=FRONTEND_DIR, name="Vite Production Build", env=vite_env)

    # 2. Limpeza de Caches Anteriores do PyInstaller
    print_header("PASSO 2: LIMPANDO CACHES ANTERIORES DE COMPILAÇÃO")
    folders_to_delete = [
        os.path.join(BACKEND_DIR, "build"),
        os.path.join(BACKEND_DIR, "dist"),
        os.path.join(DIST_OUT_DIR)
    ]
    for folder in folders_to_delete:
        if os.path.exists(folder):
            print(f" - Deletando diretório antigo: {folder}")
            shutil.rmtree(folder, ignore_errors=True)
            
    # 3. Compilação do Backend com PyInstaller
    print_header("PASSO 3: COMPILANDO BACKEND EM EXECUTÁVEL NATIVO")
    # Usa a instalação global do PyInstaller
    run_command(
        ["pyinstaller", "fabricos_server.spec", "--clean"], 
        cwd=BACKEND_DIR, 
        name="PyInstaller Compilation"
    )

    # 4. Estruturando o Pacote Final Comercial (Zero-Dependência)
    print_header("PASSO 4: ESTRUTURANDO PACOTE COMERCIAL FINAL (FabricOS-Enterprise)")
    os.makedirs(DIST_OUT_DIR, exist_ok=True)
    
    # A. Copiar executável fabricos_server.exe
    exe_src = os.path.join(BACKEND_DIR, "dist", "fabricos_server.exe")
    exe_dst = os.path.join(DIST_OUT_DIR, "fabricos_server.exe")
    if os.path.exists(exe_src):
        print(f" - Copiando executável compilado para: {exe_dst}")
        shutil.copy(exe_src, exe_dst)
    else:
        print("[X] ERRO: Binário compilado não foi encontrado no local esperado!")
        sys.exit(1)
        
    # B. Copiar o banco de dados SQLite migrado fabricos.db
    db_src = os.path.join(ROOT_DIR, "fabricos.db")
    db_dst = os.path.join(DIST_OUT_DIR, "fabricos.db")
    if os.path.exists(db_src):
        print(f" - Copiando banco de dados SQLite para: {db_dst}")
        shutil.copy(db_src, db_dst)
    else:
        print("[AVISO] Banco de dados fabricos.db não encontrado no root. O cliente criará um banco limpo ao iniciar.")

    # C. Criar pasta backend/uploads vazia
    uploads_dir = os.path.join(DIST_OUT_DIR, "backend", "uploads")
    print(f" - Criando pasta de uploads de imagens em: {uploads_dir}")
    os.makedirs(uploads_dir, exist_ok=True)
    
    # 5. Adicionando utilitários e manuais
    # Copia o manual de instalação se existir
    man_src = os.path.join(ROOT_DIR, "documentacao", "manual_instalacao.md")
    man_dst = os.path.join(DIST_OUT_DIR, "manual_instalacao.md")
    if os.path.exists(man_src):
        print(" - Copiando Manual de Instalação...")
        shutil.copy(man_src, man_dst)

    # Copia os inicializadores/launchers profissionais
    # A. Iniciar_Silencioso.vbs
    vbs_src = os.path.join(ROOT_DIR, "Iniciar_Silencioso.vbs")
    vbs_dst = os.path.join(DIST_OUT_DIR, "Iniciar_Silencioso.vbs")
    if os.path.exists(vbs_src):
        print(" - Copiando Inicializador Silencioso VBS...")
        shutil.copy(vbs_src, vbs_dst)

    # B. Instalar_Servico.bat
    srv_src = os.path.join(ROOT_DIR, "Instalar_Servico.bat")
    srv_dst = os.path.join(DIST_OUT_DIR, "Instalar_Servico.bat")
    if os.path.exists(srv_src):
        print(" - Copiando Instalador de Serviço do Windows...")
        shutil.copy(srv_src, srv_dst)

    # C. Iniciar_Producao.bat
    bat_src = os.path.join(ROOT_DIR, "Iniciar_Producao.bat")
    bat_dst = os.path.join(DIST_OUT_DIR, "Iniciar_Producao.bat")
    if os.path.exists(bat_src):
        print(" - Copiando Launcher Batch de Produção...")
        shutil.copy(bat_src, bat_dst)


    print_header("SUCESSO: FABRICOS-ENTERPRISE GERADO COM 100% DE EXCELÊNCIA!")
    print(f" Diretório final do Pacote: {DIST_OUT_DIR}")
    print(" Conteúdo Gerado:")
    for item in os.listdir(DIST_OUT_DIR):
        print(f"  - {item}")
    print("="*60)

if __name__ == "__main__":
    main()
