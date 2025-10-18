#!/usr/bin/env tsx
/**
 * Generate TypeScript types and prompt accessors from YAML files
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { PromptLoader } from "../src/loader.js";
import type { PromptDefinition, VariableSchema } from "../src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");
const promptsDir = join(rootDir, "prompts");
const generatedDir = join(rootDir, "src", "generated");

/**
 * Convert kebab-case to PascalCase
 */
function toPascalCase(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

/**
 * Convert kebab-case to camelCase
 */
function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Generate TypeScript type from variable schema
 */
function generateType(schema: VariableSchema, indent: string = ""): string {
  switch (schema.type) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "array":
      if (schema.items) {
        return `Array<${generateType(schema.items)}>`;
      }
      return "unknown[]";
    case "object":
      if (schema.properties) {
        const props = Object.entries(schema.properties)
          .map(([key, propSchema]) => {
            const optional = propSchema.required ? "" : "?";
            const type = generateType(propSchema, indent + "  ");
            const comment = propSchema.description
              ? `${indent}  /** ${propSchema.description} */\n`
              : "";
            return `${comment}${indent}  ${key}${optional}: ${type};`;
          })
          .join("\n");
        return `{\n${props}\n${indent}}`;
      }
      return "Record<string, unknown>";
    default:
      return "unknown";
  }
}

/**
 * Generate interface for prompt variables
 */
function generateInterface(
  promptName: string,
  variables: Record<string, VariableSchema>
): string {
  const interfaceName = `${toPascalCase(promptName)}Variables`;
  const props = Object.entries(variables)
    .map(([key, schema]) => {
      const optional = schema.required ? "" : "?";
      const type = generateType(schema);
      const comment = schema.description ? `  /** ${schema.description} */\n` : "";
      const defaultValue = schema.default !== undefined
        ? ` (default: ${JSON.stringify(schema.default)})`
        : "";
      return `${comment}  ${key}${optional}: ${type};${defaultValue ? ` // ${defaultValue}` : ""}`;
    })
    .join("\n");

  return `
/**
 * Variables for ${promptName} prompt
 */
export interface ${interfaceName} {
${props}
}
`;
}

/**
 * Generate prompt accessor (as object property, not export statement)
 */
function generateAccessor(
  promptName: string,
  definition: PromptDefinition
): string {
  const pascalName = toPascalCase(promptName);
  const interfaceName = `${pascalName}Variables`;

  return `{
  /** Prompt name */
  name: "${promptName}",

  /** Prompt version */
  version: "${definition.version}",

  /** Prompt description */
  description: "${definition.description}",

  /** Prompt tags */
  tags: ${JSON.stringify(definition.tags)},

  /** Variable schema */
  schema: ${JSON.stringify(definition.variables, null, 2)},

  /** Metadata */
  metadata: ${JSON.stringify(definition.metadata, null, 2)},

  /**
   * Render the prompt with variables
   */
  render(variables: Partial<${interfaceName}> = {}, options?: import("../types.js").RenderOptions): string {
    const compiled = loader.compile("${promptName}");
    return compiled.render(variables, options);
  },

  /**
   * Validate variables against schema
   */
  validate(variables: Partial<${interfaceName}>): import("../types.js").ValidationResult {
    return loader.validatePrompt("${promptName}", variables);
  },

  /**
   * Get compiled template
   */
  compile(): import("../types.js").CompiledTemplate {
    return loader.compile("${promptName}");
  }
} as const`;
}

/**
 * Group prompts by category (directory)
 */
function groupPromptsByCategory(
  prompts: PromptDefinition[]
): Map<string, PromptDefinition[]> {
  const groups = new Map<string, PromptDefinition[]>();

  for (const prompt of prompts) {
    // Extract category from tags or use "general"
    const category = prompt.tags.find((tag) =>
      ["agent", "cursor", "tool", "builder"].includes(tag)
    ) || "general";

    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category)!.push(prompt);
  }

  return groups;
}

/**
 * Main generation function
 */
