# Extend the existing mcmasterful-books image and include our adapter
FROM ghcr.io/mcmastercce/bvd-103-mcmasterful-books/mcmasterful-books-docker:main

# Create non-root user for security
USER root
RUN groupadd -g 1001 frontend
RUN useradd -r -u 1001 -g frontend -m -d /home/frontenduser frontenduser
RUN chown -R frontenduser:frontend /home/frontenduser

# Copy our adapter code into the image
COPY --chown=frontenduser:frontend adapter/ /source/adapter/

# Switch to non-root user
USER frontenduser

# The base image should already have the correct EXPOSE and CMD
# But we can add a health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1 