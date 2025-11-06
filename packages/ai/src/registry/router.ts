/**
 * Model Router
 * 
 * Intelligent routing logic for selecting the best model for a given task.
 * Implements decision tree based on task type, capabilities, privacy, cost, and speed.
 * 
 * Features:
 * - Task classification and routing
 * - Capability-based filtering
 * - Privacy-first routing
 * - Cost and speed optimization
 * - Health-aware routing
 * - Fallback chain management
 * 
 * @module @aura/ai/registry
 */

import { createLogger } from '@aura/utils';
import { ModelRegistry, TaskRoutingOptions, ModelCapabilityFlags } from './model-registry';

const logger = createLogger();

/**
 * Router configuration
 */
export interface RouterConfig {
  registry: ModelRegistry;
  defaultPreferences?: {
    preferLocal?: boolean;
    preferCloud?: boolean;
    costOptimization?: boolean;
    speedOptimization?: boolean;
  };
}

/**
 * Routing decision
 */
export interface RoutingDecision {
  modelId: string;
  provider: string;
  confidence: number; // 0-1
  reason: string;
  fallbackChain: string[];
}

/**
 * Model Router
 * 
 * Routes tasks to appropriate models based on intelligent decision logic.
 */
export class ModelRouter {
  private config: RouterConfig;
  private registry: ModelRegistry;
  private logger = createLogger();

  constructor(config: RouterConfig) {
    this.config = config;
    this.registry = config.registry;
  }

  /**
   * Route a task to the best model
   */
  routeTask(options: TaskRoutingOptions): RoutingDecision {
    logger.debug('Routing task', { type: options.type, options });

    // Step 1: Privacy check
    if (options.requiresPrivacy || this.config.defaultPreferences?.preferLocal) {
      const localDecision = this.routeToLocal(options);
      if (localDecision) {
        return localDecision;
      }
    }

    // Step 2: Task type classification
    const taskCapabilities = this.getRequiredCapabilities(options.type);
    const enhancedOptions: TaskRoutingOptions = {
      ...options,
      capabilities: [...(options.capabilities || []), ...taskCapabilities],
    };

    // Step 3: Get candidates
    const candidates = this.getCandidates(enhancedOptions);
    
    if (candidates.length === 0) {
      throw new Error(`No model available for task type: ${options.type}`);
    }

    // Step 4: Select best model
    const selected = this.selectBestModel(candidates, enhancedOptions);

    // Step 5: Build fallback chain
    const fallbackChain = this.buildFallbackChain(selected, enhancedOptions);

    return {
      modelId: selected.id,
      provider: selected.provider,
      confidence: selected.confidence,
      reason: selected.reason,
      fallbackChain,
    };
  }

  /**
   * Route to local model
   */
  private routeToLocal(options: TaskRoutingOptions): RoutingDecision | null {
    try {
      const localModel = this.registry.getBestModel({
        location: 'local',
        capabilities: this.getRequiredCapabilities(options.type),
      });

      const config = this.registry.getModelConfig(
        Array.from(this.registry.getEnabledProviders()).find(id => {
          const c = this.registry.getModelConfig(id);
          return c?.location === 'local' && c?.offlineCapable;
        }) || ''
      );

      if (config) {
        return {
          modelId: config.id,
          provider: config.provider,
          confidence: 0.9,
          reason: 'Privacy-required task routed to local model',
          fallbackChain: [],
        };
      }
    } catch {
      // No local model available
    }

    return null;
  }

  /**
   * Get candidates for routing
   */
  private getCandidates(options: TaskRoutingOptions): Array<{
    id: string;
    provider: string;
    config: any;
    score: number;
  }> {
    const candidates: Array<{
      id: string;
      provider: string;
      config: any;
      score: number;
    }> = [];

    for (const modelId of this.registry.getEnabledProviders()) {
      const config = this.registry.getModelConfig(modelId);
      if (!config) continue;

      // Check capabilities
      const requiredCaps = this.getRequiredCapabilities(options.type);
      const hasCapabilities = requiredCaps.every(cap => config.capabilities[cap]);
      if (!hasCapabilities) continue;

      // Check context length
      if (options.contextLength && config.maxContextLength < options.contextLength) {
        continue;
      }

      // Check health
      const health = this.registry.getHealthStatus(modelId);
      if (!health || health.status !== 'healthy') {
        continue;
      }

      // Calculate score
      const score = this.calculateScore(config, health, options);

      candidates.push({
        id: modelId,
        provider: config.provider,
        config,
        score,
      });
    }

    return candidates.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate model score
   */
  private calculateScore(
    config: any,
    health: any,
    options: TaskRoutingOptions
  ): number {
    let score = 100;

    // Priority (lower is better, so higher score)
    const priority = config.priority || 100;
    score -= priority * 0.1;

    // Health status
    if (health.status === 'degraded') {
      score -= 20;
    }

    // Latency (lower is better)
    if (health.latency) {
      score -= health.latency * 0.01;
    }

    // Cost optimization
    if (options.costOptimization && config.cost) {
      const avgCost = (config.cost.inputPerToken + config.cost.outputPerToken) / 2;
      score -= avgCost * 1000; // Penalize high cost
    }

    // Speed optimization
    if (options.speedOptimization && config.latency) {
      score -= config.latency.p50 * 0.1;
    }

    // Preferred for this task type
    if (config.preferredFor?.includes(options.type)) {
      score += 50;
    }

    return Math.max(0, score);
  }

  /**
   * Select best model from candidates
   */
  private selectBestModel(
    candidates: Array<{ id: string; provider: string; config: any; score: number }>,
    options: TaskRoutingOptions
  ): {
    id: string;
    provider: string;
    confidence: number;
    reason: string;
  } {
    const best = candidates[0];

    let reason = `Selected ${best.config.name} based on `;
    if (options.costOptimization) {
      reason += 'cost optimization';
    } else if (options.speedOptimization) {
      reason += 'speed optimization';
    } else {
      reason += 'priority and score';
    }

    const confidence = best.score > 80 ? 0.9 : best.score > 60 ? 0.7 : 0.5;

    return {
      id: best.id,
      provider: best.provider,
      confidence,
      reason,
    };
  }

  /**
   * Build fallback chain
   */
  private buildFallbackChain(
    selected: { id: string; provider: string },
    options: TaskRoutingOptions
  ): string[] {
    const config = this.registry.getModelConfig(selected.id);
    if (!config) return [];

    const fallbackChain: string[] = [];

    // Use explicit fallback list if available
    if (config.fallbackTo) {
      for (const fallbackId of config.fallbackTo) {
        if (this.registry.hasModel(fallbackId)) {
          const health = this.registry.getHealthStatus(fallbackId);
          if (health && health.status === 'healthy') {
            fallbackChain.push(fallbackId);
          }
        }
      }
    }

    // Add default fallback provider
    const defaultFallback = this.registry.getBestModel({
      location: options.requiresPrivacy ? 'local' : undefined,
    });

    // Find fallback model ID
    for (const modelId of this.registry.getEnabledProviders()) {
      if (modelId !== selected.id && !fallbackChain.includes(modelId)) {
        const health = this.registry.getHealthStatus(modelId);
        if (health && health.status === 'healthy') {
          fallbackChain.push(modelId);
          break;
        }
      }
    }

    return fallbackChain;
  }

  /**
   * Get required capabilities for task type
   */
  private getRequiredCapabilities(taskType: string): (keyof ModelCapabilityFlags)[] {
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
}

