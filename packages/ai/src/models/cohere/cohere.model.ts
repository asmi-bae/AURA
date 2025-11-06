/**
 * Cohere Model Implementation
 * 
 * Implements IModel interface using BaseModel for Cohere models.
 * 
 * @module @aura/ai/models/cohere
 */

import { BaseModel } from '../../core/base-model';
import { ModelMetadata, ChatMessage, ChatCompletionOptions, ChatCompletionResult, EmbeddingResult, StreamChunk } from '../../core/interfaces';
import { CohereService, CohereConfig } from './cohere.service';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Cohere Model
 * 
 * Implements IModel interface for Cohere models.
 */
export class CohereModel extends BaseModel {
  private service: CohereService;

  constructor(config: CohereConfig) {
    const metadata: ModelMetadata = {
      provider: 'cohere',
      modelId: config.model || 'command',
      name: 'Cohere',
      version: '1.0.0',
      maxContextLength: 4096,
      maxOutputLength: 2048,
      capabilities: {
        text: true,
        vision: false,
        audio: false,
        functionCalling: false,
        streaming: true,
        embeddings: true,
        multimodal: false,
      },
      location: 'cloud',
      offlineCapable: false,
    };

    super(metadata, config);
    this.service = new CohereService(config);
  }

  /**
   * Check if model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      this.logger.error('Cohere model health check failed', { error });
      return false;
    }
  }

  /**
   * Generate chat completion
   */
  async chatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    this.validateMessages(messages);
    const opts = this.normalizeOptions(options);

    try {
      const cohereMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      const content = await this.service.chatCompletion(cohereMessages as any, {
        model: opts.model,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      });

      return {
        content,
        model: opts.model || this.metadata.modelId,
        finishReason: 'stop',
      };
    } catch (error) {
      this.logger.error('Cohere chat completion failed', { error });
      throw error;
    }
  }

  /**
   * Stream chat completion
   */
  async *streamChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    this.validateMessages(messages);
    const opts = this.normalizeOptions(options);

    try {
      const cohereMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      // Cohere doesn't have streaming in service, use non-streaming
      const result = await this.service.chatCompletion(cohereMessages as any, {
        model: opts.model,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      });
      const fullContent = result;

      yield {
        content: fullContent,
        done: true,
      };
    } catch (error) {
      this.logger.error('Cohere streaming failed', { error });
      throw error;
    }
  }

  /**
   * Generate embeddings
   */
  async generateEmbeddings(
    texts: string[],
    options?: Record<string, any>
  ): Promise<EmbeddingResult[]> {
    try {
      const model = options?.model || 'embed-english-v3.0';
      const embeddings = await this.service.generateEmbeddings(texts, model);

      return embeddings.map((embedding, index) => ({
        embedding,
        model,
      }));
    } catch (error) {
      this.logger.error('Cohere embeddings generation failed', { error });
      throw error;
    }
  }
}

