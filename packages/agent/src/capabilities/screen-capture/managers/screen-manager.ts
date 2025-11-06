/**
 * Screen Manager
 * 
 * Manages multi-monitor setups and screen information.
 * 
 * @module @aura/agent/capabilities/screen-capture/managers
 */

import { createLogger } from '@aura/utils';
import { ScreenInfo } from '../types/index.js';

const logger = createLogger();

/**
 * Screen Manager
 * 
 * Manages screen information and multi-monitor setups.
 */
export class ScreenManager {
  private screens: ScreenInfo[] = [];
  private primaryScreen: ScreenInfo | null = null;
  private isInitialized = false;

  /**
   * Initialize screen manager
   */
  async init(): Promise<void> {
    await this.detectScreens();
    this.isInitialized = true;
    logger.info('Screen manager initialized', {
      screenCount: this.screens.length,
      primaryScreen: this.primaryScreen?.id,
    });
  }

  /**
   * Detect all screens
   */
  private async detectScreens(): Promise<void> {
    const platform = process.platform;

    if (platform === 'win32') {
      await this.detectWindowsScreens();
    } else if (platform === 'darwin') {
      await this.detectMacScreens();
    } else if (platform === 'linux') {
      await this.detectLinuxScreens();
    } else {
      // Default: single screen
      this.screens = [{
        id: 0,
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        scaleFactor: 1.0,
        isPrimary: true,
      }];
      this.primaryScreen = this.screens[0];
    }
  }

  /**
   * Detect Windows screens
   */
  private async detectWindowsScreens(): Promise<void> {
    // Placeholder - would use Windows API
    this.screens = [{
      id: 0,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      scaleFactor: 1.0,
      isPrimary: true,
    }];
    this.primaryScreen = this.screens[0];
  }

  /**
   * Detect macOS screens
   */
  private async detectMacScreens(): Promise<void> {
    // Placeholder - would use macOS APIs
    this.screens = [{
      id: 0,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      scaleFactor: 1.0,
      isPrimary: true,
    }];
    this.primaryScreen = this.screens[0];
  }

  /**
   * Detect Linux screens
   */
  private async detectLinuxScreens(): Promise<void> {
    // Placeholder - would use X11/Wayland APIs
    this.screens = [{
      id: 0,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      scaleFactor: 1.0,
      isPrimary: true,
    }];
    this.primaryScreen = this.screens[0];
  }

  /**
   * Get all screens
   */
  getScreens(): ScreenInfo[] {
    return [...this.screens];
  }

  /**
   * Get screen by ID
   */
  getScreen(id: number): ScreenInfo | null {
    return this.screens.find(s => s.id === id) || null;
  }

  /**
   * Get primary screen
   */
  getPrimaryScreen(): ScreenInfo | null {
    return this.primaryScreen;
  }

  /**
   * Get screen at coordinates
   */
  getScreenAt(x: number, y: number): ScreenInfo | null {
    return this.screens.find(s =>
      x >= s.x &&
      x < s.x + s.width &&
      y >= s.y &&
      y < s.y + s.height
    ) || null;
  }
}

