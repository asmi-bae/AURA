/**
 * LocalAI Integration
 * 
 * Service for interacting with LocalAI (local inference server).
 * Supports running models locally with OpenAI-compatible API.
 * 
 * Features:
 * - Local inference (privacy-focused)
 * - OpenAI-compatible API
 * - Multiple model support
 * - No API keys required
 * 
 * @module @aura/ai/models/localai
 */

import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Configuration for LocalAI integration
 */
export interface LocalAIConfig {
  /** LocalAI server URL */
  baseURL?: string;
  /** Default model to use */
  model?: string;
  /** Default temperature (0-2) */
  temperature?: number;
  /** Default maximum tokens */
  maxTokens?: number;
  /** API key (optional, for authentication) */
  apiKey?: string;
}

/**
 * LocalAI Integration Service
 */
export class LocalAIService {
  private baseURL: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private apiKey?: string;

  constructor(config: LocalAIConfig = {}) {
    this.baseURL = config.baseURL || 'http://localhost:8080/v1';
    this.defaultModel = config.model || 'gpt-3.5-turbo';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 2000;
    this.apiKey = config.apiKey;

    logger.info('LocalAI service initialized', {
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
    }
  ): Promise<string> {
    try {
      const model = options?.model || this.defaultModel;
      const temperature = options?.temperature ?? this.defaultTemperature;
      const maxTokens = options?.maxTokens ?? this.defaultMaxTokens;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`LocalAI API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      logger.error('LocalAI chat completion failed', { error });
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

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`LocalAI API error: ${response.statusText}`);
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
      logger.error('LocalAI streaming failed', { error });
      throw error;
    }
  }
}

