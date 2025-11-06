"use strict";
/**
 * Multi-Agent Orchestrator
 *
 * Coordinates multiple AI agents to work together on complex tasks.
 * Manages context memory, task distribution, and result aggregation.
 *
 * Features:
 * - Multi-agent coordination
 * - Context memory management
 * - Task distribution
 * - Result aggregation
 *
 * @module @aura/ai/registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAgentOrchestrator = void 0;
const utils_1 = require("@aura/utils");
const gpt_1 = require("../models/gpt");
const claude_1 = require("../models/claude");
const gemini_1 = require("../models/gemini");
const ollama_1 = require("../models/ollama");
const logger = (0, utils_1.createLogger)();
/**
 * Multi-Agent Orchestrator
 *
 * Coordinates multiple AI agents to work together on tasks.
 */
class MultiAgentOrchestrator {
    registry;
    logger = (0, utils_1.createLogger)();
    contextMemory = new Map();
    maxMemorySize = 10; // Keep last 10 messages per agent
    constructor(registry) {
        this.registry = registry;
        this.logger.info('Multi-agent orchestrator initialized');
    }
    /**
     * Coordinate multiple agents on a task
     *
     * @param task - Task description
     * @param context - Task context
     * @param agents - Array of agents to coordinate
     * @returns Results from all agents
     */
    async coordinateTask(task, context, agents) {
        const results = {};
        // Execute agents in sequence (can be parallelized if needed)
        for (const agent of agents) {
            const startTime = Date.now();
            try {
                // Get model by ID if specified, otherwise by provider
                const model = agent.modelId
                    ? this.registry.getModel(agent.modelId)
                    : this.registry.getModel(agent.provider);
                const agentContext = {
                    ...context,
                    role: agent.role,
                    previousResults: results,
                };
                // Get context memory for this agent
                const memoryKey = `${agent.provider}:${agent.role}`;
                const previousMemory = this.contextMemory.get(memoryKey) || [];
                // Build messages with context
                const messages = [
                    ...previousMemory,
                    {
                        role: 'user',
                        content: `Task: ${task}\nContext: ${JSON.stringify(agentContext, null, 2)}`,
                    },
                ];
                // Call appropriate model based on type
                let response;
                if (model instanceof gpt_1.GPTService) {
                    response = await model.chatCompletion(messages);
                }
                else if (model instanceof claude_1.ClaudeService) {
                    response = await model.chatCompletion(messages);
                }
                else if (model instanceof gemini_1.GeminiService) {
                    response = await model.chatCompletion(messages);
                }
                else if (model instanceof ollama_1.OllamaService) {
                    response = await model.chatCompletion(messages);
                }
                else {
                    response = 'Unknown model type';
                }
                const duration = Date.now() - startTime;
                results[agent.provider] = {
                    provider: agent.provider,
                    role: agent.role,
                    response,
                    timestamp: new Date(),
                    duration,
                };
                // Update context memory
                previousMemory.push({ role: 'user', content: messages[messages.length - 1].content }, { role: 'assistant', content: response });
                // Keep only last N messages
                this.contextMemory.set(memoryKey, previousMemory.slice(-this.maxMemorySize));
                this.logger.debug('Agent coordination successful', {
                    provider: agent.provider,
                    role: agent.role,
                    duration,
                });
            }
            catch (error) {
                const duration = Date.now() - startTime;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error('Error coordinating agent task', {
                    error: errorMessage,
                    provider: agent.provider,
                    role: agent.role,
                });
                results[agent.provider] = {
                    provider: agent.provider,
                    role: agent.role,
                    error: errorMessage,
                    timestamp: new Date(),
                    duration,
                };
            }
        }
        return results;
    }
    /**
     * Clear context memory for an agent
     *
     * @param provider - Provider name
     * @param role - Agent role
     */
    clearAgentMemory(provider, role) {
        if (provider && role) {
            const key = `${provider}:${role}`;
            this.contextMemory.delete(key);
            this.logger.info('Agent memory cleared', { provider, role });
        }
        else {
            this.contextMemory.clear();
            this.logger.info('All agent memory cleared');
        }
    }
    /**
     * Get context memory for an agent
     *
     * @param provider - Provider name
     * @param role - Agent role
     * @returns Context memory
     */
    getAgentMemory(provider, role) {
        const key = `${provider}:${role}`;
        return this.contextMemory.get(key) || [];
    }
    /**
     * Set maximum memory size per agent
     *
     * @param size - Maximum number of messages to keep
     */
    setMaxMemorySize(size) {
        this.maxMemorySize = size;
        this.logger.info('Max memory size updated', { size });
    }
}
exports.MultiAgentOrchestrator = MultiAgentOrchestrator;
