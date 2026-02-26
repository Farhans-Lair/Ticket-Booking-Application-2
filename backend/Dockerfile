FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm install --production

COPY backend/src ./src

COPY frontend /app/frontend

EXPOSE 3000

CMD ["node", "src/server.js"]