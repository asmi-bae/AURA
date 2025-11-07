/**
 * Common Constants
 * 
 * Shared constants used across the application
 */

/**
 * Service names
 */
export const SERVICE_NAMES = {
  GATEWAY: 'gateway',
  AUTH: 'auth',
  WORKFLOW_ENGINE: 'workflow-engine',
  WEBHOOK_HANDLER: 'webhook-handler',
  SCHEDULER: 'scheduler',
  NOTIFICATION: 'notification',
  COLLABORATION: 'collaboration',
  REAL_TIME_AGENT: 'real-time-agent',
  REALTIME: 'realtime',
  AGENT: 'agent',
  PLUGIN: 'plugin',
  RAG: 'rag',
  VECTOR: 'vector',
  MESSAGING: 'messaging',
  ANALYTICS: 'analytics',
  REGISTRY: 'registry',
} as const;

/**
 * Event types
 */
export const EVENT_TYPES = {
  // Workflow events
  WORKFLOW_CREATED: 'workflow.created',
  WORKFLOW_UPDATED: 'workflow.updated',
  WORKFLOW_DELETED: 'workflow.deleted',
  WORKFLOW_EXECUTED: 'workflow.executed',
  WORKFLOW_FAILED: 'workflow.failed',
  
  // Agent events
  AGENT_CREATED: 'agent.created',
  AGENT_UPDATED: 'agent.updated',
  AGENT_DELETED: 'agent.deleted',
  AGENT_TASK_COMPLETED: 'agent.task.completed',
  AGENT_TASK_FAILED: 'agent.task.failed',
  
  // Plugin events
  PLUGIN_LOADED: 'plugin.loaded',
  PLUGIN_UNLOADED: 'plugin.unloaded',
  PLUGIN_ERROR: 'plugin.error',
  
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  
  // Notification events
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',
  
  // System events
  SERVICE_STARTED: 'service.started',
  SERVICE_STOPPED: 'service.stopped',
  SERVICE_ERROR: 'service.error',
} as const;

/**
 * HTTP Status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Error codes
 */
export const ERROR_CODES = {
  // Generic errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  
  // Workflow errors
  WORKFLOW_NOT_FOUND: 'WORKFLOW_NOT_FOUND',
  WORKFLOW_EXECUTION_FAILED: 'WORKFLOW_EXECUTION_FAILED',
  
  // Agent errors
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_TASK_FAILED: 'AGENT_TASK_FAILED',
  
  // Plugin errors
  PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
  PLUGIN_LOAD_FAILED: 'PLUGIN_LOAD_FAILED',
  PLUGIN_EXECUTION_FAILED: 'PLUGIN_EXECUTION_FAILED',
  
  // Auth errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  
  // Database errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
  USER: 'user',
} as const;

/**
 * Agent types
 */
export const AGENT_TYPES = {
  AUTONOMOUS: 'autonomous',
  ASSISTANT: 'assistant',
  WORKFLOW: 'workflow',
} as const;

/**
 * Workflow status
 */
export const WORKFLOW_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
} as const;

/**
 * Execution status
 */
export const EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;
