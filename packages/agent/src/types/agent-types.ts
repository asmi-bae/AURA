/**
 * Agent Types
 * 
 * Defines different agent types that can be instantiated.
 * Each type has different capabilities and purposes.
 * 
 * @module @aura/agent/types
 */

/**
 * Agent type enumeration
 */
export enum AgentType {
  /** Interactive Assistant - Voice + chat assistant, screen-view, help user interactively */
  INTERACTIVE_ASSISTANT = 'interactive-assistant',
  
  /** Automation Agent - Perform scripted or AI-decided OS tasks */
  AUTOMATION = 'automation',
  
  /** Observer - Monitor apps/screens for conditions, raise alerts, trigger workflows */
  OBSERVER = 'observer',
  
  /** Recorder - Record UI sequences and convert to reusable workflows */
  RECORDER = 'recorder',
  
  /** Supervisor - Coordinates other local agents and reports to central admin */
  SUPERVISOR = 'supervisor',
  
  /** Training Agent - Safely run experimental automations, simulate workflows locally */
  TRAINING = 'training',
  
  /** Custom Agent - Developer can attach plugins, custom skill sets, or hardware drivers */
  CUSTOM = 'custom',
}

/**
 * Agent type configuration
 */
export interface AgentTypeConfig {
  /** Type name */
  type: AgentType;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Default capabilities for this type */
  defaultCapabilities: string[];
  /** Default policies */
  defaultPolicies?: {
    requireApprovalFor?: string[];
    allowedActions?: string[];
    deniedActions?: string[];
  };
  /** Icon or visual identifier */
  icon?: string;
}

/**
 * Agent type registry
 */
export const AGENT_TYPE_CONFIGS: Record<AgentType, AgentTypeConfig> = {
  [AgentType.INTERACTIVE_ASSISTANT]: {
    type: AgentType.INTERACTIVE_ASSISTANT,
    displayName: 'Interactive Assistant',
    description: 'Voice + chat assistant, screen-view, help user interactively',
    defaultCapabilities: ['screen-capture', 'voice-io', 'chat', 'vision'],
    defaultPolicies: {
      requireApprovalFor: ['screen-capture', 'voice-io'],
    },
  },
  [AgentType.AUTOMATION]: {
    type: AgentType.AUTOMATION,
    displayName: 'Automation Agent',
    description: 'Perform scripted or AI-decided OS tasks',
    defaultCapabilities: ['mouse-control', 'keyboard-control', 'screen-capture', 'file-operations'],
    defaultPolicies: {
      requireApprovalFor: ['file-write', 'system-commands'],
    },
  },
  [AgentType.OBSERVER]: {
    type: AgentType.OBSERVER,
    displayName: 'Observer',
    description: 'Monitor apps/screens for conditions, raise alerts, trigger workflows',
    defaultCapabilities: ['screen-capture', 'process-monitoring', 'event-detection'],
    defaultPolicies: {
      requireApprovalFor: [],
      deniedActions: ['mouse-control', 'keyboard-control', 'file-write'],
    },
  },
  [AgentType.RECORDER]: {
    type: AgentType.RECORDER,
    displayName: 'Recorder',
    description: 'Record UI sequences and convert to reusable workflows',
    defaultCapabilities: ['screen-capture', 'mouse-monitoring', 'keyboard-monitoring', 'event-recording'],
    defaultPolicies: {
      requireApprovalFor: ['recording'],
    },
  },
  [AgentType.SUPERVISOR]: {
    type: AgentType.SUPERVISOR,
    displayName: 'Supervisor',
    description: 'Coordinates other local agents and reports to central admin',
    defaultCapabilities: ['agent-management', 'policy-enforcement', 'reporting'],
    defaultPolicies: {
      requireApprovalFor: ['agent-control'],
    },
  },
  [AgentType.TRAINING]: {
    type: AgentType.TRAINING,
    displayName: 'Training Agent',
    description: 'Safely run experimental automations, simulate workflows locally',
    defaultCapabilities: ['sandbox', 'simulation', 'workflow-testing'],
    defaultPolicies: {
      requireApprovalFor: [],
      deniedActions: ['file-write', 'system-commands'],
    },
  },
  [AgentType.CUSTOM]: {
    type: AgentType.CUSTOM,
    displayName: 'Custom Agent',
    description: 'Developer can attach plugins, custom skill sets, or hardware drivers',
    defaultCapabilities: [],
    defaultPolicies: {
      requireApprovalFor: ['all'],
    },
  },
};

/**
 * Get agent type configuration
 */
export function getAgentTypeConfig(type: AgentType): AgentTypeConfig {
  return AGENT_TYPE_CONFIGS[type];
}

/**
 * Get all agent types
 */
export function getAllAgentTypes(): AgentType[] {
  return Object.values(AgentType);
}

