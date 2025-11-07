import express, { Request, Response } from 'express';
import cron from 'node-cron';
import { AuraWorkflowEngine, TimerTrigger } from '@aura/core';
import { ServiceRegistration } from '@aura/core/src/service-registration';
import { initializeDataSource, AppDataSource, Workflow } from '@aura/db';
import { createLogger } from '@aura/utils';
// Config initialization - optional for scheduler
// import { initConfig } from '@aura/config';
import Redis from 'ioredis';
import crypto from 'crypto';

const logger = createLogger();
const app = express();
const port = process.env.PORT || 3003;

// Initialize configuration (optional)
// initConfig();

app.use(express.json());

// Service registration
const serviceRegistration = new ServiceRegistration({
  id: 'scheduler-service',
  name: 'Scheduler Service',
  version: '1.0.0',
  url: `http://${process.env.SERVICE_HOST || 'localhost'}:${port}`,
  metadata: {
    description: 'Workflow scheduling and automation service',
  },
});

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD,
});

// Initialize workflow engine
const workflowEngine = new AuraWorkflowEngine({
  redisConnection: redis,
  enableCache: true,
  enableMetrics: true,
});

// Initialize database
const dbConnection = await initializeDataSource();

// Update workflow engine with database connection
if (dbConnection && dbConnection.isInitialized) {
  (workflowEngine as any).config.dbConnection = dbConnection;
}

// Initialize and start worker
await workflowEngine.init();
await workflowEngine.startWorker();

interface ScheduledWorkflow {
  id: string;
  workflowId: string;
  cronExpression: string;
  task: cron.ScheduledTask;
  trigger?: TimerTrigger;
}

const scheduledWorkflows = new Map<string, ScheduledWorkflow>();

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    service: 'scheduler',
    scheduledWorkflows: scheduledWorkflows.size,
  });
});

