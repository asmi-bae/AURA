import { EventBus } from './event-bus';
import { createLogger } from '@aura/utils';
import { ModelRegistry, MultiAgentOrchestrator } from '@aura/ai';

export interface OrchestratorConfig {
  eventBus: EventBus;
  modelRegistry: ModelRegistry;
  redis?: any;
}

export interface AgentTask {
  id: string;
  type: string;
  context: Record<string, any>;
  agents: Array<{ provider: string; role: string }>;
  priority?: number;
}

export class AuraOrchestrator {
  private eventBus: EventBus;
  private modelRegistry: ModelRegistry;
  private orchestrator: MultiAgentOrchestrator;
  private logger = createLogger();
  private taskQueue: AgentTask[] = [];
  private processingTasks: Set<string> = new Set();

  constructor(config: OrchestratorConfig) {
    this.eventBus = config.eventBus;
    this.modelRegistry = config.modelRegistry;
    this.orchestrator = new MultiAgentOrchestrator(config.modelRegistry);

    // Setup event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.eventBus.on('agent:task', async (task: AgentTask) => {
      await this.processTask(task);
    });

    this.eventBus.on('agent:coordinate', async (data: { task: string; agents: Array<{ provider: string; role: string }>; context: Record<string, any> }) => {
      await this.coordinateAgents(data.task, data.agents, data.context);
    });
  }

  async addTask(task: AgentTask): Promise<void> {
    this.taskQueue.push(task);
    this.taskQueue.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    await this.processNextTask();
  }

  private async processNextTask(): Promise<void> {
    if (this.taskQueue.length === 0 || this.processingTasks.size >= 5) {
      return; // Max 5 concurrent tasks
    }

    const task = this.taskQueue.shift();
    if (!task) return;

    if (this.processingTasks.has(task.id)) {
      return; // Already processing
    }

    this.processingTasks.add(task.id);
    await this.processTask(task);
    this.processingTasks.delete(task.id);

    // Process next task
    await this.processNextTask();
  }

  private async processTask(task: AgentTask): Promise<void> {
    try {
      this.logger.info('Processing agent task', { taskId: task.id, type: task.type });

      // Publish task started event
      await this.eventBus.publish('agent:task:started', {
        taskId: task.id,
        type: task.type,
      });

      // Coordinate agents
      const results = await this.coordinateAgents(
        `Task: ${task.type}`,
        task.agents,
        task.context
      );

      // Publish task completed event
      await this.eventBus.publish('agent:task:completed', {
        taskId: task.id,
        results,
      });

      this.logger.info('Agent task completed', { taskId: task.id });
    } catch (error) {
      this.logger.error('Error processing agent task', { error, taskId: task.id });
      
      await this.eventBus.publish('agent:task:failed', {
        taskId: task.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async coordinateAgents(
    task: string,
    agents: Array<{ provider: string; role: string }>,
    context: Record<string, any>
  ): Promise<Record<string, any>> {
    try {
      this.logger.info('Coordinating agents', { task, agents: agents.length });

      const results = await this.orchestrator.coordinateTask(
        task,
        context,
        agents.map(a => ({ provider: a.provider as any, role: a.role }))
      );

      // Publish coordination results
      await this.eventBus.publish('agent:coordination:completed', {
        task,
        results,
      });

      return results;
    } catch (error) {
      this.logger.error('Error coordinating agents', { error, task });
      throw error;
    }
  }

  async getStatus(): Promise<{
    queueLength: number;
    processingTasks: number;
    availableAgents: string[];
  }> {
    return {
      queueLength: this.taskQueue.length,
      processingTasks: this.processingTasks.size,
      availableAgents: this.modelRegistry.getAllModels(),
    };
  }
}

