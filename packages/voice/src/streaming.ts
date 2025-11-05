import { createLogger } from '@aura/utils';
import { VoiceStreamOptions, AudioConfig } from './types';
import { Device } from 'mediasoup-client';

export class VoiceStreamManager {
  private logger = createLogger();
  private devices: Map<string, Device> = new Map();

  async createStream(streamId: string, options: VoiceStreamOptions): Promise<MediaStream> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: options.audioConfig.sampleRate || 48000,
          channelCount: options.audioConfig.channels || 1,
        },
        video: false,
      });

      // Process audio chunks
      if (options.onChunk) {
        const audioContext = new AudioContext({ sampleRate: options.audioConfig.sampleRate || 48000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
          const inputData = e.inputBuffer.getChannelData(0);
          const buffer = Buffer.from(new Float32Array(inputData).buffer);
          options.onChunk?.(buffer);
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      }

      return stream;
    } catch (error) {
      this.logger.error('Error creating voice stream', { error, streamId });
      throw error;
    }
  }

  async createWebRTCConnection(streamId: string, signalingUrl: string): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // Handle WebRTC events
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // Send candidate to signaling server
        this.logger.debug('ICE candidate', { streamId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      this.logger.info('WebRTC connection state changed', { streamId, state: pc.connectionState });
    };

    return pc;
  }

  stopStream(streamId: string): void {
    const device = this.devices.get(streamId);
    if (device) {
      device.close();
      this.devices.delete(streamId);
    }
  }
}

