import OpenAI from 'openai';
import { createLogger } from '@aura/utils';
import { STTOptions, TranscriptionResult, AudioConfig } from './types';

export interface STTProvider {
  transcribe(audio: Buffer, options?: STTOptions): Promise<TranscriptionResult>;
  transcribeStream?(stream: NodeJS.ReadableStream, options?: STTOptions): Promise<TranscriptionResult>;
}

export class WhisperSTT implements STTProvider {
  private openai: OpenAI;
  private logger = createLogger();

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async transcribe(audio: Buffer, options: STTOptions = {}): Promise<TranscriptionResult> {
    try {
      const file = new File([audio], 'audio.wav', { type: 'audio/wav' });
      
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: options.model || 'whisper-1',
        language: options.language,
        temperature: options.temperature,
        prompt: options.prompt,
        response_format: 'verbose_json',
      });

      return {
        text: response.text,
        language: response.language,
        segments: response.segments?.map(seg => ({
          start: seg.start,
          end: seg.end,
          text: seg.text,
          confidence: (seg as any).confidence,
        })),
        confidence: 1.0, // Whisper doesn't provide confidence scores
      };
    } catch (error) {
      this.logger.error('Error transcribing audio with Whisper', { error });
      throw error;
    }
  }
}

export class VoskSTT implements STTProvider {
  private model: any;
  private logger = createLogger();

  constructor(modelPath: string) {
    // Vosk model loading would be done here
    // const vosk = require('vosk');
    // this.model = new vosk.Model(modelPath);
    this.logger.warn('Vosk STT not fully implemented - requires model files');
  }

  async transcribe(audio: Buffer, options: STTOptions = {}): Promise<TranscriptionResult> {
    // Vosk implementation would go here
    throw new Error('Vosk STT not fully implemented');
  }
}

export class STTService {
  private provider: STTProvider;
  private logger = createLogger();

  constructor(provider: 'whisper' | 'vosk', config: { apiKey?: string; modelPath?: string }) {
    if (provider === 'whisper') {
      if (!config.apiKey) {
        throw new Error('OpenAI API key required for Whisper STT');
      }
      this.provider = new WhisperSTT(config.apiKey);
    } else if (provider === 'vosk') {
      if (!config.modelPath) {
        throw new Error('Model path required for Vosk STT');
      }
      this.provider = new VoskSTT(config.modelPath);
    } else {
      throw new Error(`Unsupported STT provider: ${provider}`);
    }
  }

  async transcribe(audio: Buffer, options?: STTOptions): Promise<TranscriptionResult> {
    return this.provider.transcribe(audio, options);
  }

  async transcribeStream(stream: NodeJS.ReadableStream, options?: STTOptions): Promise<TranscriptionResult> {
    if (!this.provider.transcribeStream) {
      // Buffer the stream and transcribe
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const audio = Buffer.concat(chunks);
      return this.transcribe(audio, options);
    }
    return this.provider.transcribeStream(stream, options);
  }
}

