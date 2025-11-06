/**
 * Google Gemini Integration
 * 
 * Service for interacting with Google's Gemini models (Gemini 1.5 Pro, Gemini 1.5 Flash, etc.)
 * Supports text, multimodal (text + image), and streaming responses.
 * 
 * Features:
 * - Multimodal support (text + images)
 * - Fast responses with Gemini Flash
 * - Long context window
 * - Vision capabilities
 * 
 * @module @aura/ai/models/gemini
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Configuration for Gemini integration
 */
export interface GeminiConfig {
  /** Google API key */
  apiKey: string;
  /** Default model to use */
  model?: string;
  /** Default temperature (0-2) */
  temperature?: number;
  /** Default maximum tokens */
  maxTokens?: number;
}

/**
 * Google Gemini Integration Service
 * 
 * Provides methods for interacting with Google's Gemini models.
 */
export class GeminiService {
  private client: GoogleGenerativeAI;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;

  constructor(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error('Google API key is required');
    }

    this.client = new GoogleGenerativeAI(config.apiKey);
    this.defaultModel = config.model || 'gemini-1.5-pro';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 2048;

    logger.info('Gemini service initialized', {
      model: this.defaultModel,
    });
  }

  /**
   * Generate chat completion
   * 
   * @param messages - Conversation messages
   * @param options - Optional configuration
   * @returns Generated text response
   */
  async chatCompletion(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    try {
      const model = this.client.getGenerativeModel({
        model: options?.model || this.defaultModel,
        generationConfig: {
          temperature: options?.temperature ?? this.defaultTemperature,
          maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
        },
      });

      // Convert messages to Gemini format
      const chat = model.startChat({
        history: messages
          .filter(msg => msg.role === 'assistant')
          .map(msg => ({
            role: 'model',
            parts: [{ text: msg.content }],
          })),
      });

      const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()?.content || '';
      const result = await chat.sendMessage(lastUserMessage);
      const response = await result.response;
      const text = response.text();

      logger.debug('Gemini chat completion successful', {
        model: options?.model || this.defaultModel,
      });

      return text;
    } catch (error) {
      logger.error('Error in Gemini chat completion', {
        error: error instanceof Error ? error.message : 'Unknown error',
        model: options?.model || this.defaultModel,
      });
      throw error;
    }
  }

  /**
   * Chat with image (multimodal)
   * 
   * @param text - Text prompt
   * @param image - Image as Buffer or base64 string
   * @param options - Optional configuration
   * @returns Generated text response
   */
  async chatWithImage(
    text: string,
    image: Buffer | string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      mimeType?: string;
    }
  ): Promise<string> {
    try {
      const model = this.client.getGenerativeModel({
        model: options?.model || 'gemini-1.5-pro-vision',
        generationConfig: {
          temperature: options?.temperature ?? this.defaultTemperature,
          maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
        },
      });

      const imageData = Buffer.isBuffer(image)
        ? image.toString('base64')
        : image;

      const imagePart = {
        inlineData: {
          data: imageData,
          mimeType: options?.mimeType || 'image/png',
        },
      };

      const result = await model.generateContent([text, imagePart]);
      const response = await result.response;
      const textResponse = response.text();

      logger.debug('Gemini vision chat successful');

      return textResponse;
    } catch (error) {
      logger.error('Error in Gemini vision chat', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Stream chat completion
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
    }
  ): Promise<void> {
    try {
      const model = this.client.getGenerativeModel({
        model: options?.model || this.defaultModel,
        generationConfig: {
          temperature: options?.temperature ?? this.defaultTemperature,
          maxOutputTokens: options?.maxTokens ?? this.defaultMaxTokens,
        },
      });

      const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()?.content || '';
      const chat = model.startChat({
        history: messages
          .filter((msg, index) => index < messages.length - 1 && msg.role === 'assistant')
          .map(msg => ({
            role: 'model',
            parts: [{ text: msg.content }],
          })),
      });

      const result = await chat.sendMessageStream(lastUserMessage);
      
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) {
          onChunk(text);
        }
      }

      logger.debug('Gemini stream completion finished');
    } catch (error) {
      logger.error('Error in Gemini stream chat completion', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get available Gemini models
   */
  static getAvailableModels(): string[] {
    return [
      'gemini-1.5-pro',
      'gemini-1.5-pro-latest',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-pro',
      'gemini-pro-vision',
    ];
  }
}

