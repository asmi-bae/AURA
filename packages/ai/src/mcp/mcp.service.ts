/**
 * MCP (Model Context Protocol) Service
 * 
 * Service for implementing Model Context Protocol for tool calling and function execution.
 * Enables AI models to interact with external tools and APIs.
 * 
 * Features:
 * - Tool registration and management
 * - Tool execution with error handling
 * - Queue-based tool processing
 * - Tool result aggregation
 * 
 * @module @aura/ai/mcp
 */

import { Queue, Worker } from 'bullmq';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * MCP Message interface
 */
export interface MCPMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: MCPToolCall[];
  timestamp: Date;
}

/**
 * MCP Tool Call interface
 */
export interface MCPToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

/**
 * MCP Tool definition
 */
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

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  toolCallId: string;
  name: string;
  result?: any;
  error?: string;
}

/**
 * MCP Service
 * 
 * Manages tool registration and execution for AI models.
 */
export class MCPService {
  private queue: Queue;
  private worker?: Worker;
  private tools: Map<string, MCPTool> = new Map();
  private logger = createLogger();

  constructor(
    private redisConnection: any,
    private queueName: string = 'mcp-tasks'
  ) {
    this.queue = new Queue(queueName, {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    });

    this.logger.info('MCP service initialized', { queueName: this.queueName });
  }

  /**
   * Register a tool for use by AI models
   * 
   * @param tool - Tool definition
   */
  registerTool(tool: MCPTool): void {
    if (this.tools.has(tool.name)) {
      this.logger.warn(`Tool ${tool.name} already registered, overwriting`);
    }

    this.tools.set(tool.name, tool);
    this.logger.info(`MCP tool registered: ${tool.name}`, {
      description: tool.description,
      parameters: Object.keys(tool.parameters.properties || {}),
    });
  }

  /**
   * Register multiple tools
   * 
   * @param tools - Array of tool definitions
   */
  registerTools(tools: MCPTool[]): void {
    for (const tool of tools) {
      this.registerTool(tool);
    }
  }

  /**
   * Get tool definition
   * 
   * @param name - Tool name
   * @returns Tool definition or undefined
   */
  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   * 
   * @returns Array of tool definitions
   */
  getAllTools(): Array<{
    name: string;
    description: string;
    parameters: MCPTool['parameters'];
  }> {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  /**
   * Process an MCP message with tool calls
   * 
   * @param message - MCP message with tool calls
   * @returns Response message with tool results
   */
  async processMessage(message: MCPMessage): Promise<MCPMessage> {
    try {
      const job = await this.queue.add(
        'process',
        {
          message,
          tools: this.getAllTools(),
        },
        {
          jobId: `mcp-${message.id}-${Date.now()}`,
        }
      );

      const result = await job.waitUntilFinished(
        this.worker?.waitUntilReady() || Promise.resolve()
      );

      return result;
    } catch (error) {
      this.logger.error('Error processing MCP message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId: message.id,
      });
      throw error;
    }
  }

  /**
   * Execute a tool directly
   * 
   * @param toolName - Name of the tool to execute
   * @param args - Tool arguments
   * @returns Tool execution result
   */
  async executeTool(toolName: string, args: Record<string, any>): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    try {
      this.logger.debug('Executing tool', { toolName, args });
      const result = await tool.execute(args);
      this.logger.debug('Tool execution successful', { toolName });
      return result;
    } catch (error) {
      this.logger.error('Error executing tool', {
        error: error instanceof Error ? error.message : 'Unknown error',
        toolName,
        args,
      });
      throw error;
    }
  }

  /**
   * Start the MCP worker
   */
  async startWorker(): Promise<void> {
    if (this.worker) {
      this.logger.warn('MCP worker already started');
      return;
    }

    this.worker = new Worker(
      this.queueName,
      async (job) => {
        const { message } = job.data;

        if (message.toolCalls && message.toolCalls.length > 0) {
          // Execute all tool calls in parallel
          const toolResults = await Promise.allSettled(
            message.toolCalls.map(async (toolCall: MCPToolCall) => {
              return await this.executeTool(toolCall.name, toolCall.arguments);
            })
          );

          // Format results
          const results: ToolExecutionResult[] = toolResults.map((result, index) => {
            const toolCall = message.toolCalls![index];
            if (result.status === 'fulfilled') {
              return {
                toolCallId: toolCall.id,
                name: toolCall.name,
                result: result.value,
              };
            } else {
              return {
                toolCallId: toolCall.id,
                name: toolCall.name,
                error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
              };
            }
          });

          return {
            id: `response-${Date.now()}`,
            role: 'assistant' as const,
            content: JSON.stringify(results),
            timestamp: new Date(),
          };
        }

        // No tool calls, return original message
        return message;
      },
      {
        connection: this.redisConnection,
        concurrency: 5, // Process up to 5 tool calls concurrently
      }
    );

    this.worker.on('completed', (job) => {
      this.logger.info(`MCP job completed`, { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      this.logger.error(`MCP job failed`, {
        jobId: job?.id,
        error: err.message,
      });
    });

    this.logger.info('MCP worker started');
  }

  /**
   * Stop the MCP worker
   */
  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = undefined;
      this.logger.info('MCP worker stopped');
    }
  }

  /**
   * Unregister a tool
   * 
   * @param name - Tool name to unregister
   */
  unregisterTool(name: string): void {
    if (this.tools.delete(name)) {
      this.logger.info(`MCP tool unregistered: ${name}`);
    }
  }

  /**
   * Clear all registered tools
   */
  clearTools(): void {
    this.tools.clear();
    this.logger.info('All MCP tools cleared');
  }
}

