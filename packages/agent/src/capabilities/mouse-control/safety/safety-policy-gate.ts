/**
 * Safety & Policy Gate
 * 
 * Enforces safety policies and consent requirements for mouse actions.
 * Validates actions before execution and requires consent for high-risk operations.
 * 
 * @module @aura/agent/capabilities/mouse-control
 */

import { createLogger } from '@aura/utils';
import { MouseActionOptions, Point } from '../mouse-control-manager.js';
import { ConsentManager } from '../../../consent/consent-manager';

const logger = createLogger();

/**
 * Action type
 */
export type ActionType = 'move' | 'click' | 'double-click' | 'drag' | 'scroll' | 'find-and-click';

/**
 * Action context
 */
export interface ActionContext {
  type: ActionType;
  coordinates?: Point;
  from?: Point;
  to?: Point;
  button?: string;
  amount?: number;
  direction?: string;
  [key: string]: any;
}

/**
 * Safety Policy Gate
 * 
 * Validates actions against safety policies and consent requirements.
 */
export class SafetyPolicyGate {
  private consentManager: ConsentManager;
  private enabled = false;
  private trustedWorkflows: Set<string> = new Set();
  private deniedZones: Array<{ x: number; y: number; width: number; height: number }> = [];

  constructor(consentManager: ConsentManager) {
    this.consentManager = consentManager;
  }

  /**
   * Initialize safety gate
   */
  async init(): Promise<void> {
    this.enabled = true;
    logger.info('Safety policy gate initialized');
  }

  /**
   * Check if mouse control permission is granted
   */
  async checkPermission(permission: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    // Check with consent manager
    const requiresConsent = this.consentManager.requiresConsent(permission);
    if (requiresConsent) {
      const hasPermission = await this.consentManager.requestConsent(permission);
      if (!hasPermission) {
        logger.warn('Mouse control permission denied', { permission });
        return false;
      }
    }

    return true;
  }

  /**
   * Check if action is allowed
   */
  async checkAction(type: ActionType, context: ActionContext & MouseActionOptions): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    // Check if workflow is trusted
    if (context.workflowId && this.trustedWorkflows.has(context.workflowId)) {
      return true;
    }

    // Check risk level
    const riskLevel = context.riskLevel || this.assessRisk(type, context);
    if (riskLevel === 'high') {
      // High-risk actions require explicit consent
      if (context.requiresConsent !== false) {
        const approved = await this.consentManager.requestConsent(`mouse:${type}`, context);
        if (!approved) {
          logger.warn('High-risk action denied', { type, context });
          return false;
        }
      }
    }

    // Check denied zones
    if (context.coordinates) {
      if (this.isInDeniedZone(context.coordinates)) {
        logger.warn('Action denied: target in denied zone', { coordinates: context.coordinates });
        return false;
      }
    }

    // Check if action requires consent
    if (context.requiresConsent) {
      const approved = await this.consentManager.requestConsent(`mouse:${type}`, context);
      if (!approved) {
        logger.warn('Action denied by user', { type, context });
        return false;
      }
    }

    return true;
  }

  /**
   * Assess risk level for action
   */
  private assessRisk(type: ActionType, context: ActionContext): 'low' | 'medium' | 'high' {
    // High-risk actions
    const highRiskTypes: ActionType[] = ['drag', 'double-click'];
    if (highRiskTypes.includes(type)) {
      return 'high';
    }

    // Check for credential fields (if coordinates suggest input fields)
    if (context.coordinates) {
      // This would integrate with vision bridge to detect input fields
      // For now, we'll use heuristics
      if (this.mightBeCredentialField(context.coordinates)) {
        return 'high';
      }
    }

    // Medium-risk actions
    if (type === 'click' && context.button === 'right') {
      return 'medium';
    }

    // Low-risk actions
    return 'low';
  }

  /**
   * Check if coordinates might be in a credential field
   * This is a heuristic - in production, integrate with vision bridge
   */
  private mightBeCredentialField(coordinates: Point): boolean {
    // This would use vision bridge to detect input fields
    // For now, return false as placeholder
    return false;
  }

  /**
   * Check if coordinates are in denied zone
   */
  private isInDeniedZone(point: Point): boolean {
    for (const zone of this.deniedZones) {
      if (
        point.x >= zone.x &&
        point.x <= zone.x + zone.width &&
        point.y >= zone.y &&
        point.y <= zone.y + zone.height
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Add trusted workflow
   */
  addTrustedWorkflow(workflowId: string): void {
    this.trustedWorkflows.add(workflowId);
    logger.info('Workflow added to trusted list', { workflowId });
  }

  /**
   * Remove trusted workflow
   */
  removeTrustedWorkflow(workflowId: string): void {
    this.trustedWorkflows.delete(workflowId);
    logger.info('Workflow removed from trusted list', { workflowId });
  }

  /**
   * Add denied zone
   */
  addDeniedZone(x: number, y: number, width: number, height: number): void {
    this.deniedZones.push({ x, y, width, height });
    logger.info('Denied zone added', { x, y, width, height });
  }

  /**
   * Clear denied zones
   */
  clearDeniedZones(): void {
    this.deniedZones = [];
    logger.info('Denied zones cleared');
  }
}

