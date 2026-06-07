# Stage 1: Construir o Frontend com as variaveis corretas para o Backoffice
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

# Copiar os arquivos de dependencia e instalar
COPY frontend/package*.json ./
RUN npm install

# Copiar o restante do codigo do frontend e compilar
COPY frontend/ ./
# A variavel abaixo garante que a interface de Administracao seja inclusa na compilacao (que eh removida no modo local)
ENV VITE_FABRICOS_MODE=backoffice
RUN npm run build


# Stage 2: Configurar o Backend em Python e servir
FROM python:3.12-slim
WORKDIR /app

# Instala dependencias do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala requisitos do Python
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o codigo do backend
COPY backend/ /app/backend/

# Copia os arquivos estaticos compilados do frontend do Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Cria a pasta /data que será o ponto de montagem do volume
RUN mkdir -p /data

# Variavel de ambiente padrao (pode ser sobrescrita pelo painel)
ENV FABRICOS_MODE=backoffice

# Porta padrao (Railway usa PORT)
EXPOSE 8000

# Comando para rodar a aplicacao (Railway usa porta dinamica por isso nao passamos --port chumbado no CMD, o Railway cuida disso caso use a variavel PORT, mas vamos usar a configuracao dinamica)
CMD ["sh", "-c", "uvicorn backend.app.api.backoffice_server:app --host 0.0.0.0 --port ${PORT:-8000}"]
