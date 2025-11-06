/**
 * Perplexity AI Integration
 * 
 * Service for interacting with Perplexity AI's search-enhanced models.
 * Supports real-time web search and information retrieval.
 * 
 * Features:
 * - Real-time web search
 * - Up-to-date information
 * - Search-enhanced responses
 * - Multiple model options
 * 
 * @module @aura/ai/models/perplexity
 */

import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Configuration for Perplexity AI integration
 */
export interface PerplexityConfig {
  /** Perplexity API key */
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
 * Perplexity AI Integration Service
 */
export class PerplexityService {
  private apiKey: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private baseURL: string;

  constructor(config: PerplexityConfig) {
    if (!config.apiKey) {
      throw new Error('Perplexity API key is required');
    }

    this.apiKey = config.apiKey;
    this.defaultModel = config.model || 'llama-3.1-sonar-large-128k-online';
    this.defaultTemperature = config.temperature ?? 0.2;
    this.defaultMaxTokens = config.maxTokens ?? 2000;
    this.baseURL = config.baseURL || 'https://api.perplexity.ai';

    logger.info('Perplexity AI service initialized', {
      model: this.defaultModel,
      baseURL: this.baseURL,
    });
  }

  /**
   * Generate chat completion with web search
   */
  async chatCompletion(
    messages: Array<{ role: string; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      searchDomain?: string;
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
          ...(options?.searchDomain && { search_domain_filter: [options.searchDomain] }),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Perplexity AI API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      logger.error('Perplexity AI chat completion failed', { error });
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
        throw new Error(`Perplexity AI API error: ${response.statusText}`);
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
      logger.error('Perplexity AI streaming failed', { error });
      throw error;
    }
  }
}

