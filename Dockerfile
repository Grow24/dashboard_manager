# Multi-stage build for Next.js
# Stage 1: Builder - install dependencies and build the app
FROM node:22-alpine AS builder

LABEL "language"="nodejs"
LABEL "framework"="next.js"

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source files
COPY . .

# Build Next.js with default output (no standalone)
# This generates .next/static with CSS, JS, and other assets
RUN npm run build

# Verify static files were generated (this will fail the build if CSS files are missing)
RUN test -d .next/static/css && echo "✓ CSS files generated successfully" || (echo "✗ ERROR: CSS files not found!" && exit 1)
RUN test -d .next/static/chunks && echo "✓ JS chunks generated successfully" || (echo "✗ ERROR: JS chunks not found!" && exit 1)
RUN ls -la .next/static/css/ | head -5 && echo "---" && ls -la .next/static/chunks/ | head -5
RUN echo "Build verification complete. Static files are ready."

# Stage 2: Runtime - minimal image with only production files
FROM node:22-alpine AS stage-1

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/postcss.config.js ./postcss.config.js
COPY --from=builder /app/tailwind.config.ts ./tailwind.config.ts

EXPOSE 8080

# Run exactly like local `npm run build && npm run start`
# next start will serve static files from .next/static automatically
CMD ["npm", "run", "start"]
