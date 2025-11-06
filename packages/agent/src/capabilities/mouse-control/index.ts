/**
 * Mouse Control
 * 
 * Central export for mouse control capabilities.
 * 
 * @module @aura/agent/capabilities/mouse-control
 */

// ============================================================================
// Main Components
// ============================================================================
export * from './mouse-control-manager.js';
export * from './mouse-control-capability.js';

// Export MouseControlScreenInfo separately to avoid conflict with screen-capture's ScreenInfo
export type { MouseControlScreenInfo } from './mouse-control-manager.js';

// ============================================================================
// Backends - Platform-specific implementations
// ============================================================================
export * from './backends/mouse-backend.js';
export * from './backends/robotjs-backend.js';
export * from './backends/mock-backend.js';

// ============================================================================
// Managers - Multi-monitor and window management
// ============================================================================
export * from './managers/index.js';

// ============================================================================
// Safety - Policy gate and safety checks
// ============================================================================
export * from './safety/index.js';

// ============================================================================
// Vision - Element location and vision integration
// ============================================================================
export * from './vision/index.js';

// ============================================================================
// Scheduling - Action scheduling and execution
// ============================================================================
export * from './scheduling/index.js';

// ============================================================================
// Audit - Action logging and telemetry
// ============================================================================
export * from './audit/index.js';

// ============================================================================
// Recording - Recording and playback engine
// ============================================================================
export * from './recording/index.js';

// ============================================================================
// Utils - Utility functions and helpers
// ============================================================================
export * from './utils/index.js';

