import { Context7Executor } from "../executors/Context7Executor";
import { ExaExecutor } from "../executors/ExaExecutor";
import type {
  ToolClientConfig,
  ToolExecutor,
  ToolResult,
  ToolSchema,
} from "../types/index";
import { ToolCache } from "./cache";

/**
 * Main client for executing MCP tools
 * Manages tool registration, execution, and caching
 */
export class MCPToolClient {
  private executors: Map<string, ToolExecutor>;
  private cache: ToolCache;

  /**
   * Create a new MCPToolClient instance
   * @param config - Configuration for the tool client
   */
  constructor(config: ToolClientConfig = {}) {
    this.executors = new Map();
    this.cache = new ToolCache(config.cacheTTL, config.maxCacheSize);

    // Register default executors
    this.registerDefaultExecutors(config);
  }

  /**
   * Execute a tool by name with given parameters
   * @param toolName - Name of the tool to execute
   * @param params - Parameters for the tool
   * @returns Promise resolving to tool result
   */
  async executeTool(toolName: string, params: unknown): Promise<ToolResult> {
    // Generate cache key
    const cacheKey = this.cache.generateKey(toolName, params);

    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult) {
      return {
        ...cachedResult,
        metadata: {
          ...cachedResult.metadata,
          cached: true,
        },
      };
    }

    // Get executor
    const executor = this.executors.get(toolName);
    if (!executor) {
      return {
        success: false,
        error: `Tool "${toolName}" not found. Available tools: ${this.getAvailableTools().join(", ")}`,
      };
    }

    // Execute tool
    try {
      const result = await executor.execute(params);

      // Cache successful results
      if (result.success) {
        this.cache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get a list of all available tool names
   * @returns Array of tool names
   */
  getAvailableTools(): string[] {
    return Array.from(this.executors.keys());
  }

  /**
   * Get the schema for a specific tool
   * @param toolName - Name of the tool
   * @returns Tool schema or null if not found
   */
  getToolSchema(toolName: string): ToolSchema | null {
    const executor = this.executors.get(toolName);
    return executor ? executor.getSchema() : null;
  }

  /**
   * Get all tool schemas
   * @returns Array of all tool schemas
   */
  getAllToolSchemas(): ToolSchema[] {
    return Array.from(this.executors.values()).map((executor) =>
      executor.getSchema()
    );
  }

  /**
   * Generate a formatted prompt describing available tools
   * For inclusion in agent system prompts
   * @returns Formatted tool description string
   */
  getToolsPrompt(): string {
    const tools = this.getAllToolSchemas();

    if (tools.length === 0) {
      return "No external tools available.";
    }

    const toolDescriptions = tools
      .map((schema) => {
        const params = Object.entries(schema.parameters.properties || {})
          .map(([name, def]: [string, any]) => {
            const required = schema.parameters.required?.includes(name)
              ? " (required)"
              : " (optional)";
            const description = def.description || "";
            return `    - ${name}${required}: ${description}`;
          })
          .join("\n");

        return `
**${schema.name}**
${schema.description}

Parameters:
${params}
`.trim();
      })
      .join("\n\n");

    return `
## Available External Tools

You have access to the following external tools. To use a tool, include this format in your response:

\`\`\`
TOOL_USE: <tool_name>
PARAMS: <JSON object with parameters>
\`\`\`

${toolDescriptions}

After using a tool, you will receive a TOOL_RESULT with the information you requested.
Use this information to enhance your response or decision-making.
`.trim();
  }

  /**
   * Register a custom tool executor
   * @param executor - Tool executor to register
   */
  registerExecutor(executor: ToolExecutor): void {
    const schema = executor.getSchema();
    this.executors.set(schema.name, executor);
  }

  /**
   * Unregister a tool executor
   * @param toolName - Name of the tool to unregister
   * @returns True if tool was unregistered, false if not found
   */
  unregisterExecutor(toolName: string): boolean {
    return this.executors.delete(toolName);
  }

  /**
   * Clear the tool result cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clean up expired cache entries
   * @returns Number of entries cleaned
   */
  cleanupCache(): number {
    return this.cache.cleanupExpired();
  }

  /**
   * Register default tool executors
   */
  private registerDefaultExecutors(config: ToolClientConfig): void {
    // Register Context7 executor
    const context7 = new Context7Executor();
    this.registerExecutor(context7);

    // Register Exa executor if API key is provided
    if (config.exaApiKey) {
      const exa = new ExaExecutor(config.exaApiKey);
      this.registerExecutor(exa);
    }
  }
}

/**
 * Factory function to create an MCPToolClient instance
 * @param config - Tool client configuration
 */
export function createMCPToolClient(config?: ToolClientConfig): MCPToolClient {
  return new MCPToolClient(config);
}
