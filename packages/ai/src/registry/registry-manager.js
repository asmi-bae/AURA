"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryManager = void 0;
const utils_1 = require("@aura/utils");
const model_registry_1 = require("./model-registry");
const router_1 = require("./router");
const cache_1 = require("./cache");
const pipeline_1 = require("./pipeline");
const health_monitor_1 = require("./health-monitor");
const orchestrator_1 = require("./orchestrator");
const logger = (0, utils_1.createLogger)();
/**
 * Registry Manager
 *
 * Unified manager for all registry operations.
 */
class RegistryManager {
    registry;
    router;
    cache;
    pipeline;
    healthMonitor;
    orchestrator;
    logger = (0, utils_1.createLogger)();
    constructor(config = {}) {
        // Initialize registry
        this.registry = new model_registry_1.ModelRegistry();
        // Initialize router
        this.router = new router_1.ModelRouter({
            registry: this.registry,
            defaultPreferences: config.routerConfig?.defaultPreferences,
        });
        // Initialize cache
        this.cache = new cache_1.ResponseCache(config.cacheConfig);
        // Initialize pipeline executor
        this.pipeline = new pipeline_1.PipelineExecutor(this.registry);
        // Initialize health monitor
        if (config.enableHealthMonitoring !== false) {
            this.healthMonitor = new health_monitor_1.HealthMonitor({
                registry: this.registry,
                ...config.healthMonitorConfig,
            });
        }
        else {
            this.healthMonitor = new health_monitor_1.HealthMonitor({
                registry: this.registry,
            });
        }
        // Initialize orchestrator
        this.orchestrator = new orchestrator_1.MultiAgentOrchestrator(this.registry);
        logger.info('Registry manager initialized', {
            cacheEnabled: config.enableCache !== false,
            healthMonitoringEnabled: config.enableHealthMonitoring !== false,
        });
    }
    /**
     * Initialize the registry manager
     */
    async init() {
        // Start health monitoring
        if (this.healthMonitor) {
            await this.healthMonitor.start();
        }
        logger.info('Registry manager initialized');
    }
    /**
     * Register a model
     */
    registerModel(config) {
        this.registry.registerModel(config);
    }
    /**
     * Get model for task (with routing)
     */
    routeTask(options) {
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
    async executeTask(options) {
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
        let result;
        try {
            switch (options.type) {
                case 'reasoning':
                    result = await model.chatCompletion(options.input.messages || []);
                    break;
                case 'embedding':
                    result = await model.generateEmbedding?.(options.input.text);
                    break;
                case 'vision':
                    if ('chatWithImage' in model) {
                        result = await model.chatWithImage(options.input.text, options.input.image);
                    }
                    break;
                default:
                    result = await model.chatCompletion(options.input.messages || []);
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
        }
        catch (error) {
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
    async executePipeline(config) {
        return await this.pipeline.execute(config);
    }
    /**
     * Coordinate multiple agents
     */
    async coordinateAgents(task, context, agents) {
        return await this.orchestrator.coordinateTask(task, context, agents);
    }
    /**
     * Record cost metrics
     */
    recordMetrics(metrics) {
        this.registry.recordCostMetrics(metrics);
    }
    /**
     * Get registry
     */
    getRegistry() {
        return this.registry;
    }
    /**
     * Get router
     */
    getRouter() {
        return this.router;
    }
    /**
     * Get cache
     */
    getCache() {
        return this.cache;
    }
    /**
     * Get health monitor
     */
    getHealthMonitor() {
        return this.healthMonitor;
    }
    /**
     * Get orchestrator
     */
    getOrchestrator() {
        return this.orchestrator;
    }
    /**
     * Set preferences
     */
    setPreferences(preferences) {
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
    getTotalCosts(timeRange) {
        return this.registry.getTotalCosts(timeRange);
    }
    /**
     * Cleanup
     */
    async cleanup() {
        if (this.healthMonitor) {
            this.healthMonitor.stop();
        }
        logger.info('Registry manager cleanup completed');
    }
}
exports.RegistryManager = RegistryManager;
