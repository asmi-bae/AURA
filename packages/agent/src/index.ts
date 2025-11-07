/**
 * AURA Agent Package
 * 
 * Cross-platform desktop agent platform for AURA.
 * Provides automation, monitoring, and AI-driven capabilities.
 * 
 * Dynamic exports - all modules are automatically exported through
 * their respective index.ts files. Adding new modules to subdirectories
 * will automatically make them available if the subdirectory's index.ts
 * uses `export *`.
 * 
 * @module @aura/agent
 */

// ============================================================================
// Core - Agent configuration, status, and main runtime
// ============================================================================
export * from './core';

// ============================================================================
// Types - Agent types and capability definitions
// ============================================================================
// Export types explicitly to avoid conflicts with core exports
export type { AgentCapabilities, CapabilityMetadata } from './types/capabilities';
export { AgentType, type AgentTypeConfig, AGENT_TYPE_CONFIGS, getAgentTypeConfig, getAllAgentTypes } from './types/agent-types';
// Note: AgentConfig and AgentStatus are exported from ./core, not ./types

// ============================================================================
// Engine - Thinking engine, planner, executor, memory, routing
// ============================================================================
export * from './engine';

// ============================================================================
// Capabilities - Capability modules and registry
// ============================================================================
export * from './capabilities';

// ============================================================================
// Security - Security manager and key management
// ============================================================================
export { SecurityManager, type KeyPair } from './security/security-manager';

// ============================================================================
// Consent - Consent management and policy enforcement
// ============================================================================
export * from './consent';

// ============================================================================
// Communication - Gateway communication and WebSocket management
// ============================================================================
export * from './communication';

// ============================================================================
// Storage - Local storage and persistence
// ============================================================================
export * from './storage';

// ============================================================================
// Telemetry - Metrics collection and monitoring
// ============================================================================
export * from './telemetry';

// ============================================================================
// Legacy - Backward compatibility exports
// ============================================================================
export * from './legacy/automation';
export * from './legacy/screencapture';
