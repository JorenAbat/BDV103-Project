# Multi-stage build for smaller, more secure production images
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy root package files for shared dependencies
COPY package*.json ./

# Copy shared service
COPY services/shared/ ./services/shared/

# Copy warehouse-service
COPY services/warehouse-service/ ./services/warehouse-service/

# Install dependencies for shared service
WORKDIR /app/services/shared
RUN npm install && npm run build

# Install dependencies and build warehouse-service
WORKDIR /app/services/warehouse-service
RUN npm install && npm run generate && npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S warehouseuser -u 1001

# Set working directory to match build structure
WORKDIR /app/services/warehouse-service

# Copy shared service built files (maintain relative path structure)
COPY --from=builder --chown=warehouseuser:nodejs /app/services/shared/ ../shared/

# Copy warehouse-service package files
COPY --from=builder --chown=warehouseuser:nodejs /app/services/warehouse-service/package*.json ./

# Install only production dependencies for warehouse-service
RUN npm ci --only=production && npm cache clean --force

# Copy built application code
COPY --from=builder --chown=warehouseuser:nodejs /app/services/warehouse-service/dist/ ./dist/

# Switch to non-root user
USER warehouseuser

# Expose the port
EXPOSE 3002

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Command to run the application
CMD ["node", "dist/src/server.js"] 