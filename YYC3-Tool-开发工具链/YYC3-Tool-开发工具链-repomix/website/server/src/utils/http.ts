/**
 * HTTP response utilities for consistent API responses
 */

// Error response interface with request tracking
export interface ErrorResponse {
  error: string;
  requestId: string;
  timestamp: string;
}

// Generate standardized error response
export function createErrorResponse(message: string, requestId: string): ErrorResponse {
  return {
    error: message,
    requestId,
    timestamp: new Date().toISOString(),
  };
}
