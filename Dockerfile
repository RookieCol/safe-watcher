FROM gcr.io/distroless/nodejs22-debian12

USER 1000:1000

WORKDIR /app

ENV NODE_ENV=production

ARG PACKAGE_VERSION
LABEL org.opencontainers.image.version="${PACKAGE_VERSION}"

# Copy source files
COPY dist /app

# Force rebuild on code changes with a timestamp
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.created="${BUILD_DATE}"

CMD ["/app/index.mjs"]
