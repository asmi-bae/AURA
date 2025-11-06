/**
 * Verifier
 * 
 * Runs safety checks, pre-execution dry-runs, and user confirmation prompts
 * for sensitive actions.
 * 
 * @module @aura/agent/engine
 */

import { createLogger } from '@aura/utils';
import { AgentCapabilities } from '../types/capabilities';
import { ExecutionPlan } from './planner';

const logger = createLogger();

/**
 * Verifier configuration
 */
export interface VerifierConfig {
  agentId: string;
  capabilities: AgentCapabilities;
}

/**
 * Verification result
 */
export interface VerificationResult {
  approved: boolean;
  reason?: string;
  warnings?: string[];
  requiresConfirmation?: boolean;
}

/**
 * Verifier
 * 
 * Verifies plans before execution.
 */
export class Verifier {
  private config: VerifierConfig;
  private logger = createLogger();

  constructor(config: VerifierConfig) {
    this.config = config;
  }

  /**
   * Initialize the verifier
   */
  async init(): Promise<void> {
    logger.info('Verifier initialized');
  }

  /**
   * Verify a plan
   */
  async verify(plan: ExecutionPlan): Promise<VerificationResult> {
    const warnings: string[] = [];
    let requiresConfirmation = false;

    // Check risk level
    if (plan.riskLevel === 'high') {
      warnings.push('High-risk operations detected');
      requiresConfirmation = true;
    }

    // Check required capabilities
    for (const capability of plan.requiredCapabilities) {
      if (!this.config.capabilities[capability as keyof AgentCapabilities]) {
        return {
          approved: false,
          reason: `Required capability not available: ${capability}`,
          warnings,
        };
      }
    }

    // Check for destructive operations
    const destructiveOps = plan.steps.filter(step =>
      step.type.includes('delete') ||
      step.type.includes('remove') ||
      step.type.includes('format')
    );

    if (destructiveOps.length > 0) {
      warnings.push(`Destructive operations detected: ${destructiveOps.length}`);
      requiresConfirmation = true;
    }

    // All checks passed
    return {
      approved: true,
      warnings: warnings.length > 0 ? warnings : undefined,
      requiresConfirmation,
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    logger.info('Verifier cleanup completed');
  }
}

