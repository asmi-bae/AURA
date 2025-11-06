# AI Model Integration Guide

This guide explains how to integrate new AI models into the AURA AI package.

## Architecture Overview

The AI package is organized into several layers:

```
src/
├── core/           # Core interfaces and base classes
├── providers/      # AI model provider implementations
├── adapters/       # Adapters for converting providers to standard interface
├── services/       # High-level services (RAG, MCP)
├── registry/       # Model registry, orchestration, routing
├── config/         # Configuration management
├── types/          # Shared types
└── utils/          # Shared utilities
```

## Adding a New AI Model Provider

### Step 1: Create Provider Directory

Create a new directory under `src/providers/`:

```bash
mkdir -p src/providers/your-provider
```

### Step 2: Implement Provider Service

Create `src/providers/your-provider/provider.service.ts`:

```typescript
import { BaseModel, ModelMetadata, ChatMessage, ChatCompletionOptions, ChatCompletionResult } from '../../core/interfaces';
import { createLogger } from '@aura/utils';

const logger = createLogger();

export interface YourProviderConfig {
  apiKey: string;
  endpoint?: string;
  model?: string;
  // Add provider-specific config
}

export class YourProviderService extends BaseModel {
  private client: any; // Your provider's SDK client
  private config: YourProviderConfig;

  constructor(config: YourProviderConfig) {
    const metadata: ModelMetadata = {
      provider: 'your-provider',
      modelId: config.model || 'default-model',
      name: 'Your Provider Model',
      version: '1.0.0',
      maxContextLength: 4096,
      maxOutputLength: 2048,
      capabilities: {
        text: true,
        vision: false,
        audio: false,
        functionCalling: false,
        streaming: true,
        embeddings: false,
        multimodal: false,
      },
      location: 'cloud',
      offlineCapable: false,
    };

    super(metadata, config);
    this.config = config;
    // Initialize your provider's SDK
    this.client = new YourProviderSDK(config);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Implement health check
      return true;
    } catch (error) {
      logger.error('Provider health check failed', { error });
      return false;
    }
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    this.validateMessages(messages);
    const opts = this.normalizeOptions(options);

    try {
      // Call your provider's API
      const response = await this.client.chat({
        messages: this.formatMessages(messages),
        model: opts.model,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      });

      // Convert response to standard format
      return {
        content: response.text,
        model: opts.model || this.metadata.modelId,
        finishReason: response.finishReason,
        usage: response.usage ? {
          promptTokens: response.usage.inputTokens,
          completionTokens: response.usage.outputTokens,
          totalTokens: response.usage.totalTokens,
        } : undefined,
      };
    } catch (error) {
      logger.error('Chat completion failed', { error });
      throw error;
    }
  }

  async *streamChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncGenerator<any, void, unknown> {
    // Implement streaming if supported
    const result = await this.chatCompletion(messages, options);
    yield { type: 'content', content: result.content, done: true };
  }

  private formatMessages(messages: ChatMessage[]): any[] {
    // Format messages for your provider's API
    return messages.map(msg => ({
      role: msg.role,
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    }));
  }
}
```

### Step 3: Create Index File

Create `src/providers/your-provider/index.ts`:

```typescript
export * from './provider.service';
export type { YourProviderConfig } from './provider.service';
```

### Step 4: Register Provider

Add to `src/providers/index.ts`:

```typescript
export * from './your-provider';
```

### Step 5: Add Configuration

Add provider configuration to `src/config/model-config.ts`:

```typescript
export const YOUR_PROVIDER_CONFIG = {
  provider: 'your-provider',
  models: {
    'default-model': {
      modelId: 'default-model',
      name: 'Default Model',
      maxContextLength: 4096,
      maxOutputLength: 2048,
      // ...
    },
  },
};
```

### Step 6: Register in Model Factory

Update `src/core/model-factory.ts` to include your provider:

```typescript
import { YourProviderService } from '../providers/your-provider';

export function createModel(provider: string, config: any): IModel {
  switch (provider) {
    case 'your-provider':
      return new YourProviderService(config);
    // ... other providers
  }
}
```

## Using the New Provider

```typescript
import { YourProviderService } from '@aura/ai/providers/your-provider';
import { ModelRegistry } from '@aura/ai/registry';

// Create provider instance
const provider = new YourProviderService({
  apiKey: 'your-api-key',
  model: 'default-model',
});

// Or use through registry
const registry = new ModelRegistry();
await registry.registerModel('your-provider', provider);

// Use the model
const result = await provider.chatCompletion([
  { role: 'user', content: 'Hello!' }
]);
```

## Best Practices

1. **Extend BaseModel**: Always extend `BaseModel` to get common functionality
2. **Implement Interfaces**: Ensure your provider implements `IModel` interface
3. **Error Handling**: Use utilities from `utils/error-handler.ts`
4. **Retry Logic**: Use `utils/retry-handler.ts` for retryable operations
5. **Rate Limiting**: Use `utils/rate-limiter.ts` for rate limiting
6. **Logging**: Use `@aura/utils` logger for consistent logging
7. **Type Safety**: Define provider-specific types in `types.ts`
8. **Documentation**: Add README.md in provider directory

## Testing

Create tests for your provider:

```typescript
import { YourProviderService } from './provider.service';

describe('YourProviderService', () => {
  it('should create instance', () => {
    const service = new YourProviderService({
      apiKey: 'test-key',
    });
    expect(service).toBeDefined();
  });

  it('should generate chat completion', async () => {
    const service = new YourProviderService({
      apiKey: 'test-key',
    });
    const result = await service.chatCompletion([
      { role: 'user', content: 'Hello' }
    ]);
    expect(result.content).toBeDefined();
  });
});
```

## Examples

See existing providers for examples:
- `providers/openai/` - OpenAI GPT implementation
- `providers/anthropic/` - Anthropic Claude implementation
- `providers/google/` - Google Gemini implementation
- `providers/ollama/` - Ollama local models
- `providers/custom/` - Template for custom providers
