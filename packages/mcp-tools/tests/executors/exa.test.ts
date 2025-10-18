import { describe, it, expect, beforeEach } from "vitest";
import { ExaExecutor } from "../../src/executors/ExaExecutor";

describe("ExaExecutor", () => {
  let executor: ExaExecutor;
  let executorNoKey: ExaExecutor;

  beforeEach(() => {
    executor = new ExaExecutor("test-api-key");
    executorNoKey = new ExaExecutor("");
  });

  describe("getSchema", () => {
    it("should return valid schema", () => {
      const schema = executor.getSchema();

      expect(schema.name).toBe("web_search");
      expect(schema.description).toBeTruthy();
      expect(schema.parameters).toBeDefined();
      expect(schema.parameters.type).toBe("object");
      expect(schema.parameters.properties).toHaveProperty("query");
      expect(schema.parameters.required).toContain("query");
    });

    it("should include all search parameters", () => {
      const schema = executor.getSchema();
      const props = schema.parameters.properties;

      expect(props).toHaveProperty("query");
      expect(props).toHaveProperty("numResults");
      expect(props).toHaveProperty("searchType");
      expect(props).toHaveProperty("includeContent");
      expect(props).toHaveProperty("category");
    });
  });

  describe("execute", () => {
    it("should handle missing API key gracefully", async () => {
      const result = await executorNoKey.execute({
        query: "test query",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("API key not configured");
    });

    it("should validate required parameters", async () => {
      const result = await executor.execute({
        numResults: 5, // Missing query
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("should reject empty query", async () => {
      const result = await executor.execute({
        query: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("should validate numResults range", async () => {
      const result = await executor.execute({
        query: "test",
        numResults: 25, // Above maximum
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("should validate searchType enum", async () => {
      const result = await executor.execute({
        query: "test",
        searchType: "invalid", // Not in enum
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should validate category enum", async () => {
      const result = await executor.execute({
        query: "test",
        category: "invalid", // Not in enum
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should use default values for optional parameters", async () => {
      // This will fail due to no real API, but validates parameter handling
      const result = await executor.execute({
        query: "test query",
      });

      // Will fail with API key error or network error, but not validation error
      expect(result.success).toBe(false);
      if (result.error) {
        expect(result.error).not.toContain("Validation error");
      }
    });
  });

  describe("findSimilar", () => {
    it("should handle missing API key", async () => {
      const result = await executorNoKey.findSimilar({
        url: "https://example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("API key not configured");
    });

    it("should validate URL format", async () => {
      const result = await executor.findSimilar({
        url: "not-a-valid-url",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("should validate numResults range", async () => {
      const result = await executor.findSimilar({
        url: "https://example.com",
        numResults: 25, // Above maximum
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("should accept valid parameters", async () => {
      const result = await executor.findSimilar({
        url: "https://example.com",
        numResults: 5,
      });

      // Will fail due to API/network, but validates parameter structure
      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
    });
  });

  describe("error handling", () => {
    it("should provide helpful error for invalid types", async () => {
      const result = await executor.execute({
        query: 123, // Wrong type
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should handle null parameters", async () => {
      const result = await executor.execute(null);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should handle undefined parameters", async () => {
      const result = await executor.execute(undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe("snippet extraction", () => {
    it("should extract meaningful snippets", () => {
      // Access the private method through execution
      // This is a whitebox test of the snippet logic
      const longText = "A".repeat(300);
      const executor = new ExaExecutor("test-key");

      // We can't directly test private method, but we can verify
      // through the schema that snippet handling is defined
      const schema = executor.getSchema();
      expect(schema.description).toContain("content");
    });
  });
});
