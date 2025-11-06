# AI Models Supported

AURA AI package supports **13 different AI model providers** with various capabilities.

## Cloud Providers

### 1. **OpenAI (GPT)**
- **Models**: GPT-4 Turbo, GPT-4, GPT-3.5 Turbo
- **Capabilities**: Chat, Streaming, Embeddings, Function Calling, Vision
- **Best For**: General purpose, function calling, multimodal tasks
- **API**: `https://api.openai.com/v1`

### 2. **Anthropic (Claude)**
- **Models**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Capabilities**: Chat, Streaming, Function Calling, Vision, Long Context (200K tokens)
- **Best For**: Long context, reasoning, safety-focused applications
- **API**: `https://api.anthropic.com/v1`

### 3. **Google (Gemini)**
- **Models**: Gemini 1.5 Pro, Gemini Pro, Gemini Flash
- **Capabilities**: Chat, Streaming, Function Calling, Vision, Multimodal, Large Context (2M tokens)
- **Best For**: Multimodal tasks, large context, vision
- **API**: `https://generativelanguage.googleapis.com/v1`

### 4. **Mistral AI**
- **Models**: Mistral Large, Mistral Medium, Mistral Small
- **Capabilities**: Chat, Streaming, Function Calling
- **Best For**: High-quality reasoning, European data residency
- **API**: `https://api.mistral.ai/v1`

### 5. **Cohere**
- **Models**: Command, Command-Light, Embed models
- **Capabilities**: Chat, Embeddings, Reranking
- **Best For**: Embeddings, search, reranking
- **API**: `https://api.cohere.ai/v1`

### 6. **Groq**
- **Models**: Llama 3 70B, Mixtral 8x7B, Gemma 7B
- **Capabilities**: Chat, Streaming (ultra-fast)
- **Best For**: Ultra-fast inference, low latency
- **API**: `https://api.groq.com/openai/v1`

### 7. **Together AI**
- **Models**: Llama 3, Mixtral, Mistral, and more
- **Capabilities**: Chat, Streaming
- **Best For**: Fast inference with open-source models
- **API**: `https://api.together.xyz/v1`

### 8. **Azure OpenAI**
- **Models**: Same as OpenAI (GPT-4, GPT-3.5)
- **Capabilities**: Chat, Streaming, Embeddings, Function Calling, Vision
- **Best For**: Enterprise deployments, compliance, regional requirements
- **API**: Custom Azure endpoint

### 9. **Perplexity AI**
- **Models**: Sonar Large, Sonar Small (with web search)
- **Capabilities**: Chat, Streaming, Real-time Web Search
- **Best For**: Up-to-date information, web search, current events
- **API**: `https://api.perplexity.ai`

### 10. **Replicate**
- **Models**: Thousands of open-source models
- **Capabilities**: Chat, Various model-specific capabilities
- **Best For**: Access to many models, pay-per-use
- **API**: `https://api.replicate.com/v1`

### 11. **HuggingFace**
- **Models**: Thousands of models from HuggingFace Hub
- **Capabilities**: Chat, Embeddings, Various model-specific capabilities
- **Best For**: Access to many models, embeddings, free tier
- **API**: `https://api-inference.huggingface.co`

## Local Providers

### 12. **Ollama**
- **Models**: Llama 3, Mistral, CodeLlama, and more
- **Capabilities**: Chat, Streaming, Offline capable
- **Best For**: Local inference, privacy, offline use
- **API**: `http://localhost:11434` (default)

### 13. **LocalAI**
- **Models**: Any OpenAI-compatible model
- **Capabilities**: Chat, Streaming, OpenAI-compatible API
- **Best For**: Local inference, privacy, custom models
- **API**: Custom local endpoint (default: `http://localhost:8080/v1`)

## Usage

All models are available through the dynamic export system:

```typescript
import { 
  GPTService,
  ClaudeService,
  GeminiService,
  MistralService,
  CohereService,
  GroqService,
  TogetherService,
  AzureOpenAIService,
  PerplexityService,
  ReplicateService,
  HuggingFaceService,
  OllamaService,
  LocalAIService
} from '@aura/ai';
```

## Model Selection Guide

| Use Case | Recommended Provider |
|----------|---------------------|
| General purpose | OpenAI, Anthropic |
| Long context | Google Gemini, Anthropic |
| Fast inference | Groq, Together AI |
| Embeddings | OpenAI, Cohere, HuggingFace |
| Function calling | OpenAI, Anthropic, Google |
| Vision/Multimodal | OpenAI, Google Gemini, Anthropic |
| Web search | Perplexity AI |
| Privacy/Offline | Ollama, LocalAI |
| Enterprise | Azure OpenAI |
| Cost-effective | Groq, Together AI, Ollama |
| Many models | Replicate, HuggingFace |

## Adding More Models

To add a new model provider:

1. Create `src/models/your-provider/your-provider.service.ts`
2. Create `src/models/your-provider/index.ts`
3. Add export to `src/models/index.ts`
4. Add provider to `src/providers/your-provider/index.ts`
5. Add export to `src/providers/index.ts`
6. Update `ModelProvider` type in `src/types/index.ts`

The dynamic export system will automatically make it available!

