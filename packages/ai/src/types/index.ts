/**
 * AI Package Types
 * 
 * Shared types and interfaces for the AI package.
 * 
 * @module @aura/ai/types
 */

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'ollama';

/**
 * Base message interface for all AI models
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Model response interface
 */
export interface ModelResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  finishReason?: string;
}

/**
 * Streaming chunk interface
 */
export interface StreamChunk {
  content: string;
  done: boolean;
}

/**
 * Base model interface that all model services should implement
 */
export interface BaseModelService {
  chatCompletion(
    messages: AIMessage[],
    options?: any
  ): Promise<string>;

  streamChatCompletion?(
    messages: AIMessage[],
    onChunk: (chunk: string) => void,
    options?: any
  ): Promise<void>;
}

/**
 * Model capabilities
 */
export interface ModelCapabilities {
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  supportsMultimodal: boolean;
  maxContextLength: number;
  maxOutputLength: number;
}

