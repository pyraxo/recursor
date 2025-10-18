/**
 * Core type definitions for prompt management system
 */

/**
 * Variable schema definition for prompt templates
 */
export interface VariableSchema {
  /** Variable type */
  type: "string" | "number" | "boolean" | "object" | "array";
  /** Whether the variable is required */
  required: boolean;
  /** Default value if not provided */
  default?: unknown;
  /** Human-readable description */
  description: string;
  /** For array types, schema of items */
  items?: VariableSchema;
  /** For object types, schema of properties */
  properties?: Record<string, VariableSchema>;
}

/**
 * Metadata about a prompt version
 */
export interface PromptMetadata {
  /** ISO 8601 creation date */
  created_at: string;
  /** ISO 8601 last update date */
  updated_at: string;
  /** Author or team name */
  author: string;
  /** Version history changelog */
  changelog: PromptChangelogEntry[];
}

/**
 * Single changelog entry
 */
export interface PromptChangelogEntry {
  /** Semantic version */
  version: string;
  /** ISO 8601 date */
  date: string;
  /** Description of changes */
  changes: string;
}

/**
 * Complete prompt definition from YAML
 */
export interface PromptDefinition {
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  /** Unique identifier (e.g., "planner-agent") */
  name: string;
  /** Human-readable description */
  description: string;
  /** Categorization tags */
  tags: string[];
  /** Variable definitions for type safety */
  variables: Record<string, VariableSchema>;
  /** Mustache template string */
  template: string;
  /** Version and authorship metadata */
  metadata: PromptMetadata;
}

/**
 * Result of prompt validation
 */
export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** List of validation errors */
  errors: ValidationError[];
}

/**
 * Single validation error
 */
export interface ValidationError {
  /** Field path (e.g., "teamName") */
  field: string;
  /** Error message */
  message: string;
  /** Expected type or value */
  expected: string;
  /** Actual received value */
  received: unknown;
}

/**
 * Options for template rendering
 */
export interface RenderOptions {
  /** Throw error on missing required variables (default: true) */
  strict?: boolean;
  /** HTML escape variables (default: false for prompts) */
  escape?: boolean;
  /** Partial templates for inclusion */
  partials?: Record<string, string>;
  /** Whether to validate before rendering (default: true) */
  validate?: boolean;
}

/**
 * Compiled template for efficient re-rendering
 */
export interface CompiledTemplate {
  /** Original template string */
  template: string;
  /** Render function */
  render: (variables: Record<string, unknown>, options?: RenderOptions) => string;
  /** Variable schema */
  schema: Record<string, VariableSchema>;
  /** Metadata */
  metadata: PromptMetadata;
}

/**
 * Prompt variant for A/B testing
 */
export interface PromptVariant {
  /** Variant name */
  name: string;
  /** Prompt definition */
  prompt: CompiledTemplate;
  /** Optional variant-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A/B test configuration
 */
export interface ExperimentConfig {
  /** Experiment name */
  name: string;
  /** Description */
  description: string;
  /** Variants to test */
  variants: PromptVariant[];
  /** Traffic distribution (must sum to 1.0) */
  distribution: Record<string, number>;
  /** Start date (ISO 8601) */
  start_date?: string;
  /** End date (ISO 8601) */
  end_date?: string;
}

/**
 * Cache key generator function
 */
export type CacheKeyGenerator = (
  promptName: string,
  variables: Record<string, unknown>
) => string;

/**
 * Prompt loader configuration
 */
export interface LoaderConfig {
  /** Directory containing prompt YAML files */
  promptsDir: string;
  /** Whether to cache loaded prompts */
  cache?: boolean;
  /** Custom cache key generator */
  cacheKeyGenerator?: CacheKeyGenerator;
}
