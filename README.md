# AURA - Scalable Workflow Automation Platform

AURA is a comprehensive, scalable workflow automation platform that combines AI-powered workflows, real-time collaboration, cross-platform desktop automation, and enterprise-grade infrastructure.

## Architecture Overview

```
aura/
│
├── apps/
│   ├── web/                   # Next.js Admin UI (cross-platform)
│   ├── docs/                  # Documentation + API reference
│
├── packages/
│   ├── core/                  # Workflow engine wrapper (n8n-core)
│   ├── plugins/               # All integrations & custom nodes
│   ├── db/                    # TypeORM entities + DB connectors
│   ├── utils/                 # Shared utilities (logging, validation)
│   ├── auth/                  # JWT/OAuth & RBAC logic
│   ├── types/                 # TS type definitions
│   └── ai/                    # RAG, MCP, GPT integration wrapper
│
├── services/
│   ├── workflow-engine/       # Executes workflows (containerized)
│   ├── webhook-handler/       # Listens for external events
│   ├── scheduler/             # Cron/interval workflows
│   ├── notification/          # Slack/email/SMS notifications
│   ├── real-time-agent/       # Cross-platform desktop agent (Windows/Linux/macOS)
│   └── collaboration/         # Multi-user real-time sync
│
├── deployments/
│   ├── docker/                # Dockerfiles & docker-compose
│   ├── k8s/                   # Kubernetes manifests
│   └── scripts/               # Deployment scripts
```

## Features

### 🤖 Workflow Engine
- Built on n8n-core and n8n-workflow
- Queue-based execution using BullMQ and Redis
- Dynamic plugin loading
- Horizontal scaling support

### 🤝 Real-Time Collaboration
- Multi-user workflow editing
- Operational transformation (OT) for conflict-free editing
- Real-time presence indicators
- Socket.io-based synchronization

### 🖥️ Cross-Platform Desktop Agent
- Electron-based desktop application
- Windows, macOS, and Linux support
- Screen capture and automation
- Mouse and keyboard control
- Secure WebSocket connection to workflow engine

### 🤖 AI Integration
- GPT-4/GPT-5 integration
- RAG (Retrieval-Augmented Generation) support
- MCP (Model Context Protocol) for tool calling
- Vector database support (Pinecone, Weaviate)

### 📧 Notifications
- Slack integration
- Email (SMTP)
- SMS (Twilio)
- Push notifications (Firebase)

### 🔐 Authentication & Authorization
- JWT-based authentication
- OAuth 2.0 (Google)
- Role-based access control (RBAC)
- Admin, Editor, Viewer, User roles

### 📊 Database
- TypeORM with SQLite (dev) or PostgreSQL (prod)
- Migrations support
- Entity relationships
- Caching layer ready

## Tech Stack

| Layer           | Tech / Library                                   |
| --------------- | ------------------------------------------------ |
| Workflow engine | n8n-core, n8n-workflow, n8n-nodes-base           |
| Plugins         | @slack/web-api, @octokit/rest, googleapis, axios |
| AI / RAG / MCP  | openai, langchain, pinecone/weaviate             |
| Desktop agent   | electron, robotjs, desktopCapturer               |
| Real-time voice | whisper, vosk, google TTS, ElevenLabs            |
| Real-time comms | WebRTC, mediasoup, socket.io                     |
| Database        | SQLite (dev), PostgreSQL/MySQL (prod)            |
| Scheduler       | node-cron, agenda, BullMQ                        |
| Notification    | nodemailer, twilio, Slack API                    |
| Web admin       | Next.js, React, Tailwind, React Flow, Socket.io  |
| Auth            | JWT, bcrypt, next-auth                           |
| Deployment      | Docker, Kubernetes, CI/CD pipelines               |

## Getting Started

### Prerequisites

- Node.js >= 18
- pnpm >= 10.0.0
- Redis (for queue and caching)
- PostgreSQL (for production) or SQLite (for development)

### Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start development servers
pnpm dev
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DB_TYPE=sqlite  # or postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=aura
DB_PASS=securepassword
DB_NAME=aura

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key

# OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# OpenAI
OPENAI_API_KEY=your-openai-key

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Slack
SLACK_TOKEN=xoxb-your-token

# Twilio
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_FROM=+1234567890

# Firebase (for push notifications)
FIREBASE_SERVICE_ACCOUNT=path/to/service-account.json
```

## Development

### Running Services Locally

```bash
# Start workflow engine
cd services/workflow-engine
pnpm dev

# Start webhook handler
cd services/webhook-handler
pnpm dev

# Start scheduler
cd services/scheduler
pnpm dev

# Start notification service
cd services/notification
pnpm dev

# Start collaboration service
cd services/collaboration
pnpm dev

# Start web app
cd apps/web
pnpm dev
```

### Running Desktop Agent

```bash
cd services/real-time-agent
pnpm start
```

## Deployment

### Docker Compose

```bash
# Build and start all services
docker-compose -f deployments/docker/docker-compose.yml up -d

# View logs
docker-compose -f deployments/docker/docker-compose.yml logs -f

# Stop services
docker-compose -f deployments/docker/docker-compose.yml down
```

### Kubernetes

```bash
# Deploy to Kubernetes
./deployments/scripts/deploy-k8s.sh

# Check status
kubectl get pods -n aura

# View logs
kubectl logs -f deployment/workflow-engine -n aura
```

### Building Docker Images

```bash
# Build all images
./deployments/scripts/docker-build.sh

# Or build individual services
docker build -f deployments/docker/Dockerfile.workflow-engine -t aura/workflow-engine:latest .
```

## API Endpoints

### Workflow Engine (Port 3001)

- `GET /health` - Health check
- `POST /workflows/execute` - Execute a workflow
- `GET /workflows/:id/status` - Get workflow status

### Webhook Handler (Port 3002)

- `GET /health` - Health check
- `POST /webhooks/register` - Register a webhook
- `GET /webhooks` - List all webhooks
- `DELETE /webhooks/:id` - Delete a webhook

### Notification Service (Port 3004)

- `GET /health` - Health check
- `POST /notifications/send` - Send a notification
- `POST /notifications/send-bulk` - Send bulk notifications

### Collaboration Service (Port 3005)

- WebSocket connection for real-time collaboration
- Events: `join_workflow`, `workflow_operation`, `presence_update`

## Plugins

AURA supports dynamic plugin loading. Plugins are located in `packages/plugins/src/`:

- **Slack** - Slack integration
- **GitHub** - GitHub API integration
- **Google Workspace** - Google Workspace integration
- **Email** - Email sending
- **Teams** - Microsoft Teams integration
- **Internal API** - Internal API calls

### Creating a Custom Plugin

1. Create a new file in `packages/plugins/src/`
2. Implement the `AuraPlugin` interface
3. Export the plugin
4. Register it in `packages/plugins/src/index.ts`

## Database Migrations

```bash
# Run migrations
cd packages/db
pnpm db:migrate

# Revert migrations
pnpm db:revert

# Seed database
pnpm db:seed
```

## Documentation

- **[Development Guide](./DEVELOPMENT.md)** - Setup and development workflow
- **[Architecture](./ARCHITECTURE.md)** - System architecture and design
- **[Deployment Guide](./DEPLOYMENT.md)** - Deployment instructions
- **[Contributing](./CONTRIBUTING.md)** - Contribution guidelines
- **[Changelog](./CHANGELOG.md)** - Version history and changes
- **[Implementation Status](./IMPLEMENTATION_STATUS.md)** - Historical implementation status

## Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE.md](./LICENSE.md) file for details.

## Support

For issues and questions:
- Check the [documentation](./DEVELOPMENT.md)
- Search existing [GitHub Issues](https://github.com/your-org/aura/issues)
- Open a new issue if needed
