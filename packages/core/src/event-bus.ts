import { EventEmitter } from 'events';
import Redis from 'ioredis';
import { createLogger } from '@aura/utils';

export interface EventBusConfig {
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
  useRedis?: boolean;
}

export class EventBus extends EventEmitter {
  private redis?: Redis;
  private subscriber?: Redis;
  private logger = createLogger();
  private useRedis: boolean;

  constructor(config: EventBusConfig = {}) {
    super();
    this.useRedis = config.useRedis ?? true;

    if (this.useRedis && config.redis) {
      this.redis = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
      });

      this.subscriber = this.redis.duplicate();

      this.subscriber.on('message', (channel: string, message: string) => {
        try {
          const { event, data } = JSON.parse(message);
          super.emit(event, data);
        } catch (error) {
          this.logger.error('Error parsing event message', { error, channel });
        }
      });

      this.subscriber.on('error', (error) => {
        this.logger.error('Redis subscriber error', { error });
      });
    }
  }

  async publish(event: string, data: any): Promise<void> {
    if (this.useRedis && this.redis) {
      try {
        await this.redis.publish('aura-events', JSON.stringify({ event, data }));
      } catch (error) {
        this.logger.error('Error publishing event to Redis', { error, event });
        // Fallback to local emit
        super.emit(event, data);
      }
    } else {
      // Local emit only
      super.emit(event, data);
    }
  }

  async subscribe(channel: string = 'aura-events'): Promise<void> {
    if (this.useRedis && this.subscriber) {
      await this.subscriber.subscribe(channel);
      this.logger.info(`Subscribed to channel: ${channel}`);
    }
  }

  async unsubscribe(channel: string): Promise<void> {
    if (this.useRedis && this.subscriber) {
      await this.subscriber.unsubscribe(channel);
      this.logger.info(`Unsubscribed from channel: ${channel}`);
    }
  }

  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }
}

