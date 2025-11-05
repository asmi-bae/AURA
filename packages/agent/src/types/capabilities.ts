/**
 * Agent Capabilities
 * 
 * Defines all capabilities that an agent can have.
 * Capabilities determine what the agent can do.
 * 
 * @module @aura/agent/types
 */

/**
 * Agent capabilities configuration
 * 
 * @interface AgentCapabilities
 * @property {boolean} screen-capture - Screen capture capability
 * @property {boolean} screen-stream - Screen streaming capability
 * @property {boolean} voice-io - Voice input/output capability
 * @property {boolean} mouse-control - Mouse control capability
 * @property {boolean} keyboard-control - Keyboard control capability
 * @property {boolean} file-operations - File operations capability
 * @property {boolean} file-read - File read capability
 * @property {boolean} file-write - File write capability
 * @property {boolean} clipboard - Clipboard access capability
 * @property {boolean} process-control - Process control capability
 * @property {boolean} window-management - Window management capability
 * @property {boolean} ocr - OCR capability
 * @property {boolean} vision - Vision/AI capability
 * @property {boolean} chat - Chat capability
 * @property {boolean} camera - Camera access capability
 * @property {boolean} microphone - Microphone access capability
 * @property {boolean} automation - Automation capability
 * @property {boolean} recording - Recording capability
 * @property {boolean} process-monitoring - Process monitoring capability
 * @property {boolean} event-detection - Event detection capability
 * @property {boolean} agent-management - Agent management capability
 * @property {boolean} policy-enforcement - Policy enforcement capability
 * @property {boolean} reporting - Reporting capability
 * @property {boolean} sandbox - Sandbox capability
 * @property {boolean} simulation - Simulation capability
 * @property {boolean} workflow-testing - Workflow testing capability
 */
export interface AgentCapabilities {
  'screen-capture'?: boolean;
  'screen-stream'?: boolean;
  'voice-io'?: boolean;
  'mouse-control'?: boolean;
  'keyboard-control'?: boolean;
  'file-operations'?: boolean;
  'file-read'?: boolean;
  'file-write'?: boolean;
  'clipboard'?: boolean;
  'process-control'?: boolean;
  'window-management'?: boolean;
  /** OCR capability */
  'ocr'?: boolean;
  'vision'?: boolean;
  'chat'?: boolean;
  'camera'?: boolean;
  'microphone'?: boolean;
  'automation'?: boolean;
  'recording'?: boolean;
  'process-monitoring'?: boolean;
  'event-detection'?: boolean;
  'agent-management'?: boolean;
  'policy-enforcement'?: boolean;
  'reporting'?: boolean;
  'sandbox'?: boolean;
  'simulation'?: boolean;
  /** Workflow testing capability */
  'workflow-testing'?: boolean;
}

/**
 * Capability metadata
 * 
 * @interface CapabilityMetadata
 * @property {string} name - Capability name
 * @property {string} displayName - Display name
 * @property {string} description - Description
 * @property {'automation' | 'monitoring' | 'media' | 'system' | 'ai' | 'other'} category - Category
 * @property {boolean} requiresConsent - Requires consent
 * @property {'low' | 'medium' | 'high'} riskLevel - Risk level
 * @property {'windows' | 'macos' | 'linux'}[] platforms - Platform support
 * @property {string[]} dependencies - Dependencies
 */
export interface CapabilityMetadata {
  name: string;
  displayName: string;
  description: string;
  category: 'automation' | 'monitoring' | 'media' | 'system' | 'ai' | 'other';
  requiresConsent: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  platforms: ('windows' | 'macos' | 'linux')[];
  dependencies?: string[];
}

/**
 * Capability registry
 * 
 * @constant CAPABILITY_METADATA
 * @type {Record<keyof AgentCapabilities, CapabilityMetadata>}
 */
