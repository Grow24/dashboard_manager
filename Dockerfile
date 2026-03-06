FROM node:22-slim
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

# Verify static files were generated
RUN ls -la .next/static/css/ || echo "Warning: CSS files not found"

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Run exactly like local `npm run build && npm run start`
# next start will serve static files from .next/static automatically
CMD ["npm", "run", "start"]