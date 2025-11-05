export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, any>;
}

export interface WorkflowConnection {
  source: string;
  target: string;
  sourceOutput: string;
  targetInput: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  active: boolean;
  settings?: WorkflowSettings;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface WorkflowSettings {
  executionOrder?: 'lastNode' | 'specified';
  saveExecutionProgress?: boolean;
  saveDataErrorExecution?: 'all' | 'none';
  saveManualExecutions?: boolean;
  callerPolicy?: 'workflowsFromSameOwner' | 'anyone';
  timezone?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  mode: 'manual' | 'trigger' | 'webhook' | 'cron';
  status: 'running' | 'success' | 'error' | 'waiting' | 'canceled';
  startedAt: Date;
  stoppedAt?: Date;
  data?: ExecutionData;
  error?: ExecutionError;
}

export interface ExecutionData {
  resultData: {
    runData: Record<string, any>;
    lastNodeExecuted?: string;
  };
}

export interface ExecutionError {
  message: string;
  stack?: string;
  node?: string;
}

