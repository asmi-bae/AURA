/**
 * Embedding Generator
 * 
 * Generates embeddings using various providers
 */

import { createLogger } from '@aura/utils';
// @ts-ignore - OpenAI types may have issues
import OpenAI from 'openai';

const logger = createLogger();

export interface EmbeddingOptions {
  model?: string;
  dimensions?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  dimensions: number;
  model: string;
}

/**
 * Embedding Generator
 */
export class EmbeddingGenerator {
  private openai: OpenAI | null = null;
  private defaultModel = 'text-embedding-3-small';

  constructor(openaiApiKey?: string) {
    if (openaiApiKey) {
      this.openai = new OpenAI({ apiKey: openaiApiKey });
    }
  }

  /**
   * Generate embedding for text
   */
  async generate(text: string, options: EmbeddingOptions = {}): Promise<EmbeddingResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const model = options.model || this.defaultModel;
      const response = await this.openai.embeddings.create({
        model,
        input: text,
        dimensions: options.dimensions,
      });

      return {
        embedding: response.data[0].embedding,
        dimensions: response.data[0].embedding.length,
        model,
      };
    } catch (error) {
      logger.error('Error generating embedding', { error });
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateBatch(texts: string[], options: EmbeddingOptions = {}): Promise<EmbeddingResult[]> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const model = options.model || this.defaultModel;
      const response = await this.openai.embeddings.create({
        model,
        input: texts,
        dimensions: options.dimensions,
      });

      return response.data.map((item: any) => ({
        embedding: item.embedding,
        dimensions: item.embedding.length,
        model,
      }));
    } catch (error) {
      logger.error('Error generating embeddings', { error });
      throw error;
    }
  }
}
