import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@aura/utils';
import { FunctionDefinition } from './gpt';

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class ClaudeIntegration {
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;
  private logger = createLogger();

  constructor(config: ClaudeConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.defaultModel = config.model || 'claude-3-5-sonnet-20241022';
    this.defaultMaxTokens = config.maxTokens ?? 4096;
    this.defaultTemperature = config.temperature ?? 0.7;
  }

  async chatCompletion(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      system?: string;
    }
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: options?.model || this.defaultModel,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        temperature: options?.temperature ?? this.defaultTemperature,
        system: options?.system,
        messages: messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error) {
      this.logger.error('Error in Claude chat completion', { error });
      throw error;
    }
  }

  async streamChatCompletion(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (chunk: string) => void,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      system?: string;
    }
  ): Promise<void> {
    try {
      const stream = await this.client.messages.stream({
        model: options?.model || this.defaultModel,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        temperature: options?.temperature ?? this.defaultTemperature,
        system: options?.system,
        messages: messages.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        })),
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          onChunk(event.delta.text);
        }
      }
    } catch (error) {
      this.logger.error('Error in Claude stream chat completion', { error });
      throw error;
    }
  }
}

