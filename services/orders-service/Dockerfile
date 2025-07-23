# Multi-stage build for smaller, more secure production images
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files for shared dependencies
COPY package*.json ./

# Copy shared service
COPY services/shared/ ./services/shared/

# Copy orders-service
COPY services/orders-service/ ./services/orders-service/

# Install dependencies for shared service
WORKDIR /app/services/shared
RUN npm install && npm run build

# Install dependencies and build orders-service
WORKDIR /app/services/orders-service
RUN npm install && npm run generate && npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S ordersuser -u 1001

# Set working directory
WORKDIR /app

# Copy shared service built files
COPY --from=builder --chown=ordersuser:nodejs /app/services/shared/ ./services/shared/

# Copy orders-service package files
COPY --from=builder --chown=ordersuser:nodejs /app/services/orders-service/package*.json ./

# Install only production dependencies for orders-service
RUN npm ci --only=production && npm cache clean --force

# Copy built application code
COPY --from=builder --chown=ordersuser:nodejs /app/services/orders-service/dist/ ./dist/

# Switch to non-root user
USER ordersuser

# Expose the port
EXPOSE 3003

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

# Command to run the application
CMD ["node", "dist/src/server.js"] 