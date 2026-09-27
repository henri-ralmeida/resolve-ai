FROM node:24-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:24-alpine AS app
WORKDIR /app
RUN apk add --no-cache openssl
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend/prisma ./backend/prisma
RUN cd backend && npx prisma generate
COPY backend/src ./backend/src
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
RUN mkdir /app/uploads && chown -R node:node /app
USER node
ENV NODE_ENV=production PORT=8080 UPLOADS_PATH=/app/uploads
EXPOSE 8080
CMD ["sh", "-c", "cd backend && npm start"]
