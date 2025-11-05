export interface ExecutionLog {
  id: string;
  executionId: string;
  workflowId: string;
  nodeId?: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  data?: Record<string, any>;
  timestamp: Date;
}

export interface ExecutionMetrics {
  executionId: string;
  workflowId: string;
  duration: number;
  nodesExecuted: number;
  nodesSucceeded: number;
  nodesFailed: number;
  dataSize: number;
}

