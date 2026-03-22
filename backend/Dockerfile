FROM node:20-alpine

WORKDIR /app/backend

COPY backend/package*.json ./

RUN npm install --production

COPY backend/src ./src

COPY frontend /app/frontend

# Certs are NOT copied here — they are mounted at runtime via
# docker-compose volume  ./certs:/app/certs:ro
# This keeps secrets out of the image layer history.

EXPOSE 3000 3001

CMD ["node", "src/server.js"]