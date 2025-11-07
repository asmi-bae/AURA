/**
 * Request Context
 * 
 * Context information for HTTP requests
 */

export interface RequestContext {
  /** Request ID */
  requestId: string;
  /** User ID */
  userId?: string;
  /** User roles */
  roles?: string[];
  /** IP address */
  ip?: string;
  /** User agent */
  userAgent?: string;
  /** Request timestamp */
  timestamp: Date;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Request Context Manager
 */
export class RequestContextManager {
  private static contextMap: Map<string, RequestContext> = new Map();

  /**
   * Create request context
   */
  static create(context: Partial<RequestContext>): RequestContext {
    const fullContext: RequestContext = {
      requestId: context.requestId || this.generateRequestId(),
      userId: context.userId,
      roles: context.roles || [],
      ip: context.ip,
      userAgent: context.userAgent,
      timestamp: context.timestamp || new Date(),
      metadata: context.metadata || {},
    };

    this.contextMap.set(fullContext.requestId, fullContext);
    return fullContext;
  }

  /**
   * Get request context
   */
  static get(requestId: string): RequestContext | undefined {
    return this.contextMap.get(requestId);
  }

  /**
   * Set request context
   */
  static set(requestId: string, context: RequestContext): void {
    this.contextMap.set(requestId, context);
  }

  /**
   * Delete request context
   */
  static delete(requestId: string): void {
    this.contextMap.delete(requestId);
  }

  /**
   * Generate request ID
   */
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get current context (from async local storage or similar)
   */
  static getCurrent(): RequestContext | undefined {
    // This would typically use AsyncLocalStorage in Node.js
    // For now, we'll return undefined
    return undefined;
  }

  /**
   * Run with context
   */
  static async runWithContext<T>(
    context: RequestContext,
    fn: () => Promise<T>
  ): Promise<T> {
    // This would typically use AsyncLocalStorage.run()
    // For now, we'll just run the function
    return await fn();
  }
}
