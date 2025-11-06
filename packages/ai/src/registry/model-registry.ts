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

import { createLogger } from '@aura/utils';
import { ModelProvider } from '../types';
import { GPTService, GPTConfig } from '../models/gpt';
import { ClaudeService, ClaudeConfig } from '../models/claude';
import { GeminiService, GeminiConfig } from '../models/gemini';
import { OllamaService, OllamaConfig } from '../models/ollama';

const logger = createLogger();

/**
 * Model capability flags
 * Defines what capabilities a model supports
 */
export interface ModelCapabilityFlags {
  reasoning: boolean;
  multimodal: boolean;
  vision: boolean;
  audio: boolean;
  embeddings: boolean;
  functionCalling: boolean;
}

/**
 * Model performance characteristics
 */
export interface ModelPerformance {
  p50: number; // milliseconds
  p95: number;
  p99: number;
}

/**
 * Model cost structure
 */
export interface ModelCost {
  inputPerToken: number; // $ per token
  outputPerToken: number;
}

/**
 * Model configuration
 */
export interface RegistryModelConfig {
  // Provider identification
  provider: ModelProvider | 'local';
  id: string;
  name: string;
  version: string;
  
  // Capabilities
  capabilities: ModelCapabilityFlags;
  
  // Execution details
  location: 'cloud' | 'local' | 'edge';
  endpoint?: string;
  apiKey?: string;
  
  // Performance characteristics
  maxContextLength: number;
  maxOutputLength: number;
  latency?: ModelPerformance;
  cost?: ModelCost;
  
  // Routing preferences
  priority: number; // Lower = higher priority
  fallbackTo?: string[]; // Fallback model IDs
  preferredFor?: string[]; // Task types this model excels at
  
  // Availability
  enabled: boolean;
  healthCheck?: string; // Health check endpoint
  offlineCapable: boolean;
  
  // Privacy & compliance
  requiresPrivacyMode?: boolean;
  dataRetention?: 'none' | 'short' | 'long';
  compliance?: ('gdpr' | 'hipaa' | 'soc2')[];
  
  // Provider-specific config
  config: GPTConfig | ClaudeConfig | GeminiConfig | OllamaConfig;
}

/**
 * Model preferences
 */
export interface ModelPreferences {
  defaultProvider?: ModelProvider;
  preferredModels?: Record<ModelProvider, string>;
  fallbackProvider?: ModelProvider;
  costOptimization?: boolean;
  speedOptimization?: boolean;
  preferLocal?: boolean;
  preferCloud?: boolean;
  requirePrivacy?: boolean;
}

/**
 * Task routing options
 */
export interface TaskRoutingOptions {
  type: 'reasoning' | 'vision' | 'audio' | 'embedding' | 'rag' | 'function' | 'supervisor';
  contextLength?: number;
  requiresPrivacy?: boolean;
  preferredProvider?: ModelProvider;
  fallbackToLocal?: boolean;
  costOptimization?: boolean;
  speedOptimization?: boolean;
  capabilities?: (keyof ModelCapabilityFlags)[];
}

/**
 * Model health status
 */
export interface ModelHealthStatus {
  model: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  errorRate: number;
  lastCheck: Date;
  uptime: number; // percentage
}

/**
 * Cost metrics
 */
export interface CostMetrics {
  model: string;
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: {
    input: number; // $USD
    output: number;
    total: number;
  };
  latency: number; // milliseconds
  timestamp: Date;
}

/**
 * Model Registry
 * 
 * Manages multiple AI model providers and routes requests appropriately.
 */
export class ModelRegistry {
  private models: Map<string, GPTService | ClaudeService | GeminiService | OllamaService> = new Map();
  private configs: Map<string, RegistryModelConfig> = new Map();
  private priorities: Map<string, number> = new Map();
  private enabled: Set<string> = new Set();
  private healthStatus: Map<string, ModelHealthStatus> = new Map();
  private costMetrics: Map<string, CostMetrics[]> = new Map();
  private logger = createLogger();
  private preferences: ModelPreferences = {};
  private versionPins: Map<string, string> = new Map();
  private updatePolicies: Map<string, {
    allowMinor: boolean;
    allowPatch: boolean;
    requireApproval: boolean;
  }> = new Map();

