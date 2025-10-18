# Testing & Linting Guide

This monorepo uses **Vitest** for testing and **ESLint** with **TypeScript ESLint** for linting, following best practices from the Context7 MCP documentation.

## Quick Start

```bash
# Run all tests across the monorepo
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate coverage reports
pnpm test:coverage

# Open Vitest UI
pnpm test:ui

# Lint all packages
pnpm lint

# Type check all packages
pnpm check-types
```

## Architecture

### Vitest Configuration

The monorepo uses a **workspace-based** Vitest configuration:

- **Root**: `vitest.workspace.ts` defines all testable packages
- **Per-Package**: Each package has its own `vitest.config.ts`
- **Setup Files**: Package-specific setup in `vitest.setup.ts`

### Test Structure

```
packages/
  ui/
    vitest.config.ts          # React component testing (jsdom)
    vitest.setup.ts           # Testing Library cleanup
    src/
      button.test.tsx         # Component tests
  agent-engine/
    vitest.config.ts          # Node.js testing
    src/
      config.test.ts          # Unit tests
apps/
  web/
    vitest.config.ts          # Next.js app testing
    vitest.setup.ts
  docs/
    vitest.config.ts          # Next.js docs testing
    vitest.setup.ts
```

### ESLint Configuration

The monorepo uses **ESLint Flat Config** (ESLint 9):

- **Shared Config**: `packages/eslint-config/base.js`
- **Type-Checked Rules**: `typeCheckedConfig` export for stricter linting
- **Framework-Specific**: `next.js`, `react-internal.js` configs
- **Test Files**: `vitest.js` config with relaxed rules

## Running Tests

### Run Tests for Specific Packages

```bash
# Using Turborepo filter
turbo test --filter=@repo/ui
turbo test --filter=web

# Using pnpm filter
pnpm --filter @repo/ui test
pnpm --filter @recursor/agent-engine test
```

### Run Tests with Coverage

```bash
# All packages
pnpm test:coverage

# Specific package
pnpm --filter @repo/ui test:coverage
```

### Watch Mode for Development

```bash
# Watch all packages
pnpm test:watch

# Watch specific package
pnpm --filter @repo/ui test:watch
```

## Linting

### Run Linting

```bash
# Lint all packages (via Turborepo)
pnpm lint

# Lint specific package
turbo lint --filter=web
pnpm --filter web lint

# Auto-fix issues
pnpm --filter web lint --fix
```

### Linting Rules

The ESLint configuration includes:

- ✅ ESLint recommended rules
- ✅ TypeScript ESLint recommended rules
- ✅ Turbo-specific rules (no undeclared env vars)
- ✅ Prettier compatibility
- ✅ All errors shown as warnings (eslint-plugin-only-warn)

### Type-Checked Linting

For stricter type-aware linting, packages can use `typeCheckedConfig`:

```javascript
import { typeCheckedConfig } from "@repo/eslint-config/base";

export default typeCheckedConfig;
```

This enables rules that require TypeScript type information.

## Writing Tests

### Component Tests (React)

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MyComponent } from "./my-component";

describe("MyComponent", () => {
  it("renders correctly", () => {
    render(<MyComponent />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });
});
```

### Unit Tests (Node.js)

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./my-function";

describe("myFunction", () => {
  it("returns expected value", () => {
    expect(myFunction(2, 3)).toBe(5);
  });
});
```

### Mock Functions

```typescript
import { describe, it, expect, vi } from "vitest";

describe("with mocks", () => {
  it("calls callback", () => {
    const callback = vi.fn();
    myFunctionWithCallback(callback);
    expect(callback).toHaveBeenCalled();
  });
});
```

## CI/CD Integration

GitHub Actions workflow is configured at `.github/workflows/ci.yml`:

- ✅ Type checking
- ✅ Linting
- ✅ Tests
- ✅ Coverage reports
- ✅ Matrix testing (Node 18.x, 20.x)

## Turborepo Task Dependencies

The `turbo.json` configuration ensures proper task execution order:

```json
{
  "test": {
    "dependsOn": ["^build"]
  },
  "lint": {
    "dependsOn": ["^lint"]
  }
}
```

This means tests run after builds are complete, ensuring compiled code is available.

## Coverage Thresholds

Coverage reports are generated in `coverage/` directories. To enforce thresholds, add to your `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

## Best Practices

### Testing

1. **Co-locate tests**: Place `.test.ts` files next to source files
2. **Descriptive names**: Use clear test descriptions
3. **AAA pattern**: Arrange, Act, Assert
4. **Mock sparingly**: Prefer real implementations when possible
5. **Fast tests**: Keep unit tests fast (<1s)

### Linting

1. **Fix on save**: Use VSCode settings for auto-fix
2. **Pre-commit hooks**: Consider adding Husky + lint-staged
3. **Consistent style**: Let Prettier handle formatting
4. **Type safety**: Enable strict TypeScript checks
5. **No warnings in CI**: `--max-warnings 0` enforced

## VSCode Integration

The `.vscode/` directory includes:

- **settings.json**: Auto-fix on save, Prettier integration
- **extensions.json**: Recommended extensions (ESLint, Vitest, Prettier)

Install recommended extensions for the best developer experience.

## Troubleshooting

### Tests not running

```bash
# Rebuild the workspace
pnpm build

# Clear Vitest cache
pnpm test -- --clearCache
```

### ESLint errors

```bash
# Check ESLint config
pnpm --filter web lint --debug

# Verify TypeScript config
pnpm check-types
```

### Coverage not generating

Ensure `@vitest/coverage-v8` is installed:

```bash
pnpm add -D @vitest/coverage-v8
```

## Additional Resources

- [Vitest Documentation](https://vitest.dev)
- [TypeScript ESLint](https://typescript-eslint.io)
- [Testing Library](https://testing-library.com)
- [Turborepo Testing Guide](https://turbo.build/repo/docs/guides/tools/vitest)
