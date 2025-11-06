"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCP = void 0;
const bullmq_1 = require("bullmq");
const utils_1 = require("@aura/utils");
class MCP {
    redisConnection;
    queueName;
    queue;
    worker;
    queueEvents;
    tools = new Map();
    logger = (0, utils_1.createLogger)();
    constructor(redisConnection, queueName = 'mcp-tasks') {
        this.redisConnection = redisConnection;
        this.queueName = queueName;
        this.queue = new bullmq_1.Queue(queueName, { connection: redisConnection });
        this.queueEvents = new bullmq_1.QueueEvents(queueName, { connection: redisConnection });
    }
    registerTool(tool) {
        this.tools.set(tool.name, tool);
        this.logger.info(`Registered MCP tool: ${tool.name}`);
    }
    async processMessage(message) {
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
    async startWorker() {
        this.worker = new bullmq_1.Worker(this.queueName, async (job) => {
            const { message, tools } = job.data;
            if (message.toolCalls && message.toolCalls.length > 0) {
                const toolResults = await Promise.all(message.toolCalls.map(async (toolCall) => {
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
                    }
                    catch (error) {
                        this.logger.error(`Error executing tool ${toolCall.name}`, { error });
                        return {
                            toolCallId: toolCall.id,
                            name: toolCall.name,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        };
                    }
                }));
                return {
                    id: `response-${Date.now()}`,
                    role: 'assistant',
                    content: JSON.stringify(toolResults),
                    timestamp: new Date(),
                };
            }
            return message;
        }, { connection: this.redisConnection });
        this.worker.on('completed', (job) => {
            this.logger.info(`MCP job ${job.id} completed`);
        });
        this.worker.on('failed', (job, err) => {
            this.logger.error(`MCP job ${job?.id} failed`, { error: err });
        });
    }
    async stopWorker() {
        if (this.worker) {
            await this.worker.close();
        }
    }
}
exports.MCP = MCP;
