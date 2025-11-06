/**
 * AURA Agent Core
 * 
 * Core runtime for the AURA desktop agent platform.
 * Manages lifecycle, registration, security, and coordination of all agent components.
 * 
 * Features:
 * - Agent lifecycle management (init, start, stop, restart)
 * - Secure registration with gateway
 * - Device keypair generation and management
 * - Capability registry and management
 * - Integration with all AURA packages
 * 
 * @module @aura/agent/core
 */

import { createLogger } from '@aura/utils';
import { EventEmitter } from 'events';
import { AgentType } from '../types/agent-types';
import { AgentCapabilities } from '../types/capabilities';
import { SecurityManager } from '../security/security-manager';
import { ConsentManager } from '../consent/consent-manager';
import { CommunicationManager } from '../communication/communication-manager';
import { LocalStorage } from '../storage/local-storage';
import { TelemetryService } from '../telemetry/telemetry-service';
import { BaseThinkingEngine } from '../engine/base-thinking-engine';

const logger = createLogger();

/**
 * Agent configuration
 */
export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  gatewayUrl: string;
  keypair?: { publicKey: string; privateKey: string };
  capabilities: AgentCapabilities;
  policies?: {
    requireApprovalFor?: string[];
    allowedActions?: string[];
    deniedActions?: string[];
    offlineMode?: boolean;
  };
  autoUpdate?: {
    enabled: boolean;
    channel?: 'stable' | 'beta' | 'alpha';
  };
}

/**
 * Agent status
 */
export interface AgentStatus {
  id: string;
  name: string;
  type: AgentType;
  state: 'initializing' | 'running' | 'paused' | 'stopped' | 'error';
  connected: boolean;
  capabilities: AgentCapabilities;
  lastSeen: Date;
  uptime: number;
  error?: string;
}

/**
 * AURA Agent Core
 * 
 * Main runtime for the desktop agent platform.
 */
export class AgentCore extends EventEmitter {
  private config: AgentConfig;
  private status: AgentStatus;
  private startTime: Date | null = null;
  private logger = createLogger();
  
  // Core components
  private securityManager: SecurityManager;
  private consentManager: ConsentManager;
  private communicationManager: CommunicationManager | null = null;
  private storage: LocalStorage;
  private telemetry: TelemetryService;
  private thinkingEngine: BaseThinkingEngine | null = null;

  // Lifecycle
  private isInitialized = false;
  private isRunning = false;

  constructor(config: AgentConfig) {
    super();
    
    this.config = config;
    this.status = {
      id: config.id,
      name: config.name,
      type: config.type,
      state: 'initializing',
      connected: false,
      capabilities: config.capabilities,
      lastSeen: new Date(),
      uptime: 0,
    };

    // Initialize core components
    this.securityManager = new SecurityManager(
      config.keypair || this.generateKeypair()
    );
    
    this.consentManager = new ConsentManager({
      requireApprovalFor: config.policies?.requireApprovalFor || [],
      allowedActions: config.policies?.allowedActions || [],
      deniedActions: config.policies?.deniedActions || [],
    });

    this.storage = new LocalStorage({
      agentId: config.id,
      encryptionKey: this.securityManager.getEncryptionKey(),
    });

    this.telemetry = new TelemetryService({
      agentId: config.id,
      storage: this.storage,
      enabled: true, // Can be disabled for privacy
    });

    logger.info('Agent core initialized', {
      agentId: config.id,
      type: config.type,
      capabilities: Object.keys(config.capabilities),
    });
  }

