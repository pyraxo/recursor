/**
 * Tests for prompt cache
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PromptCache } from "../../src/utils/cache.js";

describe("PromptCache", () => {
  let cache: PromptCache;

  beforeEach(() => {
    cache = new PromptCache(3); // Small size for testing
  });

  describe("get and set", () => {
    it("stores and retrieves cached prompts", () => {
      cache.set("test-prompt", { var1: "value1" }, "rendered output");

      const result = cache.get("test-prompt", { var1: "value1" });
      expect(result).toBe("rendered output");
    });

    it("returns undefined for non-existent entries", () => {
      const result = cache.get("non-existent", {});
      expect(result).toBeUndefined();
    });

    it("generates different keys for different variables", () => {
      cache.set("prompt", { var1: "a" }, "output A");
      cache.set("prompt", { var1: "b" }, "output B");

      expect(cache.get("prompt", { var1: "a" })).toBe("output A");
      expect(cache.get("prompt", { var1: "b" })).toBe("output B");
    });

    it("generates same key regardless of property order", () => {
      cache.set("prompt", { a: 1, b: 2 }, "output");

      const result = cache.get("prompt", { b: 2, a: 1 });
      expect(result).toBe("output");
    });
  });

  describe("LRU behavior", () => {
    it("evicts oldest entry when capacity is reached", () => {
      cache.set("prompt1", {}, "output1");
      cache.set("prompt2", {}, "output2");
      cache.set("prompt3", {}, "output3");

      expect(cache.size()).toBe(3);

      // Adding fourth should evict first
      cache.set("prompt4", {}, "output4");

      expect(cache.size()).toBe(3);
      expect(cache.get("prompt1", {})).toBeUndefined();
      expect(cache.get("prompt4", {})).toBe("output4");
    });

    it("moves accessed entries to end", () => {
      cache.set("prompt1", {}, "output1");
      cache.set("prompt2", {}, "output2");
      cache.set("prompt3", {}, "output3");

      // Access prompt1, moving it to end
      cache.get("prompt1", {});

      // Add new entry, should evict prompt2
      cache.set("prompt4", {}, "output4");

      expect(cache.get("prompt1", {})).toBe("output1");
      expect(cache.get("prompt2", {})).toBeUndefined();
    });
  });

  describe("clear", () => {
    it("removes all entries", () => {
      cache.set("prompt1", {}, "output1");
      cache.set("prompt2", {}, "output2");

      cache.clear();

      expect(cache.size()).toBe(0);
      expect(cache.get("prompt1", {})).toBeUndefined();
      expect(cache.get("prompt2", {})).toBeUndefined();
    });
  });

  describe("has", () => {
    it("returns true for cached prompts", () => {
      cache.set("prompt", { var: "value" }, "output");
      expect(cache.has("prompt", { var: "value" })).toBe(true);
    });

    it("returns false for non-cached prompts", () => {
      expect(cache.has("prompt", { var: "value" })).toBe(false);
    });
  });

  describe("delete", () => {
    it("removes specific entries", () => {
      cache.set("prompt", { var: "value" }, "output");
      expect(cache.has("prompt", { var: "value" })).toBe(true);

      cache.delete("prompt", { var: "value" });
      expect(cache.has("prompt", { var: "value" })).toBe(false);
    });

    it("returns true when entry was deleted", () => {
      cache.set("prompt", {}, "output");
      expect(cache.delete("prompt", {})).toBe(true);
    });

    it("returns false when entry did not exist", () => {
      expect(cache.delete("non-existent", {})).toBe(false);
    });
  });

  describe("stats", () => {
    it("returns correct statistics", () => {
      cache.set("prompt1", {}, "output1");
      cache.set("prompt2", {}, "output2");

      const stats = cache.stats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(3);
      expect(stats.utilizationPercent).toBeCloseTo(66.67, 1);
    });
  });
});
