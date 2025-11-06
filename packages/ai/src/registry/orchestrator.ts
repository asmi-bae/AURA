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

import { ModelRegistry } from './model-registry';
import { createLogger } from '@aura/utils';
import { ModelProvider } from '../types';
import { GPTService } from '../models/gpt';
import { ClaudeService } from '../models/claude';
import { GeminiService } from '../models/gemini';
import { OllamaService } from '../models/ollama';

const logger = createLogger();

/**
 * Agent configuration
 */
export interface AgentConfig {
  provider: ModelProvider | 'local';
  modelId?: string; // Specific model ID, or use provider
  role: string;
  priority?: number;
}

/**
 * Coordination result
 */
export interface CoordinationResult {
  provider: string;
  role: string;
  response?: string;
  error?: string;
  timestamp: Date;
  duration?: number;
}

/**
 * Multi-Agent Orchestrator
 * 
 * Coordinates multiple AI agents to work together on tasks.
 */
export class MultiAgentOrchestrator {
  private registry: ModelRegistry;
  private logger = createLogger();
  private contextMemory: Map<string, Array<{ role: 'user' | 'assistant'; content: string }>> = new Map();
  private maxMemorySize: number = 10; // Keep last 10 messages per agent

  constructor(registry: ModelRegistry) {
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
  async coordinateTask(
    task: string,
    context: Record<string, any>,
    agents: AgentConfig[]
  ): Promise<Record<string, CoordinationResult>> {
    const results: Record<string, CoordinationResult> = {};

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
            role: 'user' as const,
            content: `Task: ${task}\nContext: ${JSON.stringify(agentContext, null, 2)}`,
          },
        ];

        // Call appropriate model based on type
        let response: string;
        if (model instanceof GPTService) {
          response = await model.chatCompletion(messages);
        } else if (model instanceof ClaudeService) {
          response = await model.chatCompletion(messages);
        } else if (model instanceof GeminiService) {
          response = await model.chatCompletion(messages);
        } else if (model instanceof OllamaService) {
          response = await model.chatCompletion(messages);
        } else {
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
        previousMemory.push(
          { role: 'user', content: messages[messages.length - 1].content },
          { role: 'assistant', content: response }
        );
        // Keep only last N messages
        this.contextMemory.set(memoryKey, previousMemory.slice(-this.maxMemorySize));

        this.logger.debug('Agent coordination successful', {
          provider: agent.provider,
          role: agent.role,
          duration,
        });
      } catch (error) {
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
  clearAgentMemory(provider?: string, role?: string): void {
    if (provider && role) {
      const key = `${provider}:${role}`;
      this.contextMemory.delete(key);
      this.logger.info('Agent memory cleared', { provider, role });
    } else {
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
  getAgentMemory(provider: string, role: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    const key = `${provider}:${role}`;
    return this.contextMemory.get(key) || [];
  }

  /**
   * Set maximum memory size per agent
   * 
   * @param size - Maximum number of messages to keep
   */
  setMaxMemorySize(size: number): void {
    this.maxMemorySize = size;
    this.logger.info('Max memory size updated', { size });
  }
}

