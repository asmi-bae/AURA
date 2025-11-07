/**
 * AI Trigger
 * 
 * Trigger workflows based on AI model predictions or classifications
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';
import { ModelRegistry } from '@aura/ai';

const logger = createLogger();

export interface AITriggerConfig {
  modelId: string;
  prompt: string;
  threshold?: number; // Confidence threshold (0-1)
  checkInterval?: number; // How often to check (ms)
  context?: Record<string, any>;
}

export interface AITriggerPayload {
  triggerId: string;
  modelId: string;
  prediction: any;
  confidence: number;
  timestamp: Date;
  context?: Record<string, any>;
}

/**
 * AI Trigger
 */
export class AITrigger extends EventEmitter {
  private config: Required<Omit<AITriggerConfig, 'context'>> & { context?: Record<string, any> };
  private registeredTriggers: Map<string, { workflowId: string; interval: NodeJS.Timeout | null }> = new Map();
  private modelRegistry: ModelRegistry;
  private lastPredictions: Map<string, any> = new Map();

  constructor(config: AITriggerConfig, modelRegistry: ModelRegistry) {
    super();
    this.config = {
      threshold: config.threshold || 0.7,
      checkInterval: config.checkInterval || 60000, // Default 1 minute
      ...config,
    };
    this.modelRegistry = modelRegistry;
  }

  /**
   * Register a workflow for AI trigger
   */
  async register(workflowId: string, triggerId?: string): Promise<string> {
    const id = triggerId || `ai_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    // Verify model exists
    const model = this.modelRegistry.getModel(this.config.modelId);
    if (!model) {
      throw new Error(`Model ${this.config.modelId} not found`);
    }

    // Initialize last prediction
    this.lastPredictions.set(id, null);

    // Create check interval
    const interval = setInterval(async () => {
      try {
        await this.check(id, workflowId);
      } catch (error) {
        logger.error(`AI trigger check failed`, { triggerId: id, error });
      }
    }, this.config.checkInterval);

    this.registeredTriggers.set(id, { workflowId, interval });
    logger.info(`AI trigger registered`, { triggerId: id, workflowId, modelId: this.config.modelId });
    this.emit('registered', id, workflowId);

    // Perform initial check
    await this.check(id, workflowId);

    return id;
  }

  /**
   * Check AI prediction and trigger if threshold met
   */
  private async check(triggerId: string, workflowId: string): Promise<void> {
    try {
      // Get model
      const model = this.modelRegistry.getModel(this.config.modelId);
      if (!model) {
        logger.error(`Model not found`, { modelId: this.config.modelId });
        return;
      }

      // Prepare prompt with context
      const prompt = this.buildPrompt();

      // Get prediction (using model's generate method if available)
      let response: string;
      if (typeof (model as any).generate === 'function') {
        response = await (model as any).generate(prompt, {
          maxTokens: 100,
          temperature: 0.7,
        });
      } else if (typeof (model as any).complete === 'function') {
        response = await (model as any).complete(prompt);
      } else {
        throw new Error(`Model ${this.config.modelId} does not support generation`);
      }

      // Parse prediction (assuming JSON response)
      let prediction: any;
      let confidence = 1.0;

      try {
        const parsed = JSON.parse(response);
        prediction = parsed.prediction || parsed;
        confidence = parsed.confidence || 1.0;
      } catch {
        // If not JSON, use response as prediction
        prediction = response;
        confidence = 1.0;
      }

      // Check if threshold is met
      if (confidence >= this.config.threshold) {
        // Check if prediction changed
        const lastPrediction = this.lastPredictions.get(triggerId);
        if (JSON.stringify(prediction) !== JSON.stringify(lastPrediction)) {
          this.lastPredictions.set(triggerId, prediction);

          const payload: AITriggerPayload = {
            triggerId,
            modelId: this.config.modelId,
            prediction,
            confidence,
            timestamp: new Date(),
            context: this.config.context,
          };

          logger.info(`AI trigger fired`, { triggerId, workflowId, confidence, prediction });
          this.emit('triggered', triggerId, workflowId, payload);
        }
      }
    } catch (error) {
      logger.error(`AI trigger check error`, { triggerId, error });
      this.emit('error', triggerId, error);
    }
  }

  /**
   * Build prompt with context
   */
  private buildPrompt(): string {
    let prompt = this.config.prompt;

    if (this.config.context) {
      const contextStr = JSON.stringify(this.config.context, null, 2);
      prompt = `${prompt}\n\nContext:\n${contextStr}`;
    }

    return prompt;
  }

  /**
   * Unregister a trigger
   */
  unregister(triggerId: string): void {
    const trigger = this.registeredTriggers.get(triggerId);
    if (trigger) {
      if (trigger.interval) {
        clearInterval(trigger.interval);
      }
      this.registeredTriggers.delete(triggerId);
      this.lastPredictions.delete(triggerId);
      logger.info(`AI trigger unregistered`, { triggerId });
      this.emit('unregistered', triggerId);
    }
  }

  /**
   * Get workflow ID for trigger
   */
  getWorkflowId(triggerId: string): string | undefined {
    return this.registeredTriggers.get(triggerId)?.workflowId;
  }

  /**
   * Get registered triggers
   */
  getRegistered(): Map<string, string> {
    const result = new Map<string, string>();
    for (const [id, { workflowId }] of this.registeredTriggers.entries()) {
      result.set(id, workflowId);
    }
    return result;
  }

  /**
   * Update context
   */
  updateContext(context: Record<string, any>): void {
    this.config.context = { ...this.config.context, ...context };
    logger.info(`AI trigger context updated`, { context: this.config.context });
  }

  /**
   * Clear all triggers
   */
  clear(): void {
    for (const [id] of this.registeredTriggers.entries()) {
      this.unregister(id);
    }
  }
}
