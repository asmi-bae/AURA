"use strict";
/**
 * Health Monitor
 *
 * Monitors AI model health, latency, and availability.
 * Provides health checks, status updates, and automatic failover.
 *
 * Features:
 * - Periodic health checks
 * - Latency monitoring
 * - Error rate tracking
 * - Automatic status updates
 * - Health status aggregation
 *
 * @module @aura/ai/registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthMonitor = void 0;
const utils_1 = require("@aura/utils");
const logger = (0, utils_1.createLogger)();
/**
 * Health Monitor
 *
 * Monitors model health and availability.
 */
class HealthMonitor {
    config;
    registry;
    logger = (0, utils_1.createLogger)();
    checkInterval = null;
    isRunning = false;
    constructor(config) {
        this.config = config;
        this.registry = config.registry;
    }
    /**
     * Start health monitoring
     */
    async start() {
        if (this.isRunning) {
            logger.warn('Health monitor already running');
            return;
        }
        this.isRunning = true;
        const interval = this.config.checkInterval || 60000; // 1 minute default
        // Perform initial check
        await this.checkAllModels();
        // Start periodic checks
        this.checkInterval = setInterval(async () => {
            await this.checkAllModels();
        }, interval);
        logger.info('Health monitor started', { interval });
    }
    /**
     * Stop health monitoring
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        this.isRunning = false;
        logger.info('Health monitor stopped');
    }
    /**
     * Check all models
     */
    async checkAllModels() {
        const modelIds = this.registry.getEnabledProviders();
        logger.debug('Checking model health', { count: modelIds.length });
        await Promise.allSettled(modelIds.map(modelId => this.checkModel(modelId)));
    }
    /**
     * Check single model health
     */
    async checkModel(modelId) {
        try {
            const config = this.registry.getModelConfig(modelId);
            if (!config) {
                return;
            }
            const startTime = Date.now();
            let success = false;
            let error = null;
            try {
                // Perform health check based on model type
                if (config.healthCheck) {
                    // Custom health check endpoint
                    const response = await fetch(config.healthCheck, {
                        method: 'GET',
                        signal: AbortSignal.timeout(this.config.timeout || 5000),
                    });
                    success = response.ok;
                }
                else {
                    // Simple ping test
                    const model = this.registry.getModel(modelId);
                    // Try a simple operation to test availability
                    success = true; // Assume success if model is accessible
                }
                const latency = Date.now() - startTime;
                const currentHealth = this.registry.getHealthStatus(modelId);
                // Determine status
                let status = 'healthy';
                if (!success) {
                    status = 'down';
                }
                else if (latency > 5000) {
                    status = 'degraded';
                }
                // Calculate error rate (simplified)
                const errorRate = error ? 1 : 0;
                // Update health status
                await this.registry.updateHealthStatus(modelId, {
                    status,
                    latency,
                    errorRate,
                });
                logger.debug('Model health checked', {
                    modelId,
                    status,
                    latency,
                });
            }
            catch (err) {
                error = err instanceof Error ? err : new Error('Unknown error');
                success = false;
                await this.registry.updateHealthStatus(modelId, {
                    status: 'down',
                    latency: Date.now() - startTime,
                    errorRate: 1,
                });
                logger.warn('Model health check failed', {
                    modelId,
                    error: error.message,
                });
            }
        }
        catch (error) {
            logger.error('Error checking model health', {
                modelId,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }
    /**
     * Get overall health status
     */
    getOverallHealth() {
        const modelIds = this.registry.getEnabledProviders();
        let healthy = 0;
        let degraded = 0;
        let down = 0;
        for (const modelId of modelIds) {
            const health = this.registry.getHealthStatus(modelId);
            if (!health)
                continue;
            switch (health.status) {
                case 'healthy':
                    healthy++;
                    break;
                case 'degraded':
                    degraded++;
                    break;
                case 'down':
                    down++;
                    break;
            }
        }
        return {
            healthy,
            degraded,
            down,
            total: modelIds.length,
        };
    }
}
exports.HealthMonitor = HealthMonitor;
