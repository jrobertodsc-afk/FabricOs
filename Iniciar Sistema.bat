@echo off
title Sistema de Controle de Retiradas - Produção
echo Inicializando o sistema...

:: Verificar se o Python está instalado (tentar python e depois py)
set PY_CMD=python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    set PY_CMD=py
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERRO: Python nao encontrado.
        echo 1. Verifique se o Python esta instalado.
        echo 2. Certifique-se de marcar "Add Python to PATH" na instalacao.
        echo 3. Reinicie o computador se acabou de instalar.
        pause
        exit
    )
)

:: Verificar/Instalar dependencias
echo Verificando dependencias (Flask)...
%PY_CMD% -m pip install flask >nul 2>&1

:: Iniciar o servidor
echo Servidor iniciado em http://127.0.0.1:5001
echo Mantenha esta janela aberta enquanto usa o sistema.
%PY_CMD% app.py
pause
