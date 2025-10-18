/**
 * Simple in-memory cache for rendered prompts
 */

import type { CacheKeyGenerator } from "../types.js";

/**
 * Default cache key generator using JSON stringification
 */
const defaultKeyGenerator: CacheKeyGenerator = (
  promptName: string,
  variables: Record<string, unknown>
): string => {
  // Sort keys for consistent hashing
  const sortedVars = Object.keys(variables)
    .sort()
    .reduce((acc, key) => {
      acc[key] = variables[key];
      return acc;
    }, {} as Record<string, unknown>);

  return `${promptName}:${JSON.stringify(sortedVars)}`;
};

/**
 * Simple LRU cache for prompt rendering
 */
export class PromptCache {
  private cache = new Map<string, string>();
  private keyGenerator: CacheKeyGenerator;
  private maxSize: number;

  constructor(maxSize: number = 1000, keyGenerator?: CacheKeyGenerator) {
    this.maxSize = maxSize;
    this.keyGenerator = keyGenerator || defaultKeyGenerator;
  }

  /**
   * Get a cached prompt by key
   */
  get(promptName: string, variables: Record<string, unknown>): string | undefined {
    const key = this.generateKey(promptName, variables);
    const value = this.cache.get(key);

    // LRU: Move to end on access
    if (value !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }

    return value;
  }

  /**
   * Set a cached prompt
   */
  set(
    promptName: string,
    variables: Record<string, unknown>,
    value: string
  ): void {
    const key = this.generateKey(promptName, variables);

    // Remove oldest entry if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  /**
   * Clear all cached prompts
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Generate cache key
   */
  generateKey(promptName: string, variables: Record<string, unknown>): string {
    return this.keyGenerator(promptName, variables);
  }

  /**
   * Check if a prompt is cached
   */
  has(promptName: string, variables: Record<string, unknown>): boolean {
    const key = this.generateKey(promptName, variables);
    return this.cache.has(key);
  }

  /**
   * Delete a specific cached prompt
   */
  delete(promptName: string, variables: Record<string, unknown>): boolean {
    const key = this.generateKey(promptName, variables);
    return this.cache.delete(key);
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; maxSize: number; utilizationPercent: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
    };
  }
}

/**
 * Global cache instance
 */
export const promptCache = new PromptCache();
