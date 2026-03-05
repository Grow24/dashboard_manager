
FROM node:22-slim
LABEL "language"="nodejs"
LABEL "framework"="next.js"

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# Copy standalone server and static files
COPY .next/standalone ./
COPY .next/static ./.next/static
COPY public ./public

EXPOSE 8080

CMD ["node", "server.js"]