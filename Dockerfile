# Stage 1: Build the frontend (Force rebuild)
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Run the python backend
FROM python:3.12-slim
WORKDIR /app


# Copia e instala requisitos do Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o codigo do backend
COPY backend/ /app/backend/

# Copia os arquivos estaticos compilados do frontend do stage de build
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

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