async function generate() {
  console.log("🔨 Generating TypeScript types from YAML prompts...\n");

  // Ensure generated directory exists
  if (!existsSync(generatedDir)) {
    mkdirSync(generatedDir, { recursive: true });
  }

  // Load all prompts
  const loader = new PromptLoader({ promptsDir });

  try {
    loader.loadAll();
  } catch (error) {
    // If no prompts exist yet, create empty generated files
    console.log("⚠️  No prompts found. Creating empty generated files...\n");

    writeFileSync(
      join(generatedDir, "types.ts"),
      `// Auto-generated - no prompts found yet\nexport {}\n`
    );

    writeFileSync(
      join(generatedDir, "prompts.ts"),
      `// Auto-generated - no prompts found yet\nexport {}\n`
    );

    writeFileSync(
      join(generatedDir, "index.ts"),
      `// Auto-generated - no prompts found yet\nexport * from "./types.js";\nexport * from "./prompts.js";\n`
    );

    console.log("✅ Created empty generated files");
    return;
  }

  const prompts = loader.getAll();
  console.log(`📋 Found ${prompts.length} prompts\n`);

  // Generate types file
  let typesContent = `/**
 * Auto-generated TypeScript types for prompts
 *
 * DO NOT EDIT MANUALLY - regenerate with: pnpm run generate
 */

`;

  for (const prompt of prompts) {
    typesContent += generateInterface(prompt.name, prompt.variables);
  }

  // Generate category union type
  const categories = Array.from(groupPromptsByCategory(prompts).keys());
  typesContent += `\n/**\n * Available prompt categories\n */\n`;
  if (categories.length > 0) {
    typesContent += `export type PromptCategory = ${categories.map((c) => `"${c}"`).join(" | ")};\n`;
  } else {
    typesContent += `export type PromptCategory = string;\n`;
  }

  // Generate prompts file
  let promptsContent = `/**
 * Auto-generated prompt accessors
 *
 * DO NOT EDIT MANUALLY - regenerate with: pnpm run generate
 */

import { PromptLoader } from "../loader.js";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const promptsDir = join(__dirname, "..", "..", "prompts");

const loader = new PromptLoader({ promptsDir });
loader.loadAll();

`;

  // Import types
  promptsContent += `import type {\n`;
  for (const prompt of prompts) {
    promptsContent += `  ${toPascalCase(prompt.name)}Variables,\n`;
  }
  promptsContent += `} from "./types.js";\n`;

  // Generate accessors grouped by category
  const groupedPrompts = groupPromptsByCategory(prompts);

  for (const [category, categoryPrompts] of groupedPrompts) {
    promptsContent += `\n/**\n * ${toPascalCase(category)} prompts\n */\n`;
    promptsContent += `export const ${category} = {\n`;

    for (const prompt of categoryPrompts) {
      const camelName = toCamelCase(prompt.name);
      // Add JSDoc comment for each prompt accessor
      promptsContent += `  /**\n   * ${prompt.description}\n   *\n   * @version ${prompt.version}\n   * @tags ${prompt.tags.join(", ")}\n   */\n`;
      promptsContent += `  ${camelName}: ${generateAccessor(prompt.name, prompt)},\n`;
    }

    promptsContent += `} as const;\n`;
  }

  // Generate unified prompts export
  promptsContent += `\n/**\n * All prompts grouped by category\n */\n`;
  promptsContent += `export const prompts = {\n`;
  for (const category of groupedPrompts.keys()) {
    promptsContent += `  ${category},\n`;
  }
  promptsContent += `} as const;\n`;

  // Generate index file
  const indexContent = `/**
 * Auto-generated exports
 *
 * DO NOT EDIT MANUALLY - regenerate with: pnpm run generate
 */

export * from "./types.js";
export * from "./prompts.js";
`;

  // Write files
  writeFileSync(join(generatedDir, "types.ts"), typesContent);
  writeFileSync(join(generatedDir, "prompts.ts"), promptsContent);
  writeFileSync(join(generatedDir, "index.ts"), indexContent);

  console.log("✅ Generated files:");
  console.log(`   - ${join(generatedDir, "types.ts")}`);
  console.log(`   - ${join(generatedDir, "prompts.ts")}`);
  console.log(`   - ${join(generatedDir, "index.ts")}`);
  console.log(`\n📦 Generated ${prompts.length} prompt accessors in ${groupedPrompts.size} categories`);
}

// Run generation
generate().catch((error) => {
  console.error("❌ Generation failed:", error);
  process.exit(1);
});
