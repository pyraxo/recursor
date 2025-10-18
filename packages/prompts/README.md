# @recursor/prompts

Centralized, type-safe prompt management for the Recursor multi-agent system.

## Features

- 📝 **YAML-based prompts** - Human-readable, git-friendly prompt definitions
- 🔒 **Type safety** - Auto-generated TypeScript interfaces with full IDE support
- 🎨 **Mustache templating** - Powerful templating with conditionals and partials
- 📦 **Zero runtime overhead** - Prompts bundled at build time
- 🚀 **Performance** - Built-in caching and optimized rendering
- ✅ **Validation** - Runtime variable validation with helpful error messages
- 🔄 **Versioning** - Semantic versioning with changelog support
- 🧪 **Testing** - Comprehensive test suite with >90% coverage

## Installation

```bash
# From the monorepo root
pnpm install
```

## Quick Start

### 1. Define a prompt (YAML)

Create `prompts/my-prompt.yaml`:

```yaml
version: "1.0.0"
name: "my-prompt"
description: "A sample prompt"
tags: ["example"]

variables:
  userName:
    type: string
    required: true
    description: "User's name"

  age:
    type: number
    required: false
    default: 0
    description: "User's age"

template: |
  Hello {{userName}}!
  {{#age}}You are {{age}} years old.{{/age}}

metadata:
  created_at: "2025-01-19"
  updated_at: "2025-01-19"
  author: "your-team"
  changelog:
    - version: "1.0.0"
      date: "2025-01-19"
      changes: "Initial version"
```

### 2. Generate TypeScript types

```bash
pnpm run generate
```

### 3. Use the prompt (TypeScript)

```typescript
import { prompts } from '@recursor/prompts';

// Render with type safety
const result = prompts.general.myPrompt.render({
  userName: "Alice",
  age: 30
});
// Output: "Hello Alice!\nYou are 30 years old."

// Validate before rendering
const validation = prompts.general.myPrompt.validate({
  userName: "Bob"
  // age is optional
});

if (validation.valid) {
  const result = prompts.general.myPrompt.render({ userName: "Bob" });
}
```

## Prompt Organization

Prompts are organized by category based on their tags:

```
prompts/
├── agents/          # Agent system prompts
│   ├── planner.yaml
│   ├── builder.yaml
│   ├── communicator.yaml
│   └── reviewer.yaml
├── cursor/          # Cursor agent prompts
│   └── unified-prompt.yaml
├── tools/           # Tool instruction prompts
│   └── tool-instructions.yaml
└── builders/        # Builder prompts
    └── html-builder.yaml
```

Access via:
```typescript
prompts.agent.planner.render(variables)
prompts.cursor.unifiedPrompt.render(variables)
prompts.tool.toolInstructions.render(variables)
```

## Variable Types

Supported types in prompt schemas:

- `string` - Text values
- `number` - Numeric values
- `boolean` - True/false
- `array` - Lists of items
- `object` - Nested objects

### Example with complex types:

```yaml
variables:
  items:
    type: array
    required: true
    description: "List of items"
    items:
      type: object
      properties:
        name:
          type: string
          required: true
          description: "Item name"
        quantity:
          type: number
          required: true
          description: "Quantity"

template: |
  {{#items}}
  - {{name}}: {{quantity}}
  {{/items}}
```

## Template Syntax

Uses [Mustache](https://mustache.github.io/) templating:

### Variables
```mustache
{{variableName}}
```

### Conditionals
```mustache
{{#condition}}
  Shown if condition is truthy
{{/condition}}

{{^condition}}
  Shown if condition is falsy
{{/condition}}
```

### Loops
```mustache
{{#items}}
  {{name}}
{{/items}}
```

### Nested Properties
```mustache
{{user.name}}
{{user.address.city}}
```

## API Reference

### `prompts`

Main export containing all prompts grouped by category.

```typescript
import { prompts } from '@recursor/prompts';

// Access by category.name
prompts.agent.planner.render(variables);
```

### Prompt Object

Each prompt has the following properties and methods:

```typescript
interface Prompt {
  name: string;
  version: string;
  description: string;
  tags: string[];
  schema: Record<string, VariableSchema>;
  metadata: PromptMetadata;

  render(variables: Variables): string;
  validate(variables: Variables): ValidationResult;
  compile(): CompiledTemplate;
}
```

### PromptLoader

Low-level API for loading prompts:

```typescript
import { PromptLoader } from '@recursor/prompts';

const loader = new PromptLoader({
  promptsDir: './prompts',
  cache: true
});

loader.loadAll();
const compiled = loader.compile('my-prompt');
const result = compiled.render(variables);
```

### TemplateRenderer

Direct template rendering:

```typescript
import { TemplateRenderer } from '@recursor/prompts';

const renderer = new TemplateRenderer();
const result = renderer.render(template, variables, {
  strict: true,
  escape: false,
  validate: true
});
```

## Development

### Build

```bash
pnpm run build
```

### Test

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

### Generate types

```bash
pnpm run generate
```

## Advanced Usage

### Caching

Rendering is cached by default for performance:

```typescript
import { renderer } from '@recursor/prompts';

// Clear cache
renderer.clearCache();

// Get cache stats
const stats = renderer.getCacheStats();
console.log(stats.size, stats.utilizationPercent);
```

### Validation

Validate variables before rendering:

```typescript
import { validator } from '@recursor/prompts';

const result = validator.validate(variables, schema);

if (!result.valid) {
  console.error(validator.formatErrors(result));
}
```

### Custom Rendering

Use the renderer directly for custom templates:

```typescript
import { renderer } from '@recursor/prompts';

const result = renderer.render(
  "Hello {{name}}!",
  { name: "World" },
  {
    strict: true,
    escape: false,
    partials: {
      header: "<h1>{{title}}</h1>"
    }
  }
);
```

## Migration from Hardcoded Prompts

See the [Implementation Plan](../../docs/plans/prompt-management-implementation-plan.md) for detailed migration strategy.

### Before:
```typescript
const systemPrompt = `You are a ${role} agent...`;
```

### After:
```typescript
import { prompts } from '@recursor/prompts';

const systemPrompt = prompts.agent[role].render({
  teamName: stack.name,
  projectTitle: project.title,
  phase: stack.phase
});
```

## Contributing

1. Add YAML prompt files to `prompts/` directory
2. Run `pnpm run generate` to create TypeScript types
3. Run `pnpm test` to verify
4. Build with `pnpm run build`

## License

MIT
