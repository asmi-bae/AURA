/**
 * AURA Workflow Engine
 * 
 * High-performance, scalable workflow execution engine built on n8n-core.
 * Supports distributed execution, caching, metrics, and database persistence.
 * 
 * Features:
 * - Queue-based execution with BullMQ
 * - Database integration with TypeORM (@aura/db)
 * - Workflow caching for performance
 * - Execution metrics and monitoring
 * - Error handling and retry logic
 * - Priority-based job processing
 * 
 * @module @aura/core/engine
 */

import { Workflow as N8nWorkflow } from 'n8n-workflow';
import { Queue, Worker, Job, QueueOptions, WorkerOptions } from 'bullmq';
import Redis from 'ioredis';
import { createLogger } from '@aura/utils';
import { PluginLoader } from '../plugins/plugin-loader';
import { AuraPlugin } from '@aura/plugins';
import { WorkflowCache } from '../cache/workflow-cache';
import { ExecutionMetrics } from '../metrics/execution-metrics';
import { WorkflowRepository } from '../database/workflow-repository';
import { ExecutionLogRepository } from '../database/execution-log-repository';
import { WorkflowExecution, Workflow } from '@aura/db';
import type { Connection } from 'typeorm';

/**
 * Configuration for workflow engine
 */
export interface WorkflowEngineConfig {
  /** Redis connection for queue */
  redisConnection: Redis | any;
  /** Database connection (TypeORM) */
  dbConnection?: Connection;
  /** Plugins directory path */
  pluginsDir?: string;
  /** Enable plugin watching */
  watchPlugins?: boolean;
  /** Queue configuration */
  queueConfig?: QueueOptions;
  /** Worker configuration */
  workerConfig?: WorkerOptions;
  /** Maximum concurrent executions */
  maxConcurrentExecutions?: number;
  /** Enable caching */
  enableCache?: boolean;
  /** Cache TTL in seconds */
  cacheTTL?: number;
  /** Enable metrics collection */
  enableMetrics?: boolean;
}

/**
 * Workflow execution result
 */
export interface WorkflowExecutionResult {
  success: boolean;
  executionId: string;
  workflowId: string;
  duration: number;
  nodesExecuted: number;
  nodesSucceeded: number;
  nodesFailed: number;
  error?: Error;
  data?: any;
}

/**
 * AURA Workflow Engine
 * 
 * Main workflow execution engine that orchestrates workflow runs
 * with database persistence, caching, and metrics collection.
 */
export class AuraWorkflowEngine {
  private queue: Queue;
  private worker: Worker | null = null;
  private pluginLoader: PluginLoader;
  private workflowCache: WorkflowCache | null = null;
  private metrics: ExecutionMetrics | null = null;
  private workflowRepo: WorkflowRepository | null = null;
  private executionLogRepo: ExecutionLogRepository | null = null;
  private logger = createLogger();
  private config: Required<WorkflowEngineConfig>;
  private isInitialized = false;

  constructor(config: WorkflowEngineConfig) {
    // Validate required configuration
    if (!config.redisConnection) {
      throw new Error('Redis connection is required');
    }

    // Set defaults and merge config
    this.config = {
      redisConnection: config.redisConnection,
      dbConnection: config.dbConnection || null,
      pluginsDir: config.pluginsDir || './plugins',
      watchPlugins: config.watchPlugins ?? true,
      queueConfig: config.queueConfig || {},
      workerConfig: config.workerConfig || {},
      maxConcurrentExecutions: config.maxConcurrentExecutions || 10,
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL || 300, // 5 minutes
      enableMetrics: config.enableMetrics ?? true,
    };

    // Initialize queue
    this.queue = new Queue('workflow-execution', {
      connection: this.config.redisConnection,
      defaultJobOptions: {
        removeOnComplete: {
          age: 3600, // Keep completed jobs for 1 hour
          count: 1000, // Keep last 1000 jobs
        },
        removeOnFail: {
          age: 86400, // Keep failed jobs for 24 hours
        },
        attempts: 3, // Retry failed jobs 3 times
        backoff: {
          type: 'exponential',
          delay: 2000, // Start with 2 second delay
        },
      },
      ...this.config.queueConfig,
    });

    // Initialize plugin loader
    this.pluginLoader = new PluginLoader();

    // Initialize cache if enabled
    if (this.config.enableCache) {
      this.workflowCache = new WorkflowCache(
        this.config.redisConnection,
        this.config.cacheTTL
      );
    }

    // Initialize metrics if enabled
    if (this.config.enableMetrics) {
      this.metrics = new ExecutionMetrics(this.config.redisConnection);
    }

    // Initialize database repositories if connection provided
    if (this.config.dbConnection) {
      this.workflowRepo = new WorkflowRepository(this.config.dbConnection);
      this.executionLogRepo = new ExecutionLogRepository(this.config.dbConnection);
    }

    this.logger.info('Workflow engine initialized', {
      pluginsDir: this.config.pluginsDir,
      cacheEnabled: this.config.enableCache,
      metricsEnabled: this.config.enableMetrics,
      dbEnabled: !!this.config.dbConnection,
    });
  }

