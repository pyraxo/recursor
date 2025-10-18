/**
 * Template renderer using Mustache templating
 */

import Mustache from "mustache";
import type {
  RenderOptions,
  VariableSchema,
  CompiledTemplate,
  PromptMetadata,
} from "./types.js";
import { validator } from "./utils/validation.js";
import { promptCache } from "./utils/cache.js";

/**
 * Template renderer for prompt templates
 */
export class TemplateRenderer {
  private enableCache: boolean;

  constructor(enableCache: boolean = true) {
    this.enableCache = enableCache;
    // Disable HTML escaping by default for prompts
    Mustache.escape = (text) => text;
  }

  /**
   * Render a template with variables
   */
  render(
    template: string,
    variables: Record<string, unknown>,
    options: RenderOptions = {}
  ): string {
    const {
      strict = true,
      escape = false,
      partials = {},
      validate: shouldValidate = false,
    } = options;

    // In strict mode, check for undefined variables before rendering
    if (strict) {
      // Extract root-level variable names (excluding those inside sections)
      // We only validate top-level variables; nested properties in sections
      // are handled by Mustache's own logic
      const varPattern = /\{\{(?![#^\/])([\w.]+)\}\}/g;
      const matches = Array.from(template.matchAll(varPattern));
      const missingVars: string[] = [];

      for (const match of matches) {
        const varName = match[1];
        if (!varName) continue;

        // Check if variable exists (including nested paths)
        if (varName.includes('.')) {
          const parts = varName.split('.');
          let current: any = variables;
          let found = true;
          for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
              current = current[part];
            } else {
              found = false;
              break;
            }
          }
          if (!found && !missingVars.includes(varName)) {
            missingVars.push(varName);
          }
        } else if (!(varName in variables) && !missingVars.includes(varName)) {
          missingVars.push(varName);
        }
      }

      if (missingVars.length > 0) {
        throw new Error(
          `Missing required variables in strict mode: ${missingVars.join(", ")}`
        );
      }
    }

    // Set escaping based on options
    if (escape) {
      Mustache.escape = (text) => {
        return String(text)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
      };
    } else {
      Mustache.escape = (text) => text;
    }

    try {
      // Render with Mustache
      const result = Mustache.render(template, variables, partials);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Template rendering failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Compile a template for efficient re-rendering
   */
  compile(
    template: string,
    schema: Record<string, VariableSchema>,
    metadata: PromptMetadata,
    promptName: string
  ): CompiledTemplate {
    // Parse template once
    Mustache.parse(template);

    return {
      template,
      schema,
      metadata,
      render: (
        variables: Record<string, unknown>,
        options: RenderOptions = {}
      ): string => {
        const { validate: shouldValidate = true } = options;

        // Check cache first
        if (this.enableCache) {
          const cached = promptCache.get(promptName, variables);
          if (cached) {
            return cached;
          }
        }

        // Apply defaults
        const varsWithDefaults = validator.applyDefaults(variables, schema);

        // Validate if requested
        if (shouldValidate) {
          const validationResult = validator.validate(varsWithDefaults, schema);
          if (!validationResult.valid) {
            throw new Error(validator.formatErrors(validationResult));
          }
        }

        // Render
        const result = this.render(template, varsWithDefaults, options);

        // Cache result
        if (this.enableCache) {
          promptCache.set(promptName, variables, result);
        }

        return result;
      },
    };
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    promptCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return promptCache.stats();
  }
}

/**
 * Global renderer instance
 */
export const renderer = new TemplateRenderer();
