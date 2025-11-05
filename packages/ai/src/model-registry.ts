import { GPTIntegration, GPTConfig } from './gpt';
import { ClaudeIntegration, ClaudeConfig } from './claude';
import { GeminiIntegration, GeminiConfig } from './gemini';
import { OllamaIntegration, OllamaConfig } from './ollama';
import { createLogger } from '@aura/utils';

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'ollama';

export interface ModelConfig {
  provider: ModelProvider;
  config: GPTConfig | ClaudeConfig | GeminiConfig | OllamaConfig;
  priority?: number; // Lower number = higher priority
}

export interface ModelPreferences {
  defaultProvider?: ModelProvider;
  preferredModels?: Record<ModelProvider, string>;
  fallbackProvider?: ModelProvider;
}

export class ModelRegistry {
  private models: Map<ModelProvider, GPTIntegration | ClaudeIntegration | GeminiIntegration | OllamaIntegration> = new Map();
  private logger = createLogger();
  private preferences: ModelPreferences = {};

  registerModel(config: ModelConfig): void {
    try {
      let model: GPTIntegration | ClaudeIntegration | GeminiIntegration | OllamaIntegration;

      switch (config.provider) {
        case 'openai':
          model = new GPTIntegration(config.config as GPTConfig);
          break;
        case 'anthropic':
          model = new ClaudeIntegration(config.config as ClaudeConfig);
          break;
        case 'google':
          model = new GeminiIntegration(config.config as GeminiConfig);
          break;
        case 'ollama':
          model = new OllamaIntegration(config.config as OllamaConfig);
          break;
        default:
          throw new Error(`Unsupported model provider: ${config.provider}`);
      }

      this.models.set(config.provider, model);
      this.logger.info(`Registered model provider: ${config.provider}`);
    } catch (error) {
      this.logger.error(`Error registering model provider: ${config.provider}`, { error });
      throw error;
    }
  }

  getModel(provider?: ModelProvider): GPTIntegration | ClaudeIntegration | GeminiIntegration | OllamaIntegration {
    const requestedProvider = provider || this.preferences.defaultProvider || 'openai';
    const model = this.models.get(requestedProvider);

    if (!model) {
      // Try fallback
      const fallback = this.preferences.fallbackProvider || 'ollama';
      const fallbackModel = this.models.get(fallback);
      
      if (!fallbackModel) {
        throw new Error(`No model available for provider: ${requestedProvider} or fallback: ${fallback}`);
      }

      this.logger.warn(`Using fallback model: ${fallback}`);
      return fallbackModel;
    }

    return model;
  }

  setPreferences(preferences: ModelPreferences): void {
    this.preferences = { ...this.preferences, ...preferences };
  }

  getAllModels(): ModelProvider[] {
    return Array.from(this.models.keys());
  }

  hasModel(provider: ModelProvider): boolean {
    return this.models.has(provider);
  }
}

// Multi-agent coordination
export class MultiAgentOrchestrator {
  private registry: ModelRegistry;
  private logger = createLogger();
  private contextMemory: Map<string, any> = new Map();

  constructor(registry: ModelRegistry) {
    this.registry = registry;
  }

  async coordinateTask(
    task: string,
    context: Record<string, any>,
    agents: Array<{ provider: ModelProvider; role: string }>
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    // Execute tasks in parallel or sequence based on agent roles
    for (const agent of agents) {
      try {
        const model = this.registry.getModel(agent.provider);
        const agentContext = {
          ...context,
          role: agent.role,
          previousResults: results,
        };

        // Use context memory for coordination
        const memoryKey = `${agent.provider}:${agent.role}`;
        const previousMemory = this.contextMemory.get(memoryKey) || [];

        const messages = [
          ...previousMemory,
          {
            role: 'user' as const,
            content: `Task: ${task}\nContext: ${JSON.stringify(agentContext)}`,
          },
        ];

        let response: string;
        if (model instanceof GPTIntegration) {
          response = await model.chatCompletion(messages);
        } else if (model instanceof ClaudeIntegration) {
          response = await model.chatCompletion(messages);
        } else if (model instanceof GeminiIntegration) {
          response = await model.chatCompletion(messages);
        } else if (model instanceof OllamaIntegration) {
          response = await model.chatCompletion(messages);
        } else {
          response = 'Unknown model type';
        }

        results[agent.provider] = {
          role: agent.role,
          response,
          timestamp: new Date(),
        };

        // Update context memory
        previousMemory.push({
          role: 'assistant' as const,
          content: response,
        });
        this.contextMemory.set(memoryKey, previousMemory.slice(-10)); // Keep last 10 messages
      } catch (error) {
        this.logger.error(`Error coordinating task with agent: ${agent.provider}`, { error });
        results[agent.provider] = {
          role: agent.role,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date(),
        };
      }
    }

    return results;
  }

  clearMemory(): void {
    this.contextMemory.clear();
  }
}

