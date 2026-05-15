FROM node:22-alpine

WORKDIR /app

# Install build dependencies required by npm packages
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application
COPY . .

# Build-time env vars for Next.js rewrites
ARG API_BACKEND_URL=http://localhost:8006
ENV API_BACKEND_URL=$API_BACKEND_URL

# Build for production
RUN npm run build

# Runtime
EXPOSE 3000
CMD ["npm", "start"]
