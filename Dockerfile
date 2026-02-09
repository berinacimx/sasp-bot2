FROM node:20-bullseye

# Sistem bağımlılıkları (SES İÇİN ZORUNLU)
RUN apt-get update && apt-get install -y \
  ffmpeg \
  python3 \
  make \
  g++ \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg-dev \
  libgif-dev \
  librsvg2-dev \
  libsodium-dev \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

CMD ["node", "index.js"]
