# AURA Architecture

This document describes the architecture of the AURA platform.

## Overview

AURA is a microservices-based workflow automation platform built with TypeScript, Node.js, and modern cloud-native technologies.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Web App  │  │ Docs App │  │  Mobile │  │  Desktop │   │
│  │ (Next.js)│  │ (Next.js)│  │   App   │  │  Agent   │   │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘   │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┴─────────────┴─────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │         API Gateway (3000)        │
        │  ┌─────────────────────────────┐ │
        │  │  Auth │ Rate Limit │ CORS   │ │
        │  └─────────────────────────────┘ │
        └─────────────────┬─────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐
│   Services   │  │   Services   │  │   Services   │
│              │  │              │  │              │
│ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │
│ │Workflow  │ │  │ │  Agent   │ │  │ │  Plugin  │ │
│ │ Engine   │ │  │ │ Service  │ │  │ │ Service  │ │
│ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │
│              │  │              │  │              │
│ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │
│ │ Scheduler│ │  │ │ Messaging│ │  │ │ Analytics│ │
│ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │
│              │  │              │  │              │
│ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │
│ │   RAG    │ │  │ │  Vector  │ │  │ │   Auth   │ │
│ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │      Infrastructure Layer          │
        │  ┌──────┐  ┌──────┐  ┌──────────┐ │
        │  │Redis │  │PostgreSQL│ Registry│ │
        │  └──────┘  └──────┘  └──────────┘ │
        └───────────────────────────────────┘
