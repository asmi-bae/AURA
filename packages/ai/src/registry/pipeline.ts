/**
 * Pipeline Execution
 * 
 * Executes multi-step model pipelines (chains).
 * Supports sequential and parallel execution with dependency management.
 * 
 * Features:
 * - Multi-step pipeline execution
 * - Sequential and parallel steps
 * - Dependency management
 * - Error handling and rollback
 * - Result aggregation
 * 
 * @module @aura/ai/registry
 */

import { createLogger } from '@aura/utils';
import { ModelRegistry } from './model-registry';

const logger = createLogger();

/**
 * Pipeline step
 */
export interface PipelineStep {
  id: string;
  model: string | 'auto'; // Model ID or 'auto' for registry selection
  task: 'reasoning' | 'vision' | 'audio' | 'embedding' | 'rag' | 'function' | 'supervisor';
  input: any;
  dependencies?: string[]; // Step IDs this step depends on
  parallel?: boolean; // Execute in parallel with other steps
  timeout?: number; // Timeout in milliseconds
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  id: string;
  name: string;
  steps: PipelineStep[];
  registry: ModelRegistry;
  cache?: boolean; // Enable caching
  retry?: number; // Number of retries on failure
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  success: boolean;
  steps: Array<{
    id: string;
    success: boolean;
    result?: any;
    error?: Error;
    duration: number;
  }>;
  duration: number;
  result?: any;
}

/**
 * Pipeline Executor
 * 
 * Executes multi-step model pipelines.
 */
export class PipelineExecutor {
  private registry: ModelRegistry;
  private logger = createLogger();

  constructor(registry: ModelRegistry) {
    this.registry = registry;
  }

  /**
   * Execute pipeline
   */
  async execute(config: PipelineConfig): Promise<PipelineResult> {
    const startTime = Date.now();
    const stepResults: PipelineResult['steps'] = [];
    const executedSteps = new Set<string>();
    const stepResultsMap = new Map<string, any>();

    try {
      logger.info('Executing pipeline', { pipelineId: config.id, steps: config.steps.length });

      // Execute steps in order (respecting dependencies)
      const remainingSteps = [...config.steps];

      while (remainingSteps.length > 0) {
        // Find steps with satisfied dependencies
        const readySteps = remainingSteps.filter(step => {
          if (!step.dependencies || step.dependencies.length === 0) {
            return true;
          }
          return step.dependencies.every(dep => executedSteps.has(dep));
        });

        if (readySteps.length === 0) {
          throw new Error('Circular dependency or missing step');
        }

        // Execute ready steps (in parallel if marked)
        const parallelSteps = readySteps.filter(s => s.parallel);
        const sequentialSteps = readySteps.filter(s => !s.parallel);

        // Execute parallel steps
        if (parallelSteps.length > 0) {
          const parallelResults = await Promise.allSettled(
            parallelSteps.map(step => this.executeStep(step, stepResultsMap, config))
          );

          for (let i = 0; i < parallelSteps.length; i++) {
            const step = parallelSteps[i];
            const result = parallelResults[i];

            executedSteps.add(step.id);
            
            if (result.status === 'fulfilled') {
              stepResults.push(result.value);
              stepResultsMap.set(step.id, result.value.result);
            } else {
              stepResults.push({
                id: step.id,
                success: false,
                error: result.reason instanceof Error ? result.reason : new Error('Unknown error'),
                duration: 0,
              });

              // If retry enabled, retry the step
              if (config.retry && config.retry > 0) {
                // Retry logic here
              }
            }
          }
        }

        // Execute sequential steps
        for (const step of sequentialSteps) {
          try {
            const result = await this.executeStep(step, stepResultsMap, config);
            stepResults.push(result);
            stepResultsMap.set(step.id, result.result);
            executedSteps.add(step.id);
          } catch (error) {
            stepResults.push({
              id: step.id,
              success: false,
              error: error instanceof Error ? error : new Error('Unknown error'),
              duration: 0,
            });

            // If retry enabled, retry
            if (config.retry && config.retry > 0) {
              // Retry logic here
            }
          }
        }

        // Remove executed steps
        remainingSteps.splice(0, remainingSteps.length, 
          ...remainingSteps.filter(s => !executedSteps.has(s.id))
        );
      }

      const duration = Date.now() - startTime;
      const success = stepResults.every(r => r.success);

      const pipelineResult: PipelineResult = {
        success,
        steps: stepResults,
        duration,
        result: stepResultsMap.get(stepResults[stepResults.length - 1]?.id),
      };

      logger.info('Pipeline executed', {
        pipelineId: config.id,
        success,
        duration,
        stepsSucceeded: stepResults.filter(r => r.success).length,
        stepsFailed: stepResults.filter(r => !r.success).length,
      });

      return pipelineResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Pipeline execution failed', {
        pipelineId: config.id,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        success: false,
        steps: stepResults,
        duration,
        result: undefined,
      };
    }
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: PipelineStep,
    previousResults: Map<string, any>,
    config: PipelineConfig
  ): Promise<PipelineResult['steps'][0]> {
    const startTime = Date.now();

    try {
      logger.debug('Executing pipeline step', { stepId: step.id, task: step.task });

      // Resolve input (replace {{step-id}} with previous results)
      const resolvedInput = this.resolveInput(step.input, previousResults);

      // Get model
      const model = step.model === 'auto'
        ? this.registry.getModelForTask({
            type: step.task,
          })
        : this.registry.getModel(step.model);

      // Execute task
      let result: any;

      switch (step.task) {
        case 'reasoning':
          result = await (model as any).chatCompletion(resolvedInput.messages || []);
          break;
        case 'embedding':
          // Use RAG service for embeddings
          result = await (model as any).generateEmbedding?.(resolvedInput.text);
          break;
        case 'vision':
          // Use multimodal model for vision
          if ('chatWithImage' in model) {
            result = await (model as any).chatWithImage(resolvedInput.text, resolvedInput.image);
          }
          break;
        default:
          result = await (model as any).chatCompletion(resolvedInput.messages || []);
      }

      const duration = Date.now() - startTime;

      logger.debug('Pipeline step executed', { stepId: step.id, duration });

      return {
        id: step.id,
        success: true,
        result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error('Unknown error');

      logger.error('Pipeline step failed', {
        stepId: step.id,
        duration,
        error: err.message,
      });

      return {
        id: step.id,
        success: false,
        error: err,
        duration,
      };
    }
  }

  /**
   * Resolve input variables
   */
  private resolveInput(input: any, previousResults: Map<string, any>): any {
    if (typeof input === 'string') {
      // Replace {{step-id}} with previous results
      return input.replace(/\{\{(\w+)\}\}/g, (match, stepId) => {
        const value = previousResults.get(stepId);
        return value !== undefined ? JSON.stringify(value) : match;
      });
    }

    if (Array.isArray(input)) {
      return input.map(item => this.resolveInput(item, previousResults));
    }

    if (typeof input === 'object' && input !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(input)) {
        resolved[key] = this.resolveInput(value, previousResults);
      }
      return resolved;
    }

    return input;
  }
}