  /**
   * Initialize the workflow engine
   * Loads plugins and prepares the engine for execution
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      this.logger.warn('Workflow engine already initialized');
      return;
    }

    try {
      // Load plugins
      await this.pluginLoader.loadPlugins(
        this.config.pluginsDir,
        this.config.watchPlugins
      );

      this.isInitialized = true;
      this.logger.info('Workflow engine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize workflow engine', { error });
      throw error;
    }
  }

  /**
   * Start the workflow worker
   * Begins processing workflow jobs from the queue
   */
  async startWorker(): Promise<void> {
    if (this.worker) {
      this.logger.warn('Worker already started');
      return;
    }

    if (!this.isInitialized) {
      await this.init();
    }

    // Create worker with concurrency limit
    this.worker = new Worker(
      'workflow-execution',
      async (job: Job) => {
        return await this.processWorkflow(job);
      },
      {
        connection: this.config.redisConnection,
        concurrency: this.config.maxConcurrentExecutions,
        limiter: {
          max: this.config.maxConcurrentExecutions,
          duration: 1000, // Per second
        },
        ...this.config.workerConfig,
      }
    );

    // Worker event handlers
    this.worker.on('completed', async (job: Job) => {
      this.logger.info(`Workflow job completed`, {
        jobId: job.id,
        workflowId: job.data.workflowId,
      });

      // Record metrics
      if (this.metrics) {
        await this.metrics.recordExecution(job.id!, true, Date.now() - job.timestamp);
      }
    });

    this.worker.on('failed', async (job: Job | undefined, err: Error) => {
      this.logger.error(`Workflow job failed`, {
        jobId: job?.id,
        workflowId: job?.data?.workflowId,
        error: err.message,
      });

      // Record metrics
      if (this.metrics && job) {
        await this.metrics.recordExecution(job.id!, false, Date.now() - job.timestamp);
      }

      // Log to database if available
      if (this.executionLogRepo && job?.data?.workflowId) {
        await this.executionLogRepo.create({
          workflowId: job.data.workflowId,
          status: 'error',
          error: err.message,
          startedAt: new Date(job.timestamp),
          stoppedAt: new Date(),
        });
      }
    });

    this.worker.on('progress', (job: Job, progress: number | object) => {
      this.logger.debug(`Workflow job progress`, {
        jobId: job.id,
        progress,
      });
    });

    this.logger.info('Workflow worker started', {
      concurrency: this.config.maxConcurrentExecutions,
    });
  }

