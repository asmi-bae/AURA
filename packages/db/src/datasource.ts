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

export const initializeDataSource = async (): Promise<DataSource> => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  return AppDataSource;
};
