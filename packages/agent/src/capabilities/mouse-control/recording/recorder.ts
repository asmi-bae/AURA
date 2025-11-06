/**
 * Mouse Action Recorder
 * 
 * Records mouse actions with timestamps and context.
 * Captures sequences for later playback and workflow conversion.
 * 
 * @module @aura/agent/capabilities/mouse-control
 */

import { EventEmitter } from 'events';
import { createLogger } from '@aura/utils';
import { MouseControlManager, MouseButton, Point, MouseActionOptions } from '../mouse-control-manager.js';

const logger = createLogger();

/**
 * Recorded action
 */
export interface RecordedAction {
  id: string;
  type: 'move' | 'click' | 'double-click' | 'drag' | 'scroll' | 'wait';
  timestamp: number;
  relativeTime: number; // Time since recording started
  position?: Point;
  from?: Point;
  to?: Point;
  button?: MouseButton;
  amount?: number;
  direction?: 'up' | 'down';
  waitDuration?: number; // For wait actions
  metadata?: Record<string, any>;
}

/**
 * Recording session
 */
export interface RecordingSession {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  actions: RecordedAction[];
  screenInfo?: {
    width: number;
    height: number;
    scaleFactor: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Recorder options
 */
export interface RecorderOptions {
  /** Capture screenshots with actions */
  captureScreenshots?: boolean;
  /** Capture window context */
  captureWindowContext?: boolean;
  /** Minimum delay between actions to record */
  minDelayThreshold?: number;
  /** Maximum recording duration (ms) */
  maxDuration?: number;
}

/**
 * Mouse Action Recorder
 * 
 * Records mouse actions for playback and workflow conversion.
 */
export class MouseActionRecorder extends EventEmitter {
  private manager: MouseControlManager;
  private isRecording = false;
  private session: RecordingSession | null = null;
  private startTime = 0;
  private lastActionTime = 0;
  private options: Required<RecorderOptions>;
  private actionHandlers: Map<string, (...args: any[]) => void> = new Map();

  constructor(manager: MouseControlManager, options: RecorderOptions = {}) {
    super();
    this.manager = manager;
    this.options = {
      captureScreenshots: options.captureScreenshots ?? false,
      captureWindowContext: options.captureWindowContext ?? true,
      minDelayThreshold: options.minDelayThreshold ?? 50,
      maxDuration: options.maxDuration ?? 3600000, // 1 hour default
    };
  }

  /**
   * Start recording
   */
  async startRecording(name: string = 'Untitled Recording'): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    this.isRecording = true;
    this.startTime = Date.now();
    this.lastActionTime = this.startTime;

    this.session = {
      id: `recording-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      startTime: this.startTime,
      actions: [],
      metadata: {
        platform: process.platform,
        timestamp: new Date().toISOString(),
      },
    };

    // Setup event listeners
    this.setupEventListeners();

    logger.info('Recording started', { sessionId: this.session.id, name });
    this.emit('recording-started', this.session);
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<RecordingSession> {
    if (!this.isRecording || !this.session) {
      throw new Error('No recording in progress');
    }

    this.isRecording = false;
    this.session.endTime = Date.now();

    // Remove event listeners
    this.removeEventListeners();

    const session = { ...this.session };
    this.session = null;

    logger.info('Recording stopped', {
      sessionId: session.id,
      duration: (session.endTime ?? Date.now()) - session.startTime,
      actionCount: session.actions.length,
    });

    this.emit('recording-stopped', session);
    return session;
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (!this.isRecording) {
      return;
    }

    this.isRecording = false;
    logger.info('Recording paused');
    this.emit('recording-paused');
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (this.isRecording || !this.session) {
      return;
    }

    this.isRecording = true;
    this.lastActionTime = Date.now();
    logger.info('Recording resumed');
    this.emit('recording-resumed');
  }

  /**
   * Record action
   */
  private recordAction(action: Omit<RecordedAction, 'id' | 'timestamp' | 'relativeTime'>): void {
    if (!this.isRecording || !this.session) {
      return;
    }

    const now = Date.now();
    const relativeTime = now - this.startTime;

    // Check max duration
    if (relativeTime > this.options.maxDuration) {
      logger.warn('Recording duration exceeded, stopping');
      this.stopRecording();
      return;
    }

    // Record delay if significant
    const delay = now - this.lastActionTime;
    if (delay > this.options.minDelayThreshold) {
      this.session.actions.push({
        id: `wait-${now}`,
        type: 'wait',
        timestamp: now,
        relativeTime,
        waitDuration: delay,
      });
    }

    const recordedAction: RecordedAction = {
      id: `action-${now}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
      relativeTime,
      ...action,
    };

    this.session.actions.push(recordedAction);
    this.lastActionTime = now;

    this.emit('action-recorded', recordedAction);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to mouse control manager events
    const onMoved = (data: { x: number; y: number }) => {
      this.recordAction({
        type: 'move',
        position: { x: data.x, y: data.y },
      });
    };

    const onClicked = (data: { button: MouseButton }) => {
      this.manager.getCurrentPosition().then(position => {
        this.recordAction({
          type: 'click',
          position,
          button: data.button,
        });
      });
    };

    const onDoubleClicked = (data: { button: MouseButton }) => {
      this.manager.getCurrentPosition().then(position => {
        this.recordAction({
          type: 'double-click',
          position,
          button: data.button,
        });
      });
    };

    const onDragged = (data: { from: Point; to: Point }) => {
      this.recordAction({
        type: 'drag',
        from: data.from,
        to: data.to,
      });
    };

    const onScrolled = (data: { amount: number; direction: 'up' | 'down' }) => {
      this.manager.getCurrentPosition().then(position => {
        this.recordAction({
          type: 'scroll',
          position,
          amount: data.amount,
          direction: data.direction,
        });
      });
    };

    this.manager.on('moved', onMoved);
    this.manager.on('clicked', onClicked);
    this.manager.on('double-clicked', onDoubleClicked);
    this.manager.on('dragged', onDragged);
    this.manager.on('scrolled', onScrolled);

    // Store handlers for cleanup
    this.actionHandlers.set('moved', onMoved);
    this.actionHandlers.set('clicked', onClicked);
    this.actionHandlers.set('double-clicked', onDoubleClicked);
    this.actionHandlers.set('dragged', onDragged);
    this.actionHandlers.set('scrolled', onScrolled);
  }

  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    for (const [event, handler] of this.actionHandlers.entries()) {
      this.manager.removeListener(event, handler);
    }
    this.actionHandlers.clear();
  }

  /**
   * Get current session
   */
  getCurrentSession(): RecordingSession | null {
    return this.session ? { ...this.session } : null;
  }

  /**
   * Check if recording
   */
  isRecordingActive(): boolean {
    return this.isRecording;
  }

  /**
   * Get recording statistics
   */
  getStatistics(): {
    duration: number;
    actionCount: number;
    actionTypes: Record<string, number>;
  } | null {
    if (!this.session) {
      return null;
    }

    const endTime = this.session.endTime || Date.now();
    const duration = endTime - this.session.startTime;

    const actionTypes: Record<string, number> = {};
    for (const action of this.session.actions) {
      actionTypes[action.type] = (actionTypes[action.type] || 0) + 1;
    }

    return {
      duration,
      actionCount: this.session.actions.length,
      actionTypes,
    };
  }
}

