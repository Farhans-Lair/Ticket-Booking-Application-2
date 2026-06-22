<<<<<<< HEAD
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
=======
# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app

# Copy package files first (for caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy rest of the source code
COPY . .

# Expose backend port
EXPOSE 3000

# Start the server
CMD ["node", "src/server.js"]
>>>>>>> d2aba71dbbc84cc25d9f6a4fb5b7b26fdcd1fbac
