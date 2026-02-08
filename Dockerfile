FROM node:22-slim

# Ses motoru için gereken Linux inşaat araçlarını kuruyoruz
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    libc6-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Paketleri kopyala ve kur
COPY package*.json ./
RUN npm install

# Botun tüm dosyalarını içine at
COPY . .

# Botu başlat
CMD ["node", "index.js"]