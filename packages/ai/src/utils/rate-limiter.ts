/**
 * Rate Limiter
 * 
 * Utilities for rate limiting API calls.
 * 
 * @module @aura/ai/utils/rate-limiter
 */

/**
 * Simple rate limiter
 */
export class RateLimiter {
  private requests: number[] = [];
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}
  
  /**
   * Check if request can be made
   */
  canMakeRequest(): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => time > windowStart);
    
    return this.requests.length < this.maxRequests;
  }
  
  /**
   * Record a request
   */
  recordRequest(): void {
    this.requests.push(Date.now());
  }
  
  /**
   * Wait until request can be made
   */
  async waitUntilAvailable(): Promise<void> {
    while (!this.canMakeRequest()) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (Date.now() - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, Math.max(0, waitTime)));
    }
  }
  
  /**
   * Get time until next request can be made
   */
  getTimeUntilAvailable(): number {
    if (this.canMakeRequest()) {
      return 0;
    }
    
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (Date.now() - oldestRequest));
  }
}

