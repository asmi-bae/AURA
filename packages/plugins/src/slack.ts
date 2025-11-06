import { AuraPlugin } from './plugin';
import { WebClient } from '@slack/client';

export class SlackPlugin implements AuraPlugin {
  name = 'slack';
  client!: WebClient;

  async init() {
    this.client = new WebClient(process.env.SLACK_BOT_TOKEN);
  }

  async execute(params: any) {
    const { channel, message } = params;
    await this.client.chat.postMessage({
      channel,
      text: message,
    });
  }
}
