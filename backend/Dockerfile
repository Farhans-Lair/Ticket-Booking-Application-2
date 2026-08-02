FROM node:22-alpine

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm ci --omit=dev

COPY backend/src ./src

COPY frontend /app/frontend
COPY db /app/db

EXPOSE 3000 3001

CMD ["node", "src/server.js"]
