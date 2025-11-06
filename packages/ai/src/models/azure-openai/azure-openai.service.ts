/**
 * Azure OpenAI Integration
 * 
 * Service for interacting with Azure OpenAI services.
 * Supports GPT models through Azure's infrastructure.
 * 
 * Features:
 * - Enterprise-grade infrastructure
 * - Same GPT models as OpenAI
 * - Enhanced security and compliance
 * - Regional deployment options
 * 
 * @module @aura/ai/models/azure-openai
 */

import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Configuration for Azure OpenAI integration
 */
export interface AzureOpenAIConfig {
  /** Azure API key */
  apiKey: string;
  /** Azure resource endpoint */
  endpoint: string;
  /** API version */
  apiVersion?: string;
  /** Default model deployment name */
  model?: string;
  /** Default temperature (0-2) */
  temperature?: number;
  /** Default maximum tokens */
  maxTokens?: number;
}

/**
 * Azure OpenAI Integration Service
 */
export class AzureOpenAIService {
  private apiKey: string;
  private endpoint: string;
  private apiVersion: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: AzureOpenAIConfig) {
    if (!config.apiKey) {
      throw new Error('Azure OpenAI API key is required');
    }
    if (!config.endpoint) {
      throw new Error('Azure OpenAI endpoint is required');
    }

    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint.replace(/\/$/, '');
    this.apiVersion = config.apiVersion || '2024-02-15-preview';
    this.defaultModel = config.model || 'gpt-4';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 2000;

    logger.info('Azure OpenAI service initialized', {
      model: this.defaultModel,
      endpoint: this.endpoint,
      apiVersion: this.apiVersion,
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

      const url = `${this.endpoint}/openai/deployments/${model}/chat/completions?api-version=${this.apiVersion}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Azure OpenAI API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      logger.error('Azure OpenAI chat completion failed', { error });
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

      const url = `${this.endpoint}/openai/deployments/${model}/chat/completions?api-version=${this.apiVersion}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Azure OpenAI API error: ${response.statusText}`);
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
      logger.error('Azure OpenAI streaming failed', { error });
      throw error;
    }
  }
}

