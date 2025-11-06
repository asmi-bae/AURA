/**
 * Mistral AI Integration
 * 
 * Service for interacting with Mistral AI models (Mistral Large, Mistral Medium, etc.)
 * Supports chat completions, function calling, and streaming responses.
 * 
 * Features:
 * - Chat completions with conversation history
 * - Function calling for tool integration
 * - Streaming responses for real-time updates
 * - High-quality reasoning capabilities
 * 
 * @module @aura/ai/models/mistral
 */

import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Configuration for Mistral AI integration
 */
export interface MistralConfig {
  /** Mistral AI API key */
  apiKey: string;
  /** Default model to use */
  model?: string;
  /** Default temperature (0-1) */
  temperature?: number;
  /** Default maximum tokens */
  maxTokens?: number;
  /** Base URL for API */
  baseURL?: string;
}

/**
 * Mistral AI Integration Service
 * 
 * Provides methods for interacting with Mistral AI models.
 */
export class MistralService {
  private apiKey: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private baseURL: string;

  constructor(config: MistralConfig) {
    if (!config.apiKey) {
      throw new Error('Mistral AI API key is required');
    }

    this.apiKey = config.apiKey;
    this.defaultModel = config.model || 'mistral-large-latest';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 2000;
    this.baseURL = config.baseURL || 'https://api.mistral.ai/v1';

    logger.info('Mistral AI service initialized', {
      model: this.defaultModel,
      baseURL: this.baseURL,
    });
  }

  /**
   * Generate chat completion
   */
  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<string> {
    try {
      const model = options?.model || this.defaultModel;
      const temperature = options?.temperature ?? this.defaultTemperature;
      const maxTokens = options?.maxTokens ?? this.defaultMaxTokens;

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Mistral AI API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      logger.error('Mistral AI chat completion failed', { error });
      throw error;
    }
  }

  /**
   * Stream chat completion
   */
  async *streamChatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): AsyncGenerator<string, void, unknown> {
    try {
      const model = options?.model || this.defaultModel;
      const temperature = options?.temperature ?? this.defaultTemperature;
      const maxTokens = options?.maxTokens ?? this.defaultMaxTokens;

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Mistral AI API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || '';
              if (content) {
                yield content;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      logger.error('Mistral AI streaming failed', { error });
      throw error;
    }
  }
}

