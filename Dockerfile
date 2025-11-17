# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Копируем конфиги и ставим зависимости для КОРНЯ (сервер)
COPY package*.json ./
RUN npm install

# 2. Копируем конфиги и ставим зависимости для КЛИЕНТА
COPY client/package*.json ./client/
RUN cd client && npm install

# 3. Копируем весь исходный код
COPY . .

# 4. Собираем КЛИЕНТ (создаст client/dist)
RUN cd client && npm run build

# 5. Собираем СЕРВЕР (создаст dist)
RUN npm run build

# --- Stage 2: Production Run ---
FROM node:20-alpine

WORKDIR /app

# Копируем package.json для запуска
COPY package*.json ./
# Ставим только production зависимости (без typescript и vite)
RUN npm install --omit=dev

# Копируем скомпилированный сервер из Stage 1
COPY --from=builder /app/dist ./dist

# Копируем скомпилированный клиент из Stage 1
# Кладем его так, чтобы путь ../client/dist из server.js сработал.
# Структура в контейнере будет: /app/dist (сервер) и /app/client/dist (фронт)
COPY --from=builder /app/client/dist ./client/dist

# Открываем порт
EXPOSE 3000

# Запускаем
CMD ["node", "dist/server.js"]