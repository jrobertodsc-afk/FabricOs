@echo off
title FabricOS Enterprise - Registrar Servico de Inicializacao
color 0B
echo.
echo  =============================================================
echo   FabricOS Enterprise - Registrar Servico de Inicializacao
echo  =============================================================
echo.

:: Verificar privilegios de Administrador
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  [ERRO] Este script requer privilegios de Administrador!
    echo  Por favor, clique com o botao direito e selecione "Executar como Administrador".
    echo.
    pause
    exit /b 1
)

:: Obter o diretorio atual do script
set SCRIPT_DIR=%~dp0
:: Remover a barra invertida do final do caminho
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

echo  [1/2] Registrando tarefa de boot em segundo plano no Windows...
:: Cria uma tarefa agendada no boot (/sc onstart) rodando silenciosamente como SYSTEM com privilegios maximos
schtasks /create /tn "FabricOS_Server" /tr "%SCRIPT_DIR%\fabricos_server.exe" /sc onstart /ru "SYSTEM" /rl highest /f

if %errorLevel% equ 0 (
    echo  [OK] Servico registrado com sucesso!
    echo  O FabricOS agora iniciara automaticamente no boot do Windows (sem janelas abertas).
) else (
    echo  [ERRO] Falha ao registrar tarefa de boot.
    pause
    exit /b 1
)

echo.
echo  [2/2] Iniciando o servico em segundo plano agora...
schtasks /run /tn "FabricOS_Server" >nul

if %errorLevel% equ 0 (
    echo  [OK] Servico inicializado com sucesso em segundo plano!
    echo  Acesse http://127.0.0.1:8000 no seu navegador.
) else (
    echo  [ERRO] Falha ao iniciar servico de imediato.
)

echo.
echo  =============================================================
echo  Instalacao Concluida! Voce pode fechar esta janela.
echo  =============================================================
echo.
pause
exit /b 0
