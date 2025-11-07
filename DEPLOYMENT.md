# Deployment Guide

This guide covers deploying the AURA platform to various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Environment Variables](#environment-variables)
- [Health Checks](#health-checks)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required
- Docker >= 20.10
- Docker Compose >= 2.0
- Kubernetes >= 1.24 (for K8s deployment)
- kubectl (for K8s deployment)

### Optional
- Helm >= 3.0 (for K8s deployment)
- Terraform (for infrastructure as code)

## Environment Setup

### Development Environment

```bash
# Clone repository
git clone https://github.com/your-org/aura.git
cd aura

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Production Environment

1. Set up infrastructure:
   - PostgreSQL database
   - Redis cluster
   - Load balancer
   - Domain name

2. Configure environment variables
3. Set up SSL certificates
4. Configure DNS

## Docker Deployment

### Quick Start

```bash
# Start infrastructure (Redis, PostgreSQL)
docker-compose -f deployments/docker/docker-compose.yml up -d redis postgres

# Wait for services to be ready
sleep 10

# Start all services
docker-compose -f deployments/docker/docker-compose.yml up -d

# Check status
docker-compose -f deployments/docker/docker-compose.yml ps

# View logs
docker-compose -f deployments/docker/docker-compose.yml logs -f
```

### Building Images

```bash
# Build all images
./deployments/scripts/build-all.sh

# Or build individually
docker build -f deployments/docker/Dockerfile.gateway -t aura/gateway:latest .
docker build -f deployments/docker/Dockerfile.workflow-engine -t aura/workflow-engine:latest .
# ... etc
```

### Service-Specific Deployment

```bash
# Start specific service
docker-compose -f deployments/docker/docker-compose.yml up -d gateway

# Scale service
docker-compose -f deployments/docker/docker-compose.yml up -d --scale gateway=3

# Stop service
docker-compose -f deployments/docker/docker-compose.yml stop gateway

# Remove service
docker-compose -f deployments/docker/docker-compose.yml rm -f gateway
```

### Docker Compose Configuration

Edit `deployments/docker/docker-compose.yml`:

```yaml
services:
  gateway:
    build:
      context: .
      dockerfile: deployments/docker/Dockerfile.gateway
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - REDIS_HOST=redis
      - DB_HOST=postgres
    depends_on:
      - redis
      - postgres
```

## Kubernetes Deployment

### Prerequisites

```bash
# Verify kubectl access
kubectl cluster-info

# Create namespace
kubectl create namespace aura
```

### Deploy Infrastructure

```bash
# Deploy Redis
kubectl apply -f deployments/k8s/redis.yaml

# Deploy PostgreSQL
kubectl apply -f deployments/k8s/postgres.yaml

# Wait for services to be ready
kubectl wait --for=condition=ready pod -l app=redis -n aura --timeout=300s
kubectl wait --for=condition=ready pod -l app=postgres -n aura --timeout=300s
```

### Deploy Services

```bash
# Deploy all services
kubectl apply -f deployments/k8s/

# Or deploy individually
kubectl apply -f deployments/k8s/gateway.yaml
kubectl apply -f deployments/k8s/workflow-engine.yaml
# ... etc
```

### Check Deployment Status

```bash
# Check pods
kubectl get pods -n aura

# Check services
kubectl get services -n aura

# Check deployments
kubectl get deployments -n aura

# View logs
kubectl logs -f deployment/gateway -n aura
```

### Scaling

```bash
# Scale service
kubectl scale deployment gateway --replicas=3 -n aura

# Auto-scaling (if configured)
kubectl autoscale deployment gateway --min=2 --max=10 -n aura
```

### Rolling Updates

```bash
# Update image
kubectl set image deployment/gateway gateway=aura/gateway:v1.1.0 -n aura

# Check rollout status
kubectl rollout status deployment/gateway -n aura

# Rollback if needed
kubectl rollout undo deployment/gateway -n aura
```

## Environment Variables

### Common Variables

```env
# Service Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Database
DB_TYPE=postgres
DB_HOST=postgres
DB_PORT=5432
DB_USER=aura
DB_PASS=secure-password
DB_NAME=aura

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key-min-32-chars

# Registry
REGISTRY_URL=http://registry:3008

# Gateway
GATEWAY_URL=http://gateway:3000
```

### Service-Specific Variables

#### Gateway
```env
CORS_ORIGIN=https://app.aura.example.com
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

#### Auth Service
```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
```

#### AI Services
```env
OPENAI_API_KEY=
PINECONE_API_KEY=
WEAVIATE_API_KEY=
```

#### Messaging
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
DISCORD_TOKEN=
TELEGRAM_TOKEN=
```

## Health Checks

### Service Health Endpoints

All services expose `/health` endpoint:

```bash
# Check service health
curl http://localhost:3000/health
curl http://localhost:3001/health
# ... etc
```

### Health Check Response

```json
{
  "status": "ok",
  "service": "gateway",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Kubernetes Health Checks

Configured in deployment manifests:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Monitoring

### Service Discovery

All services register with Registry Service:

```bash
# List registered services
curl http://localhost:3008/services

# Get service details
curl http://localhost:3008/services/gateway

# Service health status
curl http://localhost:3008/services/gateway/health
```

### Logs

```bash
# Docker logs
docker-compose -f deployments/docker/docker-compose.yml logs -f gateway

# Kubernetes logs
kubectl logs -f deployment/gateway -n aura

# All services
kubectl logs -f -l app=aura -n aura
```

### Metrics

Access Analytics Service:

```bash
# Agent statistics
curl http://localhost:3010/stats/agents

# Workflow statistics
curl http://localhost:3010/stats/workflows

# Dashboard data
curl http://localhost:3010/dashboard
```

## Troubleshooting

### Service Won't Start

1. Check logs:
```bash
docker-compose logs service-name
kubectl logs pod-name -n aura
```

2. Check environment variables
3. Verify dependencies (Redis, PostgreSQL)
4. Check port conflicts

### Database Connection Issues

```bash
# Test database connection
psql -h localhost -U aura -d aura

# Check connection from service
docker exec -it aura-gateway-1 sh
# Inside container:
# Test connection
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli -h localhost ping

# Check from service
docker exec -it aura-gateway-1 sh
# Inside container:
# Test Redis connection
```

### Service Registration Issues

1. Check Registry Service is running
2. Verify REGISTRY_URL environment variable
3. Check network connectivity
4. Review service logs

### Performance Issues

1. Check resource usage:
```bash
docker stats
kubectl top pods -n aura
```

2. Review service logs for errors
3. Check database query performance
4. Verify Redis is working
5. Review queue processing

## Production Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Logging configured
- [ ] Health checks verified
- [ ] Service discovery working
- [ ] Load balancing configured
- [ ] Auto-scaling configured
- [ ] Backup and recovery tested
- [ ] Security audit completed
- [ ] Performance testing done
- [ ] Documentation updated

## Rollback Procedure

### Docker Compose

```bash
# Stop services
docker-compose -f deployments/docker/docker-compose.yml down

# Revert to previous version
git checkout previous-version
docker-compose -f deployments/docker/docker-compose.yml up -d
```

### Kubernetes

```bash
# Rollback deployment
kubectl rollout undo deployment/service-name -n aura

# Rollback to specific revision
kubectl rollout undo deployment/service-name --to-revision=2 -n aura
```

## Backup and Recovery

### Database Backup

```bash
# PostgreSQL backup
pg_dump -h localhost -U aura aura > backup.sql

# Restore
psql -h localhost -U aura aura < backup.sql
```

### Configuration Backup

```bash
# Backup environment files
tar -czf config-backup.tar.gz .env deployments/
```

## Security Considerations

1. **Secrets Management**
   - Use Kubernetes secrets
   - Use Docker secrets
   - Never commit secrets to git

2. **Network Security**
   - Use internal networks
   - Configure firewalls
   - Enable TLS/SSL

3. **Access Control**
   - Limit admin access
   - Use RBAC
   - Enable 2FA

4. **Monitoring**
   - Monitor for security events
   - Set up alerts
   - Regular security audits

## Support

For deployment issues:
1. Check logs
2. Review documentation
3. Check GitHub issues
4. Contact maintainers

## References

- [Development Guide](./DEVELOPMENT.md)
- [Architecture](./ARCHITECTURE.md)
- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)

