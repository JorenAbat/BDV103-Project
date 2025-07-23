# Multi-stage build for smaller, more secure production images
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY services/swagger-docs/package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY services/swagger-docs/ ./

# Production stage
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S docsuser -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY --from=builder --chown=docsuser:nodejs /app/package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY --from=builder --chown=docsuser:nodejs /app/src/ ./src/

# Switch to non-root user
USER docsuser

# Expose the port
EXPOSE 3004

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3004/health || exit 1

# Command to run the application
CMD ["npm", "start"] 