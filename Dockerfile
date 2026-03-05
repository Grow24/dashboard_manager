FROM node:22-slim
LABEL "language"="nodejs"
LABEL "framework"="next.js"

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy application source
COPY . .

# Build the Next.js app with default output (no standalone)
RUN npm run build

EXPOSE 8080
ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Run the app the same way as locally after a build
CMD ["npm", "run", "start"]
