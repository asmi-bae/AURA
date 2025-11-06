/**
 * Playback Engine
 * 
 * Replays recorded mouse sequences with speed control, repeat, and conditional branching.
 * Supports converting recordings to workflow nodes.
 * 
 * @module @aura/agent/capabilities/mouse-control
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';
import { MouseControlManager, MouseActionOptions } from '../mouse-control-manager.js';
import { RecordingSession, RecordedAction } from './recorder.js';

const logger = createLogger();

/**
 * Playback options
 */
export interface PlaybackOptions {
  /** Playback speed multiplier (1.0 = normal, 2.0 = 2x speed) */
  speed?: number;
  /** Repeat count (0 = infinite, 1 = once, etc.) */
  repeat?: number;
  /** Start from specific action index */
  startFrom?: number;
  /** Stop at specific action index */
  stopAt?: number | undefined;
  /** Enable conditional branching */
  enableBranching?: boolean;
  /** Wait conditions (e.g., wait for window to appear) */
  waitConditions?: Array<{
    actionIndex: number;
    condition: () => Promise<boolean>;
    timeout?: number;
  }>;
  /** Action options to apply */
  actionOptions?: MouseActionOptions;
}

/**
 * Playback status
 */
export interface PlaybackStatus {
  sessionId: string;
  currentAction: number;
  totalActions: number;
  isPlaying: boolean;
  isPaused: boolean;
  speed: number;
  repeatCount: number;
  currentRepeat: number;
}

/**
 * Playback Engine
 * 
 * Replays recorded mouse sequences.
 */
export class PlaybackEngine extends EventEmitter {
  private manager: MouseControlManager;
  private isPlaying = false;
  private isPaused = false;
  private currentSession: RecordingSession | null = null;
  private currentActionIndex = 0;
  private currentRepeat = 0;
  private playbackOptions: {
    speed: number;
    repeat: number;
    startFrom: number;
    stopAt?: number;
    enableBranching: boolean;
    waitConditions: Array<{
      actionIndex: number;
      condition: () => Promise<boolean>;
      timeout?: number;
    }>;
    actionOptions?: MouseActionOptions;
  };
  private abortController: AbortController | null = null;

  constructor(manager: MouseControlManager, options: PlaybackOptions = {}) {
    super();
    this.manager = manager;
    this.playbackOptions = {
      speed: options.speed ?? 1.0,
      repeat: options.repeat ?? 1,
      startFrom: options.startFrom ?? 0,
      stopAt: options.stopAt,
      enableBranching: options.enableBranching ?? false,
      waitConditions: options.waitConditions ?? [],
      actionOptions: options.actionOptions ?? {},
    };
  }

