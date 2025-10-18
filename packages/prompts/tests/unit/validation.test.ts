/**
 * Tests for prompt validation
 */

import { describe, it, expect } from "vitest";
import { PromptValidator } from "../../src/utils/validation.js";
import type { VariableSchema } from "../../src/types.js";

describe("PromptValidator", () => {
  const validator = new PromptValidator();

  describe("validate", () => {
    it("validates required string variables", () => {
      const schema: Record<string, VariableSchema> = {
        name: {
          type: "string",
          required: true,
          description: "User name",
        },
      };

      const result = validator.validate({ name: "John" }, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("fails on missing required variables", () => {
      const schema: Record<string, VariableSchema> = {
        name: {
          type: "string",
          required: true,
          description: "User name",
        },
      };

      const result = validator.validate({}, schema);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]?.field).toBe("name");
      expect(result.errors[0]?.message).toContain("Missing required variable");
    });

    it("validates number types", () => {
      const schema: Record<string, VariableSchema> = {
        age: {
          type: "number",
          required: true,
          description: "User age",
        },
      };

      expect(validator.validate({ age: 25 }, schema).valid).toBe(true);
      expect(validator.validate({ age: "25" }, schema).valid).toBe(false);
    });

    it("validates boolean types", () => {
      const schema: Record<string, VariableSchema> = {
        active: {
          type: "boolean",
          required: true,
          description: "Is active",
        },
      };

      expect(validator.validate({ active: true }, schema).valid).toBe(true);
      expect(validator.validate({ active: "true" }, schema).valid).toBe(false);
    });

    it("validates array types", () => {
      const schema: Record<string, VariableSchema> = {
        tags: {
          type: "array",
          required: true,
          description: "Tags",
          items: {
            type: "string",
            required: true,
            description: "Tag",
          },
        },
      };

      expect(validator.validate({ tags: ["a", "b"] }, schema).valid).toBe(true);
      expect(validator.validate({ tags: "not-array" }, schema).valid).toBe(false);
      expect(validator.validate({ tags: [1, 2] }, schema).valid).toBe(false);
    });

    it("validates object types", () => {
      const schema: Record<string, VariableSchema> = {
        user: {
          type: "object",
          required: true,
          description: "User object",
          properties: {
            name: {
              type: "string",
              required: true,
              description: "Name",
            },
            age: {
              type: "number",
              required: false,
              description: "Age",
            },
          },
        },
      };

      expect(
        validator.validate({ user: { name: "John", age: 25 } }, schema).valid
      ).toBe(true);
      expect(validator.validate({ user: { name: "John" } }, schema).valid).toBe(
        true
      );
      expect(validator.validate({ user: { age: 25 } }, schema).valid).toBe(false);
      expect(validator.validate({ user: "not-object" }, schema).valid).toBe(
        false
      );
    });

    it("allows optional variables to be omitted", () => {
      const schema: Record<string, VariableSchema> = {
        name: {
          type: "string",
          required: false,
          description: "Optional name",
        },
      };

      const result = validator.validate({}, schema);
      expect(result.valid).toBe(true);
    });

    it("detects unknown variables", () => {
      const schema: Record<string, VariableSchema> = {
        name: {
          type: "string",
          required: true,
          description: "Name",
        },
      };

      const result = validator.validate({ name: "John", unknown: "value" }, schema);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "unknown")).toBe(true);
    });
  });

  describe("applyDefaults", () => {
    it("applies default values for missing variables", () => {
      const schema: Record<string, VariableSchema> = {
        name: {
          type: "string",
          required: false,
          default: "Anonymous",
          description: "Name",
        },
        age: {
          type: "number",
          required: false,
          default: 0,
          description: "Age",
        },
      };

      const result = validator.applyDefaults({}, schema);
      expect(result).toEqual({ name: "Anonymous", age: 0 });
    });

    it("does not override provided values", () => {
      const schema: Record<string, VariableSchema> = {
        name: {
          type: "string",
          required: false,
          default: "Anonymous",
          description: "Name",
        },
      };

      const result = validator.applyDefaults({ name: "John" }, schema);
      expect(result).toEqual({ name: "John" });
    });

    it("preserves variables without defaults", () => {
      const schema: Record<string, VariableSchema> = {
        name: {
          type: "string",
          required: false,
          description: "Name",
        },
      };

      const result = validator.applyDefaults({}, schema);
      expect(result).toEqual({});
    });
  });

  describe("formatErrors", () => {
    it("returns empty string for valid results", () => {
      const result = { valid: true, errors: [] };
      expect(validator.formatErrors(result)).toBe("");
    });

    it("formats validation errors", () => {
      const result = {
        valid: false,
        errors: [
          {
            field: "name",
            message: "Missing required variable",
            expected: "string",
            received: undefined,
          },
        ],
      };

      const formatted = validator.formatErrors(result);
      expect(formatted).toContain("name");
      expect(formatted).toContain("Missing required variable");
    });
  });
});
