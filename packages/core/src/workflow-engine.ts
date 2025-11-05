import { Workflow } from 'n8n-workflow';
import { Queue, Worker } from 'bullmq';
import { PluginLoader } from './plugin-loader';
import { AuraPlugin } from '@aura/plugins';

export class AuraWorkflowEngine {
  private queue: Queue;
  private worker: Worker | null = null;
  private pluginLoader: PluginLoader;

  constructor(private redisConnection: any) {
    this.queue = new Queue('workflow-execution', { connection: redisConnection });
    this.pluginLoader = new PluginLoader();
  }

  async init(pluginsDir: string) {
    await this.pluginLoader.loadPlugins(pluginsDir, true);
  }

  async executeWorkflow(workflowData: any) {
    await this.queue.add('execute', {
      workflowData,
      plugins: this.pluginLoader.getAllPlugins()
    });
  }

  async startWorker() {
    this.worker = new Worker('workflow-execution', async job => {
      await this.processWorkflow(job);
    }, { connection: this.redisConnection });

    this.worker.on('completed', job => {
      console.log(`Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job ${job?.id} failed with error:`, err);
    });
  }

  async processWorkflow(job: { data: { workflowData: any; plugins: AuraPlugin[] } }) {
    const { workflowData, plugins } = job.data;
    const workflow = new Workflow(workflowData);
    
    await workflow.run({
      source: [{
        type: 'internal',
      }],
      runData: {},
      pinData: {},
      executionMode: 'cli',
      contextData: {
        plugins,
      }
    });
  }
}
