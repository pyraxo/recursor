/**
 * Context7 tool input parameters
 */
export interface Context7SearchParams {
  libraryName: string;
  topic?: string;
  tokens?: number;
}

/**
 * Context7 library match result
 */
export interface LibraryMatch {
  libraryId: string;
  name: string;
  description: string;
  trustScore: number;
  snippets: number;
  versions?: string[];
}

/**
 * Context7 search result
 */
export interface Context7SearchResult {
  libraryId: string;
  documentation: string;
  codeExamples: number;
  trustScore: number;
}

/**
 * Context7 resolve library input
 */
export interface Context7ResolveParams {
  libraryName: string;
}

/**
 * Context7 resolve library result
 */
export interface Context7ResolveResult {
  matches: LibraryMatch[];
  topMatch: LibraryMatch | null;
}
