import { z } from "zod";
import type {
  ToolExecutor,
  ToolResult,
  ToolSchema,
  Context7SearchParams,
  Context7SearchResult,
  Context7ResolveParams,
  Context7ResolveResult,
  LibraryMatch,
} from "../types/index.js";

/**
 * Zod schema for Context7 search documentation parameters
 */
const searchDocsSchema = z.object({
  libraryName: z.string().min(1, "Library name is required"),
  topic: z.string().optional(),
  tokens: z.number().min(100).max(10000).optional().default(3000),
});

/**
 * Zod schema for Context7 resolve library parameters
 */
const resolveLibrarySchema = z.object({
  libraryName: z.string().min(1, "Library name is required"),
});

/**
 * Executor for Context7 documentation search operations
 * Provides access to technical documentation and library references
 */
export class Context7Executor implements ToolExecutor {
  private readonly toolName = "search_documentation";

  /**
   * Execute a documentation search
   * @param params - Search parameters (libraryName, topic, tokens)
   * @returns Promise resolving to search results with documentation content
   */
  async execute(params: unknown): Promise<ToolResult<Context7SearchResult>> {
    try {
      const validated = searchDocsSchema.parse(params);
      return await this.searchDocumentation(validated);
    } catch (error) {
      return this.handleError(error) as ToolResult<Context7SearchResult>;
    }
  }

  /**
   * Resolve a library name to Context7 library ID
   * @param params - Library name to resolve
   * @returns Promise resolving to library matches
   */
  async resolveLibrary(
    params: unknown
  ): Promise<ToolResult<Context7ResolveResult>> {
    try {
      const validated = resolveLibrarySchema.parse(params);
      return await this.resolveLibraryId(validated);
    } catch (error) {
      return this.handleError(error) as ToolResult<Context7ResolveResult>;
    }
  }

  /**
   * Get the schema definition for this tool
   * Used for documentation and prompt generation
   */
  getSchema(): ToolSchema {
    return {
      name: this.toolName,
      description:
        "Search technical documentation, SDKs, and library references. " +
        "Use this when you need to understand APIs, frameworks, or libraries. " +
        "Returns formatted documentation with code examples and usage patterns.",
      parameters: {
        type: "object",
        properties: {
          libraryName: {
            type: "string",
            description:
              'Name of the library or package (e.g., "react", "next.js", "typescript")',
          },
          topic: {
            type: "string",
            description:
              'Specific topic to focus on (e.g., "hooks", "routing", "types")',
          },
          tokens: {
            type: "number",
            description:
              "Maximum tokens of documentation to retrieve (100-10000, default: 3000)",
            default: 3000,
          },
        },
        required: ["libraryName"],
      },
    };
  }

  /**
   * Get the Zod input schema for validation
   */
  getInputSchema() {
    return searchDocsSchema;
  }

  /**
   * Internal method to search documentation
   * This is where the actual Context7 MCP integration would happen
   */
  private async searchDocumentation(
    params: Context7SearchParams
  ): Promise<ToolResult<Context7SearchResult>> {
    try {
      // First, resolve the library name to get the Context7 library ID
      const resolveResult = await this.resolveLibraryId({
        libraryName: params.libraryName,
      });

      if (!resolveResult.success || !resolveResult.data?.topMatch) {
        return {
          success: false,
          error: `Could not find library "${params.libraryName}". Try a more specific name or check spelling.`,
        };
      }

      const libraryId = resolveResult.data.topMatch.libraryId;

      // Then fetch the documentation
      const docs = await this.fetchDocumentation(
        libraryId,
        params.topic,
        params.tokens
      );

      return {
        success: true,
        data: {
          libraryId,
          documentation: docs.content,
          codeExamples: docs.snippets,
          trustScore: resolveResult.data.topMatch.trustScore,
        },
        metadata: {
          libraryName: params.libraryName,
          topic: params.topic,
          tokensRequested: params.tokens,
        },
      };
    } catch (error) {
      return this.handleError(error) as ToolResult<Context7SearchResult>;
    }
  }

  /**
   * Resolve a library name to Context7-compatible library ID
   * Uses the MCP resolve-library-id function
   */
  private async resolveLibraryId(
    params: Context7ResolveParams
  ): Promise<ToolResult<Context7ResolveResult>> {
    try {
      // TODO: Implement actual MCP call to mcp__context7__resolve-library-id
      // For now, returning a mock structure
      // This will be replaced with actual MCP client integration

      // Placeholder implementation
      // In production, this would call the MCP server
      const mockMatches: LibraryMatch[] = [
        {
          libraryId: `/org/${params.libraryName}`,
          name: params.libraryName,
          description: `Documentation for ${params.libraryName}`,
          trustScore: 8.0,
          snippets: 100,
        },
      ];

      return {
        success: true,
        data: {
          matches: mockMatches,
          topMatch: mockMatches[0] || null,
        },
      };
    } catch (error) {
      return this.handleError(error) as ToolResult<Context7ResolveResult>;
    }
  }

  /**
   * Fetch documentation for a specific library
   * Uses the MCP get-library-docs function
   */
  private async fetchDocumentation(
    libraryId: string,
    topic?: string,
    tokens: number = 3000
  ): Promise<{ content: string; snippets: number }> {
    // TODO: Implement actual MCP call to mcp__context7__get-library-docs
    // For now, returning a mock structure

    // Placeholder implementation
    // In production, this would call the MCP server
    return {
      content: `# Documentation for ${libraryId}\n\nTopic: ${topic || "General"}\n\n[Documentation content would appear here]`,
      snippets: 10,
    };
  }

  /**
   * Handle errors consistently across the executor
   */
  private handleError(error: unknown): ToolResult {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    return {
      success: false,
      error: `Context7 search failed: ${errorMessage}`,
    };
  }
}

/**
 * Factory function to create a Context7 executor instance
 */
export function createContext7Executor(): Context7Executor {
  return new Context7Executor();
}
