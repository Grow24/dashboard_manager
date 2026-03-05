# Use the official Node.js runtime as base image
FROM node:22-slim

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

# Expose port
EXPOSE 8080

ENV PORT=8080
ENV HOSTNAME="0.0.0.0"
ENV NODE_ENV=production

# Start the application
CMD ["npm", "run", "start"]
