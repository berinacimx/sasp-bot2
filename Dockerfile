FROM node:20-bullseye

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
  ffmpeg \
  libopus0 \
  libopus-dev \
  libsodium23 \
  libsodium-dev \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --build-from-source

COPY . .

CMD ["node", "index.js"]
