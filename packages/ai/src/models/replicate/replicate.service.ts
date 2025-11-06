/**
 * Replicate Integration
 * 
 * Service for interacting with Replicate's model hosting platform.
 * Supports running various open-source models in the cloud.
 * 
 * Features:
 * - Access to thousands of open-source models
 * - Pay-per-use pricing
 * - Easy model deployment
 * - Streaming support
 * 
 * @module @aura/ai/models/replicate
 */

import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Configuration for Replicate integration
 */
export interface ReplicateConfig {
  /** Replicate API token */
  apiToken: string;
  /** Default model to use (e.g., 'meta/llama-2-70b-chat') */
  model?: string;
  /** Default temperature (0-1) */
  temperature?: number;
  /** Default maximum tokens */
  maxTokens?: number;
  /** Base URL for API */
  baseURL?: string;
}

/**
 * Replicate Integration Service
 */
export class ReplicateService {
  private apiToken: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private baseURL: string;

  constructor(config: ReplicateConfig) {
    if (!config.apiToken) {
      throw new Error('Replicate API token is required');
    }

    this.apiToken = config.apiToken;
    this.defaultModel = config.model || 'meta/llama-2-70b-chat';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 2000;
    this.baseURL = config.baseURL || 'https://api.replicate.com/v1';

    logger.info('Replicate service initialized', {
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

      // Convert messages to prompt format
      const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');

      const response = await fetch(`${this.baseURL}/predictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.apiToken}`,
        },
        body: JSON.stringify({
          version: model,
          input: {
            prompt,
            temperature,
            max_length: maxTokens,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(`Replicate API error: ${JSON.stringify(error)}`);
      }

      const prediction = await response.json();
      
      // Poll for completion
      let result: any = prediction;
      while (result.status === 'starting' || result.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`${this.baseURL}/predictions/${result.id}`, {
          headers: {
            'Authorization': `Token ${this.apiToken}`,
          },
        });
        result = await statusResponse.json() as any;
      }

      if (result.status === 'succeeded') {
        return Array.isArray(result.output) ? result.output.join('') : result.output || '';
      } else {
        throw new Error(`Replicate prediction failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      logger.error('Replicate chat completion failed', { error });
      throw error;
    }
  }
}

