/**
 * Workflow Stats Collector
 * 
 * Collects statistics about workflow executions
 */

import { createLogger } from '@aura/utils';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface WorkflowStats {
  workflowId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageNodesExecuted: number;
  lastExecutionTime?: Date;
  createdAt: Date;
}

/**
 * Workflow Stats Collector
 */
export class WorkflowStatsCollector extends EventEmitter {
  private stats: Map<string, WorkflowStats> = new Map();

  /**
   * Record workflow execution
   */
  recordExecution(
    workflowId: string,
    success: boolean,
    executionTime: number,
    nodesExecuted: number
  ): void {
    const existing = this.stats.get(workflowId) || {
      workflowId,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      averageNodesExecuted: 0,
      createdAt: new Date(),
    };

    existing.totalExecutions++;
    if (success) {
      existing.successfulExecutions++;
    } else {
      existing.failedExecutions++;
    }

    // Update averages
    existing.averageExecutionTime = 
      (existing.averageExecutionTime * (existing.totalExecutions - 1) + executionTime) / 
      existing.totalExecutions;

    existing.averageNodesExecuted = 
      (existing.averageNodesExecuted * (existing.totalExecutions - 1) + nodesExecuted) / 
      existing.totalExecutions;

    existing.lastExecutionTime = new Date();
    this.stats.set(workflowId, existing);

    this.emit('statsUpdated', workflowId, existing);
  }

  /**
   * Get stats for workflow
   */
  getStats(workflowId: string): WorkflowStats | undefined {
    return this.stats.get(workflowId);
  }

  /**
   * Get all stats
   */
  getAllStats(): WorkflowStats[] {
    return Array.from(this.stats.values());
  }

  /**
   * Get aggregated stats
   */
  getAggregatedStats(): {
    totalWorkflows: number;
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    averageNodesExecuted: number;
    successRate: number;
  } {
    const allStats = this.getAllStats();
    
    const totalExecutions = allStats.reduce((sum, stat) => sum + stat.totalExecutions, 0);
    const successfulExecutions = allStats.reduce((sum, stat) => sum + stat.successfulExecutions, 0);
    const failedExecutions = allStats.reduce((sum, stat) => sum + stat.failedExecutions, 0);
    const totalExecutionTime = allStats.reduce(
      (sum, stat) => sum + stat.averageExecutionTime * stat.totalExecutions,
      0
    );
    const totalNodesExecuted = allStats.reduce(
      (sum, stat) => sum + stat.averageNodesExecuted * stat.totalExecutions,
      0
    );

    return {
      totalWorkflows: allStats.length,
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      averageExecutionTime: totalExecutions > 0 ? totalExecutionTime / totalExecutions : 0,
      averageNodesExecuted: totalExecutions > 0 ? totalNodesExecuted / totalExecutions : 0,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
    };
  }

  /**
   * Get top workflows by execution count
   */
  getTopWorkflows(limit: number = 10): WorkflowStats[] {
    return this.getAllStats()
      .sort((a, b) => b.totalExecutions - a.totalExecutions)
      .slice(0, limit);
  }

  /**
   * Clear stats for workflow
   */
  clearStats(workflowId: string): void {
    this.stats.delete(workflowId);
    this.emit('statsCleared', workflowId);
  }

  /**
   * Clear all stats
   */
  clearAllStats(): void {
    this.stats.clear();
    this.emit('allStatsCleared');
  }
}
