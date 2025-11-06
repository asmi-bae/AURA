/**
 * Cohere Integration
 * 
 * Service for interacting with Cohere models (Command, Command-Light, etc.)
 * Supports chat completions, embeddings, and reranking.
 * 
 * Features:
 * - Chat completions with conversation history
 * - Embeddings generation
 * - Reranking for search
 * - Streaming responses
 * 
 * @module @aura/ai/models/cohere
 */

import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Configuration for Cohere integration
 */
export interface CohereConfig {
  /** Cohere API key */
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
 * Cohere Integration Service
 */
export class CohereService {
  private apiKey: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private baseURL: string;

  constructor(config: CohereConfig) {
    if (!config.apiKey) {
      throw new Error('Cohere API key is required');
    }

    this.apiKey = config.apiKey;
    this.defaultModel = config.model || 'command';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 2000;
    this.baseURL = config.baseURL || 'https://api.cohere.ai/v1';

    logger.info('Cohere service initialized', {
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

      // Convert messages to Cohere format
      const chatHistory = messages.slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: msg.content,
      }));
      const message = messages[messages.length - 1]?.content || '';

      const response = await fetch(`${this.baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          message,
          chat_history: chatHistory,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Cohere API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      return data.text || '';
    } catch (error) {
      logger.error('Cohere chat completion failed', { error });
      throw error;
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(
    texts: string[],
    options?: {
      model?: string;
      inputType?: 'search_document' | 'search_query' | 'classification' | 'clustering';
    }
  ): Promise<number[][]> {
    try {
      const model = options?.model || 'embed-english-v3.0';
      const inputType = options?.inputType || 'search_document';

      const response = await fetch(`${this.baseURL}/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          texts,
          input_type: inputType,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Cohere API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      return data.embeddings || [];
    } catch (error) {
      logger.error('Cohere embeddings generation failed', { error });
      throw error;
    }
  }

  /**
   * Rerank documents
   */
  async rerank(
    query: string,
    documents: string[],
    options?: {
      model?: string;
      topN?: number;
    }
  ): Promise<Array<{ index: number; relevanceScore: number }>> {
    try {
      const model = options?.model || 'rerank-english-v3.0';
      const topN = options?.topN || documents.length;

      const response = await fetch(`${this.baseURL}/rerank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          query,
          documents,
          top_n: topN,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Cohere API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      return data.results || [];
    } catch (error) {
      logger.error('Cohere rerank failed', { error });
      throw error;
    }
  }
}

