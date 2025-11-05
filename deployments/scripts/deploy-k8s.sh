#!/bin/bash

# Kubernetes deployment script

set -e

echo "Deploying AURA to Kubernetes..."

# Create namespace
kubectl apply -f deployments/k8s/namespace.yaml

# Create secrets
kubectl apply -f deployments/k8s/secrets.yaml

# Deploy Redis
kubectl apply -f deployments/k8s/redis.yaml

# Deploy PostgreSQL
kubectl apply -f deployments/k8s/postgres.yaml

# Wait for databases to be ready
echo "Waiting for databases to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/redis -n aura
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n aura

# Deploy services
kubectl apply -f deployments/k8s/workflow-engine.yaml
kubectl apply -f deployments/k8s/webhook-handler.yaml
kubectl apply -f deployments/k8s/scheduler.yaml
kubectl apply -f deployments/k8s/notification.yaml
kubectl apply -f deployments/k8s/collaboration.yaml

echo "Deployment complete!"
echo "Run 'kubectl get pods -n aura' to check status"

