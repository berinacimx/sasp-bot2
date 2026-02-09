FROM node:20-bullseye

ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=production

# Voice + Encryption için HER ŞEY
RUN apt-get update && apt-get install -y \
  ffmpeg \
  libopus0 \
  libopus-dev \
  libsodium23 \
  libsodium-dev \
  python3 \
  make \
  g++ \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --build-from-source --unsafe-perm

COPY . .

CMD ["node", "index.js"]
