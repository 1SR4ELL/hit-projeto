FROM node:20-alpine

WORKDIR /app

# Instala dependências do sistema
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src

RUN mkdir -p uploads logs

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
