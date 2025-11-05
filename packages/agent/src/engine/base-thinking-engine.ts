/**
 * Base Thinking Engine
 * 
 * Lightweight reasoning stack inside agent for autonomous decision making.
 * Coordinates planning, execution, memory, and model routing.
 * 
 * Features:
 * - Planner: decomposes high-level goals into actionable steps
 * - Executor: executes low-level actions using capability modules
 * - Memory: short-term episodic memory and long-term cache
 * - Model Router: routes tasks to appropriate AI models
 * - Tool Manager: unified interface to local tools
 * - Verifier: safety checks and pre-execution dry-runs
 * 
 * @module @aura/agent/engine
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';
import { ModelRegistry } from '@aura/ai';
import { AgentType } from '../types/agent-types';
import { AgentCapabilities } from '../types/capabilities';
import { LocalStorage } from '../storage/local-storage';
import { TelemetryService } from '../telemetry/telemetry-service';
import { Planner } from './planner';
import { Executor } from './executor';
import { MemoryManager } from './memory-manager';
import { ModelRouter } from './model-router';
import { ToolManager } from './tool-manager';
import { Verifier } from './verifier';

const logger = createLogger();

/**
 * Thinking Engine Configuration
 */
export interface ThinkingEngineConfig {
  /** Agent ID */
  agentId: string;
  /** Agent type */
  agentType: AgentType;
  /** Agent capabilities */
  capabilities: AgentCapabilities;
  /** Local storage */
  storage: LocalStorage;
  /** Telemetry service */
  telemetry: TelemetryService;
  /** Model registry (optional, uses local models if not provided) */
  modelRegistry?: ModelRegistry;
  /** Enable local LLM fallback */
  enableLocalLLM?: boolean;
  /** Learning loop enabled */
  enableLearning?: boolean;
}

/**
 * Task execution result
 */
export interface TaskResult {
  /** Task ID */
  taskId: string;
  /** Success status */
  success: boolean;
  /** Result data */
  result?: any;
  /** Error if any */
  error?: Error;
  /** Execution duration */
  duration: number;
  /** Steps executed */
  steps: number;
  /** Steps succeeded */
  stepsSucceeded: number;
  /** Steps failed */
  stepsFailed: number;
}

/**
 * Base Thinking Engine
 * 
 * Main reasoning engine for the agent.
 */
export class BaseThinkingEngine extends EventEmitter {
  private config: ThinkingEngineConfig;
  private logger = createLogger();
  
  // Core components
  private planner: Planner;
  private executor: Executor;
  private memory: MemoryManager;
  private modelRouter: ModelRouter;
  private toolManager: ToolManager;
  private verifier: Verifier;

  // State
  private isInitialized = false;
  private isRunning = false;
  private isPaused = false;
  private currentTask: string | null = null;

  constructor(config: ThinkingEngineConfig) {
    super();
    
    this.config = config;

    // Initialize components
    this.planner = new Planner({
      agentId: config.agentId,
      agentType: config.agentType,
      capabilities: config.capabilities,
      modelRegistry: config.modelRegistry,
      enableLocalLLM: config.enableLocalLLM ?? true,
    });

    this.executor = new Executor({
      agentId: config.agentId,
      capabilities: config.capabilities,
      storage: config.storage,
    });

    this.memory = new MemoryManager({
      agentId: config.agentId,
      storage: config.storage,
      maxEpisodicMemory: 100, // Keep last 100 events
      maxLongTermMemory: 1000, // Keep last 1000 events
    });

    this.modelRouter = new ModelRouter({
      modelRegistry: config.modelRegistry,
      enableLocalLLM: config.enableLocalLLM ?? true,
      offlineMode: config.capabilities.offlineMode ?? false,
    });

    this.toolManager = new ToolManager({
      agentId: config.agentId,
      capabilities: config.capabilities,
    });

    this.verifier = new Verifier({
      agentId: config.agentId,
      capabilities: config.capabilities,
    });

    logger.info('Base thinking engine initialized', {
      agentId: config.agentId,
      agentType: config.agentType,
    });
  }

  /**
   * Initialize the thinking engine
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('Thinking engine already initialized');
      return;
    }

    try {
      // Initialize components
      await this.planner.init();
      await this.executor.init();
      await this.memory.init();
      await this.modelRouter.init();
      await this.toolManager.init();
      await this.verifier.init();

      // Setup event handlers
      this.setupEventHandlers();

      this.isInitialized = true;
      logger.info('Thinking engine initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize thinking engine', { error });
      throw error;
    }
  }

  /**
   * Start the thinking engine
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    if (this.isRunning) {
      logger.warn('Thinking engine already running');
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    logger.info('Thinking engine started');
  }

  /**
   * Stop the thinking engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Cancel current task if any
    if (this.currentTask) {
      await this.cancelTask(this.currentTask);
    }

    this.isRunning = false;
    this.isPaused = false;
    logger.info('Thinking engine stopped');
  }

  /**
   * Pause the thinking engine
   */
  async pause(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isPaused = true;
    logger.info('Thinking engine paused');
  }