// Schedule a workflow
app.post('/schedule', async (req: Request, res: Response) => {
  try {
    const { workflowId, cronExpression, interval } = req.body;
    
    if (!workflowId) {
      return res.status(400).json({ error: 'Workflow ID is required' });
    }

    if (cronExpression) {
      scheduleWorkflowCron(workflowId, cronExpression);
    } else if (interval) {
      scheduleWorkflowInterval(workflowId, interval);
    } else {
      return res.status(400).json({ error: 'Either cronExpression or interval is required' });
    }

    res.json({ 
      message: 'Workflow scheduled successfully',
      workflowId,
    });
  } catch (error) {
    logger.error('Error scheduling workflow', { error });
    res.status(500).json({ 
      error: 'Failed to schedule workflow',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Unschedule a workflow
app.delete('/schedule/:workflowId', (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params as { workflowId: string };
    if (!workflowId) {
      return res.status(400).json({ error: 'Workflow ID is required' });
    }
    unscheduleWorkflow(workflowId);
    res.json({ message: 'Workflow unscheduled successfully' });
  } catch (error) {
    logger.error('Error unscheduling workflow', { error });
    res.status(500).json({ error: 'Failed to unschedule workflow' });
  }
});

// List scheduled workflows
app.get('/schedule', (req: Request, res: Response) => {
  try {
    const schedules = Array.from(scheduledWorkflows.values()).map(scheduled => ({
      id: scheduled.id,
      workflowId: scheduled.workflowId,
      cronExpression: scheduled.cronExpression,
    }));
    res.json({ schedules, total: schedules.length });
  } catch (error) {
    logger.error('Error listing scheduled workflows', { error });
    res.status(500).json({ error: 'Failed to list scheduled workflows' });
  }
});

// Load and schedule workflows from database
async function loadScheduledWorkflows() {
  try {
    const workflowRepo = AppDataSource.getRepository(Workflow);
    const workflows = await workflowRepo.find({
      where: {
        status: 'active',
      } as any,
    });

    for (const workflow of workflows) {
      // Check if workflow has cron schedule in settings
      const schedule = (workflow.settings as any)?.schedule;
      if (schedule && typeof schedule === 'string') {
        if (cron.validate(schedule)) {
          scheduleWorkflowCron(workflow.id.toString(), schedule);
        } else {
          // Try as interval (milliseconds)
          const interval = parseInt(schedule, 10);
          if (!isNaN(interval)) {
            scheduleWorkflowInterval(workflow.id.toString(), interval);
          }
        }
      }
    }

    logger.info(`Loaded ${scheduledWorkflows.size} scheduled workflows`);
  } catch (error) {
    logger.error('Error loading scheduled workflows', { error });
  }
}

// Schedule a workflow with cron expression
function scheduleWorkflowCron(workflowId: string, cronExpression: string) {
  // Remove existing schedule if exists
  if (scheduledWorkflows.has(workflowId)) {
    const existing = scheduledWorkflows.get(workflowId)!;
    existing.task.stop();
    if (existing.trigger) {
      existing.trigger.unregister(existing.id);
    }
    scheduledWorkflows.delete(workflowId);
  }

  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    logger.error(`Invalid cron expression: ${cronExpression} for workflow ${workflowId}`);
    throw new Error(`Invalid cron expression: ${cronExpression}`);
  }

  // Create scheduled task
  const task = cron.schedule(cronExpression, async () => {
    try {
      logger.info(`Executing scheduled workflow: ${workflowId}`);
      await workflowEngine.executeWorkflow(workflowId, undefined, 0, 0);
    } catch (error) {
      logger.error(`Error executing scheduled workflow ${workflowId}`, { error });
    }
  });

  scheduledWorkflows.set(workflowId, {
    id: crypto.randomUUID(),
    workflowId,
    cronExpression,
    task,
  });

  logger.info(`Scheduled workflow ${workflowId} with cron expression: ${cronExpression}`);
}

// Schedule a workflow with interval
function scheduleWorkflowInterval(workflowId: string, intervalMs: number) {
  // Remove existing schedule if exists
  if (scheduledWorkflows.has(workflowId)) {
    const existing = scheduledWorkflows.get(workflowId)!;
    existing.task.stop();
    if (existing.trigger) {
      existing.trigger.unregister(existing.id);
    }
    scheduledWorkflows.delete(workflowId);
  }

  // Create timer trigger
  const trigger = new TimerTrigger({
    schedule: intervalMs.toString(),
  });

  const triggerId = trigger.register(workflowId, crypto.randomUUID());

  // Listen for trigger events
  trigger.on('triggered', async (id, wfId, payload) => {
    try {
      logger.info(`Executing interval-triggered workflow: ${wfId}`);
      await workflowEngine.executeWorkflow(wfId);
    } catch (error) {
      logger.error(`Error executing interval-triggered workflow ${wfId}`, { error });
    }
  });

  // Create a dummy task for consistency
  const task = {
    stop: () => {
      trigger.unregister(triggerId);
    },
  } as cron.ScheduledTask;

  scheduledWorkflows.set(workflowId, {
    id: triggerId,
    workflowId,
    cronExpression: `interval:${intervalMs}ms`,
    task,
    trigger,
  });

  logger.info(`Scheduled workflow ${workflowId} with interval: ${intervalMs}ms`);
}

// Remove scheduled workflow
function unscheduleWorkflow(workflowId: string) {
  if (scheduledWorkflows.has(workflowId)) {
    const scheduled = scheduledWorkflows.get(workflowId)!;
    scheduled.task.stop();
    if (scheduled.trigger) {
      scheduled.trigger.unregister(scheduled.id);
    }
    scheduledWorkflows.delete(workflowId);
    logger.info(`Unscheduled workflow: ${workflowId}`);
  }
}

// Load workflows on startup
await loadScheduledWorkflows();

// Poll database for changes every minute
setInterval(async () => {
  try {
    await loadScheduledWorkflows();
  } catch (error) {
    logger.error('Error reloading scheduled workflows', { error });
  }
}, 60000); // Poll every minute

// Start server
const server = app.listen(port, async () => {
  logger.info(`Scheduler service running on port ${port}`);
  
  // Register with registry service
  await serviceRegistration.register();
  serviceRegistration.setupGracefulShutdown();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Scheduler service shutting down...');
  await serviceRegistration.unregister();
  scheduledWorkflows.forEach((scheduled) => {
    scheduled.task.stop();
    if (scheduled.trigger) {
      scheduled.trigger.unregister(scheduled.id);
    }
  });
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('Scheduler service shutting down...');
  await serviceRegistration.unregister();
  scheduledWorkflows.forEach((scheduled) => {
    scheduled.task.stop();
    if (scheduled.trigger) {
      scheduled.trigger.unregister(scheduled.id);
    }
  });
  server.close(() => {
    process.exit(0);
  });
});