/**
 * Service Container
 * 
 * Dependency injection container for services
 */

import { BaseService, ServiceConfig } from './BaseService';
import { createLogger } from '@aura/utils';

const logger = createLogger();

export type ServiceConstructor<T extends BaseService = BaseService> = new (
  ...args: any[]
) => T;

export interface ServiceRegistration {
  name: string;
  service: BaseService;
  config: ServiceConfig;
  dependencies: string[];
}

/**
 * Service Container
 */
export class Container {
  private services: Map<string, ServiceRegistration> = new Map();
  private serviceInstances: Map<string, BaseService> = new Map();
  private initialized = false;

  /**
   * Register a service
   */
  register<T extends BaseService>(
    name: string,
    ServiceClass: ServiceConstructor<T>,
    config: ServiceConfig,
    ...args: any[]
  ): void {
    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`);
    }

    const service = new ServiceClass(config, ...args);
    
    this.services.set(name, {
      name,
      service,
      config,
      dependencies: config.dependencies || [],
    });
    
    this.serviceInstances.set(name, service);
    
    logger.info(`Service ${name} registered`);
  }

  /**
   * Get a service by name
   */
  get<T extends BaseService>(name: string): T {
    const registration = this.services.get(name);
    if (!registration) {
      throw new Error(`Service ${name} not found`);
    }
    return registration.service as T;
  }

  /**
   * Check if a service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Get all service names
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('Container already initialized');
      return;
    }

    // Sort services by dependencies
    const sortedServices = this.topologicalSort();
    
    logger.info('Initializing services', { count: sortedServices.length });
    
    for (const name of sortedServices) {
      const registration = this.services.get(name);
      if (!registration) continue;
      
      try {
        await registration.service.initialize();
        logger.info(`Service ${name} initialized`);
      } catch (error) {
        logger.error(`Failed to initialize service ${name}`, { error });
        throw error;
      }
    }
    
    this.initialized = true;
    logger.info('All services initialized');
  }

  /**
   * Start all services
   */
  async start(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const sortedServices = this.topologicalSort();
    
    logger.info('Starting services', { count: sortedServices.length });
    
    for (const name of sortedServices) {
      const registration = this.services.get(name);
      if (!registration) continue;
      
      try {
        await registration.service.start();
        logger.info(`Service ${name} started`);
      } catch (error) {
        logger.error(`Failed to start service ${name}`, { error });
        throw error;
      }
    }
    
    logger.info('All services started');
  }

  /**
   * Stop all services (in reverse order)
   */
  async stop(): Promise<void> {
    const sortedServices = this.topologicalSort().reverse();
    
    logger.info('Stopping services', { count: sortedServices.length });
    
    for (const name of sortedServices) {
      const registration = this.services.get(name);
      if (!registration) continue;
      
      try {
        if (registration.service.getState() === 'running') {
          await registration.service.stop();
          logger.info(`Service ${name} stopped`);
        }
      } catch (error) {
        logger.error(`Failed to stop service ${name}`, { error });
      }
    }
    
    logger.info('All services stopped');
  }

  /**
   * Topological sort of services based on dependencies
   */
  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (name: string): void => {
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected involving service ${name}`);
      }
      
      if (visited.has(name)) {
        return;
      }
      
      visiting.add(name);
      
      const registration = this.services.get(name);
      if (registration) {
        for (const dep of registration.dependencies) {
          if (!this.services.has(dep)) {
            throw new Error(`Service ${name} depends on unknown service ${dep}`);
          }
          visit(dep);
        }
      }
      
      visiting.delete(name);
      visited.add(name);
      result.push(name);
    };

    for (const name of this.services.keys()) {
      if (!visited.has(name)) {
        visit(name);
      }
    }

    return result;
  }

  /**
   * Get health status of all services
   */
  async getHealthStatus(): Promise<Record<string, any>> {
    const status: Record<string, any> = {};
    
    for (const [name, registration] of this.services.entries()) {
      try {
        const health = await registration.service.healthCheck();
        status[name] = {
          state: registration.service.getState(),
          healthy: health.healthy,
          ...health.details,
        };
      } catch (error) {
        status[name] = {
          state: registration.service.getState(),
          healthy: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
    
    return status;
  }
}
