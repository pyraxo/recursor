import type { z } from "zod";

/**
 * Schema definition for a tool
 * Describes the structure of input/output parameters
 */
export interface ToolSchema {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Result returned from tool execution
 * Contains either successful data or error information
 */
export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Base interface for all tool executors
 * Implements the Strategy pattern for different tool types
 */
export interface ToolExecutor {
  /**
   * Execute the tool with given parameters
   * @param params - Validated input parameters
   * @returns Promise resolving to tool result
   */
  execute(params: unknown): Promise<ToolResult>;

  /**
   * Get the schema definition for this tool
   * Used for prompt generation and validation
   */
  getSchema(): ToolSchema;

  /**
   * Optional: Get input schema for validation
   */
  getInputSchema?(): z.ZodSchema;
}

/**
 * Configuration for tool client
 */
export interface ToolClientConfig {
  exaApiKey?: string;
  cacheTTL?: number; // Cache time-to-live in milliseconds
  maxCacheSize?: number; // Maximum number of cached entries
}

/**
 * Cache entry structure
 */
export interface CacheEntry<T = unknown> {
  result: ToolResult<T>;
  timestamp: number;
}
