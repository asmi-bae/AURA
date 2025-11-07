/**
 * WebSocket Channel
 * 
 * WebSocket messaging channel
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createLogger } from '@aura/utils';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface WebSocketChannelConfig {
  port?: number;
  cors?: {
    origin: string | string[];
    credentials: boolean;
  };
}

export interface Message {
  id: string;
  channel: string;
  userId?: string;
  content: any;
  timestamp: Date;
}

/**
 * WebSocket Channel
 */
export class WebSocketChannel extends EventEmitter {
  private io: SocketIOServer | null = null;
  private config: WebSocketChannelConfig;
  private connectedClients: Map<string, Socket> = new Map();

  constructor(config: WebSocketChannelConfig = {}) {
    super();
    this.config = {
      cors: {
        origin: '*',
        credentials: false,
      },
      ...config,
    };
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: this.config.cors,
    });

    this.io.on('connection', (socket: Socket) => {
      const clientId = socket.id;
      this.connectedClients.set(clientId, socket);
      
      logger.info('WebSocket client connected', { clientId });

      socket.on('message', (data: any) => {
        const message: Message = {
          id: `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
          channel: data.channel || 'default',
          userId: (socket as any).userId,
          content: data,
          timestamp: new Date(),
        };

        this.emit('message', message);
        this.emit(`message:${message.channel}`, message);
      });

      socket.on('join', (channel: string) => {
        socket.join(channel);
        logger.info('Client joined channel', { clientId, channel });
        this.emit('join', { clientId, channel });
      });

      socket.on('leave', (channel: string) => {
        socket.leave(channel);
        logger.info('Client left channel', { clientId, channel });
        this.emit('leave', { clientId, channel });
      });

      socket.on('disconnect', () => {
        this.connectedClients.delete(clientId);
        logger.info('WebSocket client disconnected', { clientId });
        this.emit('disconnect', { clientId });
      });
    });

    logger.info('WebSocket channel initialized');
  }

  /**
   * Send message to channel
   */
  sendToChannel(channel: string, message: any): void {
    if (!this.io) {
      throw new Error('WebSocket server not initialized');
    }

    this.io.to(channel).emit('message', message);
    logger.debug('Message sent to channel', { channel });
  }

  /**
   * Send message to client
   */
  sendToClient(clientId: string, message: any): void {
    const socket = this.connectedClients.get(clientId);
    if (socket) {
      socket.emit('message', message);
      logger.debug('Message sent to client', { clientId });
    }
  }

  /**
   * Broadcast message to all clients
   */
  broadcast(message: any): void {
    if (!this.io) {
      throw new Error('WebSocket server not initialized');
    }

    this.io.emit('message', message);
    logger.debug('Message broadcasted to all clients');
  }

  /**
   * Get connected clients count
   */
  getConnectedCount(): number {
    return this.connectedClients.size;
  }
}
