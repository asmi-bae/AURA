import { Queue, Worker, QueueEvents } from 'bullmq';
import { createLogger } from '@aura/utils';

export interface MCPMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: MCPToolCall[];
  timestamp: Date;
}

export interface MCPToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: Record<string, any>) => Promise<any>;
}

export class MCP {
  private queue: Queue;
  private worker?: Worker;
  private queueEvents?: QueueEvents;
  private tools: Map<string, MCPTool> = new Map();
  private logger = createLogger();

  constructor(private redisConnection: any, private queueName: string = 'mcp-tasks') {
    this.queue = new Queue(queueName, { connection: redisConnection });
    this.queueEvents = new QueueEvents(queueName, { connection: redisConnection });
  }

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    this.logger.info(`Registered MCP tool: ${tool.name}`);
  }

  async processMessage(message: MCPMessage): Promise<MCPMessage> {
    const job = await this.queue.add('process', {
      message,
      tools: Array.from(this.tools.entries()).map(([name, tool]) => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    });

    if (!this.worker || !this.queueEvents) {
      throw new Error('Worker or QueueEvents not initialized');
    }
    await this.worker.waitUntilReady();
    const result = await job.waitUntilFinished(this.queueEvents);
    return result;
  }

  async startWorker(): Promise<void> {
    this.worker = new Worker(
      this.queueName,
      async (job) => {
        const { message, tools } = job.data;

        if (message.toolCalls && message.toolCalls.length > 0) {
          const toolResults = await Promise.all(
            message.toolCalls.map(async (toolCall: MCPToolCall) => {
              const tool = this.tools.get(toolCall.name);
              if (!tool) {
                throw new Error(`Tool ${toolCall.name} not found`);
              }

              try {
                const result = await tool.execute(toolCall.arguments);
                return {
                  toolCallId: toolCall.id,
                  name: toolCall.name,
                  result,
                };
              } catch (error) {
                this.logger.error(`Error executing tool ${toolCall.name}`, { error });
                return {
                  toolCallId: toolCall.id,
                  name: toolCall.name,
                  error: error instanceof Error ? error.message : 'Unknown error',
                };
              }
            })
          );

          return {
            id: `response-${Date.now()}`,
            role: 'assistant' as const,
            content: JSON.stringify(toolResults),
            timestamp: new Date(),
          };
        }

        return message;
      },
      { connection: this.redisConnection }
    );

    this.worker.on('completed', (job) => {
      this.logger.info(`MCP job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`MCP job ${job?.id} failed`, { error: err });
    });
  }

  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
  }
}
