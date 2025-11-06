# Model Adapters

This directory contains adapters for integrating AI models from different providers.

## Structure

```
adapters/
├── openai/          # OpenAI adapter
├── anthropic/       # Anthropic adapter
├── google/          # Google adapter
├── ollama/          # Ollama adapter
└── custom/          # Custom model adapter template
```

## Creating a Custom Adapter

To integrate a new AI model:

1. Create a new directory under `adapters/`
2. Implement the `IModel` interface or extend `BaseModel`
3. Register the adapter in the model factory

### Example

```typescript
import { BaseModel, IModel, ModelMetadata, ChatMessage, ChatCompletionResult } from '../core';
import { ModelFactory } from '../core/model-factory';

export class CustomModelAdapter extends BaseModel {
  constructor(config: any) {
    const metadata: ModelMetadata = {
      provider: 'custom',
      modelId: config.model || 'custom-model',
      name: 'Custom Model',
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
  }

  async chatCompletion(messages: ChatMessage[]): Promise<ChatCompletionResult> {
    // Implement your model's chat completion logic
    // ...
  }
}

// Register the adapter
ModelFactory.registerModel('custom', CustomModelAdapter);
```

