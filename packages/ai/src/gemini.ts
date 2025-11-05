import { GoogleGenerativeAI } from '@google/generative-ai';
import { createLogger } from '@aura/utils';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class GeminiIntegration {
  private client: GoogleGenerativeAI;
  private defaultModel: string;
  private defaultTemperature: number;
  private defaultMaxTokens: number;
  private logger = createLogger();

  constructor(config: GeminiConfig) {
    this.client = new GoogleGenerativeAI(config.apiKey);
    this.defaultModel = config.model || 'gemini-1.5-pro';
    this.defaultTemperature = config.temperature ?? 0.7;
    this.defaultMaxTokens = config.maxTokens ?? 2048;
  }

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
      return response.text();
    } catch (error) {
      this.logger.error('Error in Gemini chat completion', { error });
      throw error;
    }
  }

  async chatWithImage(
    text: string,
    image: Buffer | string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
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

      const imagePart = Buffer.isBuffer(image)
        ? {
            inlineData: {
              data: image.toString('base64'),
              mimeType: 'image/png',
            },
          }
        : {
            inlineData: {
              data: image,
              mimeType: 'image/png',
            },
          };

      const result = await model.generateContent([text, imagePart]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error('Error in Gemini vision chat', { error });
      throw error;
    }
  }
}

