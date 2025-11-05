/**
 * Capability Registry
 * 
 * Registry for managing capability modules.
 * Loads and manages all available capabilities.
 * 
 * @module @aura/agent/capabilities
 */

import { createLogger } from '@aura/utils';
import { AgentCapabilities } from '../types/capabilities';

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
  private logger = createLogger();

  constructor(capabilities: AgentCapabilities) {
    this.capabilities = capabilities;
  }

  /**
   * Initialize registry
   */
  async init(): Promise<void> {
    // Load capability modules based on enabled capabilities
    // This is a placeholder - actual implementation would load real modules
    logger.info('Capability registry initialized', {
      capabilities: Object.keys(this.capabilities).filter(k => this.capabilities[k as keyof AgentCapabilities]),
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
   * Get capability
   */
  getCapability(name: string): Capability | undefined {
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

