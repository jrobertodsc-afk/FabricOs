@echo off
echo Iniciando FabricOS SaaS...

set PYTHONPATH=%CD%

start /B cmd /c "uvicorn backend.app.main:app --port 8000"
echo Backend iniciado na porta 8000...

cd frontend
start /B cmd /c "npx vite --port 5173 --host 127.0.0.1"
echo Frontend iniciado na porta 5173...

echo.
echo Tudo pronto! Acesse: http://127.0.0.1:5173
echo Pressione qualquer tecla para encerrar os servidores (Ctrl+C).
pause
taskkill /F /IM python.exe
taskkill /F /IM node.exe
