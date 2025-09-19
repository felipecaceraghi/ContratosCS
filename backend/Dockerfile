# Dockerfile
FROM python:3.12-slim

# Define o diretório de trabalho
WORKDIR /app

# Instala dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    libreoffice \
    libxml2-dev \
    libxslt1-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements.txt primeiro para cache de layers
COPY requirements.txt .

# Instala dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Copia o resto do código
COPY . .

# Expõe a porta
EXPOSE 5004

# Comando para executar
CMD ["python", "app.py"]
