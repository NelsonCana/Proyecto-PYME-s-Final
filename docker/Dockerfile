# Base ligera de Python
FROM python:3.10-slim

# Evitar archivos basura de python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# 1. Instalamos dependencias de sistema necesarias
# git/wget: para descargar herramientas
# nmap: por si acaso
# gcc/dev: para compilar librerías de python
RUN apt-get update && apt-get install -y \
    git \
    wget \
    unzip \
    nmap \
    iputils-ping \
    libpq-dev \
    gcc \
    python3-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. ZONA DE ARMAS (Carpeta /tools)
WORKDIR /tools

# [A] SQLMap (Inyección SQL)
RUN git clone --depth 1 https://github.com/sqlmapproject/sqlmap.git sqlmap

# [B] XSStrike (XSS Avanzado)
RUN git clone --depth 1 https://github.com/s0md3v/XSStrike.git xsstrike \
    && pip install -r xsstrike/requirements.txt

# [C] Dirsearch (Directorios Ocultos)
RUN git clone --depth 1 https://github.com/maurosoria/dirsearch.git dirsearch \
    && pip install -r dirsearch/requirements.txt

# [D] Nuclei (Vulnerabilidades CVE - Binario)
RUN wget https://github.com/projectdiscovery/nuclei/releases/download/v3.2.0/nuclei_3.2.0_linux_amd64.zip \
    && unzip nuclei_3.2.0_linux_amd64.zip \
    && mv nuclei /usr/local/bin/ \
    && rm nuclei_3.2.0_linux_amd64.zip

# 3. Volvemos a la aplicación
WORKDIR /app

# Instalamos dependencias de tu proyecto
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos tu código fuente
COPY . .

# Arrancamos
CMD ["uvicorn", "core.api:app", "--host", "0.0.0.0", "--port", "8000"]
