/**
 * Mistral AI Model Implementation
 * 
 * Implements IModel interface using BaseModel for Mistral AI models.
 * 
 * @module @aura/ai/models/mistral
 */

import { BaseModel } from '../../core/base-model';
import { ModelMetadata, ChatMessage, ChatCompletionOptions, ChatCompletionResult, StreamChunk } from '../../core/interfaces';
import { MistralService, MistralConfig } from './mistral.service';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Mistral AI Model
 * 
 * Implements IModel interface for Mistral AI models.
 */
export class MistralModel extends BaseModel {
  private service: MistralService;

  constructor(config: MistralConfig) {
    const metadata: ModelMetadata = {
      provider: 'mistral',
      modelId: config.model || 'mistral-large-latest',
      name: 'Mistral AI',
      version: '1.0.0',
      maxContextLength: 32000,
      maxOutputLength: 8192,
      capabilities: {
        text: true,
        vision: false,
        audio: false,
        functionCalling: true,
        streaming: true,
        embeddings: false,
        multimodal: false,
      },
      location: 'cloud',
      offlineCapable: false,
    };

    super(metadata, config);
    this.service = new MistralService(config);
  }

  /**
   * Check if model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      this.logger.error('Mistral model health check failed', { error });
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
      const mistralMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      const content = await this.service.chatCompletion(mistralMessages as any, {
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
      this.logger.error('Mistral chat completion failed', { error });
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
      const mistralMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      let fullContent = '';
      for await (const chunk of this.service.streamChatCompletion(mistralMessages as any, {
        model: opts.model,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      })) {
        fullContent += chunk;
        yield {
          content: chunk,
          done: false,
        };
      }

      yield {
        content: fullContent,
        done: true,
      };
    } catch (error) {
      this.logger.error('Mistral streaming failed', { error });
      throw error;
    }
  }
}