  /**
   * Stop the workflow worker
   */
  async stopWorker(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
      this.logger.info('Workflow worker stopped');
    }
  }

  /**
   * Execute a workflow
   * 
   * @param workflowId - ID of the workflow to execute
   * @param workflowData - Workflow definition (optional, will fetch from DB if not provided)
   * @param priority - Job priority (higher = more priority)
   * @param delay - Delay execution by milliseconds
   * @returns Job ID
   */
  async executeWorkflow(
    workflowId: string,
    workflowData?: any,
    priority: number = 0,
    delay: number = 0
  ): Promise<string> {
    const startTime = Date.now();

    try {
      // Try to get workflow from cache first
      let workflow: any = workflowData;
      
      if (!workflow && this.workflowCache) {
        workflow = await this.workflowCache.get(workflowId);
      }

      // If not in cache, fetch from database
      if (!workflow && this.workflowRepo) {
        const dbWorkflow = await this.workflowRepo.findById(workflowId);
        if (dbWorkflow) {
          workflow = {
            id: dbWorkflow.id,
            name: dbWorkflow.name,
            nodes: dbWorkflow.nodes,
            connections: dbWorkflow.connections,
            settings: dbWorkflow.settings,
          };

          // Cache it for future use
          if (this.workflowCache) {
            await this.workflowCache.set(workflowId, workflow);
          }
        }
      }

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Create execution log in database
      let executionId: string | undefined;
      if (this.executionLogRepo) {
        const execution = await this.executionLogRepo.create({
          workflowId,
          status: 'running',
          startedAt: new Date(),
        });
        executionId = execution.id;
      }

      // Add job to queue
      const job = await this.queue.add(
        'execute',
        {
          workflowId,
          workflowData: workflow,
          executionId,
          plugins: this.pluginLoader.getAllPlugins(),
        },
        {
          priority,
          delay,
          jobId: executionId || `workflow-${workflowId}-${Date.now()}`,
        }
      );

      this.logger.info('Workflow queued for execution', {
        workflowId,
        jobId: job.id,
        executionId,
        priority,
        delay,
      });

      return job.id!;
    } catch (error) {
      this.logger.error('Error queueing workflow execution', {
        workflowId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Process a workflow job
   * 
   * @private
   */
  private async processWorkflow(job: Job): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const { workflowId, workflowData, executionId, plugins } = job.data;

    try {
      // Create n8n workflow instance
      const workflow = new N8nWorkflow(workflowData);

      // Execute workflow
      const result = await workflow.run({
        source: [
          {
            type: 'internal',
          },
        ],
        runData: {},
        pinData: {},
        executionMode: 'cli',
        contextData: {
          plugins,
          workflowId,
          executionId,
        },
      });

      const duration = Date.now() - startTime;
      const nodesExecuted = Object.keys(result.runData || {}).length;
      const nodesSucceeded = Object.values(result.runData || {}).filter(
        (node: any) => node.error === undefined
      ).length;
      const nodesFailed = nodesExecuted - nodesSucceeded;

      // Update execution log in database
      if (this.executionLogRepo && executionId) {
        await this.executionLogRepo.update(executionId, {
          status: 'success',
          stoppedAt: new Date(),
          data: {
            resultData: result.resultData,
            nodesExecuted,
            nodesSucceeded,
            nodesFailed,
            duration,
          },
        });
      }

      const executionResult: WorkflowExecutionResult = {
        success: true,
        executionId: executionId || job.id!,
        workflowId,
        duration,
        nodesExecuted,
        nodesSucceeded,
        nodesFailed,
        data: result.resultData,
      };

      this.logger.info('Workflow executed successfully', {
        workflowId,
        executionId,
        duration,
        nodesExecuted,
        nodesSucceeded,
        nodesFailed,
      });

      return executionResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error('Unknown error');

      // Update execution log in database
      if (this.executionLogRepo && executionId) {
        await this.executionLogRepo.update(executionId, {
          status: 'error',
          stoppedAt: new Date(),
          error: {
            message: err.message,
            stack: err.stack,
          },
        });
      }

      this.logger.error('Workflow execution failed', {
        workflowId,
        executionId,
        duration,
        error: err.message,
      });

      throw error;
    }
  }

  /**
   * Get workflow execution status
   */
  async getExecutionStatus(jobId: string): Promise<any> {
    const job = await this.queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      workflowId: job.data.workflowId,
      state: await job.getState(),
      progress: job.progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      timestamp: job.timestamp,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
    };
  }

  /**
   * Cancel a workflow execution
   */
  async cancelExecution(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
      this.logger.info('Workflow execution cancelled', { jobId });
    }
  }

  /**
   * Get workflow execution metrics
   */
  async getMetrics(): Promise<any> {
    if (!this.metrics) {
      return null;
    }
    return await this.metrics.getMetrics();
  }

  /**
   * Clear workflow cache
   */
  async clearCache(workflowId?: string): Promise<void> {
    if (this.workflowCache) {
      if (workflowId) {
        await this.workflowCache.delete(workflowId);
      } else {
        await this.workflowCache.clear();
      }
    }
  }

  /**
   * Close the workflow engine
   * Cleanup resources
   */
  async close(): Promise<void> {
    await this.stopWorker();
    await this.queue.close();
    this.pluginLoader.close();
    this.logger.info('Workflow engine closed');
  }
}

