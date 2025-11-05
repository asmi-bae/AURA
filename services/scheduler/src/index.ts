import cron from 'node-cron';
import { AuraWorkflowEngine } from '@aura/core';
import { initializeDataSource, Workflow } from '@aura/db';
import { createLogger } from '@aura/utils';
import Redis from 'ioredis';
import crypto from 'crypto';

const logger = createLogger();

// Initialize Redis connection
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD,
});

// Initialize workflow engine
const workflowEngine = new AuraWorkflowEngine(redis);

// Initialize database
await initializeDataSource();

// Start worker
await workflowEngine.startWorker();

interface ScheduledWorkflow {
  id: string;
  workflowId: string;
  cronExpression: string;
  task: cron.ScheduledTask;
}

const scheduledWorkflows = new Map<string, ScheduledWorkflow>();

// Load and schedule workflows from database
async function loadScheduledWorkflows() {
  try {
    const workflows = await Workflow.find({
      where: {
        active: true,
      },
    });

    for (const workflow of workflows) {
      // Check if workflow has cron schedule in settings
      const schedule = (workflow.settings as any)?.schedule;
      if (schedule && typeof schedule === 'string') {
        scheduleWorkflow(workflow.id, schedule);
      }
    }

    logger.info(`Loaded ${scheduledWorkflows.size} scheduled workflows`);
  } catch (error) {
    logger.error('Error loading scheduled workflows', { error });
  }
}

// Schedule a workflow
function scheduleWorkflow(workflowId: string, cronExpression: string) {
  // Remove existing schedule if exists
  if (scheduledWorkflows.has(workflowId)) {
    const existing = scheduledWorkflows.get(workflowId)!;
    existing.task.stop();
    scheduledWorkflows.delete(workflowId);
  }

  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    logger.error(`Invalid cron expression: ${cronExpression} for workflow ${workflowId}`);
    return;
  }

  // Create scheduled task
  const task = cron.schedule(cronExpression, async () => {
    try {
      logger.info(`Executing scheduled workflow: ${workflowId}`);
      await workflowEngine.executeWorkflow({
        id: workflowId,
        trigger: {
          type: 'cron',
          timestamp: new Date(),
        },
      });
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

  logger.info(`Scheduled workflow ${workflowId} with expression: ${cronExpression}`);
}

// Remove scheduled workflow
function unscheduleWorkflow(workflowId: string) {
  if (scheduledWorkflows.has(workflowId)) {
    const scheduled = scheduledWorkflows.get(workflowId)!;
    scheduled.task.stop();
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

logger.info('Scheduler service started');

// Keep process alive
process.on('SIGTERM', () => {
  logger.info('Scheduler service shutting down...');
  scheduledWorkflows.forEach((scheduled) => {
    scheduled.task.stop();
  });
  process.exit(0);
});
