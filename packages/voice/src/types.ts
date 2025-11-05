export interface AudioConfig {
  sampleRate?: number;
  channels?: number;
  format?: 'wav' | 'mp3' | 'opus' | 'pcm';
}

export interface STTOptions {
  language?: string;
  model?: string;
  temperature?: number;
  prompt?: string;
}

export interface TTSOptions {
  voice?: string;
  speed?: number;
  pitch?: number;
  format?: 'mp3' | 'wav' | 'opus';
  sampleRate?: number;
}

export interface TranscriptionResult {
  text: string;
  language?: string;
  segments?: TranscriptionSegment[];
  confidence?: number;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

export interface VoiceStreamOptions {
  audioConfig: AudioConfig;
  onChunk?: (chunk: Buffer) => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

