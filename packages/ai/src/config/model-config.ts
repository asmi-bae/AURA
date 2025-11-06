/**
 * Model Configuration Management
 * 
 * Centralized configuration for AI models.
 * Supports loading from files, environment variables, and runtime configuration.
 * 
 * @module @aura/ai/config
 */

import { ModelConfig, ModelMetadata } from '../core/interfaces';
import { createLogger } from '@aura/utils';
import fs from 'fs';
import path from 'path';

const logger = createLogger();

/**
 * Model configuration entry
 */
export interface ModelConfigEntry {
  /** Model metadata */
  metadata: ModelMetadata;
  /** Model configuration */
  config: ModelConfig;
  /** Whether model is enabled */
  enabled: boolean;
  /** Priority (lower = higher priority) */
  priority: number;
  /** Fallback models if this fails */
  fallbackTo?: string[];
}

/**
 * Model configuration manager
 */
export class ModelConfigManager {
  private configs = new Map<string, ModelConfigEntry>();
  private configPath?: string;

  constructor(configPath?: string) {
    this.configPath = configPath;
    if (configPath) {
      this.loadFromFile(configPath);
    }
    this.loadFromEnvironment();
  }

  /**
   * Load configuration from file
   */
  loadFromFile(filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        logger.warn('Model config file not found', { filePath });
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      if (Array.isArray(data.models)) {
        data.models.forEach((entry: ModelConfigEntry) => {
          this.register(entry.metadata.provider, entry);
        });
      }

      logger.info('Model configurations loaded from file', { filePath, count: this.configs.size });
    } catch (error) {
      logger.error('Failed to load model config from file', { error, filePath });
    }
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(): void {
    // Load OpenAI config
    if (process.env.OPENAI_API_KEY) {
      this.register('openai', {
        metadata: {
          provider: 'openai',
          modelId: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
          name: 'OpenAI GPT',
          maxContextLength: 128000,
          maxOutputLength: 4096,
          capabilities: {
            text: true,
            vision: true,
            audio: false,
            functionCalling: true,
            streaming: true,
            embeddings: true,
            multimodal: true,
          },
          location: 'cloud',
          offlineCapable: false,
        },
        config: {
          apiKey: process.env.OPENAI_API_KEY,
          model: process.env.OPENAI_MODEL,
          baseURL: process.env.OPENAI_BASE_URL,
        },
        enabled: true,
        priority: 1,
      });
    }

    // Load Anthropic config
    if (process.env.ANTHROPIC_API_KEY) {
      this.register('anthropic', {
        metadata: {
          provider: 'anthropic',
          modelId: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
          name: 'Anthropic Claude',
          maxContextLength: 200000,
          maxOutputLength: 8192,
          capabilities: {
            text: true,
            vision: true,
            audio: false,
            functionCalling: true,
            streaming: true,
            embeddings: false,
            multimodal: true,
          },
          location: 'cloud',
          offlineCapable: false,
        },
        config: {
          apiKey: process.env.ANTHROPIC_API_KEY,
          model: process.env.ANTHROPIC_MODEL,
        },
        enabled: true,
        priority: 2,
      });
    }

    // Load Google config
    if (process.env.GOOGLE_API_KEY) {
      this.register('google', {
        metadata: {
          provider: 'google',
          modelId: process.env.GOOGLE_MODEL || 'gemini-1.5-pro',
          name: 'Google Gemini',
          maxContextLength: 2000000,
          maxOutputLength: 8192,
          capabilities: {
            text: true,
            vision: true,
            audio: false,
            functionCalling: true,
            streaming: true,
            embeddings: false,
            multimodal: true,
          },
          location: 'cloud',
          offlineCapable: false,
        },
        config: {
          apiKey: process.env.GOOGLE_API_KEY,
          model: process.env.GOOGLE_MODEL,
        },
        enabled: true,
        priority: 3,
      });
    }

    // Load Ollama config
    if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST) {
      this.register('ollama', {
        metadata: {
          provider: 'ollama',
          modelId: process.env.OLLAMA_MODEL || 'llama3',
          name: 'Ollama Local',
          maxContextLength: 8192,
          maxOutputLength: 2048,
          capabilities: {
            text: true,
            vision: false,
            audio: false,
            functionCalling: false,
            streaming: true,
            embeddings: false,
            multimodal: false,
          },
          location: 'local',
          offlineCapable: true,
        },
        config: {
          baseURL: process.env.OLLAMA_BASE_URL || process.env.OLLAMA_HOST || 'http://localhost:11434',
          model: process.env.OLLAMA_MODEL,
        },
        enabled: true,
        priority: 4,
      });
    }
  }

  /**
   * Register a model configuration
   */
  register(provider: string, entry: ModelConfigEntry): void {
    this.configs.set(provider, entry);
    logger.debug('Model configuration registered', { provider });
  }

  /**
   * Get configuration for a provider
   */
  get(provider: string): ModelConfigEntry | undefined {
    return this.configs.get(provider);
  }

  /**
   * Get all enabled configurations
   */
  getEnabled(): ModelConfigEntry[] {
    return Array.from(this.configs.values())
      .filter(entry => entry.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get configuration by capability
   */
  getByCapability(capability: keyof ModelConfigEntry['metadata']['capabilities']): ModelConfigEntry[] {
    return this.getEnabled().filter(entry => entry.metadata.capabilities[capability]);
  }

  /**
   * Save configuration to file
   */
  saveToFile(filePath: string): void {
    try {
      const data = {
        models: Array.from(this.configs.values()),
      };

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      logger.info('Model configurations saved to file', { filePath });
    } catch (error) {
      logger.error('Failed to save model config to file', { error, filePath });
    }
  }
}

/**
 * Default configuration manager instance
 */
export const defaultConfigManager = new ModelConfigManager();