  /**
   * Register a model
   */
  registerModel(config: RegistryModelConfig): void {
    try {
      let model: GPTService | ClaudeService | GeminiService | OllamaService;

      switch (config.provider) {
        case 'openai':
          model = new GPTService(config.config as GPTConfig);
          break;
        case 'anthropic':
          model = new ClaudeService(config.config as ClaudeConfig);
          break;
        case 'google':
          model = new GeminiService(config.config as GeminiConfig);
          break;
        case 'ollama':
        case 'local':
          model = new OllamaService(config.config as OllamaConfig);
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
    } catch (error) {
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
  getModel(modelId?: string): GPTService | ClaudeService | GeminiService | OllamaService {
    const requestedModel = modelId || this.preferences.defaultProvider || 'openai';
    
    // Check if model is enabled and available
    if (this.models.has(requestedModel) && this.enabled.has(requestedModel)) {
      const health = this.healthStatus.get(requestedModel);
      if (health && health.status === 'healthy') {
        return this.models.get(requestedModel)!;
      }
    }

    // Try fallback provider
    const fallback = this.preferences.fallbackProvider || 'ollama';
    if (this.models.has(fallback) && this.enabled.has(fallback)) {
      this.logger.warn('Using fallback model', { fallback });
      return this.models.get(fallback)!;
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
  getModelForTask(options: TaskRoutingOptions): GPTService | ClaudeService | GeminiService | OllamaService {
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
  getBestModel(options: {
    capabilities?: (keyof ModelCapabilityFlags)[];
    location?: 'cloud' | 'local' | 'edge';
    costOptimization?: boolean;
    speedOptimization?: boolean;
  }): GPTService | ClaudeService | GeminiService | OllamaService {
    const candidates: string[] = [];

    for (const [id, config] of this.configs.entries()) {
      if (!this.enabled.has(id)) continue;

      // Check location
      if (options.location && config.location !== options.location) continue;

      // Check capabilities
      if (options.capabilities) {
        const hasAllCapabilities = options.capabilities.every(
          cap => config.capabilities[cap] === true
        );
        if (!hasAllCapabilities) continue;
      }

      // Check health
      const health = this.healthStatus.get(id);
      if (health && health.status !== 'healthy') continue;

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
  private getCandidatesForTask(options: TaskRoutingOptions): string[] {
    const candidates: string[] = [];
    const requiredCapabilities = this.getRequiredCapabilities(options.type);

    for (const [id, config] of this.configs.entries()) {
      if (!this.enabled.has(id)) continue;

      // Check context length
      if (options.contextLength && config.maxContextLength < options.contextLength) {
        continue;
      }

      // Check capabilities
      const hasRequiredCapabilities = requiredCapabilities.every(
        cap => config.capabilities[cap] === true
      );
      if (!hasRequiredCapabilities) continue;

      // Check additional capabilities if specified
      if (options.capabilities) {
        const hasAllCapabilities = options.capabilities.every(
          cap => config.capabilities[cap] === true
        );
        if (!hasAllCapabilities) continue;
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

  /**
   * Get best local model
   */
  private getBestLocalModel(options: TaskRoutingOptions): GPTService | ClaudeService | GeminiService | OllamaService | null {
    const localCandidates = Array.from(this.configs.entries())
      .filter(([id, config]) => {
        if (config.location !== 'local') return false;
        if (!this.enabled.has(id)) return false;
        if (!config.offlineCapable) return false;
        
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
  private selectByPriority(candidates: string[]): GPTService | ClaudeService | GeminiService | OllamaService {
    const sorted = candidates.sort((a, b) => {
      const priorityA = this.priorities.get(a) || 100;
      const priorityB = this.priorities.get(b) || 100;
      return priorityA - priorityB;
    });

    return this.models.get(sorted[0])!;
  }

  /**
   * Select cheapest model
   */
  private selectCheapestModel(candidates: string[]): GPTService | ClaudeService | GeminiService | OllamaService {
    let cheapest: string | null = null;
    let lowestCost = Infinity;

    for (const id of candidates) {
      const config = this.configs.get(id);
      if (!config || !config.cost) continue;

      const avgCost = (config.cost.inputPerToken + config.cost.outputPerToken) / 2;
      if (avgCost < lowestCost) {
        lowestCost = avgCost;
        cheapest = id;
      }
    }

    if (cheapest) {
      return this.models.get(cheapest)!;
    }

    // Fallback to priority if no cost data
    return this.selectByPriority(candidates);
  }

  /**
   * Select fastest model
   */
  private selectFastestModel(candidates: string[]): GPTService | ClaudeService | GeminiService | OllamaService {
    let fastest: string | null = null;
    let lowestLatency = Infinity;

    for (const id of candidates) {
      const health = this.healthStatus.get(id);
      if (!health) continue;

      if (health.latency < lowestLatency) {
        lowestLatency = health.latency;
        fastest = id;
      }
    }

    if (fastest) {
      return this.models.get(fastest)!;
    }

    // Fallback to priority if no latency data
    return this.selectByPriority(candidates);
  }

  /**
   * Set model preferences
   */
  setPreferences(preferences: ModelPreferences): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.logger.info('Model preferences updated', { preferences });
  }

  /**
   * Pin model version
   */
  pinVersion(modelId: string, version: string): void {
    this.versionPins.set(modelId, version);
    this.logger.info('Model version pinned', { modelId, version });
  }

  /**
   * Set update policy
   */
  setUpdatePolicy(modelId: string, policy: {
    allowMinor: boolean;
    allowPatch: boolean;
    requireApproval: boolean;
  }): void {
    this.updatePolicies.set(modelId, policy);
    this.logger.info('Update policy set', { modelId, policy });
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): ModelProvider[] {
    return Array.from(new Set(
      Array.from(this.configs.values()).map(c => c.provider as ModelProvider)
    ));
  }

  /**
   * Get enabled providers
   */
  getEnabledProviders(): string[] {
    return Array.from(this.enabled);
  }

  /**
   * Check if provider is available
   */
  hasModel(modelId: string): boolean {
    return this.models.has(modelId) && this.enabled.has(modelId);
  }

  /**
   * Enable a model
   */
  enableModel(modelId: string): void {
    if (this.models.has(modelId)) {
      this.enabled.add(modelId);
      this.logger.info('Model enabled', { modelId });
    }
  }

  /**
   * Disable a model
   */
  disableModel(modelId: string): void {
    this.enabled.delete(modelId);
    this.logger.info('Model disabled', { modelId });
  }

  /**
   * Get model configuration
   */
  getModelConfig(modelId: string): RegistryModelConfig | undefined {
    return this.configs.get(modelId);
  }

  /**
   * Get health status
   */
  getHealthStatus(modelId: string): ModelHealthStatus | undefined {
    return this.healthStatus.get(modelId);
  }

  /**
   * Update health status
   */
  async updateHealthStatus(modelId: string, status: Partial<ModelHealthStatus>): Promise<void> {
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
  recordCostMetrics(metrics: CostMetrics): void {
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
  getCostMetrics(modelId: string, limit?: number): CostMetrics[] {
    const metrics = this.costMetrics.get(modelId) || [];
    return limit ? metrics.slice(-limit) : metrics;
  }

  /**
   * Get total costs
   */
  getTotalCosts(timeRange?: { start: Date; end: Date }): Record<string, number> {
    const totals: Record<string, number> = {};

    for (const [modelId, metrics] of this.costMetrics.entries()) {
      let filtered = metrics;
      
      if (timeRange) {
        filtered = metrics.filter(m => 
          m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        );
      }

      const total = filtered.reduce((sum, m) => sum + m.cost.total, 0);
      totals[modelId] = total;
    }

    return totals;
  }

  /**
   * Unregister a model
   */
  unregisterModel(modelId: string): void {
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
