# Multi-stage build for smaller, more secure production images
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files for shared dependencies
COPY package*.json ./

# Copy shared service
COPY services/shared/ ./services/shared/

# Copy books-service
COPY services/books-service/ ./services/books-service/

# Install dependencies for shared service
WORKDIR /app/services/shared
RUN npm install && npm run build

# Install dependencies and build books-service
WORKDIR /app/services/books-service
RUN npm install && npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S booksuser -u 1001

# Set working directory
WORKDIR /app

# Copy shared service built files
COPY --from=builder --chown=booksuser:nodejs /app/services/shared/ ./services/shared/

# Copy books-service package files
COPY --from=builder --chown=booksuser:nodejs /app/services/books-service/package*.json ./

# Install only production dependencies for books-service
RUN npm ci --only=production && npm cache clean --force

# Copy built application code
COPY --from=builder --chown=booksuser:nodejs /app/services/books-service/dist/ ./dist/

# Switch to non-root user
USER booksuser

# Expose the port
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Command to run the application
CMD ["node", "dist/src/server.js"] 