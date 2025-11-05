export class AuraError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AuraError';
  }
}

export class NotFoundError extends AuraError {
  constructor(resource: string, id?: string) {
    super(
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      'NOT_FOUND',
      404,
      { resource, id }
    );
  }
}

export class UnauthorizedError extends AuraError {
  constructor(message: string = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401);
  }
}

export class ForbiddenError extends AuraError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN', 403);
  }
}

export class ValidationError extends AuraError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class ConflictError extends AuraError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFLICT', 409, details);
  }
}

