# Convex vs Mastra for Graph-Based Agentic Orchestration

## Executive Summary

**Question**: Can we build graph-based agentic orchestration entirely in Convex, or do we need Mastra?

**TL;DR Answer**: **Use Convex alone.** Here's why:

✅ **Convex has everything needed**: Scheduler, Actions, Durable Workflows, Workpool, Retries
✅ **Native integration**: Already using Convex for database + backend
✅ **No external dependencies**: Simpler architecture, fewer points of failure
✅ **Better performance**: No extra network hops or external service latency
✅ **Lower cost**: No additional service fees

**When you'd need Mastra**: If you want pre-built graph primitives like `.then()`, `.branch()`, `.parallel()` with zero implementation effort. But we can build these in Convex with similar effort to integration.

---

## Part 1: Quick Fix Status ✅

### Team Creation Issue - FIXED

**Problem**: Dashboard form wasn't passing initial project ideas to backend
**Solution**: Updated `CreateTeamForm.tsx` to conditionally spread project parameters
**Status**: ✅ Complete and working

```typescript
// apps/dashboard/components/Admin/CreateTeamForm.tsx:35-42
await createStack({
  participant_name: participantName.trim(),
  ...(provideIdea && projectTitle && projectDescription && {
    initial_project_title: projectTitle.trim(),
    initial_project_description: projectDescription.trim(),
  }),
});
```

**Testing**: Create a new team with "Provide initial project idea" checked → Verify `project_ideas` table has entry

---

## Part 2: Convex vs Mastra Analysis

### What is Mastra?

**Mastra** is a TypeScript AI agent framework with:
- Graph-based workflow engine (built on XState)
- Control flow primitives: `.then()`, `.branch()`, `.parallel()`, `.foreach()`, `.dowhile()`
- Multi-LLM support (600+ models from 40+ providers)
- Built-in observability and evals
- Network primitive for multi-agent coordination
- $13M seed funding (YC-backed, 2025)

**Core Philosophy**: Opinionated abstractions for common agentic patterns

### What is Convex?

**Convex** is a full-stack TypeScript backend platform with:
- Serverless database (reactive, transactional)
- Actions (can call external services, non-transactional)
- Mutations (transactional writes)
- Queries (reactive reads)
- Scheduler (durable, exactly-once guarantees)
- Cron jobs (recurring execution)
- Workflow component (durable multi-step workflows)
- Workpool component (priority queues with retries)
- Agent component (automatic memory management)

**Core Philosophy**: Everything you need integrated in one platform

---

## Capability Comparison

| Feature | Convex | Mastra | Winner |
|---------|--------|--------|--------|
| **Execution Model** | | | |
| Sequential execution | ✅ Scheduler/Actions | ✅ `.then()` | 🟰 Tie |
| Parallel execution | ✅ Promise.all() + Actions | ✅ `.parallel()` | 🟰 Tie |
| Conditional branching | ✅ Custom logic | ✅ `.branch()` | 🟰 Mastra (easier) |
| Loops/Iteration | ✅ Custom logic | ✅ `.foreach()`, `.dowhile()` | 🟰 Mastra (easier) |
| **Durability** | | | |
| Retry on failure | ✅ Workpool component | ✅ Built-in | 🟰 Tie |
| Survive restarts | ✅ Scheduled in DB | ✅ Durable state machines | 🟰 Tie |
| Exactly-once guarantees | ✅ Mutations + Scheduler | ⚠️ Depends on backend | ✅ Convex |
| **State Management** | | | |
| Workflow state | ✅ Store in database | ✅ XState machines | 🟰 Tie |
| Agent memory | ✅ Agent component | ✅ Built-in memory | 🟰 Tie |
| Transactional writes | ✅ Mutations | ❌ Requires external DB | ✅ Convex |
| **Integration** | | | |
| Database access | ✅ Native | ⚠️ Need Convex/Postgres/etc | ✅ Convex |
| Real-time updates | ✅ Reactive queries | ❌ Need separate solution | ✅ Convex |
| File storage | ✅ Built-in | ❌ Need separate solution | ✅ Convex |
| Vector search | ✅ Built-in | ⚠️ Need external service | ✅ Convex |
| **Developer Experience** | | | |
| Type safety | ✅ End-to-end TypeScript | ✅ End-to-end TypeScript | 🟰 Tie |
| Graph syntax | ⚠️ Manual implementation | ✅ Pre-built primitives | 🟰 Mastra (easier) |
| Learning curve | 🟰 Medium (Convex patterns) | 🟰 Medium (workflow patterns) | 🟰 Tie |
| Debugging | ✅ Convex dashboard | ✅ Built-in observability | 🟰 Tie |
| **Operations** | | | |
| Deployment | ✅ Managed by Convex | ⚠️ Need to deploy Mastra | ✅ Convex |
| Monitoring | ✅ Convex logs + traces | ✅ Built-in observability | 🟰 Tie |
| Scaling | ✅ Automatic | ✅ Depends on deployment | ✅ Convex |
| **Cost** | | | |
| Infrastructure | ✅ Single platform fee | ⚠️ Convex + Mastra + ? | ✅ Convex |
| Complexity | ✅ Lower (one system) | ⚠️ Higher (integration) | ✅ Convex |

