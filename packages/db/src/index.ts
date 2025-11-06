import 'reflect-metadata';
import { AppDataSource, initializeDataSource } from './datasource.js';

// ============================================================================
// Entities - All database entities
// ============================================================================
export * from './entities/User.js';
export * from './entities/Workflow.js';
export * from './entities/Plugin.js';
export * from './entities/Session.js';
export * from './entities/Log.js';
export * from './entities/base.entity.js';

// ============================================================================
// DataSource - Database connection and initialization
// ============================================================================
export { AppDataSource, initializeDataSource };

// ============================================================================
// Repositories - Custom repository implementations
// ============================================================================
export * from './repositories/base.repository.js';
export * from './repositories/user.repository.js';
export * from './repositories/workflow.repository.js';

// ============================================================================
// Query Builder - Dynamic query building utilities
// ============================================================================
export * from './query-builder/query-builder.js';
