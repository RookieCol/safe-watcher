#!/bin/bash
set -e

# Build the TypeScript code
echo "Building application..."
yarn build

# Build the Docker image with current timestamp
echo "Building Docker image..."
docker build --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" -t safe-watcher:latest .

# Stop any existing container
echo "Stopping existing container (if any)..."
docker stop safe-watcher-container || true
docker rm safe-watcher-container || true

# Run the new container
echo "Starting new container..."
docker run -d --name safe-watcher-container \
  --restart unless-stopped \
  -v "$(pwd)/config.yaml:/app/config.yaml" \
  safe-watcher:latest

echo "Deployment complete!" 