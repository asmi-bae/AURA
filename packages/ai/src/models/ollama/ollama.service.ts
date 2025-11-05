/**
 * Ollama Integration
 * 
 * Service for interacting with local Ollama models (LLaMA, Mistral, etc.)
 * Supports running models locally for privacy-sensitive applications.
 * 
 * Features:
 * - Local execution (no data sent to cloud)
 * - Wide range of open-source models
 * - Streaming support
 * - Offline operation
 * 
 * @module @aura/ai/models/ollama
 */

import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Configuration for Ollama integration
 */
export interface OllamaConfig {
  /** Ollama base URL */
  baseUrl?: string;
  /** Default model to use */
  model?: string;
  /** Default temperature (0-2) */
  temperature?: number;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Ollama Integration Service
 * 
 * Provides methods for interacting with local Ollama models.
 */
export class OllamaService {
  private baseUrl: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private timeout: number;

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.defaultModel = config.model || 'llama2';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.timeout = config.timeout || 30000; // 30 seconds

    logger.info('Ollama service initialized', {
      baseUrl: this.baseUrl,
      model: this.defaultModel,
    });
  }

  /**
   * Generate chat completion
   * 
   * @param messages - Conversation messages
   * @param options - Optional configuration
   * @returns Generated text response
   */
  async chatCompletion(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      stream?: boolean;
    }
  ): Promise<string> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || this.defaultModel,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          options: {
            temperature: options?.temperature ?? this.defaultTemperature,
          },
          stream: options?.stream || false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      const content = data.message?.content || '';

      logger.debug('Ollama chat completion successful', {
        model: options?.model || this.defaultModel,
      });

      return content;
    } catch (error) {
      logger.error('Error in Ollama chat completion', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: options?.model || this.defaultModel,
      });
      throw error;
    }
  }

  /**
   * Stream chat completion for real-time responses
   * 
   * @param messages - Conversation messages
   * @param onChunk - Callback for each chunk
   * @param options - Optional configuration
   */
  async streamChatCompletion(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (chunk: string) => void,
    options?: {
      model?: string;
      temperature?: number;
    }
  ): Promise<void> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || this.defaultModel,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          options: {
            temperature: options?.temperature ?? this.defaultTemperature,
          },
          stream: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.statusText} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              onChunk(data.message.content);
            }
          } catch {
            // Ignore invalid JSON
          }
        }
      }

      logger.debug('Ollama stream completion finished');
    } catch (error) {
      logger.error('Error in Ollama stream chat completion', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      logger.error('Error listing Ollama models', { error });
      return [];
    }
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available Ollama models (common ones)
   */
  static getAvailableModels(): string[] {
    return [
      'llama2',
      'llama2:13b',
      'llama2:70b',
      'mistral',
      'mixtral',
      'codellama',
      'neural-chat',
      'starling-lm',
      'phi',
      'orca-mini',
    ];
  }
}

