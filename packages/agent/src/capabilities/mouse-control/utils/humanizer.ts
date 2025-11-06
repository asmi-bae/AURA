/**
 * Humanizer
 * 
 * Adds natural delays, movement curves, and randomization
 * to make mouse movements appear human-like.
 * 
 * @module @aura/agent/capabilities/mouse-control
 */

import { createLogger } from '@aura/utils';
import { Point } from '../mouse-control-manager.js';

const logger = createLogger();

/**
 * Humanizer Configuration
 */
export interface HumanizerConfig {
  /** Base delay between actions (ms) */
  baseDelay?: number;
  /** Delay variation range (ms) */
  delayVariation?: number;
  /** Movement speed factor (0-1, where 1 is fastest) */
  speedFactor?: number;
  /** Jitter amplitude for movement */
  jitterAmplitude?: number;
  /** Enable Bezier curves for movement */
  useBezierCurves?: boolean;
}

/**
 * Humanizer
 * 
 * Generates human-like mouse movements and delays.
 */
export class Humanizer {
  private config: Required<HumanizerConfig>;

  constructor(config: HumanizerConfig = {}) {
    this.config = {
      baseDelay: config.baseDelay ?? 50,
      delayVariation: config.delayVariation ?? 20,
      speedFactor: config.speedFactor ?? 0.7,
      jitterAmplitude: config.jitterAmplitude ?? 2,
      useBezierCurves: config.useBezierCurves ?? true,
    };
  }

  /**
   * Generate movement path with humanization
   */
  generatePath(start: Point, end: Point, humanizeLevel: number = 0.7): Point[] {
    const path: Point[] = [];
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    );

    // Calculate number of steps based on distance and humanize level
    const baseSteps = Math.max(5, Math.floor(distance / 10));
    const steps = Math.floor(baseSteps * (1 + humanizeLevel * 0.5));

    if (this.config.useBezierCurves && humanizeLevel > 0.3) {
      // Use Bezier curve for more natural movement
      return this.generateBezierPath(start, end, steps, humanizeLevel);
    } else {
      // Linear interpolation with jitter
      return this.generateLinearPath(start, end, steps, humanizeLevel);
    }
  }

  /**
   * Generate Bezier curve path
   */
  private generateBezierPath(
    start: Point,
    end: Point,
    steps: number,
    humanizeLevel: number
  ): Point[] {
    const path: Point[] = [];
    
    // Create control points for Bezier curve
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    // Add some randomness to control points
    const jitterX = (Math.random() - 0.5) * this.config.jitterAmplitude * humanizeLevel * 10;
    const jitterY = (Math.random() - 0.5) * this.config.jitterAmplitude * humanizeLevel * 10;
    
    const cp1 = {
      x: midX + jitterX,
      y: midY + jitterY,
    };
    
    const cp2 = {
      x: midX - jitterX * 0.5,
      y: midY - jitterY * 0.5,
    };

    // Generate points along Bezier curve
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const point = this.bezierPoint(start, cp1, cp2, end, t);
      
      // Add small jitter
      if (humanizeLevel > 0.5) {
        point.x += (Math.random() - 0.5) * this.config.jitterAmplitude;
        point.y += (Math.random() - 0.5) * this.config.jitterAmplitude;
      }
      
      path.push({
        x: Math.round(point.x),
        y: Math.round(point.y),
      });
    }

    return path;
  }

  /**
   * Generate linear path with jitter
   */
  private generateLinearPath(
    start: Point,
    end: Point,
    steps: number,
    humanizeLevel: number
  ): Point[] {
    const path: Point[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;

      // Add jitter based on humanize level
      const jitterX = (Math.random() - 0.5) * this.config.jitterAmplitude * humanizeLevel;
      const jitterY = (Math.random() - 0.5) * this.config.jitterAmplitude * humanizeLevel;

      path.push({
        x: Math.round(x + jitterX),
        y: Math.round(y + jitterY),
      });
    }

    return path;
  }

  /**
   * Calculate point on Bezier curve
   */
  private bezierPoint(
    p0: Point,
    p1: Point,
    p2: Point,
    p3: Point,
    t: number
  ): Point {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;

    return { x, y };
  }

  /**
   * Generate human-like delay
   */
  async delay(baseMs?: number): Promise<void> {
    const base = baseMs ?? this.config.baseDelay;
    const variation = this.config.delayVariation;
    const delayMs = base + (Math.random() - 0.5) * variation * 2;
    
    await new Promise(resolve => setTimeout(resolve, Math.max(0, delayMs)));
  }

  /**
   * Generate delay with variation
   */
  async delayWithVariation(minMs: number, maxMs: number): Promise<void> {
    const delayMs = minMs + Math.random() * (maxMs - minMs);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
}

