# Use the official Node.js runtime as base image
FROM node:22-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy application files
COPY . .

# Install Tailwind CSS PostCSS plugin (this might remove some packages, so we reinstall autoprefixer)
RUN npm install @tailwindcss/postcss --legacy-peer-deps

# Ensure autoprefixer is installed (it might have been removed in the previous step)
RUN npm install autoprefixer --legacy-peer-deps

# Clean any previous build
RUN rm -rf .next

# Build the application
RUN npm run build

# Production image
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Copy public assets
COPY --from=builder /app/public ./public

# Copy standalone server files (includes server.js and minimal node_modules)
COPY --from=builder /app/.next/standalone ./

# Copy static files - CRITICAL: must be at .next/static relative to server.js
# The standalone output may already have a .next directory, so we copy static into it
COPY --from=builder /app/.next/static ./.next/static

# Expose port
EXPOSE 8080

# Start the application using the standalone server
CMD ["node", "server.js"]
