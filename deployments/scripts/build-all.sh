#!/bin/bash

# Build all Docker images for AURA services

set -e

echo "Building all AURA Docker images..."

SERVICES=(
  "gateway"
  "workflow-engine"
  "webhook-handler"
  "scheduler"
  "notification"
  "collaboration"
  "agent"
  "plugin"
  "registry"
  "messaging"
  "analytics"
  "rag"
  "vector"
  "auth"
)

for service in "${SERVICES[@]}"; do
  echo "Building $service..."
  docker build -f deployments/docker/Dockerfile.$service -t aura/$service:latest ../..
done

echo "All Docker images built successfully!"
echo ""
echo "Images:"
for service in "${SERVICES[@]}"; do
  echo "  - aura/$service:latest"
done
