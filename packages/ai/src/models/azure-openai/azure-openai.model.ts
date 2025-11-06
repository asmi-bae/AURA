/**
 * Azure OpenAI Model Implementation
 * 
 * Implements IModel interface using BaseModel for Azure OpenAI models.
 * 
 * @module @aura/ai/models/azure-openai
 */

import { BaseModel } from '../../core/base-model';
import { ModelMetadata, ChatMessage, ChatCompletionOptions, ChatCompletionResult, EmbeddingResult, StreamChunk } from '../../core/interfaces';
import { AzureOpenAIService, AzureOpenAIConfig } from './azure-openai.service';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Azure OpenAI Model
 * 
 * Implements IModel interface for Azure OpenAI models.
 */
export class AzureOpenAIModel extends BaseModel {
  private service: AzureOpenAIService;

  constructor(config: AzureOpenAIConfig) {
    const metadata: ModelMetadata = {
      provider: 'azure-openai',
      modelId: config.model || 'gpt-4',
      name: 'Azure OpenAI',
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
    this.service = new AzureOpenAIService(config);
  }

  async isAvailable(): Promise<boolean> {
    try {
      return true;
    } catch (error) {
      this.logger.error('Azure OpenAI model health check failed', { error });
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
      const azureMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      const content = await this.service.chatCompletion(azureMessages as any, {
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
      this.logger.error('Azure OpenAI chat completion failed', { error });
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
      const azureMessages = messages.map(msg => ({
        role: msg.role === 'system' ? 'system' : msg.role === 'assistant' ? 'assistant' : 'user',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));

      let fullContent = '';
      for await (const chunk of this.service.streamChatCompletion(azureMessages as any, {
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
      this.logger.error('Azure OpenAI streaming failed', { error });
      throw error;
    }
  }

  async generateEmbeddings(
    texts: string[],
    options?: Record<string, any>
  ): Promise<EmbeddingResult[]> {
    try {
      const model = options?.model || 'text-embedding-3-small';
      // Azure OpenAI embeddings - implement based on service
      // For now, throw error as it's not implemented in service
      throw new Error('Embeddings not yet implemented for Azure OpenAI');
      
      // Placeholder for when implemented:
      // const embeddings = await this.service.generateEmbeddings(texts, model);
      // return embeddings.map((embedding: number[], index: number) => ({
      //   embedding,
      //   model,
      // }));
    } catch (error) {
      this.logger.error('Azure OpenAI embeddings generation failed', { error });
      throw error;
    }
  }
}

