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

# Copy standalone server files to root (flattens structure - server.js ends up at root)
# This is the standard Next.js standalone pattern
COPY --from=builder /app/.next/standalone ./

# Copy public assets - standalone server needs access to public directory
COPY --from=builder /app/public ./public

# Copy static files - CRITICAL: must be at .next/static relative to where server.js runs
# When using output: standalone, Next.js doesn't copy .next/static into standalone by default
# Since server.js is at root after copying standalone, static files go to .next/static at root
COPY --from=builder /app/.next/static ./.next/static

# Expose port
EXPOSE 8080

# Start the application using the standalone server
# server.js is at root level after copying standalone to root
CMD ["node", "server.js"]
