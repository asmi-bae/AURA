# AURA AI Package

Comprehensive AI integration package with support for multiple providers, RAG, MCP, and multi-agent orchestration.

## Structure

```
packages/ai/
├── src/
│   ├── models/              # AI Model Providers
│   │   ├── gpt/             # OpenAI GPT models
│   │   ├── claude/           # Anthropic Claude models
│   │   ├── gemini/           # Google Gemini models
│   │   ├── ollama/           # Local Ollama models
│   │   └── types.ts          # Model types
│   │
│   ├── rag/                  # RAG (Retrieval-Augmented Generation)
│   │   ├── rag.service.ts    # Main RAG service
│   │   └── vector-stores/    # Vector store implementations
│   │       ├── pinecone.store.ts
│   │       └── weaviate.store.ts
│   │
│   ├── mcp/                   # Model Context Protocol
│   │   └── mcp.service.ts    # MCP service for tool calling
│   │
│   ├── registry/              # Model Registry & Orchestration
│   │   ├── model-registry.ts # Model provider registry
│   │   └── orchestrator.ts   # Multi-agent orchestrator
│   │
│   └── types/                 # Shared types
│
└── package.json
```

## Features

### AI Models
- **GPT (OpenAI)**: GPT-4, GPT-4 Turbo, GPT-3.5
- **Claude (Anthropic)**: Claude 3.5 Sonnet, Claude 3 Opus
- **Gemini (Google)**: Gemini 1.5 Pro, Gemini 1.5 Flash
- **Ollama**: Local models (LLaMA, Mistral, etc.)

### RAG (Retrieval-Augmented Generation)
- Text embedding generation
- Vector store integration (Pinecone, Weaviate)
- Semantic search
- Context retrieval

### MCP (Model Context Protocol)
- Tool registration and management
- Tool execution with error handling
- Queue-based processing
- Multi-tool coordination

### Multi-Agent Orchestration
- Coordinate multiple AI agents
- Context memory management
- Task distribution
- Result aggregation

## Usage

### Model Registry

```typescript
import { ModelRegistry } from '@aura/ai';

const registry = new ModelRegistry();

// Register models
registry.registerModel({
  provider: 'openai',
  config: { apiKey: process.env.OPENAI_API_KEY },
  priority: 1,
});

registry.registerModel({
  provider: 'anthropic',
  config: { apiKey: process.env.ANTHROPIC_API_KEY },
  priority: 2,
});

// Get model
const model = registry.getModel('openai');
const response = await model.chatCompletion([...]);
```

### RAG Service

```typescript
import { RAGService } from '@aura/ai';
import { PineconeVectorStore } from '@aura/ai/rag';

const vectorStore = new PineconeVectorStore({
  apiKey: process.env.PINECONE_API_KEY,
  environment: 'us-east-1',
  indexName: 'aura-index',
});

const ragService = new RAGService(process.env.OPENAI_API_KEY, vectorStore);

// Add documents
await ragService.addDocuments([
  { id: '1', text: 'Document text...', metadata: { source: 'doc1' } },
]);

// Search
const results = await ragService.search('query', 5);

// Retrieve context
const context = await ragService.retrieveContext('query', 5);
```

### MCP Service

```typescript
import { MCPService } from '@aura/ai';

const mcpService = new MCPService(redisConnection);

// Register tool
mcpService.registerTool({
  name: 'get_weather',
  description: 'Get weather for a location',
  parameters: {
    type: 'object',
    properties: {
      location: { type: 'string' },
    },
    required: ['location'],
  },
  execute: async (args) => {
    // Tool implementation
    return { temperature: 72, condition: 'sunny' };
  },
});

// Process message with tool calls
const result = await mcpService.processMessage(message);
```

### Multi-Agent Orchestration

```typescript
import { ModelRegistry, MultiAgentOrchestrator } from '@aura/ai';

const registry = new ModelRegistry();
const orchestrator = new MultiAgentOrchestrator(registry);

const results = await orchestrator.coordinateTask(
  'Analyze the data and generate a report',
  { data: '...' },
  [
    { provider: 'anthropic', role: 'analyst' },
    { provider: 'openai', role: 'writer' },
  ]
);
```

## Documentation

See individual module documentation for detailed API reference.

