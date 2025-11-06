# AURA Model Registry & Routing Specification

## Overview

The Model Registry is the central system for managing, versioning, and dynamically selecting AI models across the AURA ecosystem. It provides a unified interface for all model types and handles routing, caching, and cost optimization.

## Registry Architecture

```
@aura/ai/registry/
├── model-registry.ts      # Core registry implementation
├── orchestrator.ts        # Multi-agent coordination
├── router.ts              # Model routing logic
├── cache.ts               # Response caching
└── config/
    └── models.json        # Model configurations
```

## Model Configuration Schema

```typescript
interface ModelConfig {
  // Provider identification
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'local';
  id: string; // Unique model identifier
  name: string; // Human-readable name
  version: string; // Model version
  
  // Capabilities
  capabilities: {
    reasoning: boolean;
    multimodal: boolean;
    vision: boolean;
    audio: boolean;
    embeddings: boolean;
    functionCalling: boolean;
  };
  
  // Execution details
  location: 'cloud' | 'local' | 'edge';
  endpoint?: string; // API endpoint or local path
  apiKey?: string; // For cloud models
  
  // Performance characteristics
  maxContextLength: number;
  maxOutputLength: number;
  latency: {
    p50: number; // milliseconds
    p95: number;
    p99: number;
  };
  cost: {
    inputPerToken: number; // $ per token
    outputPerToken: number;
  };
  
  // Routing preferences
  priority: number; // Lower = higher priority
  fallbackTo?: string[]; // Fallback models if this fails
  preferredFor: string[]; // Task types this model excels at
  
  // Availability
  enabled: boolean;
  healthCheck?: string; // Health check endpoint
  offlineCapable: boolean;
  
  // Privacy & compliance
  requiresPrivacyMode: boolean; // Force local execution
  dataRetention: 'none' | 'short' | 'long';
  compliance: ('gdpr' | 'hipaa' | 'soc2')[];
}
```

## Model Registry API

### Registration

```typescript
// Register a model
registry.registerModel({
  provider: 'openai',
  id: 'gpt-4-turbo',
  name: 'GPT-4 Turbo',
  version: '2024-01-01',
  capabilities: {
    reasoning: true,
    multimodal: true,
    vision: false,
    audio: false,
    embeddings: false,
    functionCalling: true,
  },
  location: 'cloud',
  endpoint: 'https://api.openai.com/v1',
  maxContextLength: 128000,
  maxOutputLength: 4096,
  priority: 1,
  enabled: true,
});

// Register local model
registry.registerModel({
  provider: 'ollama',
  id: 'llama3-70b',
  name: 'Llama 3 70B',
  version: '3.0',
  capabilities: {
    reasoning: true,
    multimodal: false,
    vision: false,
    audio: false,
    embeddings: false,
    functionCalling: false,
  },
  location: 'local',
  endpoint: 'http://localhost:11434',
  maxContextLength: 8192,
  maxOutputLength: 2048,
  priority: 2,
  enabled: true,
  offlineCapable: true,
});
```

### Model Selection

```typescript
// Get model for a specific task
const model = registry.getModelForTask({
  type: 'reasoning',
  contextLength: 5000,
  requiresPrivacy: false,
  preferredProvider: 'openai',
  fallbackToLocal: true,
});

// Get best model based on capabilities
const visionModel = registry.getBestModel({
  capabilities: ['vision', 'multimodal'],
  location: 'cloud',
  costOptimization: true,
});
```

## Routing Logic

### Task Classification

The router classifies tasks into categories:

```typescript
type TaskType = 
  | 'reasoning'      // General problem solving
  | 'vision'         // Image/video understanding
  | 'audio'          // Speech processing
  | 'embedding'      // Vector generation
  | 'rag'            // Retrieval-augmented
  | 'function'       // Tool/function calling
  | 'supervisor';    // Meta-model tasks
```

### Routing Rules

1. **Privacy First**: If `requiresPrivacyMode: true`, only local models
2. **Capability Match**: Must support required capabilities
3. **Context Size**: Model must support required context length
4. **Cost Optimization**: Select cheapest model if `costOptimization: true`
5. **Speed Optimization**: Select fastest model if `speedOptimization: true`
6. **Health Check**: Only route to healthy models
7. **Fallback Chain**: If primary fails, try fallback models in order

### Routing Example

```typescript
// User query: "Analyze this screenshot and tell me what to click"
const task = {
  type: 'vision',
  input: {
    image: Buffer,
    query: string,
  },
  contextLength: 1000,
  requiresPrivacy: false,
};

// Router selects:
// 1. Check for vision + multimodal capability
// 2. Consider context size (small)
// 3. Prefer cloud for better accuracy
// 4. Select: GPT-4o (vision + reasoning)
// 5. Fallback: Gemini 1.5 Pro Vision
```

## Model Pipelines

### Simple Pipeline

```typescript
// Single model execution
const result = await registry.execute({
  model: 'gpt-4-turbo',
  task: 'reasoning',
  input: { messages: [...] },
});
```

### Complex Pipeline (Chain)

