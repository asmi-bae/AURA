# Dynamic Exports Guide

This document explains how the dynamic export system works in the AI package.

## How It Works

The main `index.ts` file uses **barrel exports** (`export *`) to automatically export all modules from subdirectories. Each subdirectory has its own `index.ts` that exports its modules, creating a cascading export system.

## Export Structure

```
src/
├── index.ts (main)          # Exports from all subdirectories
│
├── core/
│   └── index.ts             # Exports: interfaces, base-model, model-factory
│
├── config/
│   └── index.ts             # Exports: model-config
│
├── providers/
│   └── index.ts             # Exports: openai, anthropic, google, ollama, custom
│       ├── openai/index.ts  # Exports: GPT service
│       ├── anthropic/...    # Exports: Claude service
│       └── ...
│
├── adapters/
│   └── index.ts             # Exports: custom adapter
│
├── services/
│   └── index.ts             # Exports: RAG, MCP
│
├── registry/
│   └── index.ts             # Exports: registry, orchestrator, router, etc.
│
├── types/
│   └── index.ts             # Exports: shared types
│
└── utils/
    └── index.ts             # Exports: utilities
```

## Adding New Exports

### Method 1: Add to Existing Subdirectory

1. Create your new file in the appropriate subdirectory
2. Export it from that subdirectory's `index.ts`
3. It will automatically be available from the main package

**Example:**
```typescript
// src/utils/new-utility.ts
export function newUtility() { ... }

// src/utils/index.ts
export * from './new-utility';  // Add this line

// Now available as:
import { newUtility } from '@aura/ai';
```

### Method 2: Add New Provider

1. Create directory: `src/providers/your-provider/`
2. Create `your-provider/index.ts` with exports
3. Add to `src/providers/index.ts`:
   ```typescript
   export * from './your-provider';
   ```
4. It will automatically be available from the main package

### Method 3: Add New Service

1. Create directory: `src/services/your-service/`
2. Create `your-service/index.ts` with exports
3. Add to `src/services/index.ts`:
   ```typescript
   export * from '../your-service';
   ```
4. It will automatically be available from the main package

## Export Rules

1. **Use `export *`** in subdirectory index files to automatically export all modules
2. **Avoid duplicate exports** - check if something is already exported before adding
3. **Use named exports** - avoid default exports for better tree-shaking
4. **Document exports** - add JSDoc comments for exported items

## Benefits

- **Automatic Discovery**: New modules are automatically exported
- **No Manual Updates**: Don't need to update main index.ts for new modules
- **Tree-shaking**: Only used exports are included in bundles
- **Type Safety**: TypeScript ensures all exports are properly typed
- **Maintainability**: Clear structure makes it easy to find exports

## Common Exports

### Core Exports
```typescript
import { 
  IModel, 
  BaseModel, 
  ModelFactory,
  ModelCapabilities,
  ModelMetadata,
  ChatMessage,
  ChatCompletionResult
} from '@aura/ai';
```

### Provider Exports
```typescript
import { 
  GPTService, 
  ClaudeService, 
  GeminiService, 
  OllamaService 
} from '@aura/ai';
```

### Service Exports
```typescript
import { 
  RAGService, 
  MCPService 
} from '@aura/ai';
```

### Registry Exports
```typescript
import { 
  ModelRegistry, 
  MultiAgentOrchestrator,
  ModelRouter
} from '@aura/ai';
```

### Utility Exports
```typescript
import { 
  formatMessagesForOpenAI,
  estimateTokenCount,
  retryWithBackoff,
  RateLimiter
} from '@aura/ai';
```

