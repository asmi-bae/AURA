/**
 * HuggingFace Integration
 * 
 * Service for interacting with HuggingFace Inference API and models.
 * Supports thousands of open-source models hosted on HuggingFace.
 * 
 * Features:
 * - Access to thousands of models
 * - Inference API for hosted models
 * - Text generation, embeddings, and more
 * - Free tier available
 * 
 * @module @aura/ai/models/huggingface
 */

import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Configuration for HuggingFace integration
 */
export interface HuggingFaceConfig {
  /** HuggingFace API token */
  apiToken: string;
  /** Default model to use (e.g., 'meta-llama/Llama-2-70b-chat-hf') */
  model?: string;
  /** Default temperature (0-1) */
  temperature?: number;
  /** Default maximum tokens */
  maxTokens?: number;
  /** Base URL for API */
  baseURL?: string;
}

/**
 * HuggingFace Integration Service
 */
export class HuggingFaceService {
  private apiToken: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private baseURL: string;

  constructor(config: HuggingFaceConfig) {
    if (!config.apiToken) {
      throw new Error('HuggingFace API token is required');
    }

    this.apiToken = config.apiToken;
    this.defaultModel = config.model || 'meta-llama/Llama-2-70b-chat-hf';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 2000;
    this.baseURL = config.baseURL || 'https://api-inference.huggingface.co';

    logger.info('HuggingFace service initialized', {
      model: this.defaultModel,
      baseURL: this.baseURL,
    });
  }

  /**
   * Generate text completion
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

      // Convert messages to prompt format
      const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n') + '\nassistant:';

      const response = await fetch(`${this.baseURL}/models/${model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            temperature,
            max_new_tokens: maxTokens,
            return_full_text: false,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`HuggingFace API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      
      // Handle different response formats
      if (Array.isArray(data) && data[0]?.generated_text) {
        return data[0].generated_text;
      } else if (data.generated_text) {
        return data.generated_text;
      } else if (typeof data === 'string') {
        return data;
      }
      
      return '';
    } catch (error) {
      logger.error('HuggingFace chat completion failed', { error });
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
    }
  ): Promise<number[][]> {
    try {
      const model = options?.model || 'sentence-transformers/all-MiniLM-L6-v2';

      const response = await fetch(`${this.baseURL}/models/${model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify({
          inputs: texts,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`HuggingFace API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json() as any;
      
      // Handle different response formats
      if (Array.isArray(data) && data[0]?.embeddings) {
        return data[0].embeddings;
      } else if (data.embeddings) {
        return data.embeddings;
      }
      
      return [];
    } catch (error) {
      logger.error('HuggingFace embeddings generation failed', { error });
      throw error;
    }
  }
}

