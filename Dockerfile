# Node.js 22 imajını kullanıyoruz
FROM node:22-slim

# Ses şifrelemesi için gereken Linux paketlerini manuel kuruyoruz
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Paketleri kopyala ve derleyerek kur
COPY package*.json ./
RUN npm install --build-from-source

# Tüm dosyaları kopyala
COPY . .

# Botu başlat
CMD ["node", "index.js"]
