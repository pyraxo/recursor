import { describe, it, expect, beforeEach } from "vitest";
import { Context7Executor } from "../../src/executors/Context7Executor";

describe("Context7Executor", () => {
  let executor: Context7Executor;

  beforeEach(() => {
    executor = new Context7Executor();
  });

  describe("getSchema", () => {
    it("should return valid schema", () => {
      const schema = executor.getSchema();

      expect(schema.name).toBe("search_documentation");
      expect(schema.description).toBeTruthy();
      expect(schema.parameters).toBeDefined();
      expect(schema.parameters.type).toBe("object");
      expect(schema.parameters.properties).toHaveProperty("libraryName");
      expect(schema.parameters.required).toContain("libraryName");
    });

    it("should include topic and tokens parameters", () => {
      const schema = executor.getSchema();

      expect(schema.parameters.properties).toHaveProperty("topic");
      expect(schema.parameters.properties).toHaveProperty("tokens");
    });
  });

  describe("execute", () => {
    it("should execute with valid parameters", async () => {
      const result = await executor.execute({
        libraryName: "react",
        topic: "hooks",
        tokens: 3000,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("data");
    });

    it("should use default token value", async () => {
      const result = await executor.execute({
        libraryName: "react",
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it("should reject invalid parameters", async () => {
      const result = await executor.execute({
        libraryName: "", // Empty string
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("should reject missing required parameters", async () => {
      const result = await executor.execute({
        topic: "hooks", // Missing libraryName
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("should validate token range", async () => {
      const result = await executor.execute({
        libraryName: "react",
        tokens: 50, // Below minimum
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });

    it("should include metadata in successful results", async () => {
      const result = await executor.execute({
        libraryName: "react",
        topic: "hooks",
      });

      if (result.success) {
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.libraryName).toBe("react");
        expect(result.metadata?.topic).toBe("hooks");
      }
    });
  });

  describe("resolveLibrary", () => {
    it("should resolve library name to ID", async () => {
      const result = await executor.resolveLibrary({
        libraryName: "react",
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();

      if (result.success && result.data) {
        expect(result.data).toHaveProperty("matches");
        expect(result.data).toHaveProperty("topMatch");
      }
    });

    it("should reject empty library name", async () => {
      const result = await executor.resolveLibrary({
        libraryName: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });
  });

  describe("error handling", () => {
    it("should handle invalid input types gracefully", async () => {
      const result = await executor.execute({
        libraryName: 123, // Wrong type
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("should provide helpful error messages", async () => {
      const result = await executor.execute({});

      expect(result.success).toBe(false);
      expect(result.error).toContain("Validation error");
    });
  });
});
