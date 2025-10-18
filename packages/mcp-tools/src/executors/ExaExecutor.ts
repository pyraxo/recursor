import Exa from "exa-js";
import { z } from "zod";
import type {
  ToolExecutor,
  ToolResult,
  ToolSchema,
  ExaSearchParams,
  ExaSearchResult,
  ExaSimilarParams,
  ExaSimilarResult,
} from "../types/index.js";

/**
 * Zod schema for Exa web search parameters
 */
const webSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  numResults: z.number().min(1).max(20).optional().default(5),
  searchType: z.enum(["neural", "keyword"]).optional().default("neural"),
  includeContent: z.boolean().optional().default(true),
  category: z.enum(["news", "research", "documentation"]).optional(),
});

/**
 * Zod schema for Exa find similar content parameters
 */
const findSimilarSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  numResults: z.number().min(1).max(20).optional().default(5),
});

/**
 * Executor for Exa web search operations
 * Provides AI-powered web search with intelligent ranking
 */
export class ExaExecutor implements ToolExecutor {
  private readonly toolName = "web_search";
  private exa: any | null = null;
  private apiKey: string;

  /**
   * Create an ExaExecutor instance
   * @param apiKey - Exa API key for authentication
   */
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    if (apiKey && apiKey.trim()) {
      this.exa = new (Exa as any)(apiKey);
    }
  }

  /**
   * Execute a web search
   * @param params - Search parameters (query, numResults, etc.)
   * @returns Promise resolving to search results with ranked content
   */
  async execute(params: unknown): Promise<ToolResult<ExaSearchResult>> {
    try {
      const validated = webSearchSchema.parse(params);
      return await this.performWebSearch(validated);
    } catch (error) {
      return this.handleError(error) as ToolResult<ExaSearchResult>;
    }
  }

  /**
   * Find content similar to a given URL
   * @param params - URL and number of results
   * @returns Promise resolving to similar content results
   */
  async findSimilar(
    params: unknown
  ): Promise<ToolResult<ExaSimilarResult>> {
    try {
      const validated = findSimilarSchema.parse(params);
      return await this.findSimilarContent(validated);
    } catch (error) {
      return this.handleError(error) as ToolResult<ExaSimilarResult>;
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
        "Perform intelligent web search with AI-optimized ranking. " +
        "Use this to find current information, recent developments, " +
        "news articles, research papers, or documentation. " +
        "Returns ranked results with content and metadata.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "Search query describing what you're looking for. " +
              "Be specific and use natural language.",
          },
          numResults: {
            type: "number",
            description: "Number of results to return (1-20, default: 5)",
            default: 5,
          },
          searchType: {
            type: "string",
            description:
              '"neural" for AI-powered semantic search (recommended), ' +
              '"keyword" for traditional keyword matching',
            enum: ["neural", "keyword"],
            default: "neural",
          },
          includeContent: {
            type: "boolean",
            description:
              "Whether to extract and include page content (default: true)",
            default: true,
          },
          category: {
            type: "string",
            description:
              'Optional category filter: "news" for recent news, ' +
              '"research" for academic papers, "documentation" for technical docs',
            enum: ["news", "research", "documentation"],
          },
        },
        required: ["query"],
      },
    };
  }

  /**
   * Get the Zod input schema for validation
   */
  getInputSchema() {
    return webSearchSchema;
  }

  /**
   * Internal method to perform web search via Exa API
   */
  private async performWebSearch(
    params: ExaSearchParams
  ): Promise<ToolResult<ExaSearchResult>> {
    if (!this.exa) {
      return {
        success: false,
        error:
          "Exa API key not configured. Please set EXA_API_KEY environment variable.",
      };
    }

    try {
      const searchStartTime = Date.now();

      // Prepare search options
      const searchOptions: any = {
        type: params.searchType,
        numResults: params.numResults,
      };

      // Add category filter if specified
      if (params.category) {
        searchOptions.category = params.category;
      }

      // Perform search with or without content
      const results = params.includeContent
        ? await this.exa.searchAndContents(params.query, {
            ...searchOptions,
            text: true,
          })
        : await this.exa.search(params.query, searchOptions);

      const searchTime = Date.now() - searchStartTime;

      // Transform results to our format
      const transformedResults = results.results.map((result: any) => ({
        title: result.title || "Untitled",
        url: result.url,
        snippet: this.extractSnippet(result.text || result.snippet || ""),
        content: params.includeContent ? result.text : undefined,
        publishedDate: result.publishedDate,
        score: result.score || 0,
      }));

      return {
        success: true,
        data: {
          results: transformedResults,
          searchMetadata: {
            query: params.query,
            totalResults: transformedResults.length,
            searchTime,
          },
        },
        metadata: {
          searchType: params.searchType,
          category: params.category,
        },
      };
    } catch (error) {
      return this.handleError(error) as ToolResult<ExaSearchResult>;
    }
  }

  /**
   * Internal method to find similar content
   */
  private async findSimilarContent(
    params: ExaSimilarParams
  ): Promise<ToolResult<ExaSimilarResult>> {
    if (!this.exa) {
      return {
        success: false,
        error:
          "Exa API key not configured. Please set EXA_API_KEY environment variable.",
      };
    }

    try {
      const results = await this.exa.findSimilar(params.url, {
        numResults: params.numResults,
      });

      const transformedResults = results.results.map((result: any) => ({
        title: result.title || "Untitled",
        url: result.url,
        snippet: this.extractSnippet(result.text || result.snippet || ""),
        similarity: result.score || 0,
      }));

      return {
        success: true,
        data: {
          results: transformedResults,
        },
      };
    } catch (error) {
      return this.handleError(error) as ToolResult<ExaSimilarResult>;
    }
  }

  /**
   * Extract a meaningful snippet from text content
   * Limits to first 200 characters and ensures clean cutoff
   */
  private extractSnippet(text: string, maxLength: number = 200): string {
    if (!text || text.length <= maxLength) {
      return text;
    }

    // Cut at the last complete sentence or word boundary
    const truncated = text.substring(0, maxLength);
    const lastSentence = truncated.lastIndexOf(".");
    const lastSpace = truncated.lastIndexOf(" ");

    if (lastSentence > maxLength * 0.7) {
      return truncated.substring(0, lastSentence + 1);
    } else if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + "...";
    }

    return truncated + "...";
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

    // Provide more helpful error messages for common issues
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      return {
        success: false,
        error: "Invalid Exa API key. Please check your EXA_API_KEY configuration.",
      };
    }

    if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
      return {
        success: false,
        error: "Exa API rate limit exceeded. Please try again later.",
      };
    }

    return {
      success: false,
      error: `Exa search failed: ${errorMessage}`,
    };
  }
}

/**
 * Factory function to create an Exa executor instance
 * @param apiKey - Exa API key
 */
export function createExaExecutor(apiKey: string): ExaExecutor {
  return new ExaExecutor(apiKey);
}
