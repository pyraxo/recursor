import type { ToolResult } from "../types/index.js";

/**
 * Format a tool result for display or logging
 * @param result - Tool result to format
 * @returns Formatted string representation
 */
export function formatToolResult(result: ToolResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  return JSON.stringify(result.data, null, 2);
}

/**
 * Format tool result for LLM consumption
 * Optimized for readability and token efficiency
 * @param toolName - Name of the tool that was executed
 * @param result - Tool result
 * @returns Formatted string for LLM
 */
export function formatToolResultForLLM(
  toolName: string,
  result: ToolResult
): string {
  if (!result.success) {
    return `[${toolName} FAILED]\n${result.error}`;
  }

  const dataStr =
    typeof result.data === "string"
      ? result.data
      : JSON.stringify(result.data, null, 2);

  let output = `[${toolName} SUCCESS]\n${dataStr}`;

  if (result.metadata && Object.keys(result.metadata).length > 0) {
    output += `\n\nMetadata: ${JSON.stringify(result.metadata, null, 2)}`;
  }

  return output;
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Format a JSON object for display
 * @param obj - Object to format
 * @param indent - Indentation level (default: 2)
 * @returns Formatted JSON string
 */
export function formatJSON(obj: unknown, indent: number = 2): string {
  return JSON.stringify(obj, null, indent);
}
