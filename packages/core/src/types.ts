export interface WorkflowDefinition {
  id: string;
  name: string;
  nodes: WorkflowNode[];
}

export interface WorkflowNode {
  id: string;
  type: string;
  parameters: Record<string, any>;
}
