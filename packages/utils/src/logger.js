"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLogger = exports.createLogger = exports.Logger = void 0;
const winston_1 = __importDefault(require("winston"));
class Logger {
    logger;
    constructor(config = {}) {
        const { level = 'info', format = 'json', console: enableConsole = true, file } = config;
        const transports = [];
        if (enableConsole) {
            transports.push(new winston_1.default.transports.Console({
                format: format === 'json' ? winston_1.default.format.json() : winston_1.default.format.simple(),
            }));
        }
        if (file) {
            transports.push(new winston_1.default.transports.File({
                filename: file.filename,
                maxsize: file.maxsize || 10 * 1024 * 1024, // 10MB
                maxFiles: file.maxFiles || 5,
                format: winston_1.default.format.json(),
            }));
        }
        this.logger = winston_1.default.createLogger({
            level,
            format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
            transports,
        });
    }
    error(message, meta) {
        this.logger.error(message, meta);
    }
    warn(message, meta) {
        this.logger.warn(message, meta);
    }
    info(message, meta) {
        this.logger.info(message, meta);
    }
    debug(message, meta) {
        this.logger.debug(message, meta);
    }
    http(message, meta) {
        this.logger.http(message, meta);
    }
}
exports.Logger = Logger;
const createLogger = (config) => {
    return new Logger(config);
};
exports.createLogger = createLogger;
exports.defaultLogger = (0, exports.createLogger)({
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'production' ? 'json' : 'simple',
    console: true,
    file: {
        filename: 'logs/aura.log',
    },
});
