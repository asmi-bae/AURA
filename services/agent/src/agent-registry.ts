/**
 * Agent Registry
 * 
 * Registry for managing agent instances
 */

import { AgentCore, AgentConfig, AgentStatus } from '@aura/agent';
import { createLogger } from '@aura/utils';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface AgentInfo {
  id: string;
  name: string;
  config: AgentConfig;
  status: AgentStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent Registry
 */
export class AgentRegistry extends EventEmitter {
  private agents: Map<string, AgentCore> = new Map();
  private agentInfo: Map<string, AgentInfo> = new Map();

  /**
   * Register an agent
   */
  async register(agentId: string, config: AgentConfig, name?: string): Promise<AgentCore> {
    if (this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} is already registered`);
    }

    try {
      const agent = new AgentCore(config);
      
      // Initialize agent
      await agent.init();
      
      // Store agent
      this.agents.set(agentId, agent);
      this.agentInfo.set(agentId, {
        id: agentId,
        name: name || `Agent-${agentId}`,
        config,
        status: agent.getStatus(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Setup event listeners
      agent.on('statusChange', (status: AgentStatus) => {
        const info = this.agentInfo.get(agentId);
        if (info) {
          info.status = status;
          info.updatedAt = new Date();
        }
        this.emit('agentStatusChange', agentId, status);
      });

      agent.on('error', (error: Error) => {
        this.emit('agentError', agentId, error);
      });

      logger.info(`Agent registered`, { agentId, name: name || agentId });
      this.emit('agentRegistered', agentId);

      return agent;
    } catch (error) {
      logger.error(`Failed to register agent`, { agentId, error });
      throw error;
    }
  }

  /**
   * Get an agent by ID
   */
  get(agentId: string): AgentCore | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get agent info
   */
  getInfo(agentId: string): AgentInfo | undefined {
    return this.agentInfo.get(agentId);
  }

  /**
   * Check if agent exists
   */
  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * List all agents
   */
  list(): AgentInfo[] {
    return Array.from(this.agentInfo.values());
  }

  /**
   * Unregister an agent
   */
  async unregister(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      // Stop agent if running
      if (agent.getStatus().state === 'running') {
        await agent.stop();
      }

      // Remove from registry
      this.agents.delete(agentId);
      this.agentInfo.delete(agentId);

      logger.info(`Agent unregistered`, { agentId });
      this.emit('agentUnregistered', agentId);
    } catch (error) {
      logger.error(`Failed to unregister agent`, { agentId, error });
      throw error;
    }
  }

  /**
   * Start an agent
   */
  async start(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      await agent.start();
      const info = this.agentInfo.get(agentId);
      if (info) {
        info.status = agent.getStatus();
        info.updatedAt = new Date();
      }
      logger.info(`Agent started`, { agentId });
    } catch (error) {
      logger.error(`Failed to start agent`, { agentId, error });
      throw error;
    }
  }

  /**
   * Stop an agent
   */
  async stop(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    try {
      await agent.stop();
      const info = this.agentInfo.get(agentId);
      if (info) {
        info.status = agent.getStatus();
        info.updatedAt = new Date();
      }
      logger.info(`Agent stopped`, { agentId });
    } catch (error) {
      logger.error(`Failed to stop agent`, { agentId, error });
      throw error;
    }
  }

  /**
   * Get agent status
   */
  getStatus(agentId: string): AgentStatus | undefined {
    const agent = this.agents.get(agentId);
    return agent?.getStatus();
  }

  /**
   * Get all agent IDs
   */
  getAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Get count of agents
   */
  getCount(): number {
    return this.agents.size;
  }

  /**
   * Clear all agents
   */
  async clear(): Promise<void> {
    const agentIds = Array.from(this.agents.keys());
    for (const agentId of agentIds) {
      await this.unregister(agentId);
    }
    logger.info(`All agents cleared`);
  }
}
