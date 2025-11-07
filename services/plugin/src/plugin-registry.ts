/**
 * Plugin Registry
 * 
 * Registry for managing plugins
 */

import { PluginLoader } from '@aura/core';
import { AuraPlugin } from '@aura/plugins';
import { createLogger } from '@aura/utils';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface PluginInfo {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  enabled: boolean;
  loaded: boolean;
  path?: string;
  source?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Plugin Registry
 */
export class PluginRegistry extends EventEmitter {
  private plugins: Map<string, AuraPlugin> = new Map();
  private pluginInfo: Map<string, PluginInfo> = new Map();
  private loader: PluginLoader;

  constructor() {
    super();
    this.loader = new PluginLoader();
  }

  /**
   * Load plugin from path
   */
  async loadPlugin(pluginId: string, path: string, metadata?: Record<string, any>): Promise<void> {
    if (this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is already loaded`);
    }

    try {
      // Load plugin using PluginLoader
      await this.loader.loadPlugins(path, false);
      const loadedPlugins = this.loader.getAllPlugins();
      
      if (loadedPlugins.length === 0) {
        throw new Error(`No plugins found at ${path}`);
      }

      // Get the first plugin (assuming one plugin per path)
      const plugin = loadedPlugins[0];

      // Store plugin
      this.plugins.set(pluginId, plugin);

      // Store plugin info
      this.pluginInfo.set(pluginId, {
        id: pluginId,
        name: metadata?.name || pluginId,
        version: metadata?.version || '1.0.0',
        description: metadata?.description,
        author: metadata?.author,
        enabled: true,
        loaded: true,
        path,
        source: metadata?.source,
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info(`Plugin loaded`, { pluginId, path });
      this.emit('pluginLoaded', pluginId);
    } catch (error) {
      logger.error(`Failed to load plugin`, { pluginId, path, error });
      throw error;
    }
  }

  /**
   * Load plugin from npm package
   */
  async loadFromNPM(pluginId: string, packageName: string, version?: string): Promise<void> {
    // This would require npm package installation
    // For now, we'll just store the reference
    this.pluginInfo.set(pluginId, {
      id: pluginId,
      name: packageName,
      version: version || 'latest',
      enabled: true,
      loaded: false,
      source: 'npm',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`Plugin registered from npm`, { pluginId, packageName, version });
  }

  /**
   * Load plugin from URL
   */
  async loadFromURL(pluginId: string, url: string, metadata?: Record<string, any>): Promise<void> {
    // This would require downloading and loading the plugin
    // For now, we'll just store the reference
    this.pluginInfo.set(pluginId, {
      id: pluginId,
      name: metadata?.name || pluginId,
      version: metadata?.version || '1.0.0',
      enabled: true,
      loaded: false,
      source: url,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info(`Plugin registered from URL`, { pluginId, url });
  }

  /**
   * Get plugin by ID
   */
  get(pluginId: string): AuraPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get plugin info
   */
  getInfo(pluginId: string): PluginInfo | undefined {
    return this.pluginInfo.get(pluginId);
  }

  /**
   * Check if plugin exists
   */
  has(pluginId: string): boolean {
    return this.plugins.has(pluginId) || this.pluginInfo.has(pluginId);
  }

  /**
   * List all plugins
   */
  list(): PluginInfo[] {
    return Array.from(this.pluginInfo.values());
  }

  /**
   * Enable plugin
   */
  enable(pluginId: string): void {
    const info = this.pluginInfo.get(pluginId);
    if (!info) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    info.enabled = true;
    info.updatedAt = new Date();
    logger.info(`Plugin enabled`, { pluginId });
    this.emit('pluginEnabled', pluginId);
  }

  /**
   * Disable plugin
   */
  disable(pluginId: string): void {
    const info = this.pluginInfo.get(pluginId);
    if (!info) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    info.enabled = false;
    info.updatedAt = new Date();
    logger.info(`Plugin disabled`, { pluginId });
    this.emit('pluginDisabled', pluginId);
  }

  /**
   * Unload plugin
   */
  async unload(pluginId: string): Promise<void> {
    if (!this.plugins.has(pluginId) && !this.pluginInfo.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    this.plugins.delete(pluginId);
    this.pluginInfo.delete(pluginId);

    logger.info(`Plugin unloaded`, { pluginId });
    this.emit('pluginUnloaded', pluginId);
  }

  /**
   * Get enabled plugins
   */
  getEnabled(): AuraPlugin[] {
    const enabled: AuraPlugin[] = [];
    for (const [id, info] of this.pluginInfo.entries()) {
      if (info.enabled && this.plugins.has(id)) {
        enabled.push(this.plugins.get(id)!);
      }
    }
    return enabled;
  }

  /**
   * Get plugin count
   */
  getCount(): number {
    return this.pluginInfo.size;
  }
}
