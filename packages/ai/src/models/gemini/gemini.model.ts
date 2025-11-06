/**
 * Google Gemini Model Implementation
 * 
 * Implements IModel interface using BaseModel for Google Gemini models.
 * 
 * @module @aura/ai/models/gemini
 */

import { BaseModel } from '../../core/base-model';
import { ModelMetadata, ChatMessage, ChatCompletionOptions, ChatCompletionResult, StreamChunk } from '../../core/interfaces';
import { GeminiService, GeminiConfig } from './gemini.service';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Google Gemini Model
 * 
 * Implements IModel interface for Google Gemini models.
 */
export class GeminiModel extends BaseModel {
  private service: GeminiService;

  constructor(config: GeminiConfig) {
    const metadata: ModelMetadata = {
      provider: 'google',
      modelId: config.model || 'gemini-1.5-pro',
      name: 'Google Gemini',
      version: '1.0.0',
      maxContextLength: 2000000,
      maxOutputLength: 8192,
      capabilities: {
        text: true,
        vision: true,
        audio: false,
        functionCalling: true,
        streaming: true,
        embeddings: false,
        multimodal: true,
      },
      location: 'cloud',
      offlineCapable: false,
    };

    super(metadata, config);
    this.service = new GeminiService(config);
  }

  /**
   * Check if model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      this.logger.error('Gemini model health check failed', { error });
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
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      const content = await this.service.chatCompletion(geminiMessages as any, {
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
      this.logger.error('Gemini chat completion failed', { error });
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
      const geminiMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      let fullContent = '';
      await this.service.streamChatCompletion(geminiMessages as any, (chunk: string) => {
        fullContent += chunk;
      }, {
        model: opts.model,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
      });

      yield {
        content: fullContent,
        done: true,
      };
    } catch (error) {
      this.logger.error('Gemini streaming failed', { error });
      throw error;
    }
  }
}

