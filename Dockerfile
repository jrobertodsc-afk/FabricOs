FROM python:3.12-slim

WORKDIR /app

# Instala dependencias do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala requisitos do Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o codigo do backend e os arquivos estaticos compilados do frontend
COPY backend/ /app/backend/
COPY frontend/dist /app/frontend/dist

# =============================================================================
# RAILWAY PERSISTENT VOLUME
# O Railway monta o volume persistente em /data por definicao.
# Apontamos o banco de licencas para essa pasta garantindo persistencia real.
# =============================================================================
ENV BACKOFFICE_DB_PATH=/data/backoffice_clients.json
ENV FABRICOS_MODE=backoffice
ENV PORT=8000

# Cria o diretorio /data como fallback caso nao haja volume montado
RUN mkdir -p /data

# Expoe a porta dinamica do Railway (usa $PORT)
EXPOSE 8000

# Comando de boot: usa $PORT que o Railway injeta automaticamente
CMD uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}