```

## Service Architecture

### Gateway Service (Port 3000)

**Purpose**: Single entry point for all client requests

**Responsibilities**:
- Request routing
- Authentication & authorization
- Rate limiting
- CORS handling
- Request/response transformation

**Technology**: Fastify

**Key Features**:
- JWT token validation
- OAuth2 callback handling
- WebSocket support
- Request logging

### Workflow Engine (Port 3001)

**Purpose**: Execute and manage workflows

**Responsibilities**:
- Workflow execution
- Queue management
- State persistence
- Plugin integration

**Technology**: n8n-core, BullMQ

**Key Features**:
- Queue-based execution
- Database persistence
- Caching
- Metrics collection

### Agent Service (Port 3006)

**Purpose**: Manage and execute AI agents

**Responsibilities**:
- Agent lifecycle management
- Task execution
- Agent registry
- Statistics collection

**Key Features**:
- Agent creation and management
- Task execution via thinking engine
- Lifecycle management
- Performance tracking

### Plugin Service (Port 3007)

**Purpose**: Manage and execute plugins

**Responsibilities**:
- Plugin loading
- Sandbox execution
- Plugin registry
- Hot reload

**Key Features**:
- Secure sandbox (VM2)
- Multiple loading sources
- Plugin validation
- Hot reload support

### Registry Service (Port 3008)

**Purpose**: Service discovery and health monitoring

**Responsibilities**:
- Service registration
- Health checks
- Service discovery
- Load balancing

**Key Features**:
- Automatic service registration
- Periodic health checks
- Multiple load balancing strategies
- Service statistics

### Auth Service (Port 3013)

**Purpose**: Authentication and authorization

**Responsibilities**:
- User authentication
- Token management
- OAuth2 integration
- RBAC enforcement

**Key Features**:
- JWT authentication
- OAuth2 (4 providers)
- 2FA/TOTP
- RBAC
- Password management

## Data Flow

### Workflow Execution Flow

```
1. Client → Gateway → Workflow Engine
2. Workflow Engine → Queue (BullMQ)
3. Worker → Execute Workflow
4. Worker → Update Database
5. Worker → Emit Events
6. Client ← WebSocket ← Events
```

### Agent Task Execution Flow

```
1. Client → Gateway → Agent Service
2. Agent Service → Agent Registry
3. Agent → Thinking Engine
4. Thinking Engine → Planner → Executor
5. Executor → Capabilities
6. Results → Agent Service → Client
```

### Service Registration Flow

```
1. Service Starts
2. Service → Registry Service (Register)
3. Registry → Health Check (Periodic)
4. Service → Registry (Unregister on shutdown)
```

## Technology Stack

### Runtime
- **Node.js**: >= 18.0.0
- **TypeScript**: 5.9.2
- **Package Manager**: pnpm 10.0.0

### Frameworks
- **API**: Fastify, Express
- **Frontend**: Next.js, React
- **Database**: TypeORM (SQLite/PostgreSQL)
- **Queue**: BullMQ + Redis
- **Workflow**: n8n-core, n8n-workflow

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Build Tool**: Turbo

### Security
- **Authentication**: JWT, OAuth2
- **Encryption**: AES-256-GCM, RSA
- **Sandboxing**: VM2
- **Rate Limiting**: Redis-based

## Package Structure

### Core Packages

#### `@aura/core`
- BaseService
- Lifecycle management
- Dependency injection
- Workflow engine wrapper
- Event bus
- Queue management

#### `@aura/db`
- TypeORM entities
- Database connections
- Migrations

#### `@aura/auth`
- JWT service
- OAuth2 providers
- RBAC
- 2FA/TOTP

#### `@aura/agent`
- Agent core
- Thinking engine
- Capabilities
- Security manager

#### `@aura/ai`
- AI model integration
- RAG pipeline
- Vector store
- Embeddings

#### `@aura/config`
- Configuration management
- Environment validation

#### `@aura/crypto`
- Encryption utilities
- Signing utilities
- E2EE support

#### `@aura/common`
- Shared constants
- Helper functions
- Error codes

## Communication Patterns

### Synchronous (HTTP/REST)
- Client ↔ Gateway ↔ Services
- Service ↔ Service (direct calls)

### Asynchronous (Queue)
- Workflow execution
- Background tasks
- Event processing

### Real-time (WebSocket)
- Client ↔ Gateway
- Collaboration updates
- Live notifications

### Pub/Sub (Redis)
- Service events
- Cross-service communication
- Event broadcasting

## Scalability

### Horizontal Scaling
- Stateless services
- Load balancing via Registry
- Queue-based processing
- Database connection pooling

### Caching Strategy
- Redis for session data
- In-memory caching for frequent reads
- Workflow result caching

### Database Strategy
- PostgreSQL for production
- SQLite for development
- Connection pooling
- Read replicas (future)

## Security Architecture

### Authentication Flow
```
1. User → Auth Service (Login)
2. Auth Service → JWT Token
3. Client → Gateway (with Token)
4. Gateway → Validate Token
5. Gateway → Forward Request
```

### Authorization Flow
```
1. Request → Gateway
2. Gateway → Extract User/Role
3. Gateway → Check Permissions
4. Gateway → Allow/Deny
```

### Security Layers
1. **Network**: HTTPS, TLS
2. **Application**: Authentication, Authorization
3. **Data**: Encryption at rest, in transit
4. **Code**: Sandboxing, input validation

## Deployment Architecture

### Development
- Local services
- SQLite database
- Local Redis
- Hot reload

### Production
- Containerized services
- PostgreSQL database
- Redis cluster
- Kubernetes orchestration
- Auto-scaling
- Health checks
- Rolling updates

## Monitoring & Observability

### Logging
- Centralized logging (Winston)
- Structured logs (JSON)
- Log levels (debug, info, warn, error)

### Metrics
- Service health metrics
- Performance metrics
- Business metrics (via Analytics Service)

### Tracing
- Request IDs
- Correlation IDs
- Distributed tracing (future)

## Future Enhancements

### Planned
- GraphQL API
- gRPC support
- Advanced monitoring
- Service mesh
- Multi-region deployment
- Advanced caching strategies

### Under Consideration
- Event sourcing
- CQRS pattern
- Advanced analytics
- Machine learning integration

## References

- [Service Architecture Diagram](#system-architecture)
- [Development Guide](./DEVELOPMENT.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./docs/api-reference.md)

