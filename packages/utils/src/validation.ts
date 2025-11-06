import { z, ZodSchema, ZodError } from 'zod';
import { ValidationError } from './errors';

export function validate<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Validation failed', { errors: error.errors });
    }
    throw error;
  }
}

export function validateAsync<T>(schema: ZodSchema<T>, data: unknown): Promise<T> {
  return schema.parseAsync(data);
}

// Common validation schemas
export const schemas = {
  id: z.string().uuid(),
  email: z.string().email(),
  url: z.string().url(),
  date: z.string().datetime(),
  pagination: z.object({
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(20),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  }),
};

