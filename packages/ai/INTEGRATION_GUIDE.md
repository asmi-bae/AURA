# AURA AI Integration Guide

## Quick Start

### 1. Initialize Model Registry

```typescript
import { ModelRegistry } from '@aura/ai';

const registry = new ModelRegistry();

// Register cloud models
registry.registerModel({
  provider: 'openai',
  id: 'gpt-4-turbo',
  // ... config
});

// Register local models
registry.registerModel({
  provider: 'ollama',
  id: 'llama3-8b',
  // ... config
});
```

### 2. Use in Agent

```typescript
import { AgentCore } from '@aura/agent';
import { ModelRegistry } from '@aura/ai';

const registry = new ModelRegistry();
// ... register models

const agent = new AgentCore({
  // ... config
  // Registry will be used by Base Thinking Engine
});

// Agent automatically uses registry for AI tasks
```

### 3. Use in Workflows

```typescript
import { AuraWorkflowEngine } from '@aura/core';
import { ModelRegistry } from '@aura/ai';

const registry = new ModelRegistry();
// ... register models

const engine = new AuraWorkflowEngine({
  // ... config
  modelRegistry: registry, // Optional
});
```

## Integration Patterns

### Pattern 1: Direct Model Access

```typescript
import { GPTService } from '@aura/ai/models/gpt';

const gpt = new GPTService({
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await gpt.chatCompletion([...]);
```

### Pattern 2: Registry-Based Routing

```typescript
import { ModelRegistry } from '@aura/ai';

const registry = new ModelRegistry();
// ... register models

const model = registry.getBestModel({
  taskType: 'reasoning',
  preferLocal: false,
});

const response = await model.chatCompletion([...]);
```

### Pattern 3: Pipeline Execution

```typescript
import { ModelRegistry } from '@aura/ai';

const result = await registry.executePipeline({
  steps: [
    { model: 'embedding', task: 'embed', input: '...' },
    { model: 'rag', task: 'retrieve', input: '...' },
    { model: 'reasoning', task: 'reason', input: '...' },
  ],
});
```

## Model Type Integration

### Core Reasoning Models

```typescript
// Use GPT
import { GPTService } from '@aura/ai/models/gpt';
const gpt = new GPTService({ apiKey: '...' });

// Use Claude
import { ClaudeService } from '@aura/ai/models/claude';
const claude = new ClaudeService({ apiKey: '...' });

// Use Gemini
import { GeminiService } from '@aura/ai/models/gemini';
const gemini = new GeminiService({ apiKey: '...' });

// Use Ollama (local)
import { OllamaService } from '@aura/ai/models/ollama';
const ollama = new OllamaService({ baseUrl: 'http://localhost:11434' });
```

### Embedding Models

```typescript
import { RAGService } from '@aura/ai/rag';

const rag = new RAGService(apiKey, vectorStore);

// Generate embedding
const embedding = await rag.generateEmbedding('text');

// Search
const results = await rag.search('query', 5);
```

### RAG Models

```typescript
import { RAGService } from '@aura/ai/rag';
import { PineconeVectorStore } from '@aura/ai/rag/vector-stores';

const vectorStore = new PineconeVectorStore({
  apiKey: '...',
  environment: 'us-east-1',
  indexName: 'aura-index',
});

const rag = new RAGService(apiKey, vectorStore);

// Add documents
await rag.addDocuments([
  { id: '1', text: '...', metadata: {} },
]);

// Retrieve context
const context = await rag.retrieveContext('query', 5);
```

### Multimodal Models

```typescript
// Vision with Gemini
import { GeminiService } from '@aura/ai/models/gemini';

const gemini = new GeminiService({ apiKey: '...' });

// Chat with image
const response = await gemini.chatWithImage(
  'What is in this image?',
  imageBuffer,
);
```

### Voice Models

```typescript
import { STTService, TTSService } from '@aura/voice';

// Speech to text
const stt = new STTService();
const text = await stt.transcribe(audioBuffer);

// Text to speech
const tts = new TTSService();
const audio = await tts.synthesize('Hello world');
```

