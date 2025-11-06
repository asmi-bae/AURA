/**
 * Capability Registry
 * 
 * Registry for managing capability modules.
 * Loads and manages all available capabilities.
 * 
 * @module @aura/agent/capabilities/core
 */

import { createLogger } from '@aura/utils';
import { AgentCapabilities } from '../../types/capabilities';

const logger = createLogger();

/**
 * Capability interface
 */
export interface Capability {
  name: string;
  execute(action: string, parameters: Record<string, any>): Promise<any>;
  init?(): Promise<void>;
  cleanup?(): Promise<void>;
}

/**
 * Capability Registry
 * 
 * Manages all capability modules.
 */
export class CapabilityRegistry {
  private capabilities: AgentCapabilities;
  private modules: Map<string, Capability> = new Map();
  private moduleLoaders: Map<string, () => Promise<Capability>> = new Map();
  private loadingPromises: Map<string, Promise<Capability>> = new Map();
  private logger = createLogger();

  constructor(capabilities: AgentCapabilities) {
    this.capabilities = capabilities;
    this.setupLazyLoaders();
  }

  /**
   * Setup lazy loaders for capabilities
   */
  private setupLazyLoaders(): void {
    // Register lazy loaders for each capability type
    // This allows capabilities to be loaded on-demand
    const enabledCapabilities = Object.keys(this.capabilities).filter(
      k => this.capabilities[k as keyof AgentCapabilities]
    );

    for (const capabilityName of enabledCapabilities) {
      this.moduleLoaders.set(capabilityName, async () => {
        // Dynamic import based on capability name
        // This is a placeholder - actual implementation would import real modules
        logger.debug('Lazy loading capability', { name: capabilityName });
        return {
          name: capabilityName,
          execute: async (action: string, parameters: Record<string, any>) => {
            throw new Error(`Capability ${capabilityName} not implemented`);
          },
        };
      });
    }
  }

  /**
   * Initialize registry (lazy loading enabled)
   */
  async init(): Promise<void> {
    logger.info('Capability registry initialized', {
      capabilities: Object.keys(this.capabilities).filter(k => this.capabilities[k as keyof AgentCapabilities]),
      lazyLoading: true,
    });
  }

  /**
   * Register capability
   */
  registerCapability(capability: Capability): void {
    this.modules.set(capability.name, capability);
    logger.info('Capability registered', { name: capability.name });
  }

  /**
   * Get capability (with lazy loading)
   */
  async getCapability(name: string): Promise<Capability | undefined> {
    // Return cached if available
    if (this.modules.has(name)) {
      return this.modules.get(name);
    }

    // Check if loader exists
    const loader = this.moduleLoaders.get(name);
    if (!loader) {
      return undefined;
    }

    // Check if already loading
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name);
    }

    // Load capability lazily
    const loadPromise = loader().then(capability => {
      this.modules.set(name, capability);
      this.loadingPromises.delete(name);
      return capability;
    });

    this.loadingPromises.set(name, loadPromise);
    return loadPromise;
  }

  /**
   * Get capability synchronously (returns undefined if not loaded)
   */
  getCapabilitySync(name: string): Capability | undefined {
    return this.modules.get(name);
  }

  /**
   * Get all capabilities
   */
  getAllCapabilities(): Capability[] {
    return Array.from(this.modules.values());
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    for (const capability of this.modules.values()) {
      if (capability.cleanup) {
        await capability.cleanup();
      }
    }
    this.modules.clear();
    logger.info('Capability registry cleanup completed');
  }
}

