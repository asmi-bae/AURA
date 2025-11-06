"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = void 0;
exports.validate = validate;
exports.validateAsync = validateAsync;
const zod_1 = require("zod");
const errors_1 = require("./errors");
function validate(schema, data) {
    try {
        return schema.parse(data);
    }
    catch (error) {
        if (error instanceof zod_1.ZodError) {
            throw new errors_1.ValidationError('Validation failed', { errors: error.errors });
        }
        throw error;
    }
}
function validateAsync(schema, data) {
    return schema.parseAsync(data);
}
// Common validation schemas
exports.schemas = {
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    url: zod_1.z.string().url(),
    date: zod_1.z.string().datetime(),
    pagination: zod_1.z.object({
        page: zod_1.z.number().int().positive().default(1),
        limit: zod_1.z.number().int().positive().max(100).default(20),
        sortBy: zod_1.z.string().optional(),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
    }),
};
