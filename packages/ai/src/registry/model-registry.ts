/**
 * Model Registry
 * 
 * Central registry for managing multiple AI model providers.
 * Supports dynamic model registration, routing, and fallback strategies.
 * 
 * Features:
 * - Multi-provider support (GPT, Claude, Gemini, Ollama)
 * - Model routing based on preferences
 * - Fallback mechanisms
 * - Priority-based selection
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
 * Model configuration
 */
export interface ModelConfig {
  provider: ModelProvider;
  config: GPTConfig | ClaudeConfig | GeminiConfig | OllamaConfig;
  priority?: number; // Lower number = higher priority
  enabled?: boolean;
}

/**
 * Model preferences
 */
export interface ModelPreferences {
  defaultProvider?: ModelProvider;
  preferredModels?: Record<ModelProvider, string>;
  fallbackProvider?: ModelProvider;
  costOptimization?: boolean; // Prefer cheaper models
  speedOptimization?: boolean; // Prefer faster models
}

/**
 * Model Registry
 * 
 * Manages multiple AI model providers and routes requests appropriately.
 */
export class ModelRegistry {
  private models: Map<ModelProvider, GPTService | ClaudeService | GeminiService | OllamaService> = new Map();
  private priorities: Map<ModelProvider, number> = new Map();
  private enabled: Set<ModelProvider> = new Set();
  private logger = createLogger();
  private preferences: ModelPreferences = {};

  /**
   * Register a model provider
   * 
   * @param config - Model configuration
   */
  registerModel(config: ModelConfig): void {
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
          model = new OllamaService(config.config as OllamaConfig);
          break;
        default:
          throw new Error(`Unsupported model provider: ${config.provider}`);
      }

      this.models.set(config.provider, model);
      this.priorities.set(config.provider, config.priority ?? 100);
      if (config.enabled !== false) {
        this.enabled.add(config.provider);
      }

      this.logger.info(`Model provider registered`, {
        provider: config.provider,
        priority: config.priority ?? 100,
        enabled: config.enabled !== false,
      });
    } catch (error) {
      this.logger.error(`Error registering model provider: ${config.provider}`, { error });
      throw error;
    }
  }

  /**
   * Get a model instance
   * 
   * @param provider - Optional provider name, uses default if not specified
   * @returns Model service instance
   */
  getModel(provider?: ModelProvider): GPTService | ClaudeService | GeminiService | OllamaService {
    const requestedProvider = provider || this.preferences.defaultProvider || 'openai';
    
    // Check if provider is enabled and available
    if (this.models.has(requestedProvider) && this.enabled.has(requestedProvider)) {
      return this.models.get(requestedProvider)!;
    }

    // Try fallback provider
    const fallback = this.preferences.fallbackProvider || 'ollama';
    if (this.models.has(fallback) && this.enabled.has(fallback)) {
      this.logger.warn(`Using fallback model: ${fallback}`);
      return this.models.get(fallback)!;
    }

    // Try any enabled provider
    for (const [provider, model] of this.models.entries()) {
      if (this.enabled.has(provider)) {
        this.logger.warn(`Using available model: ${provider}`);
        return model;
      }
    }

    throw new Error(`No model available. Requested: ${requestedProvider}, Fallback: ${fallback}`);
  }

  /**
   * Get best model based on preferences
   * 
   * @param taskType - Type of task (e.g., 'reasoning', 'fast', 'vision')
   * @returns Best model for the task
   */
  getBestModel(taskType?: 'reasoning' | 'fast' | 'vision' | 'cost-effective'): GPTService | ClaudeService | GeminiService | OllamaService {
    if (taskType === 'reasoning') {
      // Claude is best for reasoning
      if (this.models.has('anthropic') && this.enabled.has('anthropic')) {
        return this.models.get('anthropic')!;
      }
    } else if (taskType === 'vision') {
      // Gemini is best for vision
      if (this.models.has('google') && this.enabled.has('google')) {
        return this.models.get('google')!;
      }
    } else if (taskType === 'fast' || taskType === 'cost-effective') {
      // Ollama is free and fast (local)
      if (this.models.has('ollama') && this.enabled.has('ollama')) {
        return this.models.get('ollama')!;
      }
    }

    // Default: get by priority
    const enabledProviders = Array.from(this.enabled)
      .filter(p => this.models.has(p))
      .sort((a, b) => {
        const priorityA = this.priorities.get(a) || 100;
        const priorityB = this.priorities.get(b) || 100;
        return priorityA - priorityB;
      });

    if (enabledProviders.length > 0) {
      return this.models.get(enabledProviders[0])!;
    }

    return this.getModel();
  }

  /**
   * Set model preferences
   * 
   * @param preferences - Preference configuration
   */
  setPreferences(preferences: ModelPreferences): void {
    this.preferences = { ...this.preferences, ...preferences };
    this.logger.info('Model preferences updated', { preferences });
  }

  /**
   * Get all registered providers
   * 
   * @returns Array of provider names
   */
  getAllProviders(): ModelProvider[] {
    return Array.from(this.models.keys());
  }

  /**
   * Get enabled providers
   * 
   * @returns Array of enabled provider names
   */
  getEnabledProviders(): ModelProvider[] {
    return Array.from(this.enabled);
  }

  /**
   * Check if provider is available
   * 
   * @param provider - Provider name
   * @returns True if provider is registered and enabled
   */
  hasProvider(provider: ModelProvider): boolean {
    return this.models.has(provider) && this.enabled.has(provider);
  }

  /**
   * Enable a provider
   * 
   * @param provider - Provider name
   */
  enableProvider(provider: ModelProvider): void {
    if (this.models.has(provider)) {
      this.enabled.add(provider);
      this.logger.info(`Model provider enabled`, { provider });
    }
  }

  /**
   * Disable a provider
   * 
   * @param provider - Provider name
   */
  disableProvider(provider: ModelProvider): void {
    this.enabled.delete(provider);
    this.logger.info(`Model provider disabled`, { provider });
  }

  /**
   * Unregister a provider
   * 
   * @param provider - Provider name
   */
  unregisterProvider(provider: ModelProvider): void {
    this.models.delete(provider);
    this.enabled.delete(provider);
    this.priorities.delete(provider);
    this.logger.info(`Model provider unregistered`, { provider });
  }
}