  /**
   * Play recording
   */
  async play(session: RecordingSession, options: PlaybackOptions = {}): Promise<void> {
    if (this.isPlaying) {
      throw new Error('Playback already in progress');
    }

    // Merge options with defaults
    const mergedOptions: PlaybackOptions = {
      speed: options.speed ?? this.playbackOptions.speed,
      repeat: options.repeat ?? this.playbackOptions.repeat ?? 1,
      startFrom: options.startFrom ?? this.playbackOptions.startFrom ?? 0,
      stopAt: options.stopAt ?? this.playbackOptions.stopAt,
      enableBranching: options.enableBranching ?? this.playbackOptions.enableBranching,
      waitConditions: options.waitConditions ?? this.playbackOptions.waitConditions,
      actionOptions: options.actionOptions ?? this.playbackOptions.actionOptions,
    };

    this.currentSession = session;
    this.currentActionIndex = mergedOptions.startFrom ?? 0;
    this.currentRepeat = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.abortController = new AbortController();

    const stopAt = mergedOptions.stopAt ?? session.actions.length;

    logger.info('Playback started', {
      sessionId: session.id,
      actionCount: session.actions.length,
      speed: mergedOptions.speed,
      repeat: mergedOptions.repeat,
    });

    this.emit('playback-started', {
      sessionId: session.id,
      totalActions: session.actions.length,
    });

    try {
      // Repeat loop
      while (
        ((mergedOptions.repeat ?? 0) === 0 || this.currentRepeat < (mergedOptions.repeat ?? 1)) &&
        !this.abortController.signal.aborted
      ) {
        if (this.currentRepeat > 0) {
          this.currentActionIndex = mergedOptions.startFrom ?? 0;
          logger.debug('Repeating playback', { repeat: this.currentRepeat });
        }

        // Play actions
        for (let i = this.currentActionIndex; i < stopAt; i++) {
          if (this.abortController.signal.aborted) {
            break;
          }

          // Wait if paused
          while (this.isPaused && !this.abortController.signal.aborted) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          if (this.abortController.signal.aborted) {
            break;
          }

          const action = session.actions[i];
          if (!action) {
            continue;
          }

          // Check wait conditions
          if (mergedOptions.enableBranching) {
            const waitCondition = (mergedOptions.waitConditions ?? []).find(
              wc => wc.actionIndex === i
            );
            if (waitCondition) {
              const conditionMet = await Promise.race([
                waitCondition.condition(),
                new Promise<boolean>((resolve) =>
                  setTimeout(() => resolve(false), waitCondition.timeout ?? 5000)
                ),
              ]);

              if (!conditionMet) {
                logger.warn('Wait condition not met, stopping playback', {
                  actionIndex: i,
                });
                throw new Error('Wait condition not met');
              }
            }
          }

          // Execute action
          await this.executeAction(action, mergedOptions);

          this.currentActionIndex = i + 1;

          this.emit('action-played', {
            actionIndex: i,
            action,
            progress: (i + 1) / session.actions.length,
          });
        }

        this.currentRepeat++;

        if ((mergedOptions.repeat ?? 0) === 0 || this.currentRepeat < (mergedOptions.repeat ?? 1)) {
          // Wait before next repeat
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (!this.abortController.signal.aborted) {
        logger.info('Playback completed', {
          sessionId: session.id,
          repeatCount: this.currentRepeat,
        });
        this.emit('playback-completed', {
          sessionId: session.id,
          repeatCount: this.currentRepeat,
        });
      }
    } catch (error) {
      logger.error('Playback failed', {
        sessionId: session.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      this.emit('playback-failed', {
        sessionId: session.id,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
      throw error;
    } finally {
      this.isPlaying = false;
      this.isPaused = false;
      this.currentActionIndex = 0;
      this.currentRepeat = 0;
      this.abortController = null;
    }
  }

  /**
   * Execute recorded action
   */
  private async executeAction(
    action: RecordedAction,
    options: PlaybackOptions
  ): Promise<void> {
    // Calculate delay based on speed
    let delay = 0;
    const speed = options.speed ?? 1.0;
    if (action.type === 'wait' && action.waitDuration) {
      delay = action.waitDuration / speed;
    } else if (action.relativeTime > 0) {
      // Calculate delay from previous action
      const previousAction = this.currentSession?.actions.find(
        a => a.relativeTime < action.relativeTime
      );
      if (previousAction) {
        delay = (action.relativeTime - previousAction.relativeTime) / speed;
      }
    }

    // Wait before action
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, Math.max(0, delay)));
    }

    // Execute action based on type
    switch (action.type) {
      case 'move':
        if (action.position) {
          await this.manager.moveTo(
            action.position.x,
            action.position.y,
            options.actionOptions
          );
        }
        break;

      case 'click':
        if (action.position && action.button) {
          await this.manager.moveTo(
            action.position.x,
            action.position.y,
            options.actionOptions
          );
          await this.manager.click(action.button, options.actionOptions);
        }
        break;

      case 'double-click':
        if (action.position && action.button) {
          await this.manager.moveTo(
            action.position.x,
            action.position.y,
            options.actionOptions ?? {}
          );
          await this.manager.doubleClick(action.button, options.actionOptions ?? {});
        }
        break;

      case 'drag':
        if (action.from && action.to) {
          await this.manager.drag(action.from, action.to, options.actionOptions ?? {});
        }
        break;

      case 'scroll':
        if (action.position && action.amount && action.direction) {
          await this.manager.moveTo(
            action.position.x,
            action.position.y,
            options.actionOptions ?? {}
          );
          await this.manager.scroll(action.amount, action.direction, options.actionOptions ?? {});
        }
        break;

      case 'wait':
        // Wait action is handled by delay above
        break;

      default:
        logger.warn('Unknown action type', { type: action.type });
    }
  }

  /**
   * Pause playback
   */
  pause(): void {
    if (!this.isPlaying) {
      return;
    }

    this.isPaused = true;
    logger.info('Playback paused');
    this.emit('playback-paused', {
      currentAction: this.currentActionIndex,
    });
  }

  /**
   * Resume playback
   */
  resume(): void {
    if (!this.isPlaying || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    logger.info('Playback resumed');
    this.emit('playback-resumed', {
      currentAction: this.currentActionIndex,
    });
  }

  /**
   * Stop playback
   */
  async stop(): Promise<void> {
    if (!this.isPlaying) {
      return;
    }

    if (this.abortController) {
      this.abortController.abort();
    }

    this.isPlaying = false;
    this.isPaused = false;

    logger.info('Playback stopped', {
      currentAction: this.currentActionIndex,
    });

    this.emit('playback-stopped', {
      currentAction: this.currentActionIndex,
    });
  }

  /**
   * Get playback status
   */
  getStatus(): PlaybackStatus | null {
    if (!this.currentSession) {
      return null;
    }

    return {
      sessionId: this.currentSession.id,
      currentAction: this.currentActionIndex,
      totalActions: this.currentSession.actions.length,
      isPlaying: this.isPlaying,
      isPaused: this.isPaused,
      speed: this.playbackOptions.speed,
      repeatCount: this.playbackOptions.repeat,
      currentRepeat: this.currentRepeat,
    };
  }

  /**
   * Convert recording to workflow nodes
   */
  convertToWorkflowNodes(session: RecordingSession): Array<{
    type: string;
    id: string;
    config: Record<string, any>;
  }> {
    const nodes: Array<{
      type: string;
      id: string;
      config: Record<string, any>;
    }> = [];

    for (const action of session.actions) {
      const nodeId = `node-${action.id}`;

      switch (action.type) {
        case 'move':
          nodes.push({
            type: 'agent.mouse.move',
            id: nodeId,
            config: {
              x: action.position?.x,
              y: action.position?.y,
            },
          });
          break;

        case 'click':
          nodes.push({
            type: 'agent.mouse.click',
            id: nodeId,
            config: {
              x: action.position?.x,
              y: action.position?.y,
              button: action.button,
            },
          });
          break;

        case 'double-click':
          nodes.push({
            type: 'agent.mouse.double-click',
            id: nodeId,
            config: {
              x: action.position?.x,
              y: action.position?.y,
              button: action.button,
            },
          });
          break;

        case 'drag':
          nodes.push({
            type: 'agent.mouse.drag',
            id: nodeId,
            config: {
              fromX: action.from?.x,
              fromY: action.from?.y,
              toX: action.to?.x,
              toY: action.to?.y,
            },
          });
          break;

        case 'scroll':
          nodes.push({
            type: 'agent.mouse.scroll',
            id: nodeId,
            config: {
              x: action.position?.x,
              y: action.position?.y,
              amount: action.amount,
              direction: action.direction,
            },
          });
          break;

        case 'wait':
          nodes.push({
            type: 'agent.wait',
            id: nodeId,
            config: {
              duration: action.waitDuration,
            },
          });
          break;
      }
    }

    return nodes;
  }
}

