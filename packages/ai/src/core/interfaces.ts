/**
 * Core AI Model Interfaces
 * 
 * Abstract interfaces that all AI models must implement.
 * This allows any AI model to be integrated easily.
 * 
 * @module @aura/ai/core/interfaces
 */

import { StreamChunk } from '../types';

/**
 * Model capabilities
 */
export interface ModelCapabilities {
  /** Supports text generation */
  text: boolean;
  /** Supports vision/image understanding */
  vision: boolean;
  /** Supports audio/speech processing */
  audio: boolean;
  /** Supports function/tool calling */
  functionCalling: boolean;
  /** Supports streaming responses */
  streaming: boolean;
  /** Supports embeddings generation */
  embeddings: boolean;
  /** Supports multimodal input */
  multimodal: boolean;
}

/**
 * Model metadata
 */
export interface ModelMetadata {
  /** Provider name (e.g., 'openai', 'anthropic', 'google') */
  provider: string;
  /** Model identifier (e.g., 'gpt-4-turbo', 'claude-3-5-sonnet') */
  modelId: string;
  /** Model name for display */
  name: string;
  /** Model version */
  version?: string;
  /** Maximum context length in tokens */
  maxContextLength: number;
  /** Maximum output length in tokens */
  maxOutputLength: number;
  /** Model capabilities */
  capabilities: ModelCapabilities;
  /** Model location */
  location: 'cloud' | 'local' | 'edge';
  /** Whether model works offline */
  offlineCapable: boolean;
}

/**
 * Model configuration
 */
export interface ModelConfig {
  /** API key or authentication token */
  apiKey?: string;
  /** Base URL for API */
  baseURL?: string;
  /** Default model to use */
  model?: string;
  /** Default temperature */
  temperature?: number;
  /** Default max tokens */
  maxTokens?: number;
  /** Additional provider-specific options */
  [key: string]: any;
}

/**
 * Chat message
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | Array<{ type: string; [key: string]: any }>;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

/**
 * Tool/Function call
 */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Tool/Function definition
 */
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Chat completion options
 */
export interface ChatCompletionOptions {
  /** Model to use (overrides default) */
  model?: string;
  /** Temperature (0-2) */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Top-p sampling */
  topP?: number;
  /** Frequency penalty */
  frequencyPenalty?: number;
  /** Presence penalty */
  presencePenalty?: number;
  /** Stop sequences */
  stop?: string[];
  /** Tools/functions to use */
  tools?: ToolDefinition[];
  /** Whether to stream response */
  stream?: boolean;
  /** Additional provider-specific options */
  [key: string]: any;
}

/**
 * Chat completion result
 */
export interface ChatCompletionResult {
  /** Generated text */
  content: string;
  /** Model used */
  model: string;
  /** Finish reason */
  finishReason?: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Tool calls if any */
  toolCalls?: ToolCall[];
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Embedding result
 */
export interface EmbeddingResult {
  /** Embedding vector */
  embedding: number[];
  /** Model used */
  model: string;
  /** Token usage */
  usage?: {
    promptTokens: number;
    totalTokens: number;
  };
}

/**
 * Base AI Model Interface
 * 
 * All AI models must implement this interface for easy integration.
 */
export interface IModel {
  /**
   * Get model metadata
   */
  getMetadata(): ModelMetadata;

  /**
   * Check if model is available/healthy
   */
  isAvailable(): Promise<boolean>;

  /**
   * Generate chat completion
   */
  chatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResult>;

  /**
   * Stream chat completion
   */
  streamChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;

  /**
   * Generate embeddings
   */
  generateEmbeddings(
    texts: string[],
    options?: Record<string, any>
  ): Promise<EmbeddingResult[]>;

  /**
   * Check if model supports a capability
   */
  supports(capability: keyof ModelCapabilities): boolean;
}

/**
 * Model adapter interface
 * 
 * Adapters convert provider-specific implementations to the standard IModel interface
 */
export interface IModelAdapter {
  /**
   * Adapt provider-specific model to IModel interface
   */
  adapt(providerModel: any, config: ModelConfig): IModel;
}

