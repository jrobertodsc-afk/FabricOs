@echo off
title FabricOS Enterprise - Instalador Comercial
color 0B
echo.
echo  =============================================================
echo   FabricOS Enterprise - Instalador Comercial e Setup de Rede
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
set SCRIPT_DIR=%SCRIPT_DIR:~0,-1%

echo  [1/4] Configurando o dominio premium local (fabricos.local)...
:: Adiciona o host fabricos.local se ja nao estiver mapeado no hosts
findstr /i /c:"fabricos.local" %windir%\System32\drivers\etc\hosts >nul
if %errorlevel% neq 0 (
    echo. >> %windir%\System32\drivers\etc\hosts
    echo 127.0.0.1 fabricos.local >> %windir%\System32\drivers\etc\hosts
    echo  [OK] Dominio fabricos.local mapeado com sucesso!
) else (
    echo  [OK] Dominio fabricos.local ja esta configurado.
)

echo.
echo  [2/4] Criando atalho premium na Area de Trabalho do cliente...
:: Cria o atalho do Windows usando PowerShell para rodar de forma 100% silenciosa
set SHORTCUT_PATH=%userprofile%\Desktop\FabricOS Enterprise.lnk
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%SCRIPT_DIR%\Iniciar_Silencioso.vbs'; $Shortcut.WorkingDirectory = '%SCRIPT_DIR%'; $Shortcut.IconLocation = 'shell32.dll,22'; $Shortcut.Description = 'Plataforma de Inteligencia Industrial FabricOS'; $Shortcut.Save()"
echo  [OK] Atalho "FabricOS Enterprise" criado na Area de Trabalho!

echo.
echo  [3/4] Registrando servico silencioso no boot do Windows...
:: Cria a tarefa agendada no boot (/sc onstart) rodando silenciosamente como SYSTEM com privilegios maximos
schtasks /create /tn "FabricOS_Server" /tr "%SCRIPT_DIR%\fabricos_server.exe" /sc onstart /ru "SYSTEM" /rl highest /f >nul

if %errorLevel% equ 0 (
    echo  [OK] Servico de boot registrado com sucesso!
) else (
    echo  [ERRO] Falha ao registrar servico de boot.
    pause
    exit /b 1
)

echo.
echo  [4/4] Inicializando o servidor em segundo plano...
schtasks /run /tn "FabricOS_Server" >nul

if %errorLevel% equ 0 (
    echo  [OK] Servidor inicializado com sucesso em segundo plano!
    echo.
    echo  =============================================================
    echo  INSTALACAO CONCLUIDA!
    echo  Acesse o sistema no endereco premium: http://fabricos.local:8000
    echo  =============================================================
    echo.
    timeout /t 3 >nul
    start "" "http://fabricos.local:8000"
) else (
    echo  [ERRO] Falha ao iniciar o servidor de imediato.
)

pause
exit /b 0