```typescript
// Multi-step pipeline
const result = await registry.executePipeline({
  steps: [
    {
      model: 'text-embedding-3-small',
      task: 'embedding',
      input: { text: 'user query' },
    },
    {
      model: 'vector-search',
      task: 'rag',
      input: { embedding: step1.result },
    },
    {
      model: 'gpt-4-turbo',
      task: 'reasoning',
      input: {
        messages: [...],
        context: step2.results,
      },
    },
  ],
});
```

## Caching Strategy

### Cache Levels

1. **Memory Cache**: Hot responses (< 1 minute)
2. **Disk Cache**: Recent responses (< 1 hour)
3. **Embedding Cache**: Vector embeddings (persistent)
4. **RAG Cache**: Retrieved contexts (TTL-based)

### Cache Keys

```typescript
// Cache key generation
const cacheKey = {
  model: 'gpt-4-turbo',
  task: 'reasoning',
  inputHash: hash(input),
  temperature: 0.7,
  maxTokens: 2000,
};
```

## Cost Tracking

```typescript
interface CostMetrics {
  model: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: {
    input: number; // $USD
    output: number;
    total: number;
  };
  latency: number; // milliseconds
  timestamp: Date;
}
```

## Health Monitoring

```typescript
interface HealthStatus {
  model: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
  lastCheck: Date;
  uptime: number; // percentage
}
```

## Model Versioning

### Version Strategy

- **Major**: Breaking changes (new API, incompatible)
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, backward compatible

### Version Pinning

```typescript
// Pin to specific version
registry.pinVersion('gpt-4-turbo', '2024-01-01');

// Auto-update policy
registry.setUpdatePolicy('gpt-4-turbo', {
  allowMinor: true,
  allowPatch: true,
  requireApproval: true,
});
```

## Integration Points

### With @aura/agent

```typescript
// Agent uses registry for model selection
const thinkingEngine = new BaseThinkingEngine({
  modelRegistry: registry,
  // ... other config
});

// Agent routes tasks to appropriate models
await thinkingEngine.executeTask({
  type: 'reasoning',
  input: '...',
});
```

### With @aura/core

```typescript
// Workflow engine uses models for AI nodes
const workflow = {
  nodes: [
    {
      type: 'ai-reasoning',
      model: 'auto', // Registry selects best model
      input: '...',
    },
  ],
};
```

### With @aura/voice

```typescript
// Voice uses registry for STT/TTS models
const voiceService = new VoiceService({
  sttModel: registry.getModel('whisper-large'),
  ttsModel: registry.getModel('elevenlabs'),
});
```

## Configuration Examples

### Development Configuration

```json
{
  "models": [
    {
      "provider": "ollama",
      "id": "llama3-8b",
      "location": "local",
      "enabled": true,
      "priority": 1
    },
    {
      "provider": "openai",
      "id": "gpt-4-turbo",
      "location": "cloud",
      "enabled": true,
      "priority": 2,
      "fallbackTo": ["llama3-8b"]
    }
  ]
}
```

### Production Configuration

```json
{
  "models": [
    {
      "provider": "openai",
      "id": "gpt-4-turbo",
      "location": "cloud",
      "enabled": true,
      "priority": 1,
      "version": "2024-01-01",
      "pinned": true
    },
    {
      "provider": "anthropic",
      "id": "claude-3-5-sonnet",
      "location": "cloud",
      "enabled": true,
      "priority": 2
    },
    {
      "provider": "ollama",
      "id": "llama3-70b",
      "location": "local",
      "enabled": true,
      "priority": 3,
      "offlineCapable": true,
      "requiresPrivacyMode": true
    }
  ],
  "routing": {
    "preferCloud": true,
    "fallbackToLocal": true,
    "costOptimization": false,
    "speedOptimization": true
  }
}
```

### Enterprise Configuration

```json
{
  "models": [
    {
      "provider": "local",
      "id": "llama3-enterprise",
      "location": "local",
      "enabled": true,
      "priority": 1,
      "requiresPrivacyMode": true,
      "compliance": ["gdpr", "hipaa", "soc2"],
      "dataRetention": "none"
    }
  ],
  "policy": {
    "forceLocal": true,
    "blockCloud": true,
    "requireApproval": true
  }
}
```

## Routing Decision Tree

```
Task Request
    │
    ├─ Privacy Required?
    │   ├─ Yes → Local Models Only
    │   └─ No → Continue
    │
    ├─ Task Type Classification
    │   ├─ Vision → Multimodal Models
    │   ├─ Audio → Voice Models
    │   ├─ Embedding → Embedding Models
    │   ├─ Function → Function-Calling Models
    │   └─ Reasoning → Core Models
    │
    ├─ Capability Match
    │   └─ Filter by required capabilities
    │
    ├─ Context Size Check
    │   └─ Filter by max context length
    │
    ├─ Optimization Mode
    │   ├─ Cost → Select cheapest
    │   ├─ Speed → Select fastest
    │   └─ Quality → Select best
    │
    ├─ Health Check
    │   └─ Only healthy models
    │
    └─ Execute with Fallback Chain
```

## Best Practices

1. **Always have a fallback**: Configure fallback models for reliability
2. **Monitor costs**: Track usage and costs per model
3. **Health checks**: Regularly check model availability
4. **Version pinning**: Pin versions in production for stability
5. **Caching**: Cache embeddings and frequent queries
6. **Privacy**: Respect privacy policies and use local models when required
7. **Load balancing**: Distribute requests across multiple models when possible

