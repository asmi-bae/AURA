/**
 * UI Package
 * 
 * Central export for all UI components and utilities.
 * Built with shadcn/ui and Tailwind CSS.
 * 
 * @module @repo/ui
 */

// ============================================================================
// Components - shadcn/ui components
// ============================================================================
export * from './components/ui/index.js';

// ============================================================================
// Lib - Utility functions
// ============================================================================
export * from './lib/index.js';

// ============================================================================
// Legacy Components - Backward compatibility (only code.tsx, button and card are in ui/)
// ============================================================================
export * from './code.js';

