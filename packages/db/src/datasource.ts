import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { User } from './entities/User.js';
import { Workflow } from './entities/Workflow.js';
import { Plugin } from './entities/Plugin.js';
import { Session } from './entities/Session.js';
import { Log } from './entities/Log.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, '..');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

type SupportedDrivers = 'sqlite' | 'postgres';

const entities = [User, Workflow, Plugin, Session, Log];

const migrationsDir = path.resolve(packageRoot, 'migrations');

const commonOptions = {
  entities,
  migrations: [path.join(migrationsDir, '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  logging: process.env.DB_LOGGING === 'true',
  // Connection pooling for better performance
  extra: {
    // Connection pool settings
    max: parseInt(process.env.DB_POOL_MAX || '10', 10), // Maximum pool size
    min: parseInt(process.env.DB_POOL_MIN || '2', 10), // Minimum pool size
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10), // 30 seconds
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000', 10), // 2 seconds
  },
  // Enable query result caching
  cache: process.env.DB_CACHE_ENABLED === 'true' ? {
    type: 'ioredis', // or 'redis' if using Redis
    duration: parseInt(process.env.DB_CACHE_DURATION || '30000', 10), // 30 seconds default
  } : false,
} satisfies Partial<DataSourceOptions>;

const dbType = (process.env.DB_TYPE as SupportedDrivers | undefined) ?? 'sqlite';

const dataDir = path.resolve(packageRoot, '..', 'data');
const defaultSqlitePath = path.resolve(dataDir, 'aura.db');
const sqlitePath = process.env.DB_PATH
  ? path.resolve(process.cwd(), process.env.DB_PATH)
  : defaultSqlitePath;

let dataSourceOptions: DataSourceOptions;

if (dbType === 'postgres') {
  dataSourceOptions = {
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? 'aura',
    password: process.env.DB_PASS ?? 'securepassword',
    database: process.env.DB_NAME ?? 'aura',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    ...commonOptions,
  } satisfies DataSourceOptions;
} else {
  fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
  dataSourceOptions = {
    type: 'sqlite',
    database: sqlitePath,
    ...commonOptions,
  } satisfies DataSourceOptions;
}

export const AppDataSource = new DataSource(dataSourceOptions);

let isInitializing = false;
let initializationPromise: Promise<DataSource> | null = null;

/**
 * Initialize data source with connection pooling and health checks
 */
export const initializeDataSource = async (): Promise<DataSource> => {
  // If already initialized, return immediately
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  // If already initializing, wait for that promise
  if (isInitializing && initializationPromise) {
    return initializationPromise;
  }

  // Start initialization
  isInitializing = true;
  initializationPromise = (async () => {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
        
        // Setup connection health monitoring
        setupConnectionHealthCheck();
        
        // Setup auto-reconnect on disconnect
        setupAutoReconnect();
      }
      return AppDataSource;
    } catch (error) {
      isInitializing = false;
      initializationPromise = null;
      throw error;
    } finally {
      isInitializing = false;
    }
  })();

  return initializationPromise;
};

/**
 * Setup connection health check
 */
function setupConnectionHealthCheck(): void {
  // Check connection health every 30 seconds
  setInterval(async () => {
    try {
      if (AppDataSource.isInitialized) {
        await AppDataSource.query('SELECT 1');
      }
    } catch (error) {
      console.error('Database connection health check failed:', error);
      // Attempt to reconnect
      if (!AppDataSource.isInitialized) {
        try {
          await AppDataSource.initialize();
        } catch (reconnectError) {
          console.error('Failed to reconnect to database:', reconnectError);
        }
      }
    }
  }, 30000); // 30 seconds
}

/**
 * Setup auto-reconnect on disconnect
 */
function setupAutoReconnect(): void {
  // Note: TypeORM doesn't have built-in disconnect event, but we can monitor
  // the connection status in health checks
}
