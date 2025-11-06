/**
 * Base Model Implementation
 * 
 * Abstract base class that provides common functionality for all AI models.
 * Models can extend this class to get default implementations.
 * 
 * @module @aura/ai/core/base-model
 */

import { IModel, ModelMetadata, ModelCapabilities, ChatMessage, ChatCompletionOptions, ChatCompletionResult, EmbeddingResult, StreamChunk } from './interfaces';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Abstract base class for AI models
 * 
 * Provides common functionality and default implementations.
 * Models should extend this class and implement required methods.
 */
export abstract class BaseModel implements IModel {
  protected metadata: ModelMetadata;
  protected config: Record<string, any>;
  protected logger = logger;

  constructor(metadata: ModelMetadata, config: Record<string, any> = {}) {
    this.metadata = metadata;
    this.config = config;
  }

  /**
   * Get model metadata
   */
  getMetadata(): ModelMetadata {
    return this.metadata;
  }

  /**
   * Check if model is available
   * 
   * Default implementation returns true.
   * Override for custom health checks.
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check - try a minimal request
      return true;
    } catch (error) {
      this.logger.error('Model health check failed', { error, model: this.metadata.modelId });
      return false;
    }
  }

  /**
   * Generate chat completion
   * 
   * Must be implemented by subclasses.
   */
  abstract chatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResult>;

  /**
   * Stream chat completion
   * 
   * Default implementation falls back to non-streaming.
   * Override for streaming support.
   */
  async *streamChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    // Default: fall back to non-streaming
    const result = await this.chatCompletion(messages, { ...options, stream: false });
    
    // Yield result as single chunk
    yield {
      content: result.content,
      done: true,
    };
  }

  /**
   * Generate embeddings
   * 
   * Default implementation throws error.
   * Override if model supports embeddings.
   */
  async generateEmbeddings(
    texts: string[],
    options?: Record<string, any>
  ): Promise<EmbeddingResult[]> {
    if (!this.supports('embeddings')) {
      throw new Error(`Model ${this.metadata.modelId} does not support embeddings`);
    }
    throw new Error('generateEmbeddings not implemented');
  }

  /**
   * Check if model supports a capability
   */
  supports(capability: keyof ModelCapabilities): boolean {
    return this.metadata.capabilities[capability] ?? false;
  }

  /**
   * Validate messages
   */
  protected validateMessages(messages: ChatMessage[]): void {
    if (!messages || messages.length === 0) {
      throw new Error('Messages array cannot be empty');
    }

    // Check total content length
    const totalLength = messages.reduce((sum, msg) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      return sum + content.length;
    }, 0);

    if (totalLength > this.metadata.maxContextLength * 4) {
      // Rough estimate: 4 chars per token
      throw new Error(`Total message length exceeds model context limit (${this.metadata.maxContextLength} tokens)`);
    }
  }

  /**
   * Normalize options
   */
  protected normalizeOptions(options?: ChatCompletionOptions): ChatCompletionOptions {
    return {
      model: options?.model || this.config.model || this.metadata.modelId,
      temperature: options?.temperature ?? this.config.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? this.config.maxTokens ?? this.metadata.maxOutputLength,
      ...options,
    };
  }
}

