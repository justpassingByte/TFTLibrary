FROM node:20-slim

WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl

# Copy package info and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the backend files
COPY . .

# Generate Prisma client for Linux
RUN npx prisma generate

EXPOSE 3001
ENV PORT=3001

# The backend runs directly via ts-node, as configured in "npm run start"
CMD ["npm", "run", "start"]
