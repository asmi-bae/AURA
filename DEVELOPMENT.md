# Development Guide

This guide provides detailed information for developing the AURA platform.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Running Services](#running-services)
- [Building](#building)
- [Testing](#testing)
- [Debugging](#debugging)
- [Code Organization](#code-organization)
- [Common Tasks](#common-tasks)

## Prerequisites

### Required Software

- **Node.js**: >= 18.0.0
- **pnpm**: >= 10.0.0
- **Redis**: >= 7.0 (for queues and caching)
- **PostgreSQL**: >= 14 (for production) or SQLite (for development)
- **Git**: Latest version

### Optional Tools

- **Docker**: For containerized development
- **Docker Compose**: For running infrastructure
- **VS Code**: Recommended IDE with extensions:
  - ESLint
  - Prettier
  - TypeScript
  - Docker

## Project Structure

```
aura/
├── apps/                    # Applications
│   ├── web/                 # Next.js web application
│   └── docs/                # Documentation site
│
├── packages/               # Shared packages
│   ├── core/               # Core functionality
│   ├── db/                  # Database entities
│   ├── auth/                # Authentication
│   ├── agent/               # Agent system
│   ├── ai/                  # AI integration
│   ├── plugins/             # Plugin system
│   ├── config/              # Configuration
│   ├── crypto/              # Cryptography
│   ├── common/              # Common utilities
│   ├── types/               # TypeScript types
│   └── utils/               # Utilities
│
├── services/                # Microservices
│   ├── gateway/             # API Gateway (3000)
│   ├── workflow-engine/     # Workflow Engine (3001)
│   ├── webhook-handler/     # Webhook Handler (3002)
│   ├── scheduler/           # Scheduler (3003)
│   ├── notification/        # Notification (3004)
│   ├── collaboration/       # Collaboration (3005)
│   ├── agent/               # Agent Service (3006)
│   ├── plugin/              # Plugin Service (3007)
│   ├── registry/            # Registry Service (3008)
│   ├── messaging/           # Messaging Service (3009)
│   ├── analytics/           # Analytics Service (3010)
│   ├── rag/                 # RAG Service (3011)
│   ├── vector/              # Vector Service (3012)
│   └── auth/                # Auth Service (3013)
│
├── deployments/             # Deployment configs
│   ├── docker/              # Dockerfiles and compose
│   ├── k8s/                 # Kubernetes manifests
│   └── scripts/             # Deployment scripts
│
└── .github/                 # GitHub workflows
    └── workflows/           # CI/CD pipelines
```

## Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/aura.git
cd aura
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Environment Configuration

Create `.env` file in root:

```env
# Database
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

# JWT
JWT_SECRET=your-secret-key-change-in-production

# Services
GATEWAY_URL=http://localhost:3000
REGISTRY_URL=http://localhost:3008

# OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AI (optional)
OPENAI_API_KEY=

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
```

### 4. Start Infrastructure

```bash
# Using Docker Compose
docker-compose -f deployments/docker/docker-compose.yml up -d redis postgres

# Or manually
redis-server
# PostgreSQL setup...
```

### 5. Build Packages

```bash
pnpm build
```

## Running Services

### Development Mode

```bash
# Run all services in development mode
pnpm dev

# Run specific service
pnpm --filter @aura/gateway dev
pnpm --filter @aura/workflow-engine dev
pnpm --filter @aura/agent-service dev
```

### Individual Service Commands

```bash
# Gateway
cd services/gateway
pnpm dev

# Workflow Engine
cd services/workflow-engine
pnpm dev

# Agent Service
cd services/agent
pnpm dev
```

### Service Ports

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

## Building

### Build All Packages

```bash
pnpm build
```

### Build Specific Package

```bash
pnpm --filter @aura/gateway build
pnpm --filter @aura/core build
```

### Build with Turbo

```bash
# Clean build
pnpm build --force

# Build specific package and dependencies
pnpm build --filter @aura/gateway...
```

## Testing

### Run All Tests

```bash
pnpm test
```

### Run Tests for Specific Package

```bash
pnpm --filter @aura/gateway test
```

### Test Coverage

```bash
pnpm test:coverage
```

### Watch Mode

```bash
pnpm test:watch
```

## Debugging

### VS Code Debugging

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Gateway",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "@aura/gateway", "dev"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### Logging

All services use `@aura/utils` logger:

```typescript
import { createLogger } from '@aura/utils';

const logger = createLogger();

logger.info('Service started', { port: 3000 });
logger.error('Error occurred', { error });
logger.debug('Debug info', { data });
```

### Environment Variables

Set `LOG_LEVEL=debug` for verbose logging:

```bash
LOG_LEVEL=debug pnpm --filter @aura/gateway dev
```

## Code Organization

### Package Structure

```
packages/package-name/
├── src/
│   ├── index.ts           # Main exports
│   ├── types.ts           # Type definitions
│   └── utils.ts           # Utilities
├── package.json
├── tsconfig.json
└── README.md
```

### Service Structure

```
services/service-name/
├── src/
│   ├── index.ts           # Entry point
│   ├── routes/            # API routes
│   ├── middlewares/       # Express middlewares
│   ├── services/          # Business logic
│   └── types.ts           # Types
├── package.json
├── tsconfig.json
└── Dockerfile
```

### Naming Conventions

- **Files**: kebab-case (`user-service.ts`)
- **Classes**: PascalCase (`UserService`)
- **Functions**: camelCase (`getUserById`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Interfaces**: PascalCase with `I` prefix optional (`IUser` or `User`)

## Common Tasks

### Adding a New Service

1. Create service directory:
```bash
mkdir services/new-service
cd services/new-service
```

2. Initialize package:
```bash
pnpm init
```

3. Add to workspace:
```json
// pnpm-workspace.yaml
packages:
  - 'services/new-service'
```

4. Create service structure:
```typescript
// src/index.ts
import express from 'express';
import { ServiceRegistration } from '@aura/core';

const app = express();
const port = 3014;

const serviceRegistration = new ServiceRegistration({
  id: 'new-service',
  name: 'New Service',
  version: '1.0.0',
  url: `http://localhost:${port}`,
});

app.listen(port, async () => {
  await serviceRegistration.register();
  console.log(`Service running on port ${port}`);
});
```

### Adding a New Package

1. Create package directory:
```bash
mkdir packages/new-package
cd packages/new-package
```

2. Initialize package:
```bash
pnpm init
```

3. Add to workspace and configure TypeScript

### Database Migrations

```bash
cd packages/db
pnpm db:migrate
pnpm db:revert
pnpm db:seed
```

### Updating Dependencies

```bash
# Update all dependencies
pnpm update

# Update specific package
pnpm update @aura/core

# Check for outdated packages
pnpm outdated
```

### Code Formatting

```bash
# Format all code
pnpm format

# Check formatting
pnpm format:check
```

### Linting

```bash
# Lint all code
pnpm lint

# Fix linting issues
pnpm lint:fix
```

## Troubleshooting

### Build Errors

```bash
# Clean build
rm -rf node_modules packages/*/dist services/*/dist
pnpm install
pnpm build
```

### Port Conflicts

Change port in service `.env` or `src/index.ts`

### Redis Connection Issues

Ensure Redis is running:
```bash
redis-cli ping
# Should return: PONG
```

### Database Connection Issues

Check database is running and credentials are correct in `.env`

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [TypeORM Documentation](https://typeorm.io/)
- [Turbo Documentation](https://turbo.build/repo/docs)

## Getting Help

- Check existing issues on GitHub
- Review documentation
- Ask in discussions
- Contact maintainers

Happy coding! 🚀

