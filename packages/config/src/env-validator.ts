/**
 * Environment Validator
 * 
 * Validates environment variables using Zod schemas
 */

import { z } from 'zod';
import { createLogger } from '@aura/utils';

const logger = createLogger();

/**
 * Environment schema validation
 */
export const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  
  // Database
  DB_TYPE: z.enum(['sqlite', 'postgres', 'mysql']).default('sqlite'),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  DB_USER: z.string().optional(),
  DB_PASS: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_SYNC: z.string().transform(val => val === 'true').default('false'),
  
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('6379'),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().transform(Number).pipe(z.number().int().nonnegative()).default('0'),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // OAuth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().url().optional(),
  
  // AI
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  
  // SMTP
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  SMTP_SECURE: z.string().transform(val => val === 'true').default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  // Twilio
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM: z.string().optional(),
  
  // Slack
  SLACK_TOKEN: z.string().optional(),
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  
  // Firebase
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),
  
  // CORS
  CORS_ORIGIN: z.string().default('*'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'simple']).default('json'),
  
  // Workflow Engine
  PLUGINS_DIR: z.string().default('./plugins'),
  MAX_CONCURRENT_EXECUTIONS: z.string().transform(Number).pipe(z.number().int().positive()).default('10'),
  
  // Feature Flags
  ENABLE_CACHE: z.string().transform(val => val !== 'false').default('true'),
  ENABLE_METRICS: z.string().transform(val => val !== 'false').default('true'),
  ENABLE_TRACING: z.string().transform(val => val === 'true').default('false'),
});

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validate environment variables
 */
export function validateEnv(env: Record<string, string | undefined> = process.env): EnvConfig {
  try {
    const config = envSchema.parse(env);
    logger.info('Environment validation passed');
    return config;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      logger.error('Environment validation failed', { errors: error.errors });
      throw new Error(`Environment validation failed: ${missing}`);
    }
    throw error;
  }
}

/**
 * Get environment variable with type coercion
 */
export function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (value === undefined) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

/**
 * Get boolean environment variable
 */
export function getEnvBool(key: string, defaultValue = false): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value === 'true' || value === '1';
}

/**
 * Get number environment variable
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Environment variable ${key} is required but not set`);
    }
    return defaultValue;
  }
  const num = Number(value);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} is not a valid number`);
  }
  return num;
}