### Action Models (MCP)

```typescript
import { MCPService } from '@aura/ai/mcp';

const mcp = new MCPService(redisConnection);

// Register tool
mcp.registerTool({
  name: 'send_email',
  description: 'Send an email',
  parameters: { /* ... */ },
  execute: async (args) => {
    // Tool implementation
  },
});

// Process message with tool calls
const result = await mcp.processMessage(message);
```

## Agent Integration

### Base Thinking Engine

```typescript
import { BaseThinkingEngine } from '@aura/agent/engine';

const engine = new BaseThinkingEngine({
  agentId: 'agent-1',
  agentType: AgentType.AUTOMATION,
  capabilities: { /* ... */ },
  storage: localStorage,
  telemetry: telemetry,
  modelRegistry: registry, // AI model registry
});

// Engine automatically uses registry for AI tasks
await engine.executeWorkflow(workflow);
```

### Agent with AI Models

```typescript
import { AgentCore } from '@aura/agent';
import { ModelRegistry } from '@aura/ai';

const registry = new ModelRegistry();
// ... register models

const agent = new AgentCore({
  id: 'agent-1',
  name: 'My Agent',
  type: AgentType.INTERACTIVE_ASSISTANT,
  gatewayUrl: 'https://gateway.aura.com',
  capabilities: {
    'screen-capture': true,
    'voice-io': true,
    'automation': true,
  },
  // Registry will be passed to thinking engine
});

// Agent handles AI model routing automatically
await agent.start();
```

## Workflow Integration

### AI Nodes in Workflows

```typescript
// Workflow with AI node
const workflow = {
  id: 'workflow-1',
  name: 'Document Analysis',
  nodes: [
    {
      id: 'node-1',
      type: 'ai-reasoning',
      model: 'auto', // Registry selects
      input: {
        messages: [
          { role: 'user', content: 'Analyze this document' },
        ],
      },
    },
    {
      id: 'node-2',
      type: 'ai-embedding',
      model: 'text-embedding-3-small',
      input: {
        text: '{{node-1.output}}',
      },
    },
  ],
};
```

## Cross-Platform Considerations

### Desktop (Agent)

```typescript
// Prefer local models for privacy
const registry = new ModelRegistry({
  preferLocal: true,
  fallbackToCloud: true,
});

// Register local models
registry.registerModel({
  provider: 'ollama',
  id: 'llama3-8b',
  location: 'local',
  offlineCapable: true,
});
```

### Web (Browser)

```typescript
// Use cloud models only
const registry = new ModelRegistry({
  preferCloud: true,
  allowLocal: false,
});

// Register cloud models
registry.registerModel({
  provider: 'openai',
  id: 'gpt-4-turbo',
  location: 'cloud',
});
```

### Server (Gateway)

```typescript
// Use both cloud and cached local models
const registry = new ModelRegistry({
  preferCloud: true,
  fallbackToLocal: true,
  cacheEnabled: true,
});
```

## Best Practices

1. **Always use Registry**: Don't instantiate models directly, use the registry
2. **Handle Failures**: Always have fallback models configured
3. **Cache Embeddings**: Cache embeddings to reduce API costs
4. **Monitor Costs**: Track usage and costs per model
5. **Respect Privacy**: Use local models when privacy is required
6. **Health Checks**: Monitor model health and availability
7. **Version Pinning**: Pin model versions in production

## Troubleshooting

### Model Not Found

```typescript
// Check if model is registered
if (!registry.hasModel('gpt-4-turbo')) {
  registry.registerModel({ /* ... */ });
}
```

### Model Unavailable

```typescript
// Check health
const health = await registry.getHealth('gpt-4-turbo');
if (health.status !== 'healthy') {
  // Use fallback
  const fallback = registry.getFallback('gpt-4-turbo');
}
```

### High Costs

```typescript
// Use local models or cheaper alternatives
registry.setPreferences({
  costOptimization: true,
  preferLocal: true,
});
```

