import winston from 'winston';

export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'debug';

export interface LoggerConfig {
  level?: LogLevel;
  format?: 'json' | 'simple';
  console?: boolean;
  file?: {
    filename: string;
    maxsize?: number;
    maxFiles?: number;
  };
}

export class Logger {
  private logger: winston.Logger;

  constructor(config: LoggerConfig = {}) {
    const { level = 'info', format = 'json', console: enableConsole = true, file } = config;

    const transports: winston.transport[] = [];

    if (enableConsole) {
      transports.push(
        new winston.transports.Console({
          format: format === 'json' ? winston.format.json() : winston.format.simple(),
        })
      );
    }

    if (file) {
      transports.push(
        new winston.transports.File({
          filename: file.filename,
          maxsize: file.maxsize || 10 * 1024 * 1024, // 10MB
          maxFiles: file.maxFiles || 5,
          format: winston.format.json(),
        })
      );
    }

    this.logger = winston.createLogger({
      level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports,
    });
  }

  error(message: string, meta?: Record<string, any>): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }

  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }

  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }

  http(message: string, meta?: Record<string, any>): void {
    this.logger.http(message, meta);
  }
}

export const createLogger = (config?: LoggerConfig): Logger => {
  return new Logger(config);
};

export const defaultLogger = createLogger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  format: process.env.NODE_ENV === 'production' ? 'json' : 'simple',
  console: true,
  file: {
    filename: 'logs/aura.log',
  },
});

