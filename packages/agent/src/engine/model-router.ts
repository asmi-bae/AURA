/**
 * Model Router
 * 
 * Routes tasks to appropriate AI models based on latency, cost,
 * privacy policy, and capability.
 * 
 * @module @aura/agent/engine
 */

import { createLogger } from '@aura/utils';
import { ModelRegistry } from '@aura/ai';

const logger = createLogger();

/**
 * Model Router configuration
 */
export interface ModelRouterConfig {
  modelRegistry?: ModelRegistry;
  enableLocalLLM?: boolean;
  offlineMode?: boolean;
  preferences?: {
    preferLocal?: boolean;
    preferFast?: boolean;
    preferCheap?: boolean;
  };
}

/**
 * Model Router
 * 
 * Routes tasks to appropriate AI models.
 */
export class ModelRouter {
  private config: ModelRouterConfig;
  private logger = createLogger();
  private modelRegistry?: ModelRegistry;

  constructor(config: ModelRouterConfig) {
    this.config = config;
    this.modelRegistry = config.modelRegistry;
  }

  /**
   * Initialize the model router
   */
  async init(): Promise<void> {
    logger.info('Model router initialized', {
      hasRegistry: !!this.modelRegistry,
      offlineMode: this.config.offlineMode ?? false,
    });
  }

  /**
   * Get model for task
   */
  getModelForTask(taskType: string, context?: Record<string, any>): any {
    if (!this.modelRegistry) {
      return null;
    }

    // Route based on task type and preferences
    if (this.config.offlineMode || this.config.preferences?.preferLocal) {
      return this.modelRegistry.getModel('ollama');
    }

    if (taskType === 'vision' || taskType === 'image') {
      return this.modelRegistry.getModel('google'); // Gemini for vision
    }

    if (taskType === 'reasoning' || taskType === 'analysis') {
      return this.modelRegistry.getModel('anthropic'); // Claude for reasoning
    }

    // Default to GPT
    return this.modelRegistry.getModel('openai');
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    logger.info('Model router cleanup completed');
  }
}

