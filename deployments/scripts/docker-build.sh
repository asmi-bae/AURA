#!/bin/bash

# Docker build script for AURA services

set -e

echo "Building Docker images..."

# Build workflow-engine
echo "Building workflow-engine..."
docker build -f deployments/docker/Dockerfile.workflow-engine -t aura/workflow-engine:latest ../..

# Build webhook-handler
echo "Building webhook-handler..."
docker build -f deployments/docker/Dockerfile.webhook-handler -t aura/webhook-handler:latest ../..

# Build scheduler
echo "Building scheduler..."
docker build -f deployments/docker/Dockerfile.scheduler -t aura/scheduler:latest ../..

# Build notification
echo "Building notification..."
docker build -f deployments/docker/Dockerfile.notification -t aura/notification:latest ../..

# Build collaboration
echo "Building collaboration..."
docker build -f deployments/docker/Dockerfile.collaboration -t aura/collaboration:latest ../..

echo "Docker images built successfully!"

