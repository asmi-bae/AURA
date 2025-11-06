/**
 * AURA Agent Package
 * 
 * Cross-platform desktop agent platform for AURA.
 * Provides automation, monitoring, and AI-driven capabilities.
 * 
 * @module @aura/agent
 */

// Core (exports AgentConfig, AgentStatus from core)
export * from './core';

// Types (only export types not in core)
export * from './types/agent-types';
export * from './types/capabilities';

// Engine
export * from './engine';

// Capabilities
export * from './capabilities';

// Security (exports KeyPair from security-manager, not security.ts)
export { SecurityManager, type KeyPair } from './security/security-manager';

// Consent
export * from './consent';

// Communication
export * from './communication';

// Storage
export * from './storage';

// Telemetry
export * from './telemetry';

// Legacy (for backward compatibility)
export * from './legacy/automation';
export * from './legacy/screencapture';
