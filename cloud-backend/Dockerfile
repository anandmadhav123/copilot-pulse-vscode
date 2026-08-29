# Use official Node.js LTS lightweight image
FROM node:20-alpine

# Working directory
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production

# Start application
CMD ["node", "src/server.js"]
