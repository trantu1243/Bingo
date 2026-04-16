# Base image
FROM node:20-alpine

# Tạo thư mục app
WORKDIR /app

# Copy package trước để cache
COPY package*.json ./

# Install deps
RUN npm install

# Copy toàn bộ source
COPY . .

# Build Next.js
RUN npm run build

# Expose port (phải giống server.mjs)
EXPOSE 3000

# Run server
CMD ["npm", "run", "start"]