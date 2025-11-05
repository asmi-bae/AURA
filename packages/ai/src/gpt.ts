import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/src/resources/chat/completions';
import { createLogger } from '@aura/utils';

export interface GPTConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export class GPTIntegration {
  private openai: OpenAI;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private logger = createLogger();

  constructor(config: GPTConfig) {
    this.openai = new OpenAI({ apiKey: config.apiKey });
    this.defaultModel = config.model || 'gpt-4-turbo-preview';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 2000;
  }

  async chatCompletion(
    messages: ChatCompletionMessageParam[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature ?? this.defaultTemperature,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        stream: options?.stream || false,
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('Error in GPT chat completion', { error });
      throw error;
    }
  }

  async functionCalling(
    messages: ChatCompletionMessageParam[],
    functions: FunctionDefinition[],
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<Array<{ name: string; arguments: Record<string, any> }> | null> {
    try {
      const response = await this.openai.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature ?? this.defaultTemperature,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        tools: functions.map(fn => ({
          type: 'function' as const,
          function: fn,
        })),
        tool_choice: 'auto',
      });

      const toolCalls = response.choices[0].message.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        return null;
      }

      return toolCalls.map((toolCall) => ({
        name: toolCall.function.name,
        arguments: JSON.parse(toolCall.function.arguments),
      }));
    } catch (error) {
      this.logger.error('Error in GPT function calling', { error });
      throw error;
    }
  }

  async streamChatCompletion(
    messages: ChatCompletionMessageParam[],
    onChunk: (chunk: string) => void,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<void> {
    try {
      const stream = await this.openai.chat.completions.create({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature ?? this.defaultTemperature,
        max_tokens: options?.maxTokens ?? this.defaultMaxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          onChunk(content);
        }
      }
    } catch (error) {
      this.logger.error('Error in GPT stream chat completion', { error });
      throw error;
    }
  }
}
