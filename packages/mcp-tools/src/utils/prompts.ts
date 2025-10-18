import type { ToolSchema } from "../types/index";

/**
 * Generate a formatted description of a single tool
 * @param schema - Tool schema
 * @returns Formatted tool description
 */
export function formatToolDescription(schema: ToolSchema): string {
  const paramsList = Object.entries(schema.parameters.properties || {})
    .map(([name, def]) => {
      const defObj = def as Record<string, unknown>;
      const required = schema.parameters.required?.includes(name)
        ? "**required**"
        : "optional";
      const description = (defObj.description as string) || "";
      const defaultValue =
        defObj.default !== undefined ? ` (default: ${defObj.default})` : "";
      return `  - \`${name}\` (${required}): ${description}${defaultValue}`;
    })
    .join("\n");

  return `
### ${schema.name}

${schema.description}

**Parameters:**
${paramsList}
`.trim();
}

/**
 * Generate a complete tools prompt for agent instructions
 * @param schemas - Array of tool schemas
 * @returns Complete formatted prompt
 */
export function generateToolsPrompt(schemas: ToolSchema[]): string {
  if (schemas.length === 0) {
    return "";
  }

  const toolDescriptions = schemas
    .map((schema) => formatToolDescription(schema))
    .join("\n\n");

  return `
## External Tools Available

You have access to external tools that can help you gather information and perform tasks.

### How to Use Tools

To use a tool, include the following format in your response:

\`\`\`
TOOL_USE: <tool_name>
PARAMS: {"param1": "value1", "param2": "value2"}
\`\`\`

You will receive the tool result, which you can then use in your analysis or response.

### Available Tools

${toolDescriptions}

### Important Notes

- Only use tools when they provide value for the current task
- Ensure all required parameters are provided
- Tool results will be returned in a TOOL_RESULT block
- You can use multiple tools, but use them sequentially
`.trim();
}

/**
 * Parse tool use from agent response
 * @param response - Agent response text
 * @returns Parsed tool name and parameters, or null if no tool use detected
 */
export function parseToolUse(response: string): {
  toolName: string;
  params: unknown;
} | null {
  const toolMatch = response.match(/TOOL_USE:\s*(\S+)/i);
  const paramsMatch = response.match(/PARAMS:\s*({[\s\S]*?})/i);

  if (!toolMatch) {
    return null;
  }

  const toolName = toolMatch[1]?.trim();
  if (!toolName) {
    return null;
  }

  let params: unknown = {};
  if (paramsMatch && paramsMatch[1]) {
    try {
      params = JSON.parse(paramsMatch[1]);
    } catch (error) {
      console.warn("Failed to parse tool parameters:", error);
      params = {};
    }
  }

  return { toolName, params };
}

/**
 * Generate example usage for a tool
 * @param schema - Tool schema
 * @param exampleParams - Example parameters
 * @returns Formatted example
 */
export function generateToolExample(
  schema: ToolSchema,
  exampleParams: Record<string, unknown>
): string {
  return `
Example usage of ${schema.name}:

\`\`\`
TOOL_USE: ${schema.name}
PARAMS: ${JSON.stringify(exampleParams, null, 2)}
\`\`\`
`.trim();
}
