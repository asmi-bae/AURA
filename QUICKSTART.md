# Quick Start Guide

This guide will help you get the AURA project up and running quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** >= 18.0.0
- **pnpm** >= 10.0.0
- **Redis** >= 7.0 (for queues and caching)
- **PostgreSQL** >= 14 (for production) or **SQLite** (for development)
- **Docker** and **Docker Compose** (optional, for containerized setup)

### Installing Prerequisites

#### Install Node.js
```bash
# Using nvm (recommended)
nvm install 18
nvm use 18

# Or download from https://nodejs.org/
```

#### Install pnpm
```bash
npm install -g pnpm@10.0.0
```

#### Install Redis
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Or use Docker
docker run -d -p 6379:6379 redis:7-alpine
```

#### Install PostgreSQL (Optional - SQLite works for dev)
```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Ubuntu/Debian
sudo apt-get install postgresql-16
sudo systemctl start postgresql

# Or use Docker
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=securepassword postgres:16-alpine
```

## Quick Start (3 Steps)

### Step 1: Install Dependencies

```bash
# Clone the repository (if not already done)
git clone <repository-url>
cd AURA

# Install all dependencies
pnpm install
```

### Step 2: Configure Environment

Create a `.env` file in the root directory:

```bash
# Copy from example (if exists) or create new
touch .env
```

Add the following to `.env`:

```env
# Database (use SQLite for development)
DB_TYPE=sqlite
DB_HOST=localhost
DB_PORT=5432
DB_USER=aura
DB_PASS=password
DB_NAME=aura

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secret (change in production!)
JWT_SECRET=your-secret-key-change-in-production-min-32-chars

# Service URLs
GATEWAY_URL=http://localhost:3000
REGISTRY_URL=http://localhost:3008

# Optional: OAuth (leave empty if not using)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Optional: AI Services
OPENAI_API_KEY=

# Optional: Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### Step 3: Start Infrastructure & Services

#### Option A: Using Docker Compose (Recommended)

```bash
# Start Redis and PostgreSQL
docker-compose -f deployments/docker/docker-compose.yml up -d redis postgres

# Wait for services to be ready (10-15 seconds)
sleep 15

# Build all packages
pnpm build

# Start all services in development mode
pnpm dev
```

#### Option B: Manual Setup

```bash
# 1. Start Redis (in a separate terminal)
redis-server
# Or if using Docker:
docker run -d -p 6379:6379 redis:7-alpine

# 2. Start PostgreSQL (if using, otherwise SQLite will be used automatically)
# PostgreSQL is already running or start it manually

# 3. Build all packages
pnpm build

# 4. Start all services
pnpm dev
```

## Running Individual Services

If you want to run services individually:

```bash
# Gateway Service (Port 3000)
pnpm --filter @aura/gateway dev

# Agent Service (Port 3006)
pnpm --filter @aura/agent-service dev

# Workflow Engine (Port 3001)
pnpm --filter @aura/workflow-engine dev

# Auth Service (Port 3013)
pnpm --filter @aura/auth-service dev

# Registry Service (Port 3008)
pnpm --filter @aura/registry-service dev

# Or navigate to service directory
cd services/gateway
pnpm dev
```

## Service Ports

| Service | Port | URL |
|---------|------|-----|
| Gateway | 3000 | http://localhost:3000 |
| Workflow Engine | 3001 | http://localhost:3001 |
| Webhook Handler | 3002 | http://localhost:3002 |
| Scheduler | 3003 | http://localhost:3003 |
| Notification | 3004 | http://localhost:3004 |
| Collaboration | 3005 | http://localhost:3005 |
| Agent | 3006 | http://localhost:3006 |
| Plugin | 3007 | http://localhost:3007 |
| Registry | 3008 | http://localhost:3008 |
| Messaging | 3009 | http://localhost:3009 |
| Analytics | 3010 | http://localhost:3010 |
| RAG | 3011 | http://localhost:3011 |
| Vector | 3012 | http://localhost:3012 |
| Auth | 3013 | http://localhost:3013 |

## Verify Installation

### Check Service Health

```bash
# Gateway
curl http://localhost:3000/health

# Agent Service
curl http://localhost:3006/health

# Registry Service
curl http://localhost:3008/health

# List all registered services
curl http://localhost:3008/services
```

### Expected Health Response

```json
{
  "status": "ok",
  "service": "gateway",
  "version": "0.0.1",
  "uptime": 123,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

## Running with Docker (Full Stack)

To run everything with Docker:

```bash
# Build all Docker images
./deployments/scripts/build-all.sh

# Or start infrastructure first
docker-compose -f deployments/docker/docker-compose.yml up -d redis postgres

# Wait for infrastructure
sleep 15

# Start all services
docker-compose -f deployments/docker/docker-compose.yml up -d

# View logs
docker-compose -f deployments/docker/docker-compose.yml logs -f

# Check status
docker-compose -f deployments/docker/docker-compose.yml ps
```

## Running Frontend Apps

### Web App

```bash
cd apps/web
pnpm install
pnpm dev
# Access at http://localhost:3000 (or configured port)
```

### Docs App

```bash
cd apps/docs
pnpm install
pnpm dev
# Access at http://localhost:3001 (or configured port)
```

## Troubleshooting

### Port Already in Use

If a port is already in use, either:
1. Stop the service using that port
2. Change the port in the service's `.env` or configuration

### Redis Connection Failed

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start it
redis-server
# Or with Docker:
docker run -d -p 6379:6379 redis:7-alpine
```

### Database Connection Failed

For SQLite (default for development):
- SQLite creates the database file automatically
- Check file permissions in the project directory

For PostgreSQL:
```bash
# Test connection
psql -h localhost -U aura -d aura

# If connection fails, check PostgreSQL is running
# macOS: brew services list
# Linux: sudo systemctl status postgresql
```

### Build Errors

```bash
# Clean and rebuild
rm -rf node_modules packages/*/dist services/*/dist apps/*/.next
pnpm install
pnpm build
```

### TypeScript Errors

```bash
# Check types
pnpm check-types

# If errors persist, rebuild
pnpm build
```

## Next Steps

- Read the [Development Guide](./DEVELOPMENT.md) for detailed development workflow
- Check [Architecture](./ARCHITECTURE.md) to understand the system design
- Review [API Documentation](./docs/api-reference.md) for API endpoints
- See [Contributing Guide](./CONTRIBUTING.md) to contribute

## Common Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all services in dev mode
pnpm dev

# Run linting
pnpm lint

# Format code
pnpm format

# Type checking
pnpm check-types

# Run tests (if available)
pnpm test
```

## Need Help?

- Check the [Development Guide](./DEVELOPMENT.md)
- Review [Troubleshooting](#troubleshooting) section above
- Check GitHub Issues
- Contact maintainers

Happy coding! 🚀

