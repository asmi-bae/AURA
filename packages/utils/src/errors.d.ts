export declare class AuraError extends Error {
    code: string;
    statusCode: number;
    details?: Record<string, any> | undefined;
    constructor(message: string, code: string, statusCode?: number, details?: Record<string, any> | undefined);
}
export declare class NotFoundError extends AuraError {
    constructor(resource: string, id?: string);
}
export declare class UnauthorizedError extends AuraError {
    constructor(message?: string);
}
export declare class ForbiddenError extends AuraError {
    constructor(message?: string);
}
export declare class ValidationError extends AuraError {
    constructor(message: string, details?: Record<string, any>);
}
export declare class ConflictError extends AuraError {
    constructor(message: string, details?: Record<string, any>);
}
//# sourceMappingURL=errors.d.ts.map