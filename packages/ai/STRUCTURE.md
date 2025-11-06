# AI Package Structure

This document describes the optimized, scalable folder structure of the AI package.

## Directory Structure

```
src/
├── core/                 # Core interfaces, base classes, factory
│   ├── interfaces.ts     # IModel, ModelMetadata, ModelCapabilities, etc.
│   ├── base-model.ts     # BaseModel abstract class
│   ├── model-factory.ts  # ModelFactory for creating models
│   └── index.ts          # Core exports
│
├── providers/            # AI model provider implementations
│   ├── openai/           # OpenAI (GPT) provider
│   │   └── index.ts
│   ├── anthropic/        # Anthropic (Claude) provider
│   │   └── index.ts
│   ├── google/           # Google (Gemini) provider
│   │   └── index.ts
│   ├── ollama/           # Ollama (local) provider
│   │   └── index.ts
│   ├── custom/           # Custom provider template
│   │   └── index.ts
│   ├── README.md         # Provider documentation
│   └── index.ts          # Provider exports
│
├── adapters/             # Model adapters
│   ├── custom/            # Custom adapter template
│   │   └── template.ts
│   └── index.ts           # Adapter exports
│
├── services/             # High-level services
│   ├── rag/              # RAG (Retrieval-Augmented Generation)
│   │   ├── rag.service.ts
│   │   ├── document-chunker.ts
│   │   ├── vector-stores/
│   │   │   ├── pinecone.store.ts
│   │   │   ├── weaviate.store.ts
│   │   │   ├── local.store.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── mcp/              # MCP (Model Context Protocol)
│   │   ├── mcp.service.ts
│   │   └── index.ts
│   └── index.ts          # Service exports
│
├── registry/             # Model registry, orchestration, routing
│   ├── model-registry.ts  # Model registry
│   ├── orchestrator.ts    # Multi-agent orchestrator
│   ├── router.ts          # Model router
│   ├── pipeline.ts        # Pipeline executor
│   ├── cache.ts           # Response cache
│   ├── health-monitor.ts  # Health monitoring
│   ├── registry-manager.ts # Registry manager
│   └── index.ts           # Registry exports
│
├── config/               # Configuration management
│   ├── model-config.ts    # Model configuration manager
│   └── index.ts           # Config exports
│
├── types/                # Shared types
│   └── index.ts           # Type exports
│
├── utils/                # Shared utilities
│   ├── message-formatter.ts  # Message formatting utilities
│   ├── token-counter.ts      # Token counting utilities
│   ├── error-handler.ts      # Error handling utilities
│   ├── retry-handler.ts      # Retry logic utilities
│   ├── rate-limiter.ts        # Rate limiting utilities
│   ├── README.md             # Utils documentation
│   └── index.ts               # Utils exports
│
├── models/               # Legacy model implementations (kept for compatibility)
│   ├── gpt/              # GPT models
│   ├── claude/            # Claude models
│   ├── gemini/            # Gemini models
│   ├── ollama/            # Ollama models
│   └── index.ts
│
└── index.ts              # Main entry point
```

## Key Improvements

### 1. **Clear Separation of Concerns**
- **Core**: Base interfaces and classes
- **Providers**: Provider-specific implementations
- **Adapters**: Adapters for converting providers to standard interface
- **Services**: High-level services (RAG, MCP)
- **Registry**: Model management and orchestration
- **Utils**: Shared utilities

### 2. **Scalable Provider System**
- Each provider has its own directory
- Easy to add new providers by creating a new directory
- Template provided for custom providers
- All providers export through `providers/index.ts`

### 3. **Utility Functions**
- Message formatting for different providers
- Token counting utilities
- Error handling with retry logic
- Rate limiting utilities

### 4. **Better Organization**
- Services separated from providers
- Adapters separated from providers
- Utils centralized for reuse
- Clear documentation in each directory

## Adding a New AI Model Provider

1. Create directory: `src/providers/your-provider/`
2. Implement provider service extending `BaseModel`
3. Export from `src/providers/your-provider/index.ts`
4. Register in `src/providers/index.ts`
5. Add configuration in `src/config/model-config.ts`

See `INTEGRATION_GUIDE.md` for detailed instructions.

## Benefits

- **Scalable**: Easy to add new AI models
- **Maintainable**: Clear structure and separation
- **Reusable**: Shared utilities and base classes
- **Type-safe**: Strong TypeScript typing throughout
- **Well-documented**: README files in each directory

