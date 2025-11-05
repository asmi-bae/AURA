import { createLogger } from '@aura/utils';

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  temperature?: number;
}

export class OllamaIntegration {
  private baseUrl: string;
  private defaultModel: string;
  private defaultTemperature: number;
  private logger = createLogger();

  constructor(config: OllamaConfig = {}) {
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.defaultModel = config.model || 'llama2';
    this.defaultTemperature = config.temperature ?? 0.7;
  }

  async chatCompletion(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      stream?: boolean;
    }
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || this.defaultModel,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          options: {
            temperature: options?.temperature ?? this.defaultTemperature,
          },
          stream: options?.stream || false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message?.content || '';
    } catch (error) {
      this.logger.error('Error in Ollama chat completion', { error });
      throw error;
    }
  }

  async streamChatCompletion(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (chunk: string) => void,
    options?: {
      model?: string;
      temperature?: number;
    }
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: options?.model || this.defaultModel,
          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
          options: {
            temperature: options?.temperature ?? this.defaultTemperature,
          },
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader');
      }

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              onChunk(data.message.content);
            }
          } catch {
            // Ignore invalid JSON
          }
        }
      }
    } catch (error) {
      this.logger.error('Error in Ollama stream chat completion', { error });
      throw error;
    }
  }
}

