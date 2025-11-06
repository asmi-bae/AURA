/**
 * Ollama Model Implementation
 * 
 * Implements IModel interface using BaseModel for Ollama local models.
 * 
 * @module @aura/ai/models/ollama
 */

import { BaseModel } from '../../core/base-model';
import { ModelMetadata, ChatMessage, ChatCompletionOptions, ChatCompletionResult, StreamChunk } from '../../core/interfaces';
import { OllamaService, OllamaConfig } from './ollama.service';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Ollama Model
 * 
 * Implements IModel interface for Ollama local models.
 */
export class OllamaModel extends BaseModel {
  private service: OllamaService;

  constructor(config: OllamaConfig = {}) {
    const metadata: ModelMetadata = {
      provider: 'ollama',
      modelId: config.model || 'llama3',
      name: 'Ollama Local',
      version: '1.0.0',
      maxContextLength: 8192,
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
      location: 'local',
      offlineCapable: true,
    };

    super(metadata, config);
    this.service = new OllamaService(config);
  }

  /**
   * Check if model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try a simple health check - access baseUrl through service
      const baseUrl = (this.service as any).baseUrl || 'http://localhost:11434';
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      this.logger.error('Ollama model health check failed', { error });
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
      const ollamaMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      const content = await this.service.chatCompletion(ollamaMessages as any, {
        model: opts.model,
        temperature: opts.temperature,
      });

      return {
        content,
        model: opts.model || this.metadata.modelId,
        finishReason: 'stop',
      };
    } catch (error) {
      this.logger.error('Ollama chat completion failed', { error });
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
      const ollamaMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      let fullContent = '';
      await this.service.streamChatCompletion(ollamaMessages as any, (chunk: string) => {
        fullContent += chunk;
      }, {
        model: opts.model,
        temperature: opts.temperature,
      });

      yield {
        content: fullContent,
        done: true,
      };
    } catch (error) {
      this.logger.error('Ollama streaming failed', { error });
      throw error;
    }
  }
}

