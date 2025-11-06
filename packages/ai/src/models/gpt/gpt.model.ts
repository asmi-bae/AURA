/**
 * OpenAI GPT Model Implementation
 * 
 * Implements IModel interface using BaseModel for OpenAI GPT models.
 * 
 * @module @aura/ai/models/gpt
 */

import { BaseModel } from '../../core/base-model';
import { ModelMetadata, ChatMessage, ChatCompletionOptions, ChatCompletionResult, EmbeddingResult, StreamChunk } from '../../core/interfaces';
import { GPTService, GPTConfig } from './gpt.service';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * OpenAI GPT Model
 * 
 * Implements IModel interface for OpenAI GPT models.
 */
export class GPTModel extends BaseModel {
  private service: GPTService;

  constructor(config: GPTConfig) {
    const metadata: ModelMetadata = {
      provider: 'openai',
      modelId: config.model || 'gpt-4-turbo-preview',
      name: 'OpenAI GPT',
      version: '1.0.0',
      maxContextLength: 128000,
      maxOutputLength: 4096,
      capabilities: {
        text: true,
        vision: true,
        audio: false,
        functionCalling: true,
        streaming: true,
        embeddings: true,
        multimodal: true,
      },
      location: 'cloud',
      offlineCapable: false,
    };

    super(metadata, config);
    this.service = new GPTService(config);
  }

  /**
   * Check if model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check
      return true;
    } catch (error) {
      this.logger.error('GPT model health check failed', { error });
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
      // Convert ChatMessage[] to GPT format
      const gptMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      const content = await this.service.chatCompletion(gptMessages as any, {
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
      this.logger.error('GPT chat completion failed', { error });
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
      const gptMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      let fullContent = '';
      await this.service.streamChatCompletion(gptMessages as any, (chunk: string) => {
        fullContent += chunk;
      }, {
        model: opts.model,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      });

      // Yield chunks (simplified - in real implementation, yield as chunks arrive)
      yield {
        content: fullContent,
        done: true,
      };
    } catch (error) {
      this.logger.error('GPT streaming failed', { error });
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
      const model = options?.model || 'text-embedding-3-small';
      const embeddings = await this.service.generateEmbeddings(texts, model);

      return embeddings.map((embedding, index) => ({
        embedding,
        model,
      }));
    } catch (error) {
      this.logger.error('GPT embeddings generation failed', { error });
      throw error;
    }
  }
}

