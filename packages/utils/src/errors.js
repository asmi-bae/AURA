"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.ValidationError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.AuraError = void 0;
class AuraError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'AuraError';
    }
}
exports.AuraError = AuraError;
class NotFoundError extends AuraError {
    constructor(resource, id) {
        super(id ? `${resource} with id ${id} not found` : `${resource} not found`, 'NOT_FOUND', 404, { resource, id });
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends AuraError {
    constructor(message = 'Unauthorized') {
        super(message, 'UNAUTHORIZED', 401);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AuraError {
    constructor(message = 'Forbidden') {
        super(message, 'FORBIDDEN', 403);
    }
}
exports.ForbiddenError = ForbiddenError;
class ValidationError extends AuraError {
    constructor(message, details) {
        super(message, 'VALIDATION_ERROR', 400, details);
    }
}
exports.ValidationError = ValidationError;
class ConflictError extends AuraError {
    constructor(message, details) {
        super(message, 'CONFLICT', 409, details);
    }
}
exports.ConflictError = ConflictError;
