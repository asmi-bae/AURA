/**
 * Discord Channel
 * 
 * Discord messaging channel
 */

import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import { createLogger } from '@aura/utils';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface DiscordChannelConfig {
  token: string;
  guildId?: string;
}

export interface DiscordMessage {
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  timestamp: Date;
}

/**
 * Discord Channel
 */
export class DiscordChannel extends EventEmitter {
  private client: Client;
  private config: DiscordChannelConfig;
  private isConnected = false;

  constructor(config: DiscordChannelConfig) {
    super();
    this.config = config;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.client.once('ready', () => {
      this.isConnected = true;
      logger.info('Discord client ready', { 
        username: this.client.user?.username,
        guilds: this.client.guilds.cache.size,
      });
      this.emit('ready');
    });

    this.client.on('messageCreate', (message) => {
      if (message.author.bot) return;

      const discordMessage: DiscordMessage = {
        id: message.id,
        channelId: message.channel.id,
        authorId: message.author.id,
        content: message.content,
        timestamp: new Date(message.createdTimestamp),
      };

      this.emit('message', discordMessage);
    });

    this.client.on('error', (error) => {
      logger.error('Discord client error', { error });
      this.emit('error', error);
    });
  }

  /**
   * Connect to Discord
   */
  async connect(): Promise<void> {
    try {
      await this.client.login(this.config.token);
      logger.info('Discord client connected');
    } catch (error) {
      logger.error('Failed to connect to Discord', { error });
      throw error;
    }
  }

  /**
   * Disconnect from Discord
   */
  async disconnect(): Promise<void> {
    this.client.destroy();
    this.isConnected = false;
    logger.info('Discord client disconnected');
  }

  /**
   * Send message to channel
   */
  async sendToChannel(channelId: string, content: string): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Discord client not connected');
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (channel && channel.isTextBased()) {
        await (channel as TextChannel).send(content);
        logger.debug('Message sent to Discord channel', { channelId });
      }
    } catch (error) {
      logger.error('Failed to send message to Discord channel', { channelId, error });
      throw error;
    }
  }

  /**
   * Get channel
   */
  async getChannel(channelId: string): Promise<TextChannel | null> {
    if (!this.isConnected) {
      return null;
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      return channel && channel.isTextBased() ? (channel as TextChannel) : null;
    } catch (error) {
      logger.error('Failed to get Discord channel', { channelId, error });
      return null;
    }
  }
}
