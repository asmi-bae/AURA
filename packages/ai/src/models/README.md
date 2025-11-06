# AI Model Providers

This directory contains implementations for all AI model providers supported by AURA.

## Available Models

### Cloud Providers

1. **OpenAI (GPT)** - `gpt/`
   - GPT-4, GPT-4 Turbo, GPT-3.5
   - Function calling, streaming, embeddings
   - Models: `gpt-4-turbo-preview`, `gpt-4`, `gpt-3.5-turbo`

2. **Anthropic (Claude)** - `claude/`
   - Claude 3.5 Sonnet, Claude 3 Opus
   - Long context window (200K tokens)
   - Models: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`

3. **Google (Gemini)** - `gemini/`
   - Gemini 1.5 Pro, Gemini Pro
   - Multimodal, large context
   - Models: `gemini-1.5-pro`, `gemini-pro`

4. **Mistral AI** - `mistral/`
   - Mistral Large, Mistral Medium
   - High-quality reasoning
   - Models: `mistral-large-latest`, `mistral-medium-latest`

5. **Cohere** - `cohere/`
   - Command, Command-Light
   - Embeddings and reranking
   - Models: `command`, `command-light`, `embed-english-v3.0`

6. **Groq** - `groq/`
   - Ultra-fast inference
   - Multiple open-source models
   - Models: `llama3-70b-8192`, `mixtral-8x7b-32768`

7. **Together AI** - `together/`
   - Fast inference with open-source models
   - Multiple model support
   - Models: `meta-llama/Llama-3-70b-chat-hf`, `mistralai/Mixtral-8x7B-Instruct-v0.1`

8. **Azure OpenAI** - `azure-openai/`
   - Enterprise-grade OpenAI models
   - Enhanced security and compliance
   - Same models as OpenAI but through Azure

9. **Perplexity AI** - `perplexity/`
   - Search-enhanced models
   - Real-time web search
   - Models: `llama-3.1-sonar-large-128k-online`, `llama-3.1-sonar-small-128k-online`

10. **Replicate** - `replicate/`
    - Thousands of open-source models
    - Pay-per-use pricing
    - Models: `meta/llama-2-70b-chat`, `mistralai/mistral-7b-instruct-v0.2`

11. **HuggingFace** - `huggingface/`
    - Access to thousands of models
    - Inference API
    - Models: `meta-llama/Llama-2-70b-chat-hf`, `sentence-transformers/all-MiniLM-L6-v2`

### Local Providers

12. **Ollama** - `ollama/`
    - Local model inference
    - Offline capable
    - Models: `llama3`, `mistral`, `codellama`

13. **LocalAI** - `localai/`
    - Local inference server
    - OpenAI-compatible API
    - Privacy-focused

## Usage Examples

### OpenAI
```typescript
import { GPTService } from '@aura/ai/models/gpt';

const gpt = new GPTService({
  apiKey: 'your-api-key',
  model: 'gpt-4-turbo-preview',
});

const result = await gpt.chatCompletion([
  { role: 'user', content: 'Hello!' }
]);
```

### Mistral AI
```typescript
import { MistralService } from '@aura/ai/models/mistral';

const mistral = new MistralService({
  apiKey: 'your-api-key',
  model: 'mistral-large-latest',
});

const result = await mistral.chatCompletion([
  { role: 'user', content: 'Hello!' }
]);
```

### Cohere (with embeddings)
```typescript
import { CohereService } from '@aura/ai/models/cohere';

const cohere = new CohereService({
  apiKey: 'your-api-key',
});

// Chat completion
const result = await cohere.chatCompletion([
  { role: 'user', content: 'Hello!' }
]);

// Embeddings
const embeddings = await cohere.generateEmbeddings(['Hello world']);
```

### Groq (ultra-fast)
```typescript
import { GroqService } from '@aura/ai/models/groq';

const groq = new GroqService({
  apiKey: 'your-api-key',
  model: 'llama3-70b-8192',
});

const result = await groq.chatCompletion([
  { role: 'user', content: 'Hello!' }
]);
```

### LocalAI (privacy-focused)
```typescript
import { LocalAIService } from '@aura/ai/models/localai';

const localai = new LocalAIService({
  baseURL: 'http://localhost:8080/v1',
  model: 'gpt-3.5-turbo',
});

const result = await localai.chatCompletion([
  { role: 'user', content: 'Hello!' }
]);
```

## Adding a New Model Provider

1. Create directory: `src/models/your-provider/`
2. Create `your-provider.service.ts` with your implementation
3. Create `your-provider/index.ts` to export the service
4. Add export to `src/models/index.ts`:
   ```typescript
   export * from './your-provider';
   ```
5. It will automatically be available from `@aura/ai/models`

## Model Capabilities

Each model provider supports different capabilities:

| Provider | Chat | Streaming | Embeddings | Function Calling | Vision |
|----------|------|-----------|------------|-----------------|--------|
| OpenAI | ✅ | ✅ | ✅ | ✅ | ✅ |
| Anthropic | ✅ | ✅ | ❌ | ✅ | ✅ |
| Google | ✅ | ✅ | ❌ | ✅ | ✅ |
| Mistral | ✅ | ✅ | ❌ | ✅ | ❌ |
| Cohere | ✅ | ❌ | ✅ | ❌ | ❌ |
| Groq | ✅ | ✅ | ❌ | ❌ | ❌ |
| Together | ✅ | ✅ | ❌ | ❌ | ❌ |
| Azure OpenAI | ✅ | ✅ | ✅ | ✅ | ✅ |
| Perplexity | ✅ | ✅ | ❌ | ❌ | ❌ |
| Replicate | ✅ | ❌ | ❌ | ❌ | ❌ |
| HuggingFace | ✅ | ❌ | ✅ | ❌ | ❌ |
| Ollama | ✅ | ✅ | ❌ | ❌ | ❌ |
| LocalAI | ✅ | ✅ | ❌ | ❌ | ❌ |

