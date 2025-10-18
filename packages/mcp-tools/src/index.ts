// Client exports
export {
  MCPToolClient,
  createMCPToolClient,
  ToolCache,
  createToolCache,
} from "./client/index.js";

// Executor exports
export {
  Context7Executor,
  createContext7Executor,
  ExaExecutor,
  createExaExecutor,
} from "./executors/index.js";

// Type exports
export type {
  ToolSchema,
  ToolResult,
  ToolExecutor,
  ToolClientConfig,
  CacheEntry,
  Context7SearchParams,
  LibraryMatch,
  Context7SearchResult,
  Context7ResolveParams,
  Context7ResolveResult,
  ExaSearchType,
  ExaCategory,
  ExaSearchParams,
  ExaSearchResultItem,
  ExaSearchMetadata,
  ExaSearchResult,
  ExaSimilarParams,
  ExaSimilarResultItem,
  ExaSimilarResult,
} from "./types/index.js";

// Utility exports
export {
  formatToolResult,
  formatToolResultForLLM,
  truncateText,
  formatJSON,
  formatToolDescription,
  generateToolsPrompt,
  parseToolUse,
  generateToolExample,
} from "./utils/index.js";
