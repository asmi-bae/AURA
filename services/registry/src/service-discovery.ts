/**
 * Service Discovery
 * 
 * Service discovery and load balancing
 */

import { RegistryManager, ServiceInfo } from './registry-manager';
import { createLogger } from '@aura/utils';

const logger = createLogger();

export type LoadBalancingStrategy = 'round-robin' | 'random' | 'least-connections' | 'health-based';

/**
 * Service Discovery
 */
export class ServiceDiscovery {
  private registry: RegistryManager;
  private roundRobinCounters: Map<string, number> = new Map();
  private connectionCounts: Map<string, number> = new Map();

  constructor(registry: RegistryManager) {
    this.registry = registry;
  }

  /**
   * Discover a service by name
   */
  discover(serviceName: string, strategy: LoadBalancingStrategy = 'round-robin'): ServiceInfo | null {
    const services = this.registry.discover(serviceName);
    
    if (services.length === 0) {
      logger.warn(`No services found for pattern: ${serviceName}`);
      return null;
    }

    // Filter to healthy services only
    const healthyServices = services.filter(s => s.status === 'healthy');
    
    if (healthyServices.length === 0) {
      logger.warn(`No healthy services found for: ${serviceName}`);
      // Fallback to any service if no healthy ones
      return services[0];
    }

    switch (strategy) {
      case 'round-robin':
        return this.roundRobin(healthyServices, serviceName);
      case 'random':
        return this.random(healthyServices);
      case 'least-connections':
        return this.leastConnections(healthyServices);
      case 'health-based':
        return this.healthBased(healthyServices);
      default:
        return healthyServices[0];
    }
  }

  /**
   * Round-robin selection
   */
  private roundRobin(services: ServiceInfo[], serviceName: string): ServiceInfo {
    const counter = this.roundRobinCounters.get(serviceName) || 0;
    const selected = services[counter % services.length];
    this.roundRobinCounters.set(serviceName, counter + 1);
    return selected;
  }

  /**
   * Random selection
   */
  private random(services: ServiceInfo[]): ServiceInfo {
    return services[Math.floor(Math.random() * services.length)];
  }

  /**
   * Least connections selection
   */
  private leastConnections(services: ServiceInfo[]): ServiceInfo {
    let least = services[0];
    let leastCount = this.connectionCounts.get(least.id) || 0;

    for (const service of services) {
      const count = this.connectionCounts.get(service.id) || 0;
      if (count < leastCount) {
        least = service;
        leastCount = count;
      }
    }

    return least;
  }

  /**
   * Health-based selection (prefer recently checked healthy services)
   */
  private healthBased(services: ServiceInfo[]): ServiceInfo {
    // Sort by last health check time (most recent first)
    const sorted = services.sort((a, b) => {
      const aTime = a.lastHealthCheck?.getTime() || 0;
      const bTime = b.lastHealthCheck?.getTime() || 0;
      return bTime - aTime;
    });

    return sorted[0];
  }

  /**
   * Increment connection count
   */
  incrementConnections(serviceId: string): void {
    const count = this.connectionCounts.get(serviceId) || 0;
    this.connectionCounts.set(serviceId, count + 1);
  }

  /**
   * Decrement connection count
   */
  decrementConnections(serviceId: string): void {
    const count = this.connectionCounts.get(serviceId) || 0;
    this.connectionCounts.set(serviceId, Math.max(0, count - 1));
  }
}
