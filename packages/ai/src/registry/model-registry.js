"use strict";
/**
 * Model Registry
 *
 * Central registry for managing multiple AI model providers.
 * Supports dynamic model registration, routing, caching, cost tracking, and health monitoring.
 *
 * Features:
 * - Multi-provider support (GPT, Claude, Gemini, Ollama)
 * - Model routing based on capabilities, cost, speed, privacy
 * - Response caching with multi-level strategy
 * - Cost tracking and optimization
 * - Health monitoring and fallback chains
 * - Version pinning and update policies
 *
 * @module @aura/ai/registry
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelRegistry = void 0;
const utils_1 = require("@aura/utils");
const gpt_1 = require("../models/gpt");
const claude_1 = require("../models/claude");
const gemini_1 = require("../models/gemini");
const ollama_1 = require("../models/ollama");
const logger = (0, utils_1.createLogger)();
/**
 * Model Registry
 *
 * Manages multiple AI model providers and routes requests appropriately.
 */
class ModelRegistry {
    models = new Map();
    configs = new Map();
    priorities = new Map();
    enabled = new Set();
    healthStatus = new Map();
    costMetrics = new Map();
    logger = (0, utils_1.createLogger)();
    preferences = {};
    versionPins = new Map();
    updatePolicies = new Map();
    /**
     * Register a model
     */
    registerModel(config) {
        try {
            let model;
            switch (config.provider) {
                case 'openai':
                    model = new gpt_1.GPTService(config.config);
                    break;
                case 'anthropic':
                    model = new claude_1.ClaudeService(config.config);
                    break;
                case 'google':
                    model = new gemini_1.GeminiService(config.config);
                    break;
                case 'ollama':
                case 'local':
                    model = new ollama_1.OllamaService(config.config);
                    break;
                default:
                    throw new Error(`Unsupported model provider: ${config.provider}`);
            }
            this.models.set(config.id, model);
            this.configs.set(config.id, config);
            this.priorities.set(config.id, config.priority);
            if (config.enabled) {
                this.enabled.add(config.id);
            }
            // Initialize health status
            this.healthStatus.set(config.id, {
                model: config.id,
                status: 'healthy',
                latency: 0,
                errorRate: 0,
                lastCheck: new Date(),
                uptime: 100,
            });
            // Initialize cost metrics
            this.costMetrics.set(config.id, []);
            this.logger.info('Model registered', {
                id: config.id,
                provider: config.provider,
                location: config.location,
                capabilities: Object.entries(config.capabilities)
                    .filter(([_, enabled]) => enabled)
                    .map(([name]) => name),
            });
        }
        catch (error) {
            this.logger.error('Error registering model', {
                error: error instanceof Error ? error.message : 'Unknown error',
                provider: config.provider,
                id: config.id,
            });
            throw error;
        }
    }
    /**
     * Get model by ID
     */
    getModel(modelId) {
        const requestedModel = modelId || this.preferences.defaultProvider || 'openai';
        // Check if model is enabled and available
        if (this.models.has(requestedModel) && this.enabled.has(requestedModel)) {
            const health = this.healthStatus.get(requestedModel);
            if (health && health.status === 'healthy') {
                return this.models.get(requestedModel);
            }
        }
        // Try fallback provider
        const fallback = this.preferences.fallbackProvider || 'ollama';
        if (this.models.has(fallback) && this.enabled.has(fallback)) {
            this.logger.warn('Using fallback model', { fallback });
            return this.models.get(fallback);
        }
        // Try any enabled provider
        for (const [id, model] of this.models.entries()) {
            if (this.enabled.has(id)) {
                const health = this.healthStatus.get(id);
                if (health && health.status === 'healthy') {
                    this.logger.warn('Using available model', { id });
                    return model;
                }
            }
        }
        throw new Error(`No model available. Requested: ${requestedModel}, Fallback: ${fallback}`);
    }
    /**
     * Get model for a specific task
     */
    getModelForTask(options) {
        // Privacy first: if privacy required, only local models
        if (options.requiresPrivacy || this.preferences.requirePrivacy) {
            const localModel = this.getBestLocalModel(options);
            if (localModel) {
                return localModel;
            }
            throw new Error('No local model available for privacy-required task');
        }
        // Filter by task type and capabilities
        const candidates = this.getCandidatesForTask(options);
        if (candidates.length === 0) {
            throw new Error(`No model available for task type: ${options.type}`);
        }
        // Select best model based on optimization preferences
        if (options.costOptimization || this.preferences.costOptimization) {
            return this.selectCheapestModel(candidates);
        }
        if (options.speedOptimization || this.preferences.speedOptimization) {
            return this.selectFastestModel(candidates);
        }
        // Default: select by priority
        return this.selectByPriority(candidates);
    }
    /**
     * Get best model based on capabilities
     */
    getBestModel(options) {
        const candidates = [];
        for (const [id, config] of this.configs.entries()) {
            if (!this.enabled.has(id))
                continue;
            // Check location
            if (options.location && config.location !== options.location)
                continue;
            // Check capabilities
            if (options.capabilities) {
                const hasAllCapabilities = options.capabilities.every(cap => config.capabilities[cap] === true);
                if (!hasAllCapabilities)
                    continue;
            }
            // Check health
            const health = this.healthStatus.get(id);
            if (health && health.status !== 'healthy')
                continue;
            candidates.push(id);
        }
        if (candidates.length === 0) {
            throw new Error('No model available matching criteria');
        }
        if (options.costOptimization) {
            return this.selectCheapestModel(candidates);
        }
        if (options.speedOptimization) {
            return this.selectFastestModel(candidates);
        }
        return this.selectByPriority(candidates);
    }
    /**
     * Get candidates for task
     */
    getCandidatesForTask(options) {
        const candidates = [];
        const requiredCapabilities = this.getRequiredCapabilities(options.type);
        for (const [id, config] of this.configs.entries()) {
            if (!this.enabled.has(id))
                continue;
            // Check context length
            if (options.contextLength && config.maxContextLength < options.contextLength) {
                continue;
            }
            // Check capabilities
            const hasRequiredCapabilities = requiredCapabilities.every(cap => config.capabilities[cap] === true);
            if (!hasRequiredCapabilities)
                continue;
            // Check additional capabilities if specified
            if (options.capabilities) {
                const hasAllCapabilities = options.capabilities.every(cap => config.capabilities[cap] === true);
                if (!hasAllCapabilities)
                    continue;
            }
            // Check location preference
            if (options.preferredProvider && config.provider !== options.preferredProvider) {
                continue;
            }
            // Check health
            const health = this.healthStatus.get(id);
            if (health && health.status === 'healthy') {
                candidates.push(id);
            }
        }
        return candidates;
    }
    /**
     * Get required capabilities for task type
     */
    getRequiredCapabilities(taskType) {
        switch (taskType) {
            case 'reasoning':
                return ['reasoning'];
            case 'vision':
                return ['vision', 'multimodal'];
            case 'audio':
                return ['audio'];
            case 'embedding':
                return ['embeddings'];
            case 'rag':
                return ['embeddings', 'reasoning'];
            case 'function':
                return ['functionCalling', 'reasoning'];
            case 'supervisor':
                return ['reasoning'];
            default:
                return ['reasoning'];
        }
    }
    /**
     * Get best local model
     */
    getBestLocalModel(options) {
        const localCandidates = Array.from(this.configs.entries())
            .filter(([id, config]) => {
            if (config.location !== 'local')
                return false;
            if (!this.enabled.has(id))
                return false;
            if (!config.offlineCapable)
                return false;
            const health = this.healthStatus.get(id);
            return health && health.status === 'healthy';
        })
            .map(([id]) => id);
        if (localCandidates.length === 0) {
            return null;
        }
        const bestLocal = this.selectByPriority(localCandidates);
        return bestLocal;
    }
    /**
     * Select model by priority
     */
    selectByPriority(candidates) {
        const sorted = candidates.sort((a, b) => {
            const priorityA = this.priorities.get(a) || 100;
            const priorityB = this.priorities.get(b) || 100;
            return priorityA - priorityB;
        });
        return this.models.get(sorted[0]);
    }
    /**
     * Select cheapest model
     */
    selectCheapestModel(candidates) {
        let cheapest = null;
        let lowestCost = Infinity;
        for (const id of candidates) {
            const config = this.configs.get(id);
            if (!config || !config.cost)
                continue;
            const avgCost = (config.cost.inputPerToken + config.cost.outputPerToken) / 2;
            if (avgCost < lowestCost) {
                lowestCost = avgCost;
                cheapest = id;
            }
        }
        if (cheapest) {
            return this.models.get(cheapest);
        }
        // Fallback to priority if no cost data
        return this.selectByPriority(candidates);
    }
    /**
     * Select fastest model
     */
    selectFastestModel(candidates) {
        let fastest = null;
        let lowestLatency = Infinity;
        for (const id of candidates) {
            const health = this.healthStatus.get(id);
            if (!health)
                continue;
            if (health.latency < lowestLatency) {
                lowestLatency = health.latency;
                fastest = id;
            }
        }
        if (fastest) {
            return this.models.get(fastest);
        }
        // Fallback to priority if no latency data
        return this.selectByPriority(candidates);
    }
    /**
     * Set model preferences
     */
    setPreferences(preferences) {
        this.preferences = { ...this.preferences, ...preferences };
        this.logger.info('Model preferences updated', { preferences });
    }
    /**
     * Pin model version
     */
    pinVersion(modelId, version) {
        this.versionPins.set(modelId, version);
        this.logger.info('Model version pinned', { modelId, version });
    }
    /**
     * Set update policy
     */
    setUpdatePolicy(modelId, policy) {
        this.updatePolicies.set(modelId, policy);
        this.logger.info('Update policy set', { modelId, policy });
    }
    /**
     * Get all registered providers
     */
    getAllProviders() {
        return Array.from(new Set(Array.from(this.configs.values()).map(c => c.provider)));
    }
    /**
     * Get enabled providers
     */
    getEnabledProviders() {
        return Array.from(this.enabled);
    }
    /**
     * Check if provider is available
     */
    hasModel(modelId) {
        return this.models.has(modelId) && this.enabled.has(modelId);
    }
    /**
     * Enable a model
     */
    enableModel(modelId) {
        if (this.models.has(modelId)) {
            this.enabled.add(modelId);
            this.logger.info('Model enabled', { modelId });
        }
    }
    /**
     * Disable a model
     */
    disableModel(modelId) {
        this.enabled.delete(modelId);
        this.logger.info('Model disabled', { modelId });
    }
    /**
     * Get model configuration
     */
    getModelConfig(modelId) {
        return this.configs.get(modelId);
    }
    /**
     * Get health status
     */
    getHealthStatus(modelId) {
        return this.healthStatus.get(modelId);
    }
    /**
     * Update health status
     */
    async updateHealthStatus(modelId, status) {
        const current = this.healthStatus.get(modelId);
        if (current) {
            this.healthStatus.set(modelId, {
                ...current,
                ...status,
                lastCheck: new Date(),
            });
        }
    }
    /**
     * Record cost metrics
     */
    recordCostMetrics(metrics) {
        const existing = this.costMetrics.get(metrics.model) || [];
        existing.push(metrics);
        // Keep only last 1000 metrics
        if (existing.length > 1000) {
            existing.shift();
        }
        this.costMetrics.set(metrics.model, existing);
    }
    /**
     * Get cost metrics
     */
    getCostMetrics(modelId, limit) {
        const metrics = this.costMetrics.get(modelId) || [];
        return limit ? metrics.slice(-limit) : metrics;
    }
    /**
     * Get total costs
     */
    getTotalCosts(timeRange) {
        const totals = {};
        for (const [modelId, metrics] of this.costMetrics.entries()) {
            let filtered = metrics;
            if (timeRange) {
                filtered = metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end);
            }
            const total = filtered.reduce((sum, m) => sum + m.cost.total, 0);
            totals[modelId] = total;
        }
        return totals;
    }
    /**
     * Unregister a model
     */
    unregisterModel(modelId) {
        this.models.delete(modelId);
        this.configs.delete(modelId);
        this.enabled.delete(modelId);
        this.priorities.delete(modelId);
        this.healthStatus.delete(modelId);
        this.costMetrics.delete(modelId);
        this.versionPins.delete(modelId);
        this.updatePolicies.delete(modelId);
        this.logger.info('Model unregistered', { modelId });
    }
}
exports.ModelRegistry = ModelRegistry;
