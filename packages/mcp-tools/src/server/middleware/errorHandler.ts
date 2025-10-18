/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
  timestamp: number;
}

/**
 * Create a standardized error response
 * @param error - Error object or message
 * @param code - Optional error code
 * @returns Formatted error response
 */
export function createErrorResponse(
  error: unknown,
  code?: string
): ErrorResponse {
  let errorMessage: string;
  let details: unknown;

  if (error instanceof Error) {
    errorMessage = error.message;
    details = {
      name: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  } else if (typeof error === "string") {
    errorMessage = error;
  } else {
    errorMessage = "An unknown error occurred";
    details = error;
  }

  return {
    error: errorMessage,
    code,
    details,
    timestamp: Date.now(),
  };
}

/**
 * Handle tool execution errors
 * @param error - Error from tool execution
 * @returns Error response suitable for MCP
 */
export function handleToolError(error: unknown): ErrorResponse {
  // Check for specific error types
  if (error instanceof Error) {
    if (error.message.includes("rate limit")) {
      return createErrorResponse(error, "RATE_LIMIT_EXCEEDED");
    }

    if (error.message.includes("unauthorized") || error.message.includes("401")) {
      return createErrorResponse(error, "UNAUTHORIZED");
    }

    if (error.message.includes("not found") || error.message.includes("404")) {
      return createErrorResponse(error, "NOT_FOUND");
    }

    if (error.message.includes("timeout")) {
      return createErrorResponse(error, "TIMEOUT");
    }
  }

  return createErrorResponse(error, "TOOL_EXECUTION_ERROR");
}

/**
 * Log errors in a structured format
 * @param context - Context where error occurred
 * @param error - Error to log
 */
export function logError(context: string, error: unknown): void {
  const timestamp = new Date().toISOString();
  const errorMessage =
    error instanceof Error ? error.message : String(error);

  console.error(`[${timestamp}] Error in ${context}: ${errorMessage}`);

  if (error instanceof Error && error.stack) {
    console.error(`Stack trace: ${error.stack}`);
  }
}
