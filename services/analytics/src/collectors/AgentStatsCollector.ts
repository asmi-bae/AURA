/**
 * Agent Stats Collector
 * 
 * Collects statistics about agent usage and performance
 */

import { createLogger } from '@aura/utils';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface AgentStats {
  agentId: string;
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  averageExecutionTime: number;
  lastExecutionTime?: Date;
  createdAt: Date;
}

/**
 * Agent Stats Collector
 */
export class AgentStatsCollector extends EventEmitter {
  private stats: Map<string, AgentStats> = new Map();

  /**
   * Record task execution
   */
  recordTaskExecution(
    agentId: string,
    success: boolean,
    executionTime: number
  ): void {
    const existing = this.stats.get(agentId) || {
      agentId,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      createdAt: new Date(),
    };

    existing.totalTasks++;
    if (success) {
      existing.successfulTasks++;
    } else {
      existing.failedTasks++;
    }

    // Update average execution time
    existing.averageExecutionTime = 
      (existing.averageExecutionTime * (existing.totalTasks - 1) + executionTime) / 
      existing.totalTasks;

    existing.lastExecutionTime = new Date();
    this.stats.set(agentId, existing);

    this.emit('statsUpdated', agentId, existing);
  }

  /**
   * Get stats for agent
   */
  getStats(agentId: string): AgentStats | undefined {
    return this.stats.get(agentId);
  }

  /**
   * Get all stats
   */
  getAllStats(): AgentStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get aggregated stats
   */
  getAggregatedStats(): {
    totalAgents: number;
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    averageExecutionTime: number;
    successRate: number;
  } {
    const allStats = this.getAllStats();
    
    const totalTasks = allStats.reduce((sum, stat) => sum + stat.totalTasks, 0);
    const successfulTasks = allStats.reduce((sum, stat) => sum + stat.successfulTasks, 0);
    const failedTasks = allStats.reduce((sum, stat) => sum + stat.failedTasks, 0);
    const totalExecutionTime = allStats.reduce(
      (sum, stat) => sum + stat.averageExecutionTime * stat.totalTasks,
      0
    );

    return {
      totalAgents: allStats.length,
      totalTasks,
      successfulTasks,
      failedTasks,
      averageExecutionTime: totalTasks > 0 ? totalExecutionTime / totalTasks : 0,
      successRate: totalTasks > 0 ? successfulTasks / totalTasks : 0,
    };
  }

  /**
   * Clear stats for agent
   */
  clearStats(agentId: string): void {
    this.stats.delete(agentId);
    this.emit('statsCleared', agentId);
  }

  /**
   * Clear all stats
   */
  clearAllStats(): void {
    this.stats.clear();
    this.emit('allStatsCleared');
  }
}
