/**
 * Service Lifecycle
 * 
 * Manages service lifecycle states and transitions
 */

import { EventEmitter } from 'events';

export type LifecycleState =
  | 'created'
  | 'initializing'
  | 'initialized'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'stopped'
  | 'error';

/**
 * Lifecycle state machine
 */
const VALID_TRANSITIONS: Record<LifecycleState, LifecycleState[]> = {
  created: ['initializing', 'error'],
  initializing: ['initialized', 'error'],
  initialized: ['starting', 'error'],
  starting: ['running', 'error'],
  running: ['stopping', 'error'],
  stopping: ['stopped', 'error'],
  stopped: ['starting', 'error'],
  error: ['initializing', 'stopped'],
};

/**
 * Lifecycle Manager
 */
export class Lifecycle extends EventEmitter {
  private state: LifecycleState = 'created';
  private error: Error | null = null;
  private serviceName: string;

  constructor(serviceName: string) {
    super();
    this.serviceName = serviceName;
  }

  /**
   * Get current state
   */
  getState(): LifecycleState {
    return this.state;
  }

  /**
   * Get error (if in error state)
   */
  getError(): Error | null {
    return this.error;
  }

  /**
   * Transition to new state
   */
  transitionTo(newState: LifecycleState, error?: Error): void {
    const validTransitions = VALID_TRANSITIONS[this.state];
    
    if (!validTransitions.includes(newState)) {
      throw new Error(
        `Invalid state transition from ${this.state} to ${newState} for service ${this.serviceName}`
      );
    }

    const oldState = this.state;
    this.state = newState;
    
    if (error) {
      this.error = error;
    } else if (newState !== 'error') {
      this.error = null;
    }

    this.emit('stateChange', newState, oldState);
    
    if (newState === 'error' && error) {
      this.emit('error', error);
    }
  }

  /**
   * Check if state is valid
   */
  isValidState(state: LifecycleState): boolean {
    return Object.keys(VALID_TRANSITIONS).includes(state);
  }

  /**
   * Check if service is running
   */
  isRunning(): boolean {
    return this.state === 'running';
  }

  /**
   * Check if service is stopped
   */
  isStopped(): boolean {
    return this.state === 'stopped';
  }

  /**
   * Check if service is in error state
   */
  isError(): boolean {
    return this.state === 'error';
  }
}
