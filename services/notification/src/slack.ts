import { WebClient } from '@slack/web-api';
import { createLogger } from '@aura/utils';

export class SlackNotifier {
  private client: WebClient;
  private logger = createLogger();

  constructor(token: string) {
    this.client = new WebClient(token);
  }

  async send(channel: string, message: string, options?: { blocks?: any[]; threadTs?: string }) {
    try {
      const result = await this.client.chat.postMessage({
        channel,
        text: message,
        blocks: options?.blocks,
        thread_ts: options?.threadTs,
      });

      return { success: true, ts: result.ts, channel: result.channel };
    } catch (error) {
      this.logger.error('Error sending Slack notification', { error, channel });
      throw error;
    }
  }

  async sendDM(userId: string, message: string, options?: { blocks?: any[] }) {
    try {
      const result = await this.client.chat.postMessage({
        channel: userId,
        text: message,
        blocks: options?.blocks,
      });

      return { success: true, ts: result.ts };
    } catch (error) {
      this.logger.error('Error sending Slack DM', { error, userId });
      throw error;
    }
  }
}

