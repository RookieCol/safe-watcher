#!/bin/bash
set -e

# Enable Corepack to use the correct Yarn version
echo "Enabling Corepack..."
corepack enable
corepack prepare yarn@4.6.0 --activate

# Install dependencies
echo "Installing dependencies..."
yarn install

# Build the TypeScript code
echo "Building application..."
yarn build

# Stop all running containers
echo "Stopping all Docker containers..."
docker ps -q | xargs -r docker stop

# Remove all stopped containers, unused networks, dangling images, and build cache
echo "Pruning Docker system..."
docker system prune -f

# Build the Docker image with current timestamp
echo "Building Docker image..."
docker build --build-arg BUILD_DATE="$(date -u +'%Y-%m-%dT%H:%M:%SZ')" -t safe-watcher:latest .

# Stop any existing container with the same name
echo "Removing existing container (if any)..."
docker rm safe-watcher-container || true

# Run the new container
echo "Starting new container..."
docker run -d --name safe-watcher-container \
  --restart unless-stopped \
  -v "$(pwd)/config.yaml:/app/config.yaml" \
  safe-watcher:latest

echo "Deployment complete!" 