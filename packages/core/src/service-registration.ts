/**
 * Service Registration Utility
 * 
 * Helper for services to register themselves with the registry service
 */

import { createLogger } from '@aura/utils';

const logger = createLogger();

export interface ServiceRegistrationConfig {
  id: string;
  name: string;
  version: string;
  url: string;
  healthCheckUrl?: string;
  metadata?: Record<string, any>;
  registryUrl?: string;
}

/**
 * Service Registration Helper
 */
export class ServiceRegistration {
  private config: ServiceRegistrationConfig;
  private registered = false;

  constructor(config: ServiceRegistrationConfig) {
    this.config = {
      registryUrl: process.env.REGISTRY_URL || 'http://localhost:3008',
      ...config,
    };
  }

  /**
   * Register service with registry
   */
  async register(): Promise<void> {
    if (this.registered) {
      logger.warn('Service already registered', { serviceId: this.config.id });
      return;
    }

    try {
      const response = await fetch(`${this.config.registryUrl}/services/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: this.config.id,
          name: this.config.name,
          version: this.config.version,
          url: this.config.url,
          healthCheckUrl: this.config.healthCheckUrl || `${this.config.url}/health`,
          metadata: {
            ...this.config.metadata,
            registeredAt: new Date().toISOString(),
            port: this.extractPort(this.config.url) ?? undefined,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Registration failed: ${error}`);
      }

      this.registered = true;
      logger.info('Service registered successfully', {
        serviceId: this.config.id,
        name: this.config.name,
        registryUrl: this.config.registryUrl,
      });
    } catch (error) {
      logger.error('Failed to register service', {
        serviceId: this.config.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - service can still run without registration
    }
  }

  /**
   * Unregister service from registry
   */
  async unregister(): Promise<void> {
    if (!this.registered) {
      return;
    }

    try {
      const response = await fetch(
        `${this.config.registryUrl}/services/${this.config.id}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        this.registered = false;
        logger.info('Service unregistered successfully', {
          serviceId: this.config.id,
        });
      }
    } catch (error) {
      logger.error('Failed to unregister service', {
        serviceId: this.config.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Extract port from URL
   */
  private extractPort(url: string | undefined): number | undefined {
    if (!url) return undefined;
    try {
      const urlObj = new URL(url);
      return urlObj.port ? parseInt(urlObj.port, 10) : undefined;
    } catch {
      // If URL parsing fails, try to extract port from string
      const match = url.match(/:(\d+)/);
      return match && match[1] ? parseInt(match[1], 10) : undefined;
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown(): void {
    const shutdown = async () => {
      logger.info('Shutting down service, unregistering from registry...');
      await this.unregister();
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}