  /**
   * Initialize the agent
   * Sets up all components and prepares for operation
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Agent already initialized');
      return;
    }

    try {
      this.status.state = 'initializing';
      this.emit('state-change', this.status.state);

      // Initialize storage
      await this.storage.init();

      // Initialize thinking engine
      this.thinkingEngine = new BaseThinkingEngine({
        agentId: this.config.id,
        agentType: this.config.type,
        capabilities: this.config.capabilities,
        storage: this.storage,
        telemetry: this.telemetry,
      });
      await this.thinkingEngine.init();

      // Initialize communication manager
      this.communicationManager = new CommunicationManager({
        agentId: this.config.id,
        gatewayUrl: this.config.gatewayUrl,
        keypair: this.securityManager.getKeypair(),
        onMessage: this.handleIncomingMessage.bind(this),
        onError: this.handleCommunicationError.bind(this),
      });

      // Register event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      this.status.state = 'stopped';
      this.emit('state-change', this.status.state);

      logger.info('Agent initialized successfully');
    } catch (error) {
      this.status.state = 'error';
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      this.emit('state-change', this.status.state);
      this.emit('error', error);
      
      logger.error('Agent initialization failed', { error });
      throw error;
    }
  }

  /**
   * Start the agent
   * Begins operation and connects to gateway
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.isRunning) {
      logger.warn('Agent already running');
      return;
    }

    try {
      this.status.state = 'running';
      this.startTime = new Date();
      this.isRunning = true;
      this.emit('state-change', this.status.state);

      // Connect to gateway
      if (this.communicationManager) {
        await this.communicationManager.connect();
        this.status.connected = true;
        this.emit('connected', true);
      }

      // Start thinking engine
      if (this.thinkingEngine) {
        await this.thinkingEngine.start();
      }

      // Start telemetry collection
      await this.telemetry.start();

      // Update status
      this.updateStatus();

      logger.info('Agent started successfully');
      this.emit('started');
    } catch (error) {
      this.status.state = 'error';
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      this.isRunning = false;
      this.emit('state-change', this.status.state);
      this.emit('error', error);
      
      logger.error('Agent start failed', { error });
      throw error;
    }
  }

  /**
   * Stop the agent
   * Stops operation and disconnects from gateway
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.status.state = 'stopped';
      this.isRunning = false;
      this.emit('state-change', this.status.state);

      // Stop thinking engine
      if (this.thinkingEngine) {
        await this.thinkingEngine.stop();
      }

      // Disconnect from gateway
      if (this.communicationManager) {
        await this.communicationManager.disconnect();
        this.status.connected = false;
        this.emit('connected', false);
      }

      // Stop telemetry
      await this.telemetry.stop();

      // Update status
      this.updateStatus();

      logger.info('Agent stopped');
      this.emit('stopped');
    } catch (error) {
      logger.error('Error stopping agent', { error });
      throw error;
    }
  }

  /**
   * Restart the agent
   */
  async restart(): Promise<void> {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    await this.start();
  }

  /**
   * Pause the agent
   * Temporarily stops execution but maintains connection
   */
  async pause(): Promise<void> {
    if (this.status.state !== 'running') {
      return;
    }

    this.status.state = 'paused';
    this.emit('state-change', this.status.state);

    if (this.thinkingEngine) {
      await this.thinkingEngine.pause();
    }

    logger.info('Agent paused');
    this.emit('paused');
  }

  /**
   * Resume the agent
   */
  async resume(): Promise<void> {
    if (this.status.state !== 'paused') {
      return;
    }

    this.status.state = 'running';
    this.emit('state-change', this.status.state);

    if (this.thinkingEngine) {
      await this.thinkingEngine.resume();
    }

    logger.info('Agent resumed');
    this.emit('resumed');
  }

  /**
   * Get current status
   */
  getStatus(): AgentStatus {
    this.updateStatus();
    return { ...this.status };
  }

  /**
   * Get configuration
   */
  getConfig(): AgentConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<AgentConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    
    // Save to storage
    await this.storage.set('config', this.config);
    
    // Emit configuration change
    this.emit('config-updated', this.config);
    
