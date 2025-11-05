/**
 * Consent Manager
 * 
 * Manages user consent and permission flows.
 * Handles approval dialogs, permission tracking, and policy enforcement.
 * 
 * @module @aura/agent/consent
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Consent Manager configuration
 */
export interface ConsentManagerConfig {
  requireApprovalFor?: string[];
  allowedActions?: string[];
  deniedActions?: string[];
}

/**
 * Consent Manager
 * 
 * Manages user consent and permissions.
 */
export class ConsentManager extends EventEmitter {
  private config: ConsentManagerConfig;
  private logger = createLogger();
  private consentCache: Map<string, boolean> = new Map();

  constructor(config: ConsentManagerConfig) {
    super();
    this.config = config;
  }

  /**
   * Check if consent is required
   */
  requiresConsent(action: string, context?: any): boolean {
    // Check if action is in require approval list
    if (this.config.requireApprovalFor?.includes(action)) {
      return true;
    }

    // Check if action is denied
    if (this.config.deniedActions?.includes(action)) {
      return false; // Denied, no consent needed
    }

    // Check if action is allowed
    if (this.config.allowedActions?.includes(action)) {
      return false; // Pre-approved
    }

    // Default: require consent for unknown actions
    return true;
  }

  /**
   * Request consent
   */
  async requestConsent(action: string, context?: any): Promise<boolean> {
    const cacheKey = `${action}:${JSON.stringify(context)}`;
    
    // Check cache
    if (this.consentCache.has(cacheKey)) {
      return this.consentCache.get(cacheKey)!;
    }

    // Emit consent request event (UI should handle this)
    this.emit('consent-requested', { action, context });

    // Wait for user response (this is a placeholder - actual implementation would show UI)
    // For now, default to false (denied) for safety
    const approved = false;

    // Cache result
    this.consentCache.set(cacheKey, approved);

    logger.info('Consent requested', { action, approved });
    return approved;
  }

  /**
   * Update policies
   */
  updatePolicies(policies: Partial<ConsentManagerConfig>): void {
    this.config = { ...this.config, ...policies };
    this.consentCache.clear(); // Clear cache when policies change
    logger.info('Policies updated', { policies });
  }

  /**
   * Clear consent cache
   */
  clearCache(): void {
    this.consentCache.clear();
    logger.info('Consent cache cleared');
  }
}

