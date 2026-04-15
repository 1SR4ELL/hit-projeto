FROM node:20-bullseye-slim

# bullseye (Debian 11) tem OpenSSL 1.1.x nativo — compatível com os binários do Prisma
RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências (incluindo devDependencies para o prisma CLI)
COPY package*.json ./
RUN npm install

# Copia schema e gera o Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# Copia o restante do código
COPY src ./src

RUN mkdir -p uploads logs

EXPOSE 3001

CMD ["npm", "start"]
