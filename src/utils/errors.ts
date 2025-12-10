/**
 * Custom error classes for Dooray MCP Server
 */

/**
 * Base error class for Dooray API errors
 */
export class DoorayAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseData?: unknown
  ) {
    super(message);
    this.name = 'DoorayAPIError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends DoorayAPIError {
  constructor(message: string = 'Invalid or missing Dooray API token') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Format error for MCP client response
 */
export function formatError(error: unknown): string {
  if (error instanceof DoorayAPIError) {
    const details = error.statusCode ? ` (Status: ${error.statusCode})` : '';
    return `Dooray API Error: ${error.message}${details}`;
  }

  if (error instanceof ValidationError) {
    return `Validation Error: ${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
