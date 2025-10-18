/**
 * Tests for template renderer
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TemplateRenderer } from "../../src/renderer.js";
import type { VariableSchema, PromptMetadata } from "../../src/types.js";

describe("TemplateRenderer", () => {
  let renderer: TemplateRenderer;

  beforeEach(() => {
    renderer = new TemplateRenderer(false); // Disable cache for tests
  });

  describe("render", () => {
    it("renders simple variable substitution", () => {
      const template = "Hello {{name}}!";
      const result = renderer.render(template, { name: "World" });
      expect(result).toBe("Hello World!");
    });

    it("renders multiple variables", () => {
      const template = "{{greeting}} {{name}}, you are {{age}} years old";
      const result = renderer.render(template, {
        greeting: "Hello",
        name: "John",
        age: 30,
      });
      expect(result).toBe("Hello John, you are 30 years old");
    });

    it("handles missing variables in non-strict mode", () => {
      const template = "Hello {{name}}!";
      const result = renderer.render(template, {}, { strict: false });
      expect(result).toBe("Hello !");
    });

    it("throws on missing variables in strict mode", () => {
      const template = "Hello {{name}}!";
      expect(() => {
        renderer.render(template, {}, { strict: true });
      }).toThrow(/Missing required variables/);
    });

    it("renders conditional sections (truthy)", () => {
      const template = "{{#isPro}}Premium User{{/isPro}}";
      const result = renderer.render(template, { isPro: true });
      expect(result).toBe("Premium User");
    });

    it("renders conditional sections (falsy)", () => {
      const template = "{{#isPro}}Premium{{/isPro}}{{^isPro}}Free{{/isPro}}";
      const result = renderer.render(template, { isPro: false });
      expect(result).toBe("Free");
    });

    it("renders inverted sections", () => {
      const template = "{{^isEmpty}}Has content{{/isEmpty}}";
      const result = renderer.render(template, { isEmpty: false });
      expect(result).toBe("Has content");
    });

    it("iterates over arrays", () => {
      const template = "{{#items}}{{name}} {{/items}}";
      // Disable strict mode for templates with sections since variables
      // inside sections are in a different scope
      const result = renderer.render(template, {
        items: [{ name: "A" }, { name: "B" }, { name: "C" }],
      }, { strict: false });
      expect(result).toBe("A B C ");
    });

    it("supports nested properties", () => {
      const template = "{{user.name}} is {{user.age}}";
      const result = renderer.render(template, {
        user: { name: "John", age: 30 },
      });
      expect(result).toBe("John is 30");
    });

    it("supports partials", () => {
      const template = "{{>header}} Content {{>footer}}";
      const partials = {
        header: "<h1>Header</h1>",
        footer: "<footer>Footer</footer>",
      };
      const result = renderer.render(template, {}, { partials });
      expect(result).toBe("<h1>Header</h1> Content <footer>Footer</footer>");
    });

    it("does not escape HTML by default", () => {
      const template = "{{html}}";
      const result = renderer.render(template, { html: "<b>bold</b>" });
      expect(result).toBe("<b>bold</b>");
    });

    it("escapes HTML when escape option is true", () => {
      const template = "{{html}}";
      const result = renderer.render(
        template,
        { html: "<b>bold</b>" },
        { escape: true }
      );
      expect(result).toBe("&lt;b&gt;bold&lt;/b&gt;");
    });
  });

  describe("compile", () => {
    const schema: Record<string, VariableSchema> = {
      name: {
        type: "string",
        required: true,
        description: "Name",
      },
      age: {
        type: "number",
        required: false,
        default: 0,
        description: "Age",
      },
    };

    const metadata: PromptMetadata = {
      created_at: "2025-01-19",
      updated_at: "2025-01-19",
      author: "test",
      changelog: [],
    };

    it("compiles a template for reuse", () => {
      const template = "{{name}} is {{age}}";
      const compiled = renderer.compile(template, schema, metadata, "test-prompt");

      const result1 = compiled.render({ name: "John", age: 30 });
      expect(result1).toBe("John is 30");

      const result2 = compiled.render({ name: "Jane", age: 25 });
      expect(result2).toBe("Jane is 25");
    });

    it("applies defaults in compiled templates", () => {
      const template = "{{name}} is {{age}}";
      const compiled = renderer.compile(template, schema, metadata, "test-prompt");

      const result = compiled.render({ name: "John" });
      expect(result).toBe("John is 0");
    });

    it("validates variables in compiled templates", () => {
      const template = "{{name}}";
      const compiled = renderer.compile(template, schema, metadata, "test-prompt");

      expect(() => {
        compiled.render({});
      }).toThrow(/Missing required variable/);
    });

    it("can skip validation in compiled templates", () => {
      const template = "{{name}}";
      const compiled = renderer.compile(template, schema, metadata, "test-prompt");

      const result = compiled.render({}, { validate: false, strict: false });
      expect(result).toBe("");
    });

    it("stores template, schema, and metadata", () => {
      const template = "{{name}}";
      const compiled = renderer.compile(template, schema, metadata, "test-prompt");

      expect(compiled.template).toBe(template);
      expect(compiled.schema).toEqual(schema);
      expect(compiled.metadata).toEqual(metadata);
    });
  });

  describe("caching", () => {
    it("caches rendered results", () => {
      const cachedRenderer = new TemplateRenderer(true);
      const template = "{{name}}";
      const schema: Record<string, VariableSchema> = {
        name: { type: "string", required: true, description: "Name" },
      };
      const metadata: PromptMetadata = {
        created_at: "2025-01-19",
        updated_at: "2025-01-19",
        author: "test",
        changelog: [],
      };

      const compiled = cachedRenderer.compile(template, schema, metadata, "test");

      // First render
      const result1 = compiled.render({ name: "John" });
      expect(result1).toBe("John");

      // Second render should use cache
      const result2 = compiled.render({ name: "John" });
      expect(result2).toBe("John");

      // Stats should show cache hit
      const stats = cachedRenderer.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it("clears cache", () => {
      const cachedRenderer = new TemplateRenderer(true);
      const template = "{{name}}";
      const schema: Record<string, VariableSchema> = {
        name: { type: "string", required: true, description: "Name" },
      };
      const metadata: PromptMetadata = {
        created_at: "2025-01-19",
        updated_at: "2025-01-19",
        author: "test",
        changelog: [],
      };

      const compiled = cachedRenderer.compile(template, schema, metadata, "test");
      compiled.render({ name: "John" });

      cachedRenderer.clearCache();

      const stats = cachedRenderer.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });
});
