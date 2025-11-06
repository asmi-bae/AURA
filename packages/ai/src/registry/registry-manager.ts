/**
 * Registry Manager
 * 
 * Unified manager that combines Model Registry, Router, Cache, Pipeline,
 * and Health Monitor into a single cohesive system.
 * 
 * Features:
 * - Unified API for all registry operations
 * - Automatic health monitoring
 * - Response caching
 * - Pipeline execution
 * - Cost tracking
 * 
 * @module @aura/ai/registry
 */

import { createLogger } from '@aura/utils';
import { ModelRegistry, RegistryModelConfig, ModelPreferences, TaskRoutingOptions, CostMetrics } from './model-registry';
import { ModelRouter, RouterConfig, RoutingDecision } from './router';
import { ResponseCache, CacheConfig } from './cache';
import { PipelineExecutor, PipelineConfig, PipelineResult } from './pipeline';
import { HealthMonitor, HealthMonitorConfig } from './health-monitor';
import { MultiAgentOrchestrator, AgentConfig, CoordinationResult } from './orchestrator';

const logger = createLogger();

/**
 * Registry Manager configuration
 */
export interface RegistryManagerConfig {
  enableCache?: boolean;
  enableHealthMonitoring?: boolean;
  cacheConfig?: CacheConfig;
  healthMonitorConfig?: Partial<HealthMonitorConfig>;
  routerConfig?: Partial<RouterConfig>;
}

/**
 * Registry Manager
 * 
 * Unified manager for all registry operations.
 */
export class RegistryManager {
  private registry: ModelRegistry;
  private router: ModelRouter;
  private cache: ResponseCache;
  private pipeline: PipelineExecutor;
  private healthMonitor: HealthMonitor;
  private orchestrator: MultiAgentOrchestrator;
  private logger = createLogger();

  constructor(config: RegistryManagerConfig = {}) {
    // Initialize registry
    this.registry = new ModelRegistry();

    // Initialize router
    this.router = new ModelRouter({
      registry: this.registry,
      defaultPreferences: config.routerConfig?.defaultPreferences,
    });

    // Initialize cache
    this.cache = new ResponseCache(config.cacheConfig);

    // Initialize pipeline executor
    this.pipeline = new PipelineExecutor(this.registry);

    // Initialize health monitor
    if (config.enableHealthMonitoring !== false) {
      this.healthMonitor = new HealthMonitor({
        registry: this.registry,
        ...config.healthMonitorConfig,
      });
    } else {
      this.healthMonitor = new HealthMonitor({
        registry: this.registry,
      });
    }

    // Initialize orchestrator
    this.orchestrator = new MultiAgentOrchestrator(this.registry);

    logger.info('Registry manager initialized', {
      cacheEnabled: config.enableCache !== false,
      healthMonitoringEnabled: config.enableHealthMonitoring !== false,
    });
  }

  /**
   * Initialize the registry manager
   */
  async init(): Promise<void> {
    // Start health monitoring
    if (this.healthMonitor) {
      await this.healthMonitor.start();
    }

    logger.info('Registry manager initialized');
  }

  /**
   * Register a model
   */
  registerModel(config: RegistryModelConfig): void {
    this.registry.registerModel(config);
  }

  /**
   * Get model for task (with routing)
   */
  routeTask(options: TaskRoutingOptions): {
    model: any;
    decision: RoutingDecision;
  } {
    const decision = this.router.routeTask(options);
    const model = this.registry.getModel(decision.modelId);
    
    return {
      model,
      decision,
    };
  }

  /**
   * Execute task with caching
   */
  async executeTask(
    options: TaskRoutingOptions & { input: any }
  ): Promise<any> {
    // Check cache first
    const cacheKey = this.cache.generateKey({
      model: options.type,
      task: options.type,
      input: options.input,
    });

    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit', { task: options.type });
        return cached;
      }
    }

    // Route to appropriate model
    const { model, decision } = this.routeTask(options);

    // Execute task
    const startTime = Date.now();
    let result: any;

    try {
      switch (options.type) {
        case 'reasoning':
          result = await (model as any).chatCompletion(options.input.messages || []);
          break;
        case 'embedding':
          result = await (model as any).generateEmbedding?.(options.input.text);
          break;
        case 'vision':
          if ('chatWithImage' in model) {
            result = await (model as any).chatWithImage(options.input.text, options.input.image);
          }
          break;
        default:
          result = await (model as any).chatCompletion(options.input.messages || []);
      }

      const duration = Date.now() - startTime;

      // Record cost metrics (would calculate tokens from actual input/output)
      this.recordMetrics({
        model: decision.modelId,
        tokens: {
          input: 0,
          output: 0,
          total: 0,
        },
        cost: {
          input: 0,
          output: 0,
          total: 0,
        },
        latency: duration,
        timestamp: new Date(),
      });

      // Cache result
      if (this.cache) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      logger.error('Task execution failed', {
        task: options.type,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Execute pipeline
   */
  async executePipeline(config: PipelineConfig): Promise<PipelineResult> {
    return await this.pipeline.execute(config);
  }

  /**
   * Coordinate multiple agents
   */
  async coordinateAgents(
    task: string,
    context: Record<string, any>,
    agents: AgentConfig[]
  ): Promise<Record<string, CoordinationResult>> {
    return await this.orchestrator.coordinateTask(task, context, agents);
  }

  /**
   * Record cost metrics
   */
  recordMetrics(metrics: CostMetrics): void {
    this.registry.recordCostMetrics(metrics);
  }

  /**
   * Get registry
   */
  getRegistry(): ModelRegistry {
    return this.registry;
  }

  /**
   * Get router
   */
  getRouter(): ModelRouter {
    return this.router;
  }

  /**
   * Get cache
   */
  getCache(): ResponseCache {
    return this.cache;
  }

  /**
   * Get health monitor
   */
  getHealthMonitor(): HealthMonitor {
    return this.healthMonitor;
  }

  /**
   * Get orchestrator
   */
  getOrchestrator(): MultiAgentOrchestrator {
    return this.orchestrator;
  }

  /**
   * Set preferences
   */
  setPreferences(preferences: ModelPreferences): void {
    this.registry.setPreferences(preferences);
  }

  /**
   * Get overall health
   */
  getOverallHealth() {
    return this.healthMonitor?.getOverallHealth() || {
      healthy: 0,
      degraded: 0,
      down: 0,
      total: 0,
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Get total costs
   */
  getTotalCosts(timeRange?: { start: Date; end: Date }) {
    return this.registry.getTotalCosts(timeRange);
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.healthMonitor) {
      this.healthMonitor.stop();
    }
    logger.info('Registry manager cleanup completed');
  }
}

