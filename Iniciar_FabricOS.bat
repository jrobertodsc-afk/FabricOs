@echo off
title FabricOS — Sistema de Gestão de Produção
color 0A

echo.
echo  ███████╗ █████╗ ██████╗ ██████╗ ██╗ ██████╗ ██████╗ ███████╗
echo  ██╔════╝██╔══██╗██╔══██╗██╔══██╗██║██╔════╝██╔═══██╗██╔════╝
echo  █████╗  ███████║██████╔╝██████╔╝██║██║     ██║   ██║███████╗
echo  ██╔══╝  ██╔══██║██╔══██╗██╔══██╗██║██║     ██║   ██║╚════██║
echo  ██║     ██║  ██║██████╔╝██║  ██║██║╚██████╗╚██████╔╝███████║
echo  ╚═╝     ╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝╚═╝ ╚═════╝ ╚═════╝ ╚══════╝
echo.
echo  Inicializando sistema...
echo  ==========================================

:: Verificar Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERRO] Python nao encontrado.
    echo  Instale Python 3.11+ em https://python.org e marque "Add to PATH"
    pause
    exit /b 1
)

:: Verificar Node.js / npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERRO] Node.js nao encontrado.
    echo  Instale Node.js em https://nodejs.org
    pause
    exit /b 1
)

:: Verificar e instalar dependencias do backend
echo.
echo  [1/4] Verificando dependencias do backend (FastAPI)...
cd /d "%~dp0backend"
if not exist ".venv" (
    echo  Criando ambiente virtual...
    python -m venv .venv
)
call .venv\Scripts\activate.bat
pip install -r requirements.txt -q

:: Verificar e instalar dependencias do frontend
echo  [2/4] Verificando dependencias do frontend (React/Vite)...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo  Instalando pacotes npm...
    npm install -q
)

:: Iniciar Backend (em nova janela)
echo  [3/4] Iniciando servidor backend (FastAPI + Uvicorn)...
cd /d "%~dp0backend"
start "FabricOS — Backend (porta 8000)" cmd /k "call .venv\Scripts\activate.bat && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

:: Aguardar backend iniciar
timeout /t 3 /nobreak >nul

:: Iniciar Frontend (em nova janela)
echo  [4/4] Iniciando servidor frontend (Vite)...
cd /d "%~dp0frontend"
start "FabricOS — Frontend (porta 5173)" cmd /k "npm run dev"

:: Aguardar Vite iniciar e abrir no navegador
timeout /t 4 /nobreak >nul
echo.
echo  ==========================================
echo  Sistema iniciado com sucesso!
echo.
echo  Backend:  http://127.0.0.1:8000
echo  Frontend: http://localhost:5173
echo  Docs API: http://127.0.0.1:8000/docs
echo  ==========================================
echo.
start "" "http://localhost:5173"

pause