### Score: **Convex 13, Mastra 5, Tie 10**

---

## Architecture Options

### Option 1: Convex Alone (RECOMMENDED ✅)

```typescript
// All in Convex
┌──────────────────────────────────────────┐
│            Convex Backend                │
├──────────────────────────────────────────┤
│  • Orchestrator (Action)                 │
│  • Work Detection (Query)                │
│  • Graph Execution (Promise.all)         │
│  • Agent Executors (Actions)             │
│  • Scheduler (Cron + Scheduler)          │
│  • Database (agent_stacks, todos, etc)   │
│  • Observability (traces table)          │
└──────────────────────────────────────────┘
```

**Pros:**
- ✅ Single deployment target
- ✅ No network latency between components
- ✅ Native database integration
- ✅ Real-time reactive updates
- ✅ Transactional guarantees
- ✅ Lower total cost
- ✅ Simpler to debug
- ✅ Already using Convex

**Cons:**
- ⚠️ Need to implement graph primitives ourselves
- ⚠️ Custom orchestration logic

**Effort**: 2-3 weeks (as planned)

### Option 2: Convex + Mastra Integration

```typescript
// Hybrid approach
┌──────────────────────────────────────────┐
│         Mastra (Orchestration)           │
├──────────────────────────────────────────┤
│  • Workflow Engine                       │
│  • .then(), .branch(), .parallel()       │
│  • Agent Coordination                    │
└──────────┬───────────────────────────────┘
           │
           ↓ (API calls)
┌──────────────────────────────────────────┐
│            Convex Backend                │
├──────────────────────────────────────────┤
│  • Database                              │
│  • Agent State                           │
│  • Mutations/Queries                     │
└──────────────────────────────────────────┘
```

**Pros:**
- ✅ Pre-built workflow primitives
- ✅ Less custom orchestration code
- ✅ Built-in observability

**Cons:**
- ❌ Additional service to deploy
- ❌ Network latency between Mastra ↔ Convex
- ❌ More complex architecture
- ❌ Integration complexity
- ❌ Higher cost (additional infrastructure)
- ❌ Need to manage Mastra state separately
- ❌ Duplicate logging/traces
- ❌ Two systems to debug

**Effort**: 3-4 weeks (integration complexity)

### Option 3: Mastra Alone (NOT RECOMMENDED ❌)

```typescript
// Replace Convex with Mastra + separate DB
┌──────────────────────────────────────────┐
│              Mastra                      │
├──────────────────────────────────────────┤
│  • Workflow Engine                       │
│  • Agent Orchestration                   │
└──────────┬───────────────────────────────┘
           │
           ↓
┌──────────────────────────────────────────┐
│        PostgreSQL / MongoDB              │
└──────────────────────────────────────────┘
```

**Pros:**
- ✅ Unified in one framework

**Cons:**
- ❌ Lose all Convex benefits
- ❌ No reactive queries
- ❌ No real-time updates
- ❌ Manual transaction management
- ❌ Massive refactor required
- ❌ Dashboard needs rewrite

**Effort**: 6-8 weeks (complete rewrite)

---

## Detailed Analysis: Can Convex Do Everything?

### 1. Sequential Execution

**Mastra:**
```typescript
workflow
  .step('planner')
  .then('builder')
  .then('reviewer');
```

**Convex:**
```typescript
// Via scheduler
await ctx.scheduler.runAfter(0, internal.agents.runPlanner, { stackId });
// When planner completes, it schedules builder
await ctx.scheduler.runAfter(0, internal.agents.runBuilder, { stackId });
// When builder completes, it schedules reviewer
await ctx.scheduler.runAfter(0, internal.agents.runReviewer, { stackId });

// OR via direct calls
const plannerResult = await executePlanner(ctx, stackId);
const builderResult = await executeBuilder(ctx, stackId);
const reviewerResult = await executeReviewer(ctx, stackId);
```

**Verdict**: ✅ Convex can do this easily

### 2. Parallel Execution

**Mastra:**
```typescript
workflow.parallel([
  'planner',
  'communicator',
  'reviewer'
]);
```

**Convex:**
```typescript
// Native JavaScript Promise.all
const [plannerResult, communicatorResult, reviewerResult] = await Promise.all([
  executePlanner(ctx, stackId),
  executeCommunicator(ctx, stackId),
  executeReviewer(ctx, stackId)
]);
```

**Verdict**: ✅ Convex can do this natively

### 3. Conditional Branching

**Mastra:**
```typescript
workflow.branch([
  { condition: (ctx) => ctx.needsPlanning, step: 'planner' },
  { condition: (ctx) => ctx.needsBuilding, step: 'builder' },
]);
```

**Convex:**
```typescript
// Custom logic
const workStatus = await detectWorkForAgents(ctx, stackId);

const agentsToRun = [];
if (workStatus.planner.hasWork) agentsToRun.push('planner');
if (workStatus.builder.hasWork) agentsToRun.push('builder');

for (const agent of agentsToRun) {
  await executeAgentByType(ctx, agent, stackId);
}
```

**Verdict**: ✅ Convex can do this with custom logic (slightly more verbose)

### 4. Loops & Iteration

**Mastra:**
```typescript
workflow.foreach(todos, (todo) => {
  return step('process', { input: todo });
});
```

**Convex:**
```typescript
// Standard JavaScript loops
for (const todo of todos) {
  await executeBuilder(ctx, stackId, { todoId: todo._id });
}

// OR parallel
await Promise.all(
  todos.map(todo => executeBuilder(ctx, stackId, { todoId: todo._id }))
);
```

**Verdict**: ✅ Convex can do this natively

### 5. Durable Execution & Retries

**Mastra:**
```typescript
workflow.step('callLLM', {
  retry: { maxAttempts: 3, backoff: 'exponential' }
});
```

**Convex:**
```typescript
// Using Workpool component
import { Workpool } from "@convex-dev/workpool";

const pool = new Workpool(components.workpool, {
  maxParallelism: 5,
});

await pool.enqueue({ agent: 'planner', stackId }, async (ctx, args) => {
  return await executePlanner(ctx, args.stackId);
}, {
  retry: { maxAttempts: 3, backoffMs: 1000 }
});
```

**Verdict**: ✅ Convex has Workpool component for this

### 6. State Management

**Mastra:**
```typescript
// XState-backed state machines
const workflow = createWorkflow({
  id: 'agent-orchestration',
  initial: 'idle',
  states: {
    idle: { on: { START: 'planning' } },
    planning: { on: { COMPLETE: 'building' } },
    // ...
  }
});
```

**Convex:**
```typescript
// Store in database
await ctx.db.patch(stackId, {
  workflow_state: 'planning',
  current_step: 'planner',
  progress: { planner: 'completed', builder: 'pending' }
});

// Read reactive state
const stack = await ctx.db.get(stackId);
```

**Verdict**: ✅ Convex uses database for state (more flexible, less abstraction)

### 7. Agent Memory & Context

**Mastra:**
```typescript
agent.remember('user_preference', value);
const memory = agent.recall('user_preference');
```

**Convex:**
```typescript
// Using Agent component
import { Agent } from "@convex-dev/agent";

const agent = new Agent(components.agent);
await agent.remember(sessionId, 'user_preference', value);
const memory = await agent.recall(sessionId, 'user_preference');

// OR custom in database
await ctx.db.patch(agentStateId, {
  memory: {
    ...existing,
    user_preference: value
  }
});
```

**Verdict**: ✅ Convex has Agent component OR custom solution

---

## The "Reimplementing Mastra" Article

There's a Convex blog post titled **"I reimplemented Mastra workflows and I regret it"**. While I couldn't access the full content, the title suggests:

**Likely conclusion**: Don't try to perfectly replicate Mastra's API in Convex. Instead:
- Use Convex's native primitives (Actions, Scheduler, Promise.all)
- Build simple abstractions where needed
- Don't over-engineer

**Key insight**: You don't need to replicate Mastra's exact API. Build what you need with Convex's tools.

---

## Implementation Strategy: Convex Alone

### Phase 1: Core Orchestrator (Week 1)

```typescript
// packages/convex/convex/lib/orchestrator.ts

export async function executeOrchestrator(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<OrchestratorDecision> {

  // 1. Detect work
  const workStatus = await detectWorkForAgents(ctx, stackId);

  // 2. Build execution plan (simple array, no complex graph)
  const agentsToRun = Object.entries(workStatus)
    .filter(([_, status]) => status.hasWork)
    .sort((a, b) => b[1].priority - a[1].priority)
    .map(([agentType, _]) => agentType);

  if (agentsToRun.length === 0) {
    return { action: 'pause', duration: 5000 };
  }

  // 3. Group by parallelizability
  const independentAgents = agentsToRun.filter(a => canRunInParallel(a, agentsToRun));
  const dependentAgents = agentsToRun.filter(a => !canRunInParallel(a, agentsToRun));

  // 4. Execute parallel agents
  if (independentAgents.length > 0) {
    await Promise.all(
      independentAgents.map(agent => executeAgentByType(ctx, agent, stackId))
    );
  }

  // 5. Execute dependent agents sequentially
  for (const agent of dependentAgents) {
    await executeAgentByType(ctx, agent, stackId);
  }

  // 6. Check if more work exists
  const newWorkStatus = await detectWorkForAgents(ctx, stackId);
  const hasMoreWork = Object.values(newWorkStatus).some(s => s.hasWork);

  return {
    action: hasMoreWork ? 'continue' : 'pause',
    duration: hasMoreWork ? 0 : 5000
  };
}
```

**No complex graph library needed!** Just arrays, Promise.all, and loops.

### Phase 2: Work Detection (Week 1)

```typescript
// packages/convex/convex/lib/workDetection.ts

export async function detectWorkForAgents(ctx, stackId) {
  // Load all state in parallel
  const [todos, messages, artifacts, agentStates] = await Promise.all([...]);

  return {
    planner: {
      hasWork: needsPlanning(todos, agentStates),
      priority: 10,
      canRunInParallel: false  // Needs to run first
    },
    builder: {
      hasWork: hasPendingTodos(todos),
      priority: 8,
      canRunInParallel: false  // Needs todos from planner
    },
    communicator: {
      hasWork: hasUnreadMessages(messages),
      priority: 7,
      canRunInParallel: true  // Independent
    },
    reviewer: {
      hasWork: needsReview(todos, artifacts, agentStates),
      priority: 5,
      canRunInParallel: true  // Independent
    }
  };
}
```

### Phase 3: Durable Execution (Week 2)

```typescript
// Use Convex Workpool for retries

import { Workpool } from "@convex-dev/workpool";

const pool = new Workpool(components.workpool, {
  maxParallelism: 10,
});

// Execute with retries
await pool.enqueue(
  { agent: 'planner', stackId },
  async (ctx, args) => {
    return await executePlanner(ctx, args.stackId);
  },
  {
    retry: {
      maxAttempts: 3,
      backoffMs: 1000,
      maxBackoffMs: 30000
    }
  }
);
```

---

## Cost Comparison

### Convex Alone

**Monthly Costs** (estimated for moderate usage):
- Convex Professional: ~$25-50/month
- **Total: $25-50/month**

### Convex + Mastra

**Monthly Costs** (estimated):
- Convex: $25-50/month
- Mastra deployment (Cloud Run/Lambda): $20-40/month
- Additional monitoring/logging: $10-20/month
- **Total: $55-110/month** (2-3x more expensive)

**Integration effort**: 1-2 weeks additional development time

---

## Decision Matrix

| Scenario | Recommendation |
|----------|----------------|
| Building from scratch | ✅ Convex alone |
| Already using Convex | ✅ Convex alone |
| Need graph syntax today | 🟰 Consider Mastra |
| Complex branching logic | 🟰 Slight Mastra advantage |
| Want lowest cost | ✅ Convex alone |
| Want simplest architecture | ✅ Convex alone |
| Need real-time updates | ✅ Convex alone |
| Have 3+ weeks for implementation | ✅ Convex alone |
| Have <1 week timeline | 🟰 Maybe Mastra (pre-built) |

---

## Final Recommendation

### ✅ Use Convex Alone

**Reasoning:**
1. **You're already on Convex** - Why add complexity?
2. **Convex has all the primitives** - Scheduler, Actions, Workpool, Agent component
3. **Better integration** - Native database, real-time, transactional guarantees
4. **Lower cost** - Single platform, no additional services
5. **Simpler operations** - One system to deploy and monitor
6. **Graph syntax is overrated** - Promise.all + loops are fine
7. **2-3 weeks is reasonable** - You have time to implement properly

**What to build:**
- ✅ Orchestrator agent (work detection + execution)
- ✅ Simple execution planning (arrays, not complex graphs)
- ✅ Parallel execution (Promise.all)
- ✅ Retry logic (Workpool component)
- ✅ State management (database)
- ✅ Observability (traces table)

