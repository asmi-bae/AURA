import OpenAI from 'openai';
import { createLogger } from '@aura/utils';
import { TTSOptions } from './types';

export interface TTSProvider {
  synthesize(text: string, options?: TTSOptions): Promise<Buffer>;
  synthesizeStream?(text: string, options?: TTSOptions): AsyncGenerator<Buffer>;
}

export class ElevenLabsTTS implements TTSProvider {
  private apiKey: string;
  private logger = createLogger();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<Buffer> {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + (options.voice || 'default'), {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: options.speed || 1.0,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS error: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      this.logger.error('Error synthesizing speech with ElevenLabs', { error });
      throw error;
    }
  }

  async *synthesizeStream(text: string, options: TTSOptions = {}): AsyncGenerator<Buffer> {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + (options.voice || 'default') + '/stream', {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            speed: options.speed || 1.0,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs TTS stream error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        yield Buffer.from(value);
      }
    } catch (error) {
      this.logger.error('Error streaming TTS with ElevenLabs', { error });
      throw error;
    }
  }
}

export class GoogleCloudTTS implements TTSProvider {
  private client: any;
  private logger = createLogger();

  constructor(serviceAccountPath: string) {
    // Google Cloud TTS client initialization
    // const textToSpeech = require('@google-cloud/text-to-speech');
    // this.client = new textToSpeech.TextToSpeechClient({
    //   keyFilename: serviceAccountPath,
    // });
    this.logger.warn('Google Cloud TTS not fully implemented - requires service account');
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<Buffer> {
    // Google Cloud TTS implementation would go here
    throw new Error('Google Cloud TTS not fully implemented');
  }
}

export class OpenAITTS implements TTSProvider {
  private openai: OpenAI;
  private logger = createLogger();

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async synthesize(text: string, options: TTSOptions = {}): Promise<Buffer> {
    try {
      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: (options.voice as any) || 'alloy',
        input: text,
        speed: options.speed || 1.0,
        response_format: options.format || 'mp3',
      });

      const buffer = Buffer.from(await response.arrayBuffer());
      return buffer;
    } catch (error) {
      this.logger.error('Error synthesizing speech with OpenAI', { error });
      throw error;
    }
  }
}

export class TTSService {
  private provider: TTSProvider;
  private logger = createLogger();

  constructor(
    provider: 'elevenlabs' | 'google' | 'openai',
    config: { apiKey?: string; serviceAccountPath?: string }
  ) {
    if (provider === 'elevenlabs') {
      if (!config.apiKey) {
        throw new Error('API key required for ElevenLabs TTS');
      }
      this.provider = new ElevenLabsTTS(config.apiKey);
    } else if (provider === 'google') {
      if (!config.serviceAccountPath) {
        throw new Error('Service account path required for Google Cloud TTS');
      }
      this.provider = new GoogleCloudTTS(config.serviceAccountPath);
    } else if (provider === 'openai') {
      if (!config.apiKey) {
        throw new Error('API key required for OpenAI TTS');
      }
      this.provider = new OpenAITTS(config.apiKey);
    } else {
      throw new Error(`Unsupported TTS provider: ${provider}`);
    }
  }

  async synthesize(text: string, options?: TTSOptions): Promise<Buffer> {
    return this.provider.synthesize(text, options);
  }

  async *synthesizeStream(text: string, options?: TTSOptions): AsyncGenerator<Buffer> {
    if (!this.provider.synthesizeStream) {
      // Fallback to non-streaming
      const audio = await this.provider.synthesize(text, options);
      yield audio;
      return;
    }
    yield* this.provider.synthesizeStream(text, options);
  }
}

