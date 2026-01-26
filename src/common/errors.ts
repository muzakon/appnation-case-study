/**
 * Validation error detail for field-level errors.
 */
export interface ValidationDetail {
  field: string;
  message: string;
}

/**
 * Base application error class.
 * All custom errors should extend this class.
 */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Resource not found error.
 * Use when a requested entity doesn't exist.
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string | number) {
    const message = identifier
      ? `${resource} with id '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

/**
 * Validation error with optional field-level details.
 * Use for input validation failures.
 */
export class ValidationError extends AppError {
  public details?: ValidationDetail[] | string[];

  constructor(message: string, details?: ValidationDetail[] | string[]) {
    super(message, 400, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.details = details;
  }
}

/**
 * Conflict error for duplicate resources.
 * Use when creating a resource that already exists.
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

/**
 * Authentication error.
 * Use when credentials are missing or invalid.
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(message, 401, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

/**
 * Authorization error.
 * Use when user lacks permission for an action.
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "You don't have permission to perform this action") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

/**
 * External service unavailable error.
 * Use when external services (GCS, Redis) fail.
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string, message?: string) {
    super(
      message || `${service} is temporarily unavailable. Please try again later.`,
      503,
      "SERVICE_UNAVAILABLE",
    );
    this.name = "ServiceUnavailableError";
  }
}

/**
 * Bad request error for malformed requests.
 * Use for general client errors that don't fit other categories.
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(message, 400, "BAD_REQUEST");
    this.name = "BadRequestError";
  }
}

/**
 * Rate limit exceeded error.
 * Use when user has reached their rate limit.
 */
export class RateLimitExceededError extends AppError {
  constructor() {
    super(
      `Rate limit exceeded.`,
      429,
      "RATE_LIMIT_EXCEEDED",
    );
    this.name = "RateLimitExceededError";
  }
}