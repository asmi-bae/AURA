/**
 * Agent Manager
 * 
 * High-level manager for agent operations
 */

import { AgentRegistry } from './agent-registry';
import { AgentCore, AgentConfig, AgentType } from '@aura/agent';
import { createLogger } from '@aura/utils';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface AgentManagerConfig {
  maxAgents?: number;
  defaultConfig?: Partial<AgentConfig>;
  autoStart?: boolean;
}

export interface CreateAgentRequest {
  name?: string;
  type: AgentType;
  config?: Partial<AgentConfig>;
  userId?: string;
}

/**
 * Agent Manager
 */
export class AgentManager extends EventEmitter {
  private registry: AgentRegistry;
  private config: Required<AgentManagerConfig>;

  constructor(config: AgentManagerConfig = {}) {
    super();
    this.registry = new AgentRegistry();
    this.config = {
      maxAgents: config.maxAgents || 100,
      defaultConfig: config.defaultConfig || {},
      autoStart: config.autoStart ?? false,
    };

    // Forward registry events
    this.registry.on('agentRegistered', (agentId: string) => {
      this.emit('agentRegistered', agentId);
    });

    this.registry.on('agentUnregistered', (agentId: string) => {
      this.emit('agentUnregistered', agentId);
    });

    this.registry.on('agentStatusChange', (agentId: string, status: any) => {
      this.emit('agentStatusChange', agentId, status);
    });

    this.registry.on('agentError', (agentId: string, error: Error) => {
      this.emit('agentError', agentId, error);
    });
  }

  /**
   * Create a new agent
   */
  async createAgent(request: CreateAgentRequest): Promise<string> {
    // Check agent limit
    if (this.registry.getCount() >= this.config.maxAgents) {
      throw new Error(`Maximum number of agents (${this.config.maxAgents}) reached`);
    }

    // Generate agent ID
    const agentId = this.generateAgentId();

    // Merge config
    const agentConfig: AgentConfig = {
      agentId,
      agentType: request.type,
      userId: request.userId || 'system',
      capabilities: {
        automation: false,
        screenCapture: false,
        mouseControl: false,
      },
      ...this.config.defaultConfig,
      ...request.config,
    } as AgentConfig;

    try {
      // Register agent
      await this.registry.register(agentId, agentConfig, request.name);

      // Auto-start if configured
      if (this.config.autoStart) {
        await this.registry.start(agentId);
      }

      logger.info(`Agent created`, { agentId, type: request.type });
      return agentId;
    } catch (error) {
      logger.error(`Failed to create agent`, { agentId, error });
      throw error;
    }
  }

  /**
   * Delete an agent
   */
  async deleteAgent(agentId: string): Promise<void> {
    await this.registry.unregister(agentId);
    logger.info(`Agent deleted`, { agentId });
  }

  /**
   * Start an agent
   */
  async startAgent(agentId: string): Promise<void> {
    await this.registry.start(agentId);
  }

  /**
   * Stop an agent
   */
  async stopAgent(agentId: string): Promise<void> {
    await this.registry.stop(agentId);
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentCore | undefined {
    return this.registry.get(agentId);
  }

  /**
   * Get agent info
   */
  getAgentInfo(agentId: string) {
    return this.registry.getInfo(agentId);
  }

  /**
   * List all agents
   */
  listAgents() {
    return this.registry.list();
  }

  /**
   * Execute a task on an agent
   */
  async executeTask(agentId: string, task: string, input?: any): Promise<any> {
    const agent = this.registry.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      // Use thinking engine to execute task
      if (!agent['thinkingEngine']) {
        throw new Error('Agent thinking engine not initialized');
      }
      const result = await (agent as any).thinkingEngine.executeTask(task, input || {});
      logger.info(`Task executed`, { agentId, task });
      return result;
    } catch (error) {
      logger.error(`Task execution failed`, { agentId, task, error });
      throw error;
    }
  }

  /**
   * Get agent statistics
   */
  getStatistics() {
    const agents = this.registry.list();
    const stats = {
      total: agents.length,
      running: agents.filter(a => a.status.state === 'running').length,
      stopped: agents.filter(a => a.status.state === 'stopped').length,
      error: agents.filter(a => a.status.state === 'error').length,
      byType: {} as Record<string, number>,
    };

    agents.forEach(agent => {
      const type = agent.config.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Generate unique agent ID
   */
  private generateAgentId(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get registry
   */
  getRegistry(): AgentRegistry {
    return this.registry;
  }
}
