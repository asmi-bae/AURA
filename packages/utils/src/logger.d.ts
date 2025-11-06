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
export declare class Logger {
    private logger;
    constructor(config?: LoggerConfig);
    error(message: string, meta?: Record<string, any>): void;
    warn(message: string, meta?: Record<string, any>): void;
    info(message: string, meta?: Record<string, any>): void;
    debug(message: string, meta?: Record<string, any>): void;
    http(message: string, meta?: Record<string, any>): void;
}
export declare const createLogger: (config?: LoggerConfig) => Logger;
export declare const defaultLogger: Logger;
//# sourceMappingURL=logger.d.ts.map