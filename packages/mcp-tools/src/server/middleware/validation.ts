import { z } from "zod";

/**
 * Validate tool parameters against a schema
 * @param params - Parameters to validate
 * @param schema - Zod schema to validate against
 * @returns Validation result with parsed data or error
 */
export function validateToolParams<T>(
  params: unknown,
  schema: z.ZodSchema<T>
): { valid: true; data: T } | { valid: false; error: string } {
  try {
    const data = schema.parse(params);
    return { valid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
      return {
        valid: false,
        error: `Validation failed: ${errors.join(", ")}`,
      };
    }
    return {
      valid: false,
      error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validate required environment variables
 * @param vars - Array of required variable names
 * @returns Validation result
 */
export function validateEnvironment(
  vars: string[]
): { valid: true } | { valid: false; missing: string[] } {
  const missing = vars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true };
}

/**
 * Sanitize tool parameters to prevent injection attacks
 * @param params - Parameters to sanitize
 * @returns Sanitized parameters
 */
export function sanitizeParams(params: unknown): unknown {
  if (typeof params !== "object" || params === null) {
    return params;
  }

  if (Array.isArray(params)) {
    return params.map(sanitizeParams);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    // Remove potentially dangerous keys
    if (key.startsWith("__") || key.startsWith("$")) {
      continue;
    }

    sanitized[key] = sanitizeParams(value);
  }

  return sanitized;
}
