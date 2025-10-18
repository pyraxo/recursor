import type { CacheEntry, ToolResult } from "../types/index";

/**
 * LRU (Least Recently Used) Cache for tool results
 * Manages caching of tool execution results with TTL and size limits
 */
export class ToolCache {
  private cache: Map<string, CacheEntry>;
  private accessOrder: string[];
  private readonly ttl: number;
  private readonly maxSize: number;

  /**
   * Create a new ToolCache instance
   * @param ttl - Time-to-live for cache entries in milliseconds (default: 15 minutes)
   * @param maxSize - Maximum number of entries to cache (default: 1000)
   */
  constructor(ttl: number = 1000 * 60 * 15, maxSize: number = 1000) {
    this.cache = new Map();
    this.accessOrder = [];
    this.ttl = ttl;
    this.maxSize = maxSize;
  }

  /**
   * Generate a cache key from tool name and parameters
   * @param toolName - Name of the tool
   * @param params - Tool parameters
   * @returns Cache key string
   */
  generateKey(toolName: string, params: unknown): string {
    const paramsStr = JSON.stringify(params, this.sortObjectKeys);
    return `${toolName}:${paramsStr}`;
  }

  /**
   * Get a cached result if it exists and is not expired
   * @param key - Cache key
   * @returns Cached tool result or null if not found/expired
   */
  get(key: string): ToolResult | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return null;
    }

    // Update access order (move to end for LRU)
    this.updateAccessOrder(key);

    return entry.result;
  }

  /**
   * Set a cache entry
   * @param key - Cache key
   * @param result - Tool result to cache
   */
  set(key: string, result: ToolResult): void {
    // Don't cache errors
    if (!result.success) {
      return;
    }

    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const entry: CacheEntry = {
      result,
      timestamp: Date.now(),
    };

    this.cache.set(key, entry);
    this.updateAccessOrder(key);
  }

  /**
   * Delete a cache entry
   * @param key - Cache key to delete
   */
  delete(key: string): void {
    this.cache.delete(key);
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get the number of cached entries
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;

    for (const [, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        expired++;
      }
    }

    return {
      total: this.cache.size,
      expired,
      valid: this.cache.size - expired,
      maxSize: this.maxSize,
      ttl: this.ttl,
    };
  }

  /**
   * Clean up expired entries
   * @returns Number of entries cleaned
   */
  cleanupExpired(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > this.ttl) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Update the access order for LRU eviction
   * Moves the key to the end of the access order array
   */
  private updateAccessOrder(key: string): void {
    // Remove key from current position
    this.accessOrder = this.accessOrder.filter((k) => k !== key);
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }

  /**
   * Evict the oldest (least recently used) entry
   */
  private evictOldest(): void {
    if (this.accessOrder.length === 0) {
      return;
    }

    const oldestKey = this.accessOrder[0];
    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Helper to sort object keys for consistent cache key generation
   * This ensures that {a: 1, b: 2} and {b: 2, a: 1} produce the same key
   */
  private sortObjectKeys(key: string, value: unknown): unknown {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((sorted: Record<string, unknown>, key: string) => {
          sorted[key] = (value as Record<string, unknown>)[key];
          return sorted;
        }, {});
    }
    return value;
  }
}

/**
 * Factory function to create a ToolCache instance
 */
export function createToolCache(ttl?: number, maxSize?: number): ToolCache {
  return new ToolCache(ttl, maxSize);
}
