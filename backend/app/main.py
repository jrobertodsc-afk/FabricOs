from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from loguru import logger

from backend.app.core.config import settings
from backend.app.api import (
    withdrawals, partners, production, financials, products,
    materials, auth, system, upload, stock, pilotage, integrations,
    employees, pieces, distributions, notifications, backoffice_server
)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    docs_url="/docs" if settings.DEBUG else None,   # Swagger só em DEBUG
    redoc_url="/redoc" if settings.DEBUG else None,
)

# ---- CORS ----
# Origens controladas via variável de ambiente CORS_ORIGINS no .env
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("backend/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="backend/uploads"), name="uploads")

# ---- Rotas ----
app.include_router(auth.router)
app.include_router(withdrawals.router)
app.include_router(partners.router)
app.include_router(production.router)
app.include_router(financials.router)
app.include_router(products.router)
app.include_router(materials.router)
app.include_router(system.router)
app.include_router(upload.router)
app.include_router(stock.router)
app.include_router(pilotage.router)
app.include_router(integrations.router)
app.include_router(employees.router)
app.include_router(pieces.router)
app.include_router(distributions.router)
app.include_router(notifications.router)
# O Central Backoffice de licenciamento só é exposto se NÃO estiver em produção estrita
if os.getenv("FABRICOS_MODE") != "production":
    app.include_router(backoffice_server.router)
# ---- Eventos de Inicialização ----
@app.on_event("startup")
async def startup_event():
    from backend.app.core.init_db import auto_initialize_db
    await auto_initialize_db()


# ---- Handler Global de Erros ----
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Captura qualquer exceção não tratada e retorna um erro 500 padronizado,
    além de despachar para o Telegram (se configurado).
    """
    error_msg = f"Crashlytics [500] 🚨\n\n**URL:** {request.url}\n**Method:** {request.method}\n**Erro:** {str(exc)}"
    logger.error(error_msg)
    
    try:
        from backend.app.api.backoffice_server import LAST_ERROR
        import traceback
        LAST_ERROR["error"] = traceback.format_exc()
    except:
        pass

    # Envia notificação pro Telegram
    try:
        from backend.app.core.telegram import send_telegram_message
        msg = (
            f"🚨 <b>ERRO 500 (CRASH) NO SISTEMA</b> 🚨\n\n"
            f"<b>URL:</b> {request.method} {request.url.path}\n"
            f"<b>Erro:</b> {str(exc)[:200]}\n"
        )
        send_telegram_message(msg)
    except Exception as e:
        logger.error(f"Erro ao enviar notificação de crash pro Telegram: {e}")

    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno no servidor. Tente novamente em instantes."},
    )


# ---- Health Check ----
@app.get("/health", tags=["System"])
async def health() -> dict:
    return {"status": "ok", "version": settings.APP_VERSION}


# ---- Fallback SPA Roteamento ----
@app.get("/{catchall:path}", include_in_schema=False)
async def spa_fallback(catchall: str):
    # Ignora caminhos de API e Uploads
    if catchall.startswith("api/") or catchall.startswith("uploads/"):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
    
    # Caminho do build estático do frontend
    import sys
    base_path = getattr(sys, '_MEIPASS', os.path.abspath("."))
    frontend_dist = os.path.join(base_path, "frontend", "dist")
    index_file = os.path.join(frontend_dist, "index.html")
    
    # Se for um arquivo estático físico na pasta dist (ex: assets/index.js)
    file_path = os.path.join(frontend_dist, catchall)
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    if os.path.exists(index_file):
        return FileResponse(index_file)
        
    # Fallback de desenvolvimento local
    local_index = os.path.abspath(os.path.join("frontend", "dist", "index.html"))
    if os.path.exists(local_index):
        return FileResponse(local_index)
        
    return JSONResponse(status_code=404, content={"detail": f"Frontend dist index.html not found at {index_file}"})
