/**
 * Anthropic Claude Integration
 * 
 * Service for interacting with Anthropic's Claude models (Claude 3.5 Sonnet, Claude 3 Opus, etc.)
 * Supports chat completions, system prompts, and streaming responses.
 * 
 * Features:
 * - Long context window (up to 200K tokens)
 * - System prompts for better control
 * - Streaming responses
 * - Strong reasoning capabilities
 * 
 * @module @aura/ai/models/claude
 */

import Anthropic from '@anthropic-ai/sdk';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Configuration for Claude integration
 */
export interface ClaudeConfig {
  /** Anthropic API key */
  apiKey: string;
  /** Default model to use */
  model?: string;
  /** Default maximum tokens */
  maxTokens?: number;
  /** Default temperature (0-1) */
  temperature?: number;
  /** Base URL for API */
  baseURL?: string;
}

/**
 * Anthropic Claude Integration Service
 * 
 * Provides methods for interacting with Anthropic's Claude models.
 */
export class ClaudeService {
  private client: Anthropic;
  private defaultModel: string;
  private defaultMaxTokens: number;
  private defaultTemperature: number;

  constructor(config: ClaudeConfig) {
    if (!config.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });

    this.defaultModel = config.model || 'claude-3-5-sonnet-20241022';
    this.defaultMaxTokens = config.maxTokens ?? 4096;
    this.defaultTemperature = config.temperature ?? 0.7;

    logger.info('Claude service initialized', {
      model: this.defaultModel,
    });
  }

  /**
   * Generate chat completion
   * 
   * @param messages - Conversation messages
   * @param options - Optional configuration including system prompt
   * @returns Generated text response
   */
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

      const content = response.content[0];
      if (!content || content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      logger.debug('Claude chat completion successful', {
        model: options?.model || this.defaultModel,
        usage: response.usage,
      });

      return 'text' in content ? content.text : '';
    } catch (error) {
      logger.error('Error in Claude chat completion', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: options?.model || this.defaultModel,
      });
      throw error;
    }
  }

  /**
   * Stream chat completion for real-time responses
   * 
   * @param messages - Conversation messages
   * @param onChunk - Callback for each chunk
   * @param options - Optional configuration
   */
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

      logger.debug('Claude stream completion finished');
    } catch (error) {
      logger.error('Error in Claude stream chat completion', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get available Claude models
   */
  static getAvailableModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-sonnet-20240620',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ];
  }
}

