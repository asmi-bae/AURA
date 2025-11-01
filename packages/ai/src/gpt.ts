import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/src/resources/chat/completions';

export class GPTIntegration {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async chatCompletion(messages: ChatCompletionMessageParam[], model: string = 'gpt-4-turbo') {
    const response = await this.openai.chat.completions.create({
      model,
      messages,
    });
    return response.choices[0].message.content;
  }

  async functionCalling(
    messages: ChatCompletionMessageParam[],
    functions: any[],
    model: string = 'gpt-4-turbo'
  ) {
    const response = await this.openai.chat.completions.create({
      model,
      messages,
      tools: functions.map(fn => ({
        type: 'function',
        function: fn,
      })),
    });

    const toolCalls = response.choices[0].message.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return null;
    }

    return toolCalls.map((toolCall: any) => ({
      name: toolCall.function.name,
      arguments: JSON.parse(toolCall.function.arguments),
    }));
  }
}
