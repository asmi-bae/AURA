/**
 * Groq Model Implementation
 * 
 * Implements IModel interface using BaseModel for Groq models.
 * 
 * @module @aura/ai/models/groq
 */

import { BaseModel } from '../../core/base-model';
import { ModelMetadata, ChatMessage, ChatCompletionOptions, ChatCompletionResult, StreamChunk } from '../../core/interfaces';
import { GroqService, GroqConfig } from './groq.service';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Groq Model
 * 
 * Implements IModel interface for Groq models.
 */
export class GroqModel extends BaseModel {
  private service: GroqService;

  constructor(config: GroqConfig) {
    const metadata: ModelMetadata = {
      provider: 'groq',
      modelId: config.model || 'llama-3.1-70b-versatile',
      name: 'Groq',
      version: '1.0.0',
      maxContextLength: 8192,
      maxOutputLength: 2048,
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
    this.service = new GroqService(config);
  }

  async isAvailable(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      this.logger.error('Groq model health check failed', { error });
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
      const groqMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      const content = await this.service.chatCompletion(groqMessages as any, {
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
      this.logger.error('Groq chat completion failed', { error });
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
      const groqMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      // Groq service uses async generator pattern
      let fullContent = '';
      for await (const chunk of this.service.streamChatCompletion(groqMessages as any, {
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

      // Final chunk
      yield {
        content: fullContent,
        done: true,
      };
    } catch (error) {
      this.logger.error('Groq streaming failed', { error });
      throw error;
    }
  }
}

