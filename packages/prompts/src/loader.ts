/**
 * YAML prompt loader
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import yaml from "js-yaml";
import type {
  PromptDefinition,
  LoaderConfig,
  CompiledTemplate,
  ValidationResult,
} from "./types.js";
import { renderer } from "./renderer.js";
import { validator } from "./utils/validation.js";

/**
 * Loads and validates prompt definitions from YAML files
 */
export class PromptLoader {
  private config: LoaderConfig;
  private loadedPrompts = new Map<string, PromptDefinition>();
  private compiledPrompts = new Map<string, CompiledTemplate>();

  constructor(config: LoaderConfig) {
    this.config = config;
  }

  /**
   * Load all prompt files from the prompts directory
   */
  loadAll(): Map<string, PromptDefinition> {
    this.loadedPrompts.clear();
    this.compiledPrompts.clear();

    const promptFiles = this.findPromptFiles(this.config.promptsDir);

    for (const filePath of promptFiles) {
      try {
        const definition = this.load(filePath);
        this.loadedPrompts.set(definition.name, definition);
      } catch (error) {
        console.error(`Failed to load prompt from ${filePath}:`, error);
        throw error;
      }
    }

    return this.loadedPrompts;
  }

  /**
   * Load a single prompt file
   */
  load(filePath: string): PromptDefinition {
    const content = readFileSync(filePath, "utf-8");
    const parsed = yaml.load(content) as Partial<PromptDefinition>;

    // Validate required fields
    const definition = this.validateDefinition(parsed, filePath);

    return definition;
  }

  /**
   * Validate a prompt definition
   */
  private validateDefinition(
    parsed: Partial<PromptDefinition>,
    filePath: string
  ): PromptDefinition {
    const errors: string[] = [];

    if (!parsed.version) errors.push("Missing 'version' field");
    if (!parsed.name) errors.push("Missing 'name' field");
    if (!parsed.description) errors.push("Missing 'description' field");
    if (!parsed.template) errors.push("Missing 'template' field");
    if (!parsed.variables) errors.push("Missing 'variables' field");
    if (!parsed.metadata) errors.push("Missing 'metadata' field");

    if (errors.length > 0) {
      throw new Error(
        `Invalid prompt definition in ${filePath}:\n  ${errors.join("\n  ")}`
      );
    }

    // Validate version format (semver)
    const versionRegex = /^\d+\.\d+\.\d+$/;
    if (!versionRegex.test(parsed.version!)) {
      throw new Error(
        `Invalid version format in ${filePath}: ${parsed.version}. Must be semantic version (e.g., 1.0.0)`
      );
    }

    // Validate name format (kebab-case)
    const nameRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!nameRegex.test(parsed.name!)) {
      throw new Error(
        `Invalid name format in ${filePath}: ${parsed.name}. Must be kebab-case (e.g., planner-agent)`
      );
    }

    return parsed as PromptDefinition;
  }

  /**
   * Compile a loaded prompt for efficient rendering
   */
  compile(promptName: string): CompiledTemplate {
    // Check cache first
    if (this.compiledPrompts.has(promptName)) {
      return this.compiledPrompts.get(promptName)!;
    }

    const definition = this.loadedPrompts.get(promptName);
    if (!definition) {
      throw new Error(
        `Prompt '${promptName}' not found. Available prompts: ${Array.from(this.loadedPrompts.keys()).join(", ")}`
      );
    }

    const compiled = renderer.compile(
      definition.template,
      definition.variables,
      definition.metadata,
      promptName
    );

    // Cache compiled template
    if (this.config.cache !== false) {
      this.compiledPrompts.set(promptName, compiled);
    }

    return compiled;
  }

  /**
   * Get a prompt definition by name
   */
  get(promptName: string): PromptDefinition | undefined {
    return this.loadedPrompts.get(promptName);
  }

  /**
   * Check if a prompt exists
   */
  has(promptName: string): boolean {
    return this.loadedPrompts.has(promptName);
  }

  /**
   * List all loaded prompt names
   */
  list(): string[] {
    return Array.from(this.loadedPrompts.keys());
  }

  /**
   * Validate a prompt against its schema
   */
  validatePrompt(
    promptName: string,
    variables: Record<string, unknown>
  ): ValidationResult {
    const definition = this.loadedPrompts.get(promptName);
    if (!definition) {
      return {
        valid: false,
        errors: [
          {
            field: "prompt",
            message: `Prompt '${promptName}' not found`,
            expected: "valid prompt name",
            received: promptName,
          },
        ],
      };
    }

    return validator.validate(variables, definition.variables);
  }

  /**
   * Recursively find all YAML files in a directory
   */
  private findPromptFiles(dir: string): string[] {
    const files: string[] = [];

    try {
      const entries = readdirSync(dir);

      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Recurse into subdirectories
          files.push(...this.findPromptFiles(fullPath));
        } else if (stat.isFile() && (extname(entry) === ".yaml" || extname(entry) === ".yml")) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      throw new Error(`Failed to read prompts directory ${dir}: ${error}`);
    }

    return files;
  }

  /**
   * Get all loaded prompt definitions
   */
  getAll(): PromptDefinition[] {
    return Array.from(this.loadedPrompts.values());
  }

  /**
   * Reload all prompts (useful for development)
   */
  reload(): void {
    this.loadAll();
  }
}