    logger.info('Agent configuration updated', { updates });
  }

  /**
   * Handle incoming message from gateway
   */
  private async handleIncomingMessage(message: any): Promise<void> {
    try {
      logger.debug('Received message from gateway', { type: message.type });

      // Update last seen
      this.status.lastSeen = new Date();
      this.updateStatus();

      // Route message to appropriate handler
      switch (message.type) {
        case 'workflow:execute':
          await this.handleWorkflowExecution(message.payload);
          break;
        case 'command:execute':
          await this.handleCommand(message.payload);
          break;
        case 'capability:request':
          await this.handleCapabilityRequest(message.payload);
          break;
        case 'update:available':
          await this.handleUpdateAvailable(message.payload);
          break;
        case 'policy:update':
          await this.handlePolicyUpdate(message.payload);
          break;
        default:
          logger.warn('Unknown message type', { type: message.type });
      }
    } catch (error) {
      logger.error('Error handling incoming message', { error, message });
      this.emit('error', error);
    }
  }

  /**
   * Handle workflow execution request
   */
  private async handleWorkflowExecution(payload: any): Promise<void> {
    if (!this.thinkingEngine) {
      throw new Error('Thinking engine not initialized');
    }

    // Request consent if needed
    const requiresConsent = this.consentManager.requiresConsent('workflow:execute', payload);
    if (requiresConsent) {
      const approved = await this.consentManager.requestConsent('workflow:execute', payload);
      if (!approved) {
        throw new Error('Workflow execution denied by user');
      }
    }

    // Execute workflow via thinking engine
    await this.thinkingEngine.executeWorkflow(payload);
  }

  /**
   * Handle direct command
   */
  private async handleCommand(payload: any): Promise<void> {
    // Request consent if needed
    const requiresConsent = this.consentManager.requiresConsent('command:execute', payload);
    if (requiresConsent) {
      const approved = await this.consentManager.requestConsent('command:execute', payload);
      if (!approved) {
        throw new Error('Command execution denied by user');
      }
    }

    // Execute command via thinking engine
    if (this.thinkingEngine) {
      await this.thinkingEngine.executeCommand(payload);
    }
  }

  /**
   * Handle capability request
   */
  private async handleCapabilityRequest(payload: any): Promise<void> {
    // Check if capability is available
    const capability = payload.capability as keyof AgentCapabilities;
    if (!this.config.capabilities[capability]) {
      throw new Error(`Capability ${capability} not available`);
    }

    // Request consent
    const approved = await this.consentManager.requestConsent('capability:use', payload);
    if (!approved) {
      throw new Error('Capability use denied by user');
    }

    // Execute capability
    // This would be handled by the capability module
    this.emit('capability-requested', payload);
  }

  /**
   * Handle update available notification
   */
  private async handleUpdateAvailable(payload: any): Promise<void> {
    logger.info('Update available', { version: payload.version });
    this.emit('update-available', payload);
  }

  /**
   * Handle policy update
   */
  private async handlePolicyUpdate(payload: any): Promise<void> {
    logger.info('Policy update received', { policies: payload.policies });
    
    // Update consent manager
    this.consentManager.updatePolicies(payload.policies);
    
    // Emit policy update event
    this.emit('policy-updated', payload.policies);
  }

  /**
   * Handle communication error
   */
  private handleCommunicationError(error: Error): void {
    logger.error('Communication error', { error });
    this.status.connected = false;
    this.emit('connected', false);
    this.emit('error', error);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Thinking engine events
    if (this.thinkingEngine) {
      this.thinkingEngine.on('task-completed', (result) => {
        this.emit('task-completed', result);
      });

      this.thinkingEngine.on('task-failed', (error) => {
        this.emit('task-failed', error);
      });
    }

    // Telemetry events
    this.telemetry.on('metric', (metric) => {
      this.emit('metric', metric);
    });
  }

  /**
   * Update status
   */
  private updateStatus(): void {
    if (this.startTime) {
      this.status.uptime = Date.now() - this.startTime.getTime();
    }
    this.status.lastSeen = new Date();
  }

  /**
   * Generate device keypair
   */
  private generateKeypair(): { publicKey: string; privateKey: string } {
    return this.securityManager.generateKeypair();
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    
    if (this.communicationManager) {
      await this.communicationManager.cleanup();
    }

    if (this.thinkingEngine) {
      await this.thinkingEngine.cleanup();
    }

    await this.telemetry.cleanup();
    await this.storage.cleanup();

    logger.info('Agent cleanup completed');
  }
}

