# Use official Node.js LTS image
FROM node:20-alpine

# Set working directory inside container
WORKDIR /app/backend

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
