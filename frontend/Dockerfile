FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application
COPY . .

# Build for production
RUN npm run build

# Runtime
EXPOSE 3000
CMD ["npm", "start"]
