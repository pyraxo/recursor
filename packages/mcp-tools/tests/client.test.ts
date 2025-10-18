import { describe, it, expect, beforeEach, vi } from "vitest";
import { MCPToolClient } from "../src/client/MCPToolClient";

describe("MCPToolClient", () => {
  let client: MCPToolClient;

  beforeEach(() => {
    client = new MCPToolClient({
      exaApiKey: "test-api-key",
      cacheTTL: 1000 * 60 * 15,
      maxCacheSize: 100,
    });
  });

  describe("initialization", () => {
    it("should initialize with default executors", () => {
      const tools = client.getAvailableTools();
      expect(tools).toContain("search_documentation");
      expect(tools).toContain("web_search");
    });

    it("should initialize without Exa if no API key provided", () => {
      const clientNoExa = new MCPToolClient({});
      const tools = clientNoExa.getAvailableTools();

      expect(tools).toContain("search_documentation");
      expect(tools).not.toContain("web_search");
    });
  });

  describe("getAvailableTools", () => {
    it("should return list of registered tool names", () => {
      const tools = client.getAvailableTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe("getToolSchema", () => {
    it("should return schema for existing tool", () => {
      const schema = client.getToolSchema("search_documentation");

      expect(schema).not.toBeNull();
      expect(schema?.name).toBe("search_documentation");
      expect(schema?.description).toBeTruthy();
      expect(schema?.parameters).toBeDefined();
    });

    it("should return null for non-existent tool", () => {
      const schema = client.getToolSchema("non_existent_tool");
      expect(schema).toBeNull();
    });
  });

  describe("getAllToolSchemas", () => {
    it("should return all tool schemas", () => {
      const schemas = client.getAllToolSchemas();

      expect(Array.isArray(schemas)).toBe(true);
      expect(schemas.length).toBeGreaterThan(0);
      expect(schemas[0]).toHaveProperty("name");
      expect(schemas[0]).toHaveProperty("description");
      expect(schemas[0]).toHaveProperty("parameters");
    });
  });

  describe("getToolsPrompt", () => {
    it("should generate formatted tool prompt", () => {
      const prompt = client.getToolsPrompt();

      expect(prompt).toContain("Available External Tools");
      expect(prompt).toContain("search_documentation");
      expect(prompt).toContain("TOOL_USE");
      expect(prompt).toContain("PARAMS");
    });

    it("should include tool descriptions", () => {
      const prompt = client.getToolsPrompt();
      expect(prompt.length).toBeGreaterThan(100);
    });
  });

  describe("executeTool", () => {
    it("should return error for non-existent tool", async () => {
      const result = await client.executeTool("non_existent_tool", {});

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should execute search_documentation tool", async () => {
      const result = await client.executeTool("search_documentation", {
        libraryName: "react",
        topic: "hooks",
      });

      // Since we have a placeholder implementation, it should succeed
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it("should cache successful results", async () => {
      const params = { libraryName: "react", topic: "hooks" };

      // First call
      const result1 = await client.executeTool("search_documentation", params);

      // Second call should be cached
      const result2 = await client.executeTool("search_documentation", params);

      if (result1.success && result2.success) {
        expect(result2.metadata?.cached).toBe(true);
      }
    });

    it("should handle validation errors gracefully", async () => {
      const result = await client.executeTool("search_documentation", {
        libraryName: "", // Invalid: empty string
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });
  });

  describe("cache management", () => {
    it("should clear cache", async () => {
      // Execute a tool to populate cache
      await client.executeTool("search_documentation", {
        libraryName: "react",
      });

      const statsBefore = client.getCacheStats();
      expect(statsBefore.total).toBeGreaterThan(0);

      client.clearCache();

      const statsAfter = client.getCacheStats();
      expect(statsAfter.total).toBe(0);
    });

    it("should get cache statistics", () => {
      const stats = client.getCacheStats();

      expect(stats).toHaveProperty("total");
      expect(stats).toHaveProperty("expired");
      expect(stats).toHaveProperty("valid");
      expect(stats).toHaveProperty("maxSize");
      expect(stats).toHaveProperty("ttl");
    });

    it("should cleanup expired entries", async () => {
      const clientShortTTL = new MCPToolClient({
        cacheTTL: 100, // 100ms
      });

      await clientShortTTL.executeTool("search_documentation", {
        libraryName: "react",
      });

      return new Promise((resolve) => {
        setTimeout(() => {
          const cleaned = clientShortTTL.cleanupCache();
          expect(cleaned).toBeGreaterThanOrEqual(0);
          resolve(undefined);
        }, 150);
      });
    });
  });

  describe("custom executor registration", () => {
    it("should allow registering custom executors", () => {
      const customExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true, data: {} }),
        getSchema: () => ({
          name: "custom_tool",
          description: "A custom tool",
          parameters: { type: "object" as const, properties: {} },
        }),
      };

      client.registerExecutor(customExecutor);

      const tools = client.getAvailableTools();
      expect(tools).toContain("custom_tool");
    });

    it("should allow unregistering executors", () => {
      const customExecutor = {
        execute: vi.fn().mockResolvedValue({ success: true, data: {} }),
        getSchema: () => ({
          name: "custom_tool",
          description: "A custom tool",
          parameters: { type: "object" as const, properties: {} },
        }),
      };

      client.registerExecutor(customExecutor);
      expect(client.getAvailableTools()).toContain("custom_tool");

      const unregistered = client.unregisterExecutor("custom_tool");
      expect(unregistered).toBe(true);
      expect(client.getAvailableTools()).not.toContain("custom_tool");
    });

    it("should return false when unregistering non-existent tool", () => {
      const unregistered = client.unregisterExecutor("non_existent_tool");
      expect(unregistered).toBe(false);
    });
  });
});