export const CAPABILITY_METADATA: Record<keyof AgentCapabilities, CapabilityMetadata> = {
  'screen-capture': {
    name: 'screen-capture',
    displayName: 'Screen Capture',
    description: 'Capture screenshots of the screen or regions',
    category: 'monitoring',
    requiresConsent: true,
    riskLevel: 'medium',
    platforms: ['windows', 'macos', 'linux'],
  },
  'screen-stream': {
    name: 'screen-stream',
    displayName: 'Screen Streaming',
    description: 'Stream screen content in real-time',
    category: 'media',
    requiresConsent: true,
    riskLevel: 'high',
    platforms: ['windows', 'macos', 'linux'],
  },
  'voice-io': {
    name: 'voice-io',
    displayName: 'Voice Input/Output',
    description: 'Capture and synthesize voice',
    category: 'media',
    requiresConsent: true,
    riskLevel: 'medium',
    platforms: ['windows', 'macos', 'linux'],
    dependencies: ['microphone'],
  },
  'mouse-control': {
    name: 'mouse-control',
    displayName: 'Mouse Control',
    description: 'Control mouse movements and clicks',
    category: 'automation',
    requiresConsent: true,
    riskLevel: 'high',
    platforms: ['windows', 'macos', 'linux'],
  },
  'keyboard-control': {
    name: 'keyboard-control',
    displayName: 'Keyboard Control',
    description: 'Control keyboard input',
    category: 'automation',
    requiresConsent: true,
    riskLevel: 'high',
    platforms: ['windows', 'macos', 'linux'],
  },
  'file-operations': {
    name: 'file-operations',
    displayName: 'File Operations',
    description: 'Perform file operations (read, write, copy, move)',
    category: 'system',
    requiresConsent: true,
    riskLevel: 'high',
    platforms: ['windows', 'macos', 'linux'],
  },
  'file-read': {
    name: 'file-read',
    displayName: 'File Read',
    description: 'Read files from filesystem',
    category: 'system',
    requiresConsent: true,
    riskLevel: 'medium',
    platforms: ['windows', 'macos', 'linux'],
  },
  'file-write': {
    name: 'file-write',
    displayName: 'File Write',
    description: 'Write files to filesystem',
    category: 'system',
    requiresConsent: true,
    riskLevel: 'high',
    platforms: ['windows', 'macos', 'linux'],
  },
  'clipboard': {
    name: 'clipboard',
    displayName: 'Clipboard Access',
    description: 'Read and write clipboard content',
    category: 'system',
    requiresConsent: true,
    riskLevel: 'medium',
    platforms: ['windows', 'macos', 'linux'],
  },
  'process-control': {
    name: 'process-control',
    displayName: 'Process Control',
    description: 'Control system processes',
    category: 'system',
    requiresConsent: true,
    riskLevel: 'high',
    platforms: ['windows', 'macos', 'linux'],
  },
  'window-management': {
    name: 'window-management',
    displayName: 'Window Management',
    description: 'Manage application windows',
    category: 'automation',
    requiresConsent: true,
    riskLevel: 'medium',
    platforms: ['windows', 'macos', 'linux'],
  },
  'ocr': {
    name: 'ocr',
    displayName: 'OCR',
    description: 'Optical Character Recognition',
    category: 'ai',
    requiresConsent: false,
    riskLevel: 'low',
    platforms: ['windows', 'macos', 'linux'],
    dependencies: ['screen-capture'],
  },
  'vision': {
    name: 'vision',
    displayName: 'Vision/AI',
    description: 'AI vision capabilities',
    category: 'ai',
    requiresConsent: false,
    riskLevel: 'low',
    platforms: ['windows', 'macos', 'linux'],
  },
  'chat': {
    name: 'chat',
    displayName: 'Chat',
    description: 'Chat interface',
    category: 'ai',
    requiresConsent: false,
    riskLevel: 'low',
    platforms: ['windows', 'macos', 'linux'],
  },
  'camera': {
    name: 'camera',
    displayName: 'Camera',
    description: 'Access camera',
    category: 'media',
    requiresConsent: true,
    riskLevel: 'high',
    platforms: ['windows', 'macos', 'linux'],
  },
  'microphone': {
    name: 'microphone',
    displayName: 'Microphone',
    description: 'Access microphone',
    category: 'media',
    requiresConsent: true,
    riskLevel: 'high',
    platforms: ['windows', 'macos', 'linux'],
  },
  'automation': {
    name: 'automation',
    displayName: 'Automation',
    description: 'General automation capabilities',
    category: 'automation',
    requiresConsent: true,
    riskLevel: 'high',
    platforms: ['windows', 'macos', 'linux'],
  },
  'recording': {
    name: 'recording',
    displayName: 'Recording',
    description: 'Record user interactions',
    category: 'monitoring',
    requiresConsent: true,
    riskLevel: 'high',
    platforms: ['windows', 'macos', 'linux'],
  },
  'process-monitoring': {
    name: 'process-monitoring',
    displayName: 'Process Monitoring',
    description: 'Monitor system processes',
    category: 'monitoring',
    requiresConsent: true,
    riskLevel: 'medium',
    platforms: ['windows', 'macos', 'linux'],
  },
  'event-detection': {
    name: 'event-detection',
    displayName: 'Event Detection',
    description: 'Detect system events',
    category: 'monitoring',
    requiresConsent: true,
    riskLevel: 'medium',
    platforms: ['windows', 'macos', 'linux'],
  },
  'agent-management': {
    name: 'agent-management',
    displayName: 'Agent Management',
    description: 'Manage other agents',
    category: 'system',
    requiresConsent: true,
    riskLevel: 'high',
    platforms: ['windows', 'macos', 'linux'],
  },
  'policy-enforcement': {
    name: 'policy-enforcement',
    displayName: 'Policy Enforcement',
    description: 'Enforce policies',
    category: 'system',
    requiresConsent: false,
    riskLevel: 'low',
    platforms: ['windows', 'macos', 'linux'],
  },
  'reporting': {
    name: 'reporting',
    displayName: 'Reporting',
    description: 'Generate reports',
    category: 'system',
    requiresConsent: false,
    riskLevel: 'low',
    platforms: ['windows', 'macos', 'linux'],
  },
  'sandbox': {
    name: 'sandbox',
    displayName: 'Sandbox',
    description: 'Run in sandboxed environment',
    category: 'system',
    requiresConsent: false,
    riskLevel: 'low',
    platforms: ['windows', 'macos', 'linux'],
  },
  'simulation': {
    name: 'simulation',
    displayName: 'Simulation',
    description: 'Simulate workflows',
    category: 'other',
    requiresConsent: false,
    riskLevel: 'low',
    platforms: ['windows', 'macos', 'linux'],
  },
  'workflow-testing': {
    name: 'workflow-testing',
    displayName: 'Workflow Testing',
    description: 'Test workflows',
    category: 'other',
    requiresConsent: false,
    riskLevel: 'low',
    platforms: ['windows', 'macos', 'linux'],
  },
};

/**
 * Get capability metadata
 */
export function getCapabilityMetadata(capability: keyof AgentCapabilities): CapabilityMetadata | undefined {
  return CAPABILITY_METADATA[capability];
}

/**
 * Get all enabled capabilities
 */
export function getEnabledCapabilities(capabilities: AgentCapabilities): string[] {
  return Object.entries(capabilities)
    .filter(([_, enabled]) => enabled === true)
    .map(([name]) => name);
}

