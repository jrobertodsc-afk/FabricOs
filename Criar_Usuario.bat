@echo off
title FabricOS Enterprise - Cadastrar Novo Usuario
color 0A

:: Verificar se o python esta instalado
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] Python nao esta instalado no sistema ou nao esta no PATH!
    pause
    exit /b 1
)

:: Executar script python
python "%~dp0criar_usuario.py"

pause
exit /b 0
