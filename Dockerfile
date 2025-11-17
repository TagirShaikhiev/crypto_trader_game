# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# 1. Копируем всё (включая виндовые файлы)
COPY . .

# 2. ВАЖНО: Удаляем вообще всё, что связано с Windows-зависимостями
# Удаляем node_modules и package-lock.json ВЕЗДЕ
RUN rm -rf node_modules package-lock.json
RUN rm -rf client/node_modules client/package-lock.json

# 3. Устанавливаем зависимости начисто (теперь npm сам поймет, что мы на Linux)
RUN npm install
RUN cd client && npm install

# 4. Собираем КЛИЕНТ
RUN cd client && npm run build

# 5. Собираем СЕРВЕР
RUN npm run build

# --- Stage 2: Production Run ---
FROM node:20-alpine

WORKDIR /app

# Копируем package.json (лок файл не нужен для запуска, если не используем ci)
COPY package.json ./

# Ставим только легкие зависимости для запуска
RUN npm install --omit=dev

# Копируем готовые папки из Stage 1
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000

CMD ["node", "dist/server.js"]