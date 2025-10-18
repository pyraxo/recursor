# Prompt Management Implementation Plan

**Date**: January 2025
**Status**: Draft
**Author**: Claude Code

## Executive Summary

This document outlines a comprehensive plan to centralize and manage prompts across the Recursor multi-agent system. The recommended approach is a **custom lightweight prompt management package** with YAML-based templates, versioning support, and TypeScript-first design, optimized for the Convex serverless environment.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Requirements and Constraints](#requirements-and-constraints)
3. [Solution Evaluation](#solution-evaluation)
4. [Recommended Approach](#recommended-approach)
5. [Architecture Design](#architecture-design)
6. [Implementation Phases](#implementation-phases)
7. [Migration Strategy](#migration-strategy)
8. [Testing Strategy](#testing-strategy)
9. [Success Metrics](#success-metrics)

---

## Current State Analysis

### Prompt Locations

Prompts are currently scattered across multiple packages with different implementations:

#### 1. **Agent System Prompts** (`packages/convex/convex/lib/llmProvider.ts`)
- **Location**: `getRoleDescription()` method (lines 269-325)
- **Agents**: Planner, Builder, Communicator, Reviewer
- **Format**: TypeScript string templates in code
- **Templating**: Dynamic context injection via `buildSystemPrompt()`
- **Issues**:
  - Hard to version and test
  - Changes require code deployment
  - No A/B testing capability
  - Difficult to iterate without touching codebase

#### 2. **Cursor Team Prompts** (`packages/agent-engine/src/cursor/cursor-team-orchestrator.ts`)
- **Location**: `buildUnifiedPrompt()` method (lines 370-475)
- **Format**: TypeScript template literal
- **Complexity**: ~100 lines of prompt text
- **Issues**: Same as agent prompts

#### 3. **Tool Prompts** (`packages/mcp-tools/src/utils/prompts.ts`)
- **Location**: `generateToolsPrompt()` function
- **Format**: TypeScript template literals
- **Purpose**: Instructing agents how to use external tools
- **Issues**: Tightly coupled to code

#### 4. **HTML Builder Prompts** (`packages/agent-engine/src/artifacts/html-builder.ts`)
- **Location**: `createBuildPrompt()` method (lines 61-84)
- **Format**: TypeScript template strings
- **Issues**: Same as above

### Current Problems

1. **No Versioning**: Cannot track or rollback prompt changes
2. **No Experimentation**: A/B testing requires code changes
3. **Poor Observability**: Hard to correlate LLM behavior with prompt versions
4. **Difficult Collaboration**: Non-engineers cannot easily iterate on prompts
5. **Tight Coupling**: Prompts mixed with application logic
6. **No Reusability**: Similar prompt patterns duplicated across files
7. **Testing Challenges**: Hard to systematically test prompt variations

---

## Requirements and Constraints

### Functional Requirements

1. **Versioning**
   - Track all prompt versions with timestamps
   - Easy rollback to previous versions
   - Support semantic versioning (v1.0.0, v1.1.0, etc.)

2. **Templating**
   - Variable interpolation (e.g., `{{projectTitle}}`)
   - Conditional sections
   - Reusable prompt fragments (partials)
   - Support for complex nested data

3. **Type Safety**
   - TypeScript interfaces for prompt variables
   - Compile-time validation of variable names
   - Autocomplete support in IDEs

4. **Multi-Environment Support**
   - Works in Convex serverless functions
   - Works in Node.js (agent-engine)
   - Works in Next.js (dashboard, web apps)
   - No browser-specific dependencies

5. **Performance**
   - Fast prompt loading (<10ms)
   - Caching support
   - Minimal bundle size impact
   - No async I/O in hot paths

6. **Organization**
   - Logical grouping (agents, tools, cursor)
   - Naming conventions
   - Easy discovery

7. **Experimentation** (Nice to Have)
   - A/B testing support
   - Gradual rollouts
   - Metrics integration

### Technical Constraints

1. **Convex Environment**
   - Serverless functions (limited filesystem access)
   - Must bundle prompts with deployment
   - No runtime file I/O
   - Environment variables available

2. **Monorepo Structure**
   - Must work as a workspace package
   - Shared across multiple apps/packages
   - Turborepo build caching compatible

3. **Build System**
   - TypeScript compilation
   - No complex build steps
   - Works with existing toolchain

4. **Bundle Size**
   - Lightweight (<50KB)
   - Tree-shakeable
   - No heavy dependencies

5. **Developer Experience**
   - Simple API
   - Good error messages
   - Documentation/examples
   - Migration path from current system

---

## Solution Evaluation

### Option 1: LangChain.js

**Pros:**
- Production-proven
- Rich ecosystem
- Built-in prompt templates
- TypeScript support

**Cons:**
- Heavy dependency (~500KB+)
- Opinionated framework
- Overkill for simple prompt management
- Learning curve
- May conflict with existing LLM abstractions

**Verdict:** ❌ Too heavy, not aligned with needs

---

### Option 2: Langfuse

**Pros:**
- Purpose-built for prompt management
- Excellent observability/tracing
- TypeScript SDK
- Serverless-friendly
- Built-in versioning
- Web UI for managing prompts
- A/B testing support

**Cons:**
- External service dependency
- Requires separate deployment
- Network calls to fetch prompts
- Adds latency
- Pricing concerns at scale
- Vendor lock-in

**Verdict:** ⚠️ Good for enterprise, but adds external dependency

---

### Option 3: Promptfoo

**Pros:**
- Excellent testing/evaluation tools
- YAML configuration
- TypeScript support
- Works with existing prompts

**Cons:**
- Focused on testing, not runtime management
- Not designed for production prompt serving
- CLI-first, not library-first

**Verdict:** ⚠️ Great for testing, should use alongside chosen solution

---

### Option 4: Prompt Foundry

**Pros:**
- TypeScript-first
- Built for prompt engineering
- Evaluation tools

**Cons:**
- Less mature ecosystem
- Commercial product
- External dependency

**Verdict:** ❌ External dependency, less control

---

### Option 5: Humanloop Prompt Files

**Pros:**
- Markdown + YAML format (human-readable)
- Git-friendly
- Template support

**Cons:**
- Requires parsing infrastructure
- Not a library, just a format spec
- Need to build tooling

**Verdict:** ⚠️ Good format, but need implementation

---

### Option 6: Custom Lightweight Solution ⭐ **RECOMMENDED**

**Pros:**
- Full control over implementation
- Minimal dependencies
- Optimized for Recursor's needs
- Works perfectly in Convex serverless
- No external service calls
- Bundle prompts at build time
- Type-safe by design
- Can evolve with project
- Learning opportunity

**Cons:**
- Need to build and maintain
- No pre-built web UI
- Manual versioning workflow

**Implementation Approach:**
1. YAML-based prompt definitions
2. TypeScript code generation for type safety
3. Simple template engine (Mustache-like)
4. Prompts bundled at build time
5. Version metadata in filenames/frontmatter
6. Optional: Future Langfuse integration for observability

**Verdict:** ✅ **RECOMMENDED** - Best fit for requirements

---

## Recommended Approach

Build a custom **`@recursor/prompts`** package with the following design:

### Key Design Principles

1. **YAML Source of Truth**: Store prompts as `.yaml` files
2. **Build-Time Compilation**: Generate TypeScript during build
3. **Type Safety**: Auto-generated interfaces for variables
4. **Zero Runtime Overhead**: No template parsing at runtime
5. **Git-Based Versioning**: Use Git + semantic versions
6. **Modular Architecture**: Easy to extend/replace later

### Directory Structure

```
packages/prompts/
├── src/
│   ├── index.ts                 # Main export
│   ├── loader.ts                # Prompt loader
│   ├── renderer.ts              # Template renderer
│   ├── types.ts                 # Core types
│   └── utils/
│       ├── validation.ts        # Schema validation
│       └── cache.ts             # Caching layer
├── prompts/
│   ├── agents/
│   │   ├── planner.yaml
│   │   ├── builder.yaml
│   │   ├── communicator.yaml
│   │   └── reviewer.yaml
│   ├── cursor/
│   │   └── unified-prompt.yaml
│   ├── tools/
│   │   └── tool-instructions.yaml
│   └── builders/
│       └── html-builder.yaml
├── generated/                   # Auto-generated TypeScript
│   ├── prompts.ts
│   └── types.ts
├── scripts/
│   └── generate-types.ts        # Code generation
├── package.json
├── tsconfig.json
└── README.md
```

### YAML Format Specification

```yaml
# prompts/agents/planner.yaml
version: "1.0.0"
name: "planner-agent"
description: "System prompt for the Planner agent"
tags: ["agent", "planner", "multi-agent-system"]

# Variable schema (for type generation)
variables:
  projectTitle:
    type: string
    required: false
    default: "figuring out what to build"
    description: "Current project title"

  phase:
    type: string
    required: false
    default: "ideation"
    description: "Current project phase"

  todoCount:
    type: number
    required: false
    default: 0
    description: "Number of tasks on board"

  teamName:
    type: string
    required: false
    default: "Team"
    description: "Agent team name"

  useStructuredOutput:
    type: boolean
    required: false
    default: false
    description: "Whether to use JSON structured output"

# Template content (Mustache-like syntax)
template: |
  You're the planner for team {{teamName}} in a hackathon simulation.

  Right now you're working on: {{projectTitle}}.
  Phase: {{phase}}. There are {{todoCount}} tasks on the board.

  {{#useStructuredOutput}}
  Your job is to manage the todo list, evolve the project description, and keep the team on track.

  Respond with JSON in this exact format:
  {
    "thinking": "your thoughts here about what needs to happen next",
    "actions": [
      {"type": "create_todo", "content": "description", "priority": 5},
      {"type": "update_todo", "oldContent": "existing todo text", "newContent": "updated text", "priority": 8}
    ]
  }
  {{/useStructuredOutput}}

  {{^useStructuredOutput}}
  Your job is to manage the todo list and keep the team on track.
  Talk through what you're seeing and what should happen next.
  {{/useStructuredOutput}}

  Keep it moving - be creative, work autonomously, and focus on building something that works.

# Metadata for tracking/observability
metadata:
  created_at: "2025-01-19"
  updated_at: "2025-01-19"
  author: "recursor-team"
  changelog:
    - version: "1.0.0"
      date: "2025-01-19"
      changes: "Initial version migrated from llmProvider.ts"
```

### TypeScript API

```typescript
// Usage Example 1: Simple rendering
import { prompts } from '@recursor/prompts';

const prompt = prompts.agents.planner.render({
  teamName: "BuilderBots",
  projectTitle: "AI Task Scheduler",
  phase: "building",
  todoCount: 5,
  useStructuredOutput: true
});

// Usage Example 2: Type-safe with autocomplete
import { AgentPromptVariables } from '@recursor/prompts';

const vars: AgentPromptVariables['planner'] = {
  teamName: "BuilderBots",
  // TypeScript will enforce correct variable names and types
};

const prompt = prompts.agents.planner.render(vars);

// Usage Example 3: Get prompt metadata
const metadata = prompts.agents.planner.metadata;
console.log(metadata.version); // "1.0.0"

// Usage Example 4: Version-specific loading
const prompt = prompts.agents.planner.v1_0_0.render(vars);

// Usage Example 5: Validation
const result = prompts.agents.planner.validate(vars);
if (!result.valid) {
  console.error(result.errors);
}
```

---

## Architecture Design

### Core Components

#### 1. **Prompt Loader** (`loader.ts`)

Responsibilities:
- Load YAML files at build time
- Parse and validate prompt definitions
- Generate TypeScript code
- Cache compiled prompts

```typescript
interface PromptDefinition {
  version: string;
  name: string;
  description: string;
  tags: string[];
  variables: Record<string, VariableSchema>;
  template: string;
  metadata: PromptMetadata;
}

interface VariableSchema {
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  default?: any;
  description: string;
}

class PromptLoader {
  loadAll(): Map<string, PromptDefinition>;
  load(path: string): PromptDefinition;
  validate(definition: PromptDefinition): ValidationResult;
}
```

#### 2. **Template Renderer** (`renderer.ts`)

Responsibilities:
- Render templates with variables
- Handle conditionals ({{#if}}, {{^unless}})
- Support partials/includes
- Validate variable types

```typescript
interface RenderOptions {
  strict?: boolean;        // Throw on missing variables
  escape?: boolean;        // HTML escape by default
  partials?: Record<string, string>;
}

class TemplateRenderer {
  render(template: string, variables: Record<string, any>, options?: RenderOptions): string;
  compile(template: string): CompiledTemplate;
}
```

#### 3. **Type Generator** (`scripts/generate-types.ts`)

Responsibilities:
- Generate TypeScript interfaces from YAML schemas
- Create type-safe prompt accessors
- Generate JSDoc comments

Output example:
```typescript
// Auto-generated - do not edit
export interface PlannerPromptVariables {
  projectTitle?: string;
  phase?: string;
  todoCount?: number;
  teamName?: string;
  useStructuredOutput?: boolean;
}

export interface AgentPromptVariables {
  planner: PlannerPromptVariables;
  builder: BuilderPromptVariables;
  communicator: CommunicatorPromptVariables;
  reviewer: ReviewerPromptVariables;
}
```

#### 4. **Validation** (`utils/validation.ts`)

Responsibilities:
- Runtime variable validation
- Schema compliance checking
- Helpful error messages

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  field: string;
  message: string;
  expected: string;
  received: any;
}

class PromptValidator {
  validate(variables: any, schema: VariableSchema): ValidationResult;
}
```

#### 5. **Caching** (`utils/cache.ts`)

Responsibilities:
- Cache rendered prompts
- Invalidate on variable changes
- Memory-efficient

```typescript
class PromptCache {
  private cache = new Map<string, string>();

  get(key: string): string | undefined;
  set(key: string, value: string): void;
  clear(): void;
  generateKey(promptName: string, variables: any): string;
}
```

### Build Pipeline

```
┌─────────────────────┐
│  YAML Prompt Files  │
│  prompts/**/*.yaml  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Schema Parser     │
│  (Zod/JSON Schema)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Type Generator     │
│ (TypeScript AST)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ generated/types.ts  │
│ generated/prompts.ts│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Package Build      │
│   (tsc compile)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   dist/ (NPM pkg)   │
└─────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Create package structure and core functionality

**Tasks**:
1. ✅ Create `packages/prompts` package
2. ✅ Set up TypeScript configuration
3. ✅ Implement YAML parser (use `js-yaml`)
4. ✅ Build template renderer (use `mustache` or custom)
5. ✅ Create basic type generator script
6. ✅ Write unit tests for renderer
7. ✅ Add to Turborepo pipeline

**Deliverables**:
- Working package with basic prompt loading
- Template rendering with variable substitution
- Type generation script
- Test suite

**Dependencies**:
```json
{
  "dependencies": {
    "js-yaml": "^4.1.0",
    "mustache": "^4.2.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.9",
    "@types/mustache": "^4.2.5",
    "vitest": "^3.2.4"
  }
}
```

---

### Phase 2: Migration - Agent Prompts (Week 2)

**Goal**: Migrate all agent system prompts to YAML

**Tasks**:
1. ✅ Create YAML files for 4 agents (planner, builder, communicator, reviewer)
2. ✅ Define variable schemas
3. ✅ Generate TypeScript types
4. ✅ Update `llmProvider.ts` to use new package
5. ✅ Test in Convex environment
6. ✅ Validate LLM outputs unchanged
7. ✅ Deploy and monitor

**Deliverables**:
- `prompts/agents/*.yaml` files
- Updated `packages/convex/convex/lib/llmProvider.ts`
- Passing integration tests
- Documentation

**Testing Strategy**:
- Snapshot tests comparing old vs new prompts
- Run agents in test mode
- Verify identical LLM behavior

---

### Phase 3: Migration - Cursor & Tools (Week 3)

**Goal**: Migrate Cursor and tool prompts

**Tasks**:
1. ✅ Create `prompts/cursor/unified-prompt.yaml`
2. ✅ Create `prompts/tools/tool-instructions.yaml`
3. ✅ Update `cursor-team-orchestrator.ts`
4. ✅ Update `mcp-tools/src/utils/prompts.ts`
5. ✅ Test Cursor agent workflows
6. ✅ Test tool usage patterns

**Deliverables**:
- All prompts migrated to YAML
- Old prompt code removed
- Full test coverage

---

### Phase 4: Enhanced Features (Week 4)

**Goal**: Add versioning and experimentation support

**Tasks**:
1. ✅ Implement version management
2. ✅ Add prompt A/B testing utility
3. ✅ Create prompt comparison CLI tool
4. ✅ Add observability hooks (optional Langfuse integration)
5. ✅ Build prompt playground/viewer (Next.js app)
6. ✅ Documentation and examples

**Deliverables**:
- Versioning system
- A/B testing framework
- CLI tools for management
- Web-based prompt viewer

**Advanced Features**:
```typescript
// A/B Testing
import { prompts, ABTestRunner } from '@recursor/prompts';

const abTest = new ABTestRunner({
  name: "planner-creativity-test",
  variants: [
    { name: "control", prompt: prompts.agents.planner.v1_0_0 },
    { name: "creative", prompt: prompts.agents.planner.v1_1_0 }
  ],
  distribution: { control: 0.5, creative: 0.5 }
});

const variant = abTest.getVariant(userId);
const prompt = variant.render(variables);
```

---

## Migration Strategy

### Backward Compatibility

During migration, support both old and new systems:

```typescript
// In llmProvider.ts
import { prompts } from '@recursor/prompts';

class ConvexLLMProvider {
  private useNewPrompts = process.env.USE_NEW_PROMPTS === 'true';

  buildSystemPrompt(role: string, context: any, useStructuredOutput: boolean = false) {
    if (this.useNewPrompts) {
      return prompts.agents[role].render({
        teamName: context.teamName,
        projectTitle: context.projectTitle,
        phase: context.phase,
        todoCount: context.todoCount,
        useStructuredOutput
      });
    } else {
      // Legacy implementation
      return this.getRoleDescription(role, useStructuredOutput);
    }
  }
}
```

### Rollout Plan

1. **Phase 1**: Deploy package, keep existing prompts (Week 1)
2. **Phase 2**: Enable new prompts for 10% of agents (Week 2)
3. **Phase 3**: Enable for 50% of agents (Week 3)
4. **Phase 4**: Enable for 100%, remove legacy code (Week 4)

### Validation Gates

Before each rollout phase:
- ✅ Unit tests pass
- ✅ Integration tests pass
- ✅ Manual QA on test agents
- ✅ Metrics show no degradation (response quality, latency)
- ✅ Convex deployment successful

---

## Testing Strategy

### 1. Unit Tests (Vitest)

Test core functionality in isolation:

```typescript
// packages/prompts/tests/renderer.test.ts
import { describe, it, expect } from 'vitest';
import { TemplateRenderer } from '../src/renderer';

describe('TemplateRenderer', () => {
  it('renders simple variables', () => {
    const renderer = new TemplateRenderer();
    const result = renderer.render(
      'Hello {{name}}!',
      { name: 'World' }
    );
    expect(result).toBe('Hello World!');
  });

  it('handles conditionals', () => {
    const renderer = new TemplateRenderer();
    const result = renderer.render(
      '{{#isPro}}Premium{{/isPro}}{{^isPro}}Free{{/isPro}}',
      { isPro: true }
    );
    expect(result).toBe('Premium');
  });

  it('throws on missing required variables', () => {
    const renderer = new TemplateRenderer();
    expect(() => {
      renderer.render('{{requiredVar}}', {}, { strict: true });
    }).toThrow();
  });
});
```

### 2. Integration Tests

Test prompts work correctly with LLM providers:

```typescript
// packages/prompts/tests/integration/agent-prompts.test.ts
import { describe, it, expect } from 'vitest';
import { prompts } from '../src';

describe('Agent Prompts Integration', () => {
  it('generates valid planner prompt', () => {
    const result = prompts.agents.planner.render({
      teamName: 'TestTeam',
      projectTitle: 'Test Project',
      phase: 'building',
      todoCount: 3,
      useStructuredOutput: true
    });

    expect(result).toContain('TestTeam');
    expect(result).toContain('Test Project');
    expect(result).toContain('JSON');
  });

  it('matches legacy prompt output', async () => {
    // Snapshot test to ensure migration doesn't change prompts
    const result = prompts.agents.planner.render({
      teamName: 'Team',
      projectTitle: 'figuring out what to build',
      phase: 'ideation',
      todoCount: 0,
      useStructuredOutput: false
    });

    expect(result).toMatchSnapshot();
  });
});
```

### 3. Prompt Quality Tests (Promptfoo)

Use Promptfoo to evaluate prompt effectiveness:

```yaml
# promptfoo.config.yaml
prompts:
  - file://packages/prompts/prompts/agents/planner.yaml

providers:
  - id: openai:gpt-4o-mini
  - id: groq:llama-3.3-70b-versatile

tests:
  - description: "Planner creates todos when none exist"
    vars:
      teamName: "TestTeam"
      projectTitle: "AI Calendar"
      phase: "ideation"
      todoCount: 0
      useStructuredOutput: true
    assert:
      - type: llm-rubric
        value: "Response should create 3-5 initial todos in JSON format"
      - type: javascript
        value: |
          const json = JSON.parse(output);
          json.actions.length >= 3 && json.actions.length <= 5

  - description: "Planner handles completed todos"
    vars:
      teamName: "TestTeam"
      projectTitle: "AI Calendar"
      phase: "building"
      todoCount: 0
      useStructuredOutput: true
    assert:
      - type: llm-rubric
        value: "Response should plan next development phase"
```

Run with: `npx promptfoo eval`

### 4. A/B Testing Framework

Built-in experimentation support:

```typescript
// packages/prompts/src/experiments.ts
export class PromptExperiment {
  constructor(
    public name: string,
    public variants: Map<string, PromptVariant>,
    public distribution: Record<string, number>
  ) {}

  getVariant(userId: string): PromptVariant {
    // Deterministic assignment based on hash
    const hash = this.hashUserId(userId);
    const rand = hash % 100;

    let cumulative = 0;
    for (const [name, percentage] of Object.entries(this.distribution)) {
      cumulative += percentage * 100;
      if (rand < cumulative) {
        return this.variants.get(name)!;
      }
    }

    return this.variants.values().next().value;
  }

  private hashUserId(userId: string): number {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}
```

---

## Success Metrics

### Engineering Metrics

- ✅ **Prompt Centralization**: 100% of prompts in YAML
- ✅ **Type Safety**: 0 runtime type errors
- ✅ **Performance**: Prompt rendering <1ms
- ✅ **Bundle Size**: Package <50KB gzipped
- ✅ **Test Coverage**: >90% code coverage
- ✅ **Build Time**: No significant increase (<5%)

### Product Metrics

- ✅ **Prompt Iteration Velocity**: Time to test new prompt <5 minutes
- ✅ **Version Rollback**: Rollback to previous prompt in <1 minute
- ✅ **Experimentation**: Run A/B test in <10 minutes
- ✅ **Quality**: Agent behavior unchanged (baseline metrics)
- ✅ **Observability**: Full prompt version tracking in traces

### Developer Experience Metrics

- ✅ **Learning Curve**: New developers can modify prompts in <30 minutes
- ✅ **Documentation**: Complete examples and API docs
- ✅ **Error Messages**: Helpful validation errors
- ✅ **IDE Support**: Full autocomplete and type hints

---

## Future Enhancements

### Phase 5: Advanced Features (Post-MVP)

**Prompt Playground Web App**
- Next.js app for viewing/testing prompts
- Live preview with variable editing
- Diff view for version comparison
- LLM response simulator

**Langfuse Integration** (Optional)
- Automatic prompt version tracking
- Performance analytics
- User feedback collection
- Drift detection

**Prompt Optimization Tools**
- Automated prompt compression
- Token usage optimization
- Cost estimation
- Performance benchmarking

**Multi-Language Support**
- Internationalization (i18n)
- Locale-specific prompts
- Translation workflow

**Advanced Templating**
- Jinja2-style filters
- Custom helper functions
- Recursive partials
- Conditional includes

---

## Risks and Mitigations

### Risk 1: Breaking Changes During Migration

**Mitigation**:
- Snapshot testing of all prompts
- Parallel running of old and new systems
- Gradual rollout with metrics
- Easy rollback via feature flag

### Risk 2: Build-Time Complexity

**Mitigation**:
- Keep generator simple (<500 LOC)
- Fast YAML parsing
- Incremental generation
- Turborepo caching

### Risk 3: Maintenance Burden

**Mitigation**:
- Minimize dependencies (3-5 only)
- Comprehensive tests
- Good documentation
- Simple architecture

### Risk 4: Template Engine Limitations

**Mitigation**:
- Start with Mustache (battle-tested)
- Design for easy engine swapping
- Escape hatch for complex prompts
- Regular evaluation of needs

---

## Alternatives Considered But Rejected

### Why Not Just Environment Variables?

**Problems**:
- No templating support
- Hard to version
- Size limits
- Poor DX for multiline strings
- No type safety

### Why Not Database Storage?

**Problems**:
- Adds latency (network calls)
- Requires Convex schema changes
- Harder to version control
- Deployment complexity
- Not suitable for build-time optimization

### Why Not Separate Microservice?

**Problems**:
- Overengineering for current scale
- Adds infrastructure complexity
- Network latency
- More failure points
- Harder to develop/test locally

---

## Appendix

### A. Example Prompt Files

See `prompts/agents/planner.yaml` above for detailed example.

### B. Migration Checklist

- [ ] Create `packages/prompts` package
- [ ] Implement core renderer
- [ ] Build type generator
- [ ] Write unit tests
- [ ] Migrate planner prompt
- [ ] Migrate builder prompt
- [ ] Migrate communicator prompt
- [ ] Migrate reviewer prompt
- [ ] Migrate cursor unified prompt
- [ ] Migrate tool prompts
- [ ] Migrate HTML builder prompts
- [ ] Deploy to staging
- [ ] Run integration tests
- [ ] Deploy to production (10%)
- [ ] Monitor metrics
- [ ] Deploy to production (100%)
- [ ] Remove legacy code
- [ ] Update documentation

### C. References

- [Promptfoo Documentation](https://www.promptfoo.dev/docs/)
- [Mustache Template Syntax](https://mustache.github.io/mustache.5.html)
- [YAML 1.2 Specification](https://yaml.org/spec/1.2/spec.html)
- [TypeScript Compiler API](https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [Convex Best Practices](https://docs.convex.dev/production/best-practices)

### D. Code Examples Repository

All implementation examples will be available in:
- `packages/prompts/examples/`
- `packages/prompts/tests/`

---

## Conclusion

The recommended **custom lightweight prompt management package** (`@recursor/prompts`) provides the best balance of:

- ✅ Full control and customization
- ✅ Zero external dependencies/services
- ✅ Optimized for Convex serverless
- ✅ Type-safe TypeScript API
- ✅ Git-based versioning
- ✅ Minimal bundle size
- ✅ Fast build and runtime performance
- ✅ Easy migration path
- ✅ Future extensibility

This approach centralizes prompt management while maintaining the flexibility to integrate with external tools (like Promptfoo for testing or Langfuse for observability) in the future.

**Next Steps**:
1. Review and approve this plan
2. Create GitHub issue/project board
3. Begin Phase 1 implementation
4. Schedule regular check-ins during migration

---

**Questions or Feedback?**
Contact: [recursor-team]
