/**
 * Anthropic Claude Model Implementation
 * 
 * Implements IModel interface using BaseModel for Anthropic Claude models.
 * 
 * @module @aura/ai/models/claude
 */

import { BaseModel } from '../../core/base-model';
import { ModelMetadata, ChatMessage, ChatCompletionOptions, ChatCompletionResult, StreamChunk } from '../../core/interfaces';
import { ClaudeService, ClaudeConfig } from './claude.service';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Anthropic Claude Model
 * 
 * Implements IModel interface for Anthropic Claude models.
 */
export class ClaudeModel extends BaseModel {
  private service: ClaudeService;

  constructor(config: ClaudeConfig) {
    const metadata: ModelMetadata = {
      provider: 'anthropic',
      modelId: config.model || 'claude-3-5-sonnet-20241022',
      name: 'Anthropic Claude',
      version: '1.0.0',
      maxContextLength: 200000,
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
    this.service = new ClaudeService(config);
  }

  /**
   * Check if model is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      this.logger.error('Claude model health check failed', { error });
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
      // Convert ChatMessage[] to Claude format
      const claudeMessages = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        }));

      const systemMessage = messages.find(msg => msg.role === 'system');
      const system = systemMessage ? (typeof systemMessage.content === 'string' ? systemMessage.content : JSON.stringify(systemMessage.content)) : undefined;

      const content = await this.service.chatCompletion(claudeMessages as any, {
        model: opts.model,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
        system,
      });

      return {
        content,
        model: opts.model || this.metadata.modelId,
        finishReason: 'stop',
      };
    } catch (error) {
      this.logger.error('Claude chat completion failed', { error });
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
      const claudeMessages = messages
        .filter(msg => msg.role !== 'system')
        .map(msg => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        }));

      const systemMessage = messages.find(msg => msg.role === 'system');
      const system = systemMessage ? (typeof systemMessage.content === 'string' ? systemMessage.content : JSON.stringify(systemMessage.content)) : undefined;

      let fullContent = '';
      await this.service.streamChatCompletion(claudeMessages as any, (chunk: string) => {
        fullContent += chunk;
        // Yield chunks as they arrive
      }, {
        model: opts.model,
        temperature: opts.temperature,
        maxTokens: opts.maxTokens,
        system,
      });

      yield {
        content: fullContent,
        done: true,
      };
    } catch (error) {
      this.logger.error('Claude streaming failed', { error });
      throw error;
    }
  }
}

