/**
 * Model Factory
 * 
 * Factory for creating AI model instances dynamically.
 * Supports registration of custom models and adapters.
 * 
 * @module @aura/ai/core/model-factory
 */

import { IModel, ModelConfig, ModelMetadata } from './interfaces';
import { IModelAdapter } from './interfaces';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Model factory for creating model instances
 */
export class ModelFactory {
  private static adapters = new Map<string, IModelAdapter>();
  private static modelClasses = new Map<string, new (config: ModelConfig) => IModel>();

  /**
   * Register a model adapter
   */
  static registerAdapter(provider: string, adapter: IModelAdapter): void {
    this.adapters.set(provider, adapter);
    logger.info('Model adapter registered', { provider });
  }

  /**
   * Register a model class
   */
  static registerModel(provider: string, modelClass: new (config: ModelConfig) => IModel): void {
    this.modelClasses.set(provider, modelClass);
    logger.info('Model class registered', { provider });
  }

  /**
   * Create a model instance
   */
  static create(provider: string, config: ModelConfig): IModel {
    // Try to use registered model class first
    const ModelClass = this.modelClasses.get(provider);
    if (ModelClass) {
      return new ModelClass(config);
    }

    // Try to use adapter
    const adapter = this.adapters.get(provider);
    if (adapter) {
      // Adapter needs a provider-specific model instance
      // This would be created by the adapter itself
      throw new Error(`Adapter for ${provider} requires provider-specific model instance`);
    }

    throw new Error(`No model implementation found for provider: ${provider}`);
  }

  /**
   * Create model from metadata
   */
  static createFromMetadata(metadata: ModelMetadata, config: ModelConfig): IModel {
    return this.create(metadata.provider, {
      ...config,
      model: metadata.modelId,
    });
  }

  /**
   * List registered providers
   */
  static getRegisteredProviders(): string[] {
    const providers = new Set<string>();
    this.adapters.forEach((_, provider) => providers.add(provider));
    this.modelClasses.forEach((_, provider) => providers.add(provider));
    return Array.from(providers);
  }

  /**
   * Check if provider is registered
   */
  static isRegistered(provider: string): boolean {
    return this.adapters.has(provider) || this.modelClasses.has(provider);
  }
}

