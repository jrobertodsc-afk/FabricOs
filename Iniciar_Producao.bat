@echo off
title FabricOS Enterprise Server Launcher
color 0E

echo.
echo  =======================================================
echo   FabricOS Enterprise Server - Painel Local de Producao
echo  =======================================================
echo.

:: Verificar se o executável existe
if not exist "fabricos_server.exe" (
    echo  [ERRO] fabricos_server.exe nao encontrado!
    echo  Por favor, execute este bat de dentro da pasta extraida.
    pause
    exit /b 1
)

:: Verificar se o servidor já está rodando na porta 8000
netstat -ano | findstr :8000 >nul
if %errorlevel% equ 0 (
    echo  [AVISO] O servidor ja esta em execucao.
    echo  Abrindo o navegador...
    start "" "http://127.0.0.1:8000"
    timeout /t 2 >nul
    exit /b 0
)

echo  [1/2] Iniciando FabricOS Server em segundo plano (Modo Producao)...
set FABRICOS_MODE=production
start "FabricOS Production Server" /min "fabricos_server.exe"

echo  [2/2] Aguardando inicializacao do banco SQLite e APIs...
timeout /t 3 /nobreak >nul

echo  [OK] Abrindo navegador em http://127.0.0.1:8000 ...
start "" "http://127.0.0.1:8000"
exit /b 0