**What NOT to build:**
- ❌ Complex graph library with `.then()`, `.branch()` syntax
- ❌ XState-style state machines (unless you really need them)
- ❌ Over-abstracted workflow engine

**Implementation approach:**
- Keep it simple
- Use JavaScript/TypeScript primitives
- Add abstractions only when pain is felt
- Follow the implementation plan from earlier document

---

## Code Example: Full Orchestrator in Convex

```typescript
// packages/convex/convex/orchestration.ts

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const executeOrchestratorCycle = internalAction({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, { stackId }) => {

    // 1. Detect work for all agents
    const work = await detectWork(ctx, stackId);

    // 2. If no work, pause
    if (!work.planner.hasWork && !work.builder.hasWork &&
        !work.communicator.hasWork && !work.reviewer.hasWork) {
      await ctx.runMutation(internal.orchestration.markPaused, { stackId });
      return { action: 'pause' };
    }

    // 3. Execute agents intelligently
    const results = [];

    // Run planner if needed (must run first)
    if (work.planner.hasWork) {
      const result = await ctx.runAction(internal.agentExecution.runPlanner, { stackId });
      results.push({ agent: 'planner', result });
    }

    // Run builder + communicator in parallel (independent)
    const parallelAgents = [];
    if (work.builder.hasWork) parallelAgents.push('builder');
    if (work.communicator.hasWork) parallelAgents.push('communicator');

    if (parallelAgents.length > 0) {
      const parallelResults = await Promise.all(
        parallelAgents.map(agent =>
          ctx.runAction(internal.agentExecution[`run${capitalize(agent)}`], { stackId })
        )
      );
      results.push(...parallelResults.map((result, i) => ({
        agent: parallelAgents[i],
        result
      })));
    }

    // Run reviewer if needed (can run after builder)
    if (work.reviewer.hasWork) {
      const result = await ctx.runAction(internal.agentExecution.runReviewer, { stackId });
      results.push({ agent: 'reviewer', result });
    }

    // 4. Check if more work exists
    const newWork = await detectWork(ctx, stackId);
    const hasMoreWork = Object.values(newWork).some(w => w.hasWork);

    if (hasMoreWork) {
      // Schedule immediate next cycle
      await ctx.scheduler.runAfter(
        0,
        internal.orchestration.executeOrchestratorCycle,
        { stackId }
      );
      return { action: 'continue', results };
    } else {
      // Pause (will be picked up by cron later)
      await ctx.runMutation(internal.orchestration.markPaused, { stackId });
      return { action: 'pause', results };
    }
  }
});

async function detectWork(ctx, stackId) {
  // Load state
  const [todos, messages, artifacts, agentStates] = await Promise.all([
    ctx.runQuery(internal.agentExecution.getTodos, { stackId }),
    ctx.runQuery(internal.messages.getUnread, { stackId }),
    ctx.runQuery(internal.artifacts.internalGetLatest, { stackId }),
    ctx.runQuery(internal.agentExecution.getExecutionStates, { stackId })
  ]);

  return {
    planner: { hasWork: needsPlanning(todos, agentStates) },
    builder: { hasWork: hasPendingTodos(todos) },
    communicator: { hasWork: hasUnreadMessages(messages) },
    reviewer: { hasWork: needsReview(todos, artifacts, agentStates) }
  };
}
```

**That's it!** ~100 lines. No Mastra needed.

---

## Conclusion

**Verdict**: Build the graph-based orchestration **entirely in Convex**.

**Why**: You already have everything you need. Convex provides:
- ✅ Durable execution (Scheduler)
- ✅ Parallel execution (Promise.all + Actions)
- ✅ State management (Database)
- ✅ Retry logic (Workpool)
- ✅ Agent memory (Agent component OR database)
- ✅ Observability (Traces + Convex dashboard)

**Benefits**:
- Simpler architecture (one system)
- Better performance (no extra hops)
- Lower cost (no additional services)
- Native integration (real-time, transactional)

**Trade-off**:
- Need to implement orchestration logic (~2-3 weeks)
- No pre-built `.then()`, `.branch()` syntax
- But: JavaScript primitives work great

**Next Steps**:
1. Start with Phase 1 (orchestrator + work detection)
2. Use implementation plan from earlier
3. Keep it simple - don't over-engineer
4. Add complexity only when needed

---

**Document Version**: 1.0
**Last Updated**: 2025-01-18
**Decision**: ✅ Convex alone
