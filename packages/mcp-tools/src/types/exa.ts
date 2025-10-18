/**
 * Exa search type
 */
export type ExaSearchType = "neural" | "keyword";

/**
 * Exa search category
 */
export type ExaCategory = "news" | "research" | "documentation";

/**
 * Exa web search input parameters
 */
export interface ExaSearchParams {
  query: string;
  numResults?: number;
  searchType?: ExaSearchType;
  includeContent?: boolean;
  category?: ExaCategory;
}

/**
 * Individual search result from Exa
 */
export interface ExaSearchResultItem {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  publishedDate?: string;
  score: number;
}

/**
 * Metadata about the search operation
 */
export interface ExaSearchMetadata {
  query: string;
  totalResults: number;
  searchTime: number;
}

/**
 * Complete Exa search result
 */
export interface ExaSearchResult {
  results: ExaSearchResultItem[];
  searchMetadata: ExaSearchMetadata;
}

/**
 * Exa find similar content parameters
 */
export interface ExaSimilarParams {
  url: string;
  numResults?: number;
}

/**
 * Similar content result item
 */
export interface ExaSimilarResultItem {
  title: string;
  url: string;
  snippet: string;
  similarity: number;
}

/**
 * Complete similar content result
 */
export interface ExaSimilarResult {
  results: ExaSimilarResultItem[];
}
