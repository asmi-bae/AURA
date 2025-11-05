/**
 * Executor
 * 
 * Executes low-level actions using capability modules.
 * Supports transactional semantics and rollback where possible.
 * 
 * @module @aura/agent/engine
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';
import { AgentCapabilities } from '../types/capabilities';
import { ExecutionPlan, ExecutionStep } from './planner';
import { LocalStorage } from '../storage/local-storage';
import { CapabilityRegistry } from '../capabilities/capability-registry';

const logger = createLogger();

/**
 * Executor configuration
 */
export interface ExecutorConfig {
  agentId: string;
  capabilities: AgentCapabilities;
  storage: LocalStorage;
}

/**
 * Execution result
 */
export interface ExecutionResult {
  success: boolean;
  stepsExecuted: number;
  stepsSucceeded: number;
  stepsFailed: number;
  result?: any;
  error?: Error;
}

/**
 * Executor
 * 
 * Executes plans step by step.
 */
export class Executor extends EventEmitter {
  private config: ExecutorConfig;
  private logger = createLogger();
  private capabilityRegistry: CapabilityRegistry;
  private isCancelled = false;

  constructor(config: ExecutorConfig) {
    super();
    this.config = config;
    this.capabilityRegistry = new CapabilityRegistry(config.capabilities);
  }

  /**
   * Initialize the executor
   */
  async init(): Promise<void> {
    await this.capabilityRegistry.init();
    logger.info('Executor initialized');
  }

  /**
   * Execute a plan
   */
  async execute(plan: ExecutionPlan): Promise<ExecutionResult> {
    this.isCancelled = false;
    const startTime = Date.now();
    let stepsExecuted = 0;
    let stepsSucceeded = 0;
    let stepsFailed = 0;

    try {
      logger.info('Executing plan', { planId: plan.id, steps: plan.steps.length });

      // Execute steps in order (respecting dependencies)
      const executedSteps = new Set<string>();
      const pendingSteps = [...plan.steps];

      while (pendingSteps.length > 0 && !this.isCancelled) {
        // Find steps with satisfied dependencies
        const readySteps = pendingSteps.filter(step => {
          if (!step.dependencies || step.dependencies.length === 0) {
            return true;
          }
          return step.dependencies.every(dep => executedSteps.has(dep));
        });

        if (readySteps.length === 0) {
          throw new Error('Circular dependency or missing step');
        }

        // Execute ready steps in parallel
        const results = await Promise.allSettled(
          readySteps.map(step => this.executeStep(step))
        );

        for (let i = 0; i < readySteps.length; i++) {
          const step = readySteps[i];
          const result = results[i];

          stepsExecuted++;
          executedSteps.add(step.id);

          if (result.status === 'fulfilled') {
            stepsSucceeded++;
          } else {
            stepsFailed++;
            logger.error('Step execution failed', {
              stepId: step.id,
              error: result.reason,
            });
          }
        }

        // Remove executed steps
        pendingSteps.splice(0, pendingSteps.length, ...pendingSteps.filter(s => !executedSteps.has(s.id)));
      }

      const duration = Date.now() - startTime;
      const result: ExecutionResult = {
        success: stepsFailed === 0,
        stepsExecuted,
        stepsSucceeded,
        stepsFailed,
      };

      logger.info('Plan execution completed', {
        planId: plan.id,
        duration,
        stepsExecuted,
        stepsSucceeded,
        stepsFailed,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Plan execution failed', {
        planId: plan.id,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        stepsExecuted,
        stepsSucceeded,
        stepsFailed,
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(step: ExecutionStep): Promise<void> {
    try {
      this.emit('step-started', step);

      logger.debug('Executing step', { stepId: step.id, type: step.type });

      // Get capability module for this step type
      const capability = this.capabilityRegistry.getCapability(step.type);
      if (!capability) {
        throw new Error(`Capability not found: ${step.type}`);
      }

      // Execute the capability
      const result = await capability.execute(step.action, step.parameters);

      this.emit('step-completed', step);
      logger.debug('Step executed successfully', { stepId: step.id });

      return result;
    } catch (error) {
      this.emit('step-failed', step, error);
      logger.error('Step execution failed', {
        stepId: step.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Cancel execution
   */
  async cancel(): Promise<void> {
    this.isCancelled = true;
    logger.info('Execution cancelled');
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.capabilityRegistry.cleanup();
    logger.info('Executor cleanup completed');
  }
}