  /**
   * Resume the thinking engine
   */
  async resume(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isPaused = false;
    logger.info('Thinking engine resumed');
  }

  /**
   * Execute a workflow
   * 
   * @param workflow - Workflow definition
   * @returns Task result
   */
  async executeWorkflow(workflow: any): Promise<TaskResult> {
    if (!this.isRunning || this.isPaused) {
      throw new Error('Thinking engine not running or paused');
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentTask = taskId;
    const startTime = Date.now();

    try {
      logger.info('Executing workflow', { taskId, workflowId: workflow.id });

      // Plan the workflow
      const plan = await this.planner.plan(workflow);

      // Verify the plan
      const verification = await this.verifier.verify(plan);
      if (!verification.approved) {
        throw new Error(`Plan verification failed: ${verification.reason}`);
      }

      // Execute the plan
      const result = await this.executor.execute(plan);

      // Update memory
      await this.memory.recordEvent({
        type: 'workflow:executed',
        taskId,
        workflowId: workflow.id,
        result,
        timestamp: new Date(),
      });

      const duration = Date.now() - startTime;
      const taskResult: TaskResult = {
        taskId,
        success: true,
        result,
        duration,
        steps: plan.steps.length,
        stepsSucceeded: result.stepsSucceeded || plan.steps.length,
        stepsFailed: result.stepsFailed || 0,
      };

      this.emit('task-completed', taskResult);
      this.currentTask = null;

      logger.info('Workflow executed successfully', { taskId, duration });

      return taskResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error('Unknown error');

      // Record error in memory
      await this.memory.recordEvent({
        type: 'workflow:failed',
        taskId,
        error: err.message,
        timestamp: new Date(),
      });

      const taskResult: TaskResult = {
        taskId,
        success: false,
        error: err,
        duration,
        steps: 0,
        stepsSucceeded: 0,
        stepsFailed: 1,
      };

      this.emit('task-failed', taskResult);
      this.currentTask = null;

      logger.error('Workflow execution failed', { taskId, error: err.message });

      throw error;
    }
  }

  /**
   * Execute a command
   * 
   * @param command - Command definition
   * @returns Task result
   */
  async executeCommand(command: any): Promise<TaskResult> {
    if (!this.isRunning || this.isPaused) {
      throw new Error('Thinking engine not running or paused');
    }

    const taskId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.currentTask = taskId;
    const startTime = Date.now();

    try {
      logger.info('Executing command', { taskId, commandType: command.type });

      // Plan the command
      const plan = await this.planner.planCommand(command);

      // Verify the plan
      const verification = await this.verifier.verify(plan);
      if (!verification.approved) {
        throw new Error(`Plan verification failed: ${verification.reason}`);
      }

      // Execute the plan
      const result = await this.executor.execute(plan);

      const duration = Date.now() - startTime;
      const taskResult: TaskResult = {
        taskId,
        success: true,
        result,
        duration,
        steps: 1,
        stepsSucceeded: 1,
        stepsFailed: 0,
      };

      this.emit('task-completed', taskResult);
      this.currentTask = null;

      logger.info('Command executed successfully', { taskId, duration });

      return taskResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error('Unknown error');

      const taskResult: TaskResult = {
        taskId,
        success: false,
        error: err,
        duration,
        steps: 1,
        stepsSucceeded: 0,
        stepsFailed: 1,
      };

      this.emit('task-failed', taskResult);
      this.currentTask = null;

      logger.error('Command execution failed', { taskId, error: err.message });

      throw error;
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    if (this.currentTask !== taskId) {
      return;
    }

    try {
      await this.executor.cancel();
      this.currentTask = null;
      logger.info('Task cancelled', { taskId });
    } catch (error) {
      logger.error('Error cancelling task', { error, taskId });
      throw error;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Planner events
    this.planner.on('plan-created', (plan) => {
      this.emit('plan-created', plan);
    });

    // Executor events
    this.executor.on('step-started', (step) => {
      this.emit('step-started', step);
    });

    this.executor.on('step-completed', (step) => {
      this.emit('step-completed', step);
    });

    this.executor.on('step-failed', (step, error) => {
      this.emit('step-failed', step, error);
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
    
    await this.planner.cleanup();
    await this.executor.cleanup();
    await this.memory.cleanup();
    await this.modelRouter.cleanup();
    await this.toolManager.cleanup();
    await this.verifier.cleanup();

    logger.info('Thinking engine cleanup completed');
  }
}

