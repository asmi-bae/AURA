/**
 * Together AI Model Implementation
 * 
 * Implements IModel interface using BaseModel for Together AI models.
 * 
 * @module @aura/ai/models/together
 */

import { BaseModel } from '../../core/base-model';
import { ModelMetadata, ChatMessage, ChatCompletionOptions, ChatCompletionResult, StreamChunk } from '../../core/interfaces';
import { TogetherService, TogetherConfig } from './together.service';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Together AI Model
 * 
 * Implements IModel interface for Together AI models.
 */
export class TogetherModel extends BaseModel {
  private service: TogetherService;

  constructor(config: TogetherConfig) {
    const metadata: ModelMetadata = {
      provider: 'together',
      modelId: config.model || 'meta-llama/Llama-3-70b-chat-hf',
      name: 'Together AI',
      version: '1.0.0',
      maxContextLength: 4096,
      maxOutputLength: 2048,
      capabilities: {
        text: true,
        vision: false,
        audio: false,
        functionCalling: false,
        streaming: true,
        embeddings: false,
        multimodal: false,
      },
      location: 'cloud',
      offlineCapable: false,
    };

    super(metadata, config);
    this.service = new TogetherService(config);
  }

  async isAvailable(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      this.logger.error('Together model health check failed', { error });
      return false;
    }
  }

  async chatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    this.validateMessages(messages);
    const opts = this.normalizeOptions(options);

    try {
      const togetherMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      const content = await this.service.chatCompletion(togetherMessages as any, {
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
      this.logger.error('Together chat completion failed', { error });
      throw error;
    }
  }

  async *streamChatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): AsyncGenerator<StreamChunk, void, unknown> {
    this.validateMessages(messages);
    const opts = this.normalizeOptions(options);

    try {
      const togetherMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      let fullContent = '';
      for await (const chunk of this.service.streamChatCompletion(togetherMessages as any, {
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
      this.logger.error('Together streaming failed', { error });
      throw error;
    }
  }
}

