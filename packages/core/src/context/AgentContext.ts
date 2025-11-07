/**
 * Agent Context
 * 
 * Context information for agent execution
 */

export interface AgentContext {
  /** Agent ID */
  agentId: string;
  /** Agent type */
  agentType: string;
  /** User ID (owner) */
  userId: string;
  /** Session ID */
  sessionId?: string;
  /** Request ID */
  requestId?: string;
  /** Execution ID */
  executionId?: string;
  /** Context timestamp */
  timestamp: Date;
  /** Memory context */
  memory?: {
    shortTerm?: any[];
    longTerm?: any[];
  };
  /** Tool context */
  tools?: {
    available: string[];
    executed: Array<{
      tool: string;
      input: any;
      output: any;
      timestamp: Date;
    }>;
  };
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Agent Context Manager
 */
export class AgentContextManager {
  private static contextMap: Map<string, AgentContext> = new Map();

  /**
   * Create agent context
   */
  static create(context: Partial<AgentContext>): AgentContext {
    if (!context.agentId) {
      throw new Error('Agent ID is required');
    }

    const fullContext: AgentContext = {
      agentId: context.agentId,
      agentType: context.agentType || 'autonomous',
      userId: context.userId || '',
      sessionId: context.sessionId || this.generateSessionId(),
      requestId: context.requestId,
      executionId: context.executionId || this.generateExecutionId(),
      timestamp: context.timestamp || new Date(),
      memory: context.memory || {},
      tools: context.tools || { available: [], executed: [] },
      metadata: context.metadata || {},
    };

    this.contextMap.set(fullContext.agentId, fullContext);
    return fullContext;
  }

  /**
   * Get agent context
   */
  static get(agentId: string): AgentContext | undefined {
    return this.contextMap.get(agentId);
  }

  /**
   * Set agent context
   */
  static set(agentId: string, context: AgentContext): void {
    this.contextMap.set(agentId, context);
  }

  /**
   * Update agent context
   */
  static update(agentId: string, updates: Partial<AgentContext>): AgentContext {
    const existing = this.get(agentId);
    if (!existing) {
      throw new Error(`Agent context not found: ${agentId}`);
    }

    const updated = { ...existing, ...updates };
    this.set(agentId, updated);
    return updated;
  }

  /**
   * Delete agent context
   */
  static delete(agentId: string): void {
    this.contextMap.delete(agentId);
  }

  /**
   * Generate session ID
   */
  private static generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate execution ID
   */
  private static generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Add tool execution to context
   */
  static addToolExecution(
    agentId: string,
    tool: string,
    input: any,
    output: any
  ): void {
    const context = this.get(agentId);
    if (!context) {
      throw new Error(`Agent context not found: ${agentId}`);
    }

    if (!context.tools) {
      context.tools = { available: [], executed: [] };
    }

    context.tools.executed.push({
      tool,
      input,
      output,
      timestamp: new Date(),
    });

    this.set(agentId, context);
  }
}
