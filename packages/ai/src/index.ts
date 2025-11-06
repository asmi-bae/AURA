/**
 * AURA AI Package
 * 
 * Comprehensive AI integration package supporting multiple providers,
 * RAG, MCP, and multi-agent orchestration.
 * 
 * This file uses dynamic barrel exports - all modules are automatically
 * exported through their respective index.ts files. Adding new modules
 * to subdirectories will automatically make them available if the
 * subdirectory's index.ts uses `export *`.
 * 
 * @module @aura/ai
 */

// ============================================================================
// Dynamic Exports - All modules are automatically exported
// ============================================================================

/**
 * Core Module
 * Exports: IModel, BaseModel, ModelFactory, ModelCapabilities, ModelMetadata, 
 *          ModelConfig, ChatMessage, ChatCompletionOptions, ChatCompletionResult,
 *          EmbeddingResult, ToolCall, ToolDefinition, IModelAdapter
 */
export * from './core';

/**
 * Configuration Module
 * Exports: ModelConfigManager, defaultConfigManager, ModelConfigEntry
 */
export * from './config';

/**
 * Models Module
 * Exports: All model implementations (OpenAI, Anthropic, Google, Ollama, Mistral, etc.)
 * - GPTModel, GPTService, GPTConfig
 * - ClaudeModel, ClaudeService, ClaudeConfig
 * - GeminiModel, GeminiService, GeminiConfig
 * - OllamaModel, OllamaService, OllamaConfig
 * - And all other model implementations
 */
export * from './models';

/**
 * Adapters Module
 * Exports: All adapter implementations for converting providers to standard interface
 */
export * from './adapters';

/**
 * Services Module
 * Exports: High-level services
 * - RAGService, DocumentChunker, VectorStores (Pinecone, Weaviate, Local)
 * - MCPService
 */
export * from './services';

/**
 * Registry Module
 * Exports: Model registry, orchestration, routing, caching, pipelines
 * - ModelRegistry, RegistryModelConfig
 * - MultiAgentOrchestrator
 * - ModelRouter
 * - ResponseCache
 * - PipelineExecutor
 * - HealthMonitor
 * - RegistryManager
 */
export * from './registry';

/**
 * Types Module
 * Exports: Shared types and interfaces
 * - ModelProvider
 * - AIMessage, ModelResponse, StreamChunk
 * - BaseModelService
 * - LegacyModelCapabilities (deprecated)
 */
export * from './types';

/**
 * Utils Module
 * Exports: Shared utilities and helper functions
 * - Message formatters: formatMessagesForOpenAI, formatMessagesForAnthropic, 
 *   formatMessagesForGoogle, formatMessagesGeneric
 * - Token counters: estimateTokenCount, countTokensByWords, countTokensInMessages
 * - Error handlers: AIProviderError, handleAPIError, isRetryableError
 * - Retry handlers: retryWithBackoff, RetryOptions
 * - Rate limiters: RateLimiter
 */
export * from './utils';

// ============================================================================
// Legacy Exports (for backward compatibility)
// ============================================================================

/**
 * Note: All models are exported through ./models above
 * Models include both Service classes (for direct API access) and Model classes (for IModel interface)
 */

/**
 * Direct MCP and RAG Exports
 * Note: These are already exported through services, but kept for direct access
 */
// export * from './mcp'; // Already exported via services
// export * from './rag'; // Already exported via services
