/**
 * Registry Manager
 * 
 * Manages service registry and discovery
 */

import { createLogger } from '@aura/utils';
import { EventEmitter } from 'events';

const logger = createLogger();

export interface ServiceInfo {
  id: string;
  name: string;
  version: string;
  url: string;
  healthCheckUrl?: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  metadata?: Record<string, any>;
  registeredAt: Date;
  lastHealthCheck?: Date;
}

export interface HealthCheckResult {
  healthy: boolean;
  latency?: number;
  error?: string;
  timestamp: Date;
}

/**
 * Registry Manager
 */
export class RegistryManager extends EventEmitter {
  private services: Map<string, ServiceInfo> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private healthCheckIntervalMs: number = 30000; // 30 seconds

  constructor(healthCheckIntervalMs: number = 30000) {
    super();
    this.healthCheckIntervalMs = healthCheckIntervalMs;
    this.startHealthChecks();
  }

  /**
   * Register a service
   */
  register(serviceInfo: Omit<ServiceInfo, 'registeredAt' | 'status'>): void {
    const service: ServiceInfo = {
      ...serviceInfo,
      status: 'unknown',
      registeredAt: new Date(),
    };

    this.services.set(service.id, service);
    logger.info(`Service registered`, { serviceId: service.id, name: service.name });
    this.emit('serviceRegistered', service);
    
    // Perform initial health check
    this.performHealthCheck(service.id);
  }

  /**
   * Unregister a service
   */
  unregister(serviceId: string): void {
    const service = this.services.get(serviceId);
    if (service) {
      this.services.delete(serviceId);
      logger.info(`Service unregistered`, { serviceId });
      this.emit('serviceUnregistered', service);
    }
  }

  /**
   * Get service by ID
   */
  get(serviceId: string): ServiceInfo | undefined {
    return this.services.get(serviceId);
  }

  /**
   * Get service by name
   */
  getByName(name: string): ServiceInfo | undefined {
    for (const service of this.services.values()) {
      if (service.name === name) {
        return service;
      }
    }
    return undefined;
  }

  /**
   * List all services
   */
  list(): ServiceInfo[] {
    return Array.from(this.services.values());
  }

  /**
   * List healthy services
   */
  listHealthy(): ServiceInfo[] {
    return this.list().filter(s => s.status === 'healthy');
  }

  /**
   * Discover services by name pattern
   */
  discover(pattern: string | RegExp): ServiceInfo[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return this.list().filter(s => regex.test(s.name));
  }

  /**
   * Perform health check on a service
   */
  async performHealthCheck(serviceId: string): Promise<HealthCheckResult> {
    const service = this.services.get(serviceId);
    if (!service) {
      throw new Error(`Service ${serviceId} not found`);
    }

    const startTime = Date.now();
    const healthCheckUrl = service.healthCheckUrl || `${service.url}/health`;

    try {
      const response = await fetch(healthCheckUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const latency = Date.now() - startTime;
      const healthy = response.ok;

      // Update service status
      service.status = healthy ? 'healthy' : 'unhealthy';
      service.lastHealthCheck = new Date();

      const result: HealthCheckResult = {
        healthy,
        latency,
        timestamp: new Date(),
      };

      this.emit('healthCheck', serviceId, result);
      
      if (!healthy) {
        logger.warn(`Service health check failed`, { 
          serviceId, 
          status: response.status,
          latency,
        });
      }

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      service.status = 'unhealthy';
      service.lastHealthCheck = new Date();

      const result: HealthCheckResult = {
        healthy: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };

      this.emit('healthCheck', serviceId, result);
      logger.error(`Service health check error`, { serviceId, error });

      return result;
    }
  }

  /**
   * Start periodic health checks
   */
  startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return;
    }

    this.healthCheckInterval = setInterval(() => {
      const services = this.list();
      for (const service of services) {
        this.performHealthCheck(service.id).catch(error => {
          logger.error(`Health check failed for service`, { 
            serviceId: service.id, 
            error,
          });
        });
      }
    }, this.healthCheckIntervalMs);

    logger.info(`Health checks started`, { interval: this.healthCheckIntervalMs });
  }

  /**
   * Stop periodic health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info(`Health checks stopped`);
    }
  }

  /**
   * Get statistics
   */
  getStatistics() {
    const services = this.list();
    return {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      unhealthy: services.filter(s => s.status === 'unhealthy').length,
      unknown: services.filter(s => s.status === 'unknown').length,
    };
  }
}
