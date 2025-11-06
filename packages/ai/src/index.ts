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
 * Providers Module
 * Exports: All provider services (OpenAI, Anthropic, Google, Ollama, Custom)
 * - GPTService, GPTConfig
 * - ClaudeService, ClaudeConfig
 * - GeminiService, GeminiConfig
 * - OllamaService, OllamaConfig
 * - CustomModelAdapter, CustomModelConfig
 */
export * from './providers';

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
 * Legacy Models Export
 * Note: Models are now organized under providers/, but we keep this for compatibility
 * This is automatically handled through providers export above
 */
// export * from './models'; // Already exported via providers

/**
 * Direct MCP and RAG Exports
 * Note: These are already exported through services, but kept for direct access
 */
// export * from './mcp'; // Already exported via services
// export * from './rag'; // Already exported via services
