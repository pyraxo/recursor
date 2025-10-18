import { describe, it, expect, beforeEach, vi } from "vitest";
import { ToolCache } from "../src/client/cache";
import type { ToolResult } from "../src/types";

describe("ToolCache", () => {
  let cache: ToolCache;

  beforeEach(() => {
    cache = new ToolCache(1000 * 60 * 15, 100); // 15 minutes, max 100 entries
  });

  describe("generateKey", () => {
    it("should generate consistent keys for same params", () => {
      const params1 = { query: "test", numResults: 5 };
      const params2 = { numResults: 5, query: "test" }; // Different order

      const key1 = cache.generateKey("web_search", params1);
      const key2 = cache.generateKey("web_search", params2);

      expect(key1).toBe(key2);
    });

    it("should generate different keys for different params", () => {
      const key1 = cache.generateKey("web_search", { query: "test1" });
      const key2 = cache.generateKey("web_search", { query: "test2" });

      expect(key1).not.toBe(key2);
    });

    it("should generate different keys for different tools", () => {
      const params = { query: "test" };
      const key1 = cache.generateKey("web_search", params);
      const key2 = cache.generateKey("search_documentation", params);

      expect(key1).not.toBe(key2);
    });
  });

  describe("get and set", () => {
    it("should cache and retrieve successful results", () => {
      const result: ToolResult = {
        success: true,
        data: { test: "data" },
      };

      const key = cache.generateKey("test_tool", { param: "value" });
      cache.set(key, result);

      const retrieved = cache.get(key);
      expect(retrieved).toEqual(result);
    });

    it("should not cache error results", () => {
      const result: ToolResult = {
        success: false,
        error: "Test error",
      };

      const key = cache.generateKey("test_tool", { param: "value" });
      cache.set(key, result);

      const retrieved = cache.get(key);
      expect(retrieved).toBeNull();
    });

    it("should return null for non-existent keys", () => {
      const retrieved = cache.get("non_existent_key");
      expect(retrieved).toBeNull();
    });

    it("should return null for expired entries", () => {
      const shortTTLCache = new ToolCache(100); // 100ms TTL
      const result: ToolResult = {
        success: true,
        data: { test: "data" },
      };

      const key = shortTTLCache.generateKey("test_tool", { param: "value" });
      shortTTLCache.set(key, result);

      // Wait for expiration
      return new Promise((resolve) => {
        setTimeout(() => {
          const retrieved = shortTTLCache.get(key);
          expect(retrieved).toBeNull();
          resolve(undefined);
        }, 150);
      });
    });
  });

  describe("LRU eviction", () => {
    it("should evict oldest entry when max size reached", () => {
      const smallCache = new ToolCache(1000 * 60, 3); // Max 3 entries

      const result: ToolResult = { success: true, data: {} };

      const key1 = smallCache.generateKey("tool", { id: 1 });
      const key2 = smallCache.generateKey("tool", { id: 2 });
      const key3 = smallCache.generateKey("tool", { id: 3 });
      const key4 = smallCache.generateKey("tool", { id: 4 });

      smallCache.set(key1, result);
      smallCache.set(key2, result);
      smallCache.set(key3, result);

      expect(smallCache.size).toBe(3);

      // Adding 4th entry should evict key1
      smallCache.set(key4, result);

      expect(smallCache.size).toBe(3);
      expect(smallCache.get(key1)).toBeNull();
      expect(smallCache.get(key2)).not.toBeNull();
      expect(smallCache.get(key3)).not.toBeNull();
      expect(smallCache.get(key4)).not.toBeNull();
    });

    it("should update access order on get", () => {
      const smallCache = new ToolCache(1000 * 60, 3); // Max 3 entries

      const result: ToolResult = { success: true, data: {} };

      const key1 = smallCache.generateKey("tool", { id: 1 });
      const key2 = smallCache.generateKey("tool", { id: 2 });
      const key3 = smallCache.generateKey("tool", { id: 3 });
      const key4 = smallCache.generateKey("tool", { id: 4 });

      smallCache.set(key1, result);
      smallCache.set(key2, result);
      smallCache.set(key3, result);

      // Access key1 to make it most recently used
      smallCache.get(key1);

      // Adding 4th entry should now evict key2 (oldest)
      smallCache.set(key4, result);

      expect(smallCache.get(key1)).not.toBeNull();
      expect(smallCache.get(key2)).toBeNull();
      expect(smallCache.get(key3)).not.toBeNull();
      expect(smallCache.get(key4)).not.toBeNull();
    });
  });

  describe("cleanupExpired", () => {
    it("should remove expired entries", () => {
      const shortTTLCache = new ToolCache(100); // 100ms TTL
      const result: ToolResult = {
        success: true,
        data: { test: "data" },
      };

      const key1 = shortTTLCache.generateKey("tool", { id: 1 });
      const key2 = shortTTLCache.generateKey("tool", { id: 2 });

      shortTTLCache.set(key1, result);

      return new Promise((resolve) => {
        setTimeout(() => {
          // Set key2 after key1 has expired
          shortTTLCache.set(key2, result);

          const cleaned = shortTTLCache.cleanupExpired();
          expect(cleaned).toBe(1);
          expect(shortTTLCache.size).toBe(1);
          expect(shortTTLCache.get(key1)).toBeNull();
          expect(shortTTLCache.get(key2)).not.toBeNull();
          resolve(undefined);
        }, 150);
      });
    });
  });

  describe("getStats", () => {
    it("should return accurate statistics", () => {
      const result: ToolResult = { success: true, data: {} };

      cache.set(cache.generateKey("tool", { id: 1 }), result);
      cache.set(cache.generateKey("tool", { id: 2 }), result);
      cache.set(cache.generateKey("tool", { id: 3 }), result);

      const stats = cache.getStats();

      expect(stats.total).toBe(3);
      expect(stats.valid).toBe(3);
      expect(stats.expired).toBe(0);
      expect(stats.maxSize).toBe(100);
    });
  });

  describe("clear", () => {
    it("should remove all entries", () => {
      const result: ToolResult = { success: true, data: {} };

      cache.set(cache.generateKey("tool", { id: 1 }), result);
      cache.set(cache.generateKey("tool", { id: 2 }), result);

      expect(cache.size).toBe(2);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.getStats().total).toBe(0);
    });
  });
});
