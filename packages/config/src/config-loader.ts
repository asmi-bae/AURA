/**
 * Configuration Loader
 * 
 * Loads and manages application configuration from environment variables and config files
 */

import { config as loadDotEnv } from 'dotenv';
import { createLogger } from '@aura/utils';
import { validateEnv, type EnvConfig } from './env-validator';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const logger = createLogger();

export interface ConfigOptions {
  /** Path to .env file */
  envPath?: string;
  /** Path to config file (JSON) */
  configPath?: string;
  /** Whether to validate environment variables */
  validate?: boolean;
  /** Whether to override existing env vars */
  override?: boolean;
}

export interface AppConfig extends EnvConfig {
  /** Application name */
  appName: string;
  /** Application version */
  appVersion: string;
  /** Application description */
  appDescription?: string;
  /** Base URL */
  baseUrl?: string;
  /** API version */
  apiVersion?: string;
  /** Service registry URL */
  serviceRegistryUrl?: string;
}

/**
 * Configuration Loader Class
 */
export class ConfigLoader {
  private config: AppConfig | null = null;
  private options: ConfigOptions;

  constructor(options: ConfigOptions = {}) {
    this.options = {
      validate: true,
      override: false,
      ...options,
    };
  }

  /**
   * Load configuration
   */
  load(): AppConfig {
    if (this.config) {
      return this.config;
    }

    // Load .env file
    if (this.options.envPath) {
      const envResult = loadDotEnv({ path: this.options.envPath, override: this.options.override });
      if (envResult.error) {
        logger.warn('Failed to load .env file', { error: envResult.error.message });
      } else {
        logger.info('Loaded .env file', { path: this.options.envPath });
      }
    } else {
      // Try default .env locations
      const defaultPaths = ['.env', '.env.local', '.env.production', '.env.development'];
      for (const path of defaultPaths) {
        if (existsSync(path)) {
          loadDotEnv({ path, override: this.options.override });
          logger.info('Loaded .env file', { path });
          break;
        }
      }
    }

    // Load config file (JSON)
    let configData: Partial<AppConfig> = {};
    if (this.options.configPath && existsSync(this.options.configPath)) {
      try {
        const configFile = readFileSync(this.options.configPath, 'utf-8');
        configData = JSON.parse(configFile);
        logger.info('Loaded config file', { path: this.options.configPath });
      } catch (error) {
        logger.error('Failed to load config file', { error, path: this.options.configPath });
      }
    }

    // Validate environment variables
    let envConfig: EnvConfig;
    if (this.options.validate) {
      envConfig = validateEnv(process.env);
    } else {
      // Use schema with safeParse for non-strict validation
      const result = require('./env-validator').envSchema.safeParse(process.env);
      if (result.success) {
        envConfig = result.data;
      } else {
        logger.warn('Environment validation failed, using partial config', { errors: result.error.errors });
        envConfig = process.env as any;
      }
    }

    // Merge config
    this.config = {
      ...envConfig,
      ...configData,
      appName: configData.appName || process.env.APP_NAME || 'AURA',
      appVersion: configData.appVersion || process.env.APP_VERSION || '0.0.1',
      appDescription: configData.appDescription || process.env.APP_DESCRIPTION,
      baseUrl: configData.baseUrl || process.env.BASE_URL,
      apiVersion: configData.apiVersion || process.env.API_VERSION || 'v1',
      serviceRegistryUrl: configData.serviceRegistryUrl || process.env.SERVICE_REGISTRY_URL,
    } as AppConfig;

    logger.info('Configuration loaded successfully', {
      appName: this.config.appName,
      appVersion: this.config.appVersion,
      nodeEnv: this.config.NODE_ENV,
    });

    return this.config;
  }

  /**
   * Get configuration
   */
  getConfig(): AppConfig {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * Reload configuration
   */
  reload(): AppConfig {
    this.config = null;
    return this.load();
  }

  /**
   * Get a specific config value
   */
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    const config = this.getConfig();
    return config[key];
  }
}

// Singleton instance
let globalConfigLoader: ConfigLoader | null = null;

/**
 * Get global config loader instance
 */
export function getConfigLoader(options?: ConfigOptions): ConfigLoader {
  if (!globalConfigLoader) {
    globalConfigLoader = new ConfigLoader(options);
  }
  return globalConfigLoader;
}

/**
 * Get application configuration
 */
export function getConfig(options?: ConfigOptions): AppConfig {
  return getConfigLoader(options).getConfig();
}

/**
 * Initialize configuration
 */
export function initConfig(options?: ConfigOptions): AppConfig {
  return getConfigLoader(options).load();
}
