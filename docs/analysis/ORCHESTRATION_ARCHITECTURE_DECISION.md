# Orchestration Architecture Decision: Convex vs Mastra

**Date**: 2025-10-18  
**Decision**: Where should autonomous agent orchestration happen?

---

## The Question

Should we use **Convex scheduled functions** or **Mastra's agent framework** to handle the autonomous tick loop and state engine for 100+ agents?

---

## Option 1: Convex-Based Orchestration (Current Plan)

### Architecture

```typescript
// packages/convex/convex/orchestration.ts
export const runAgentTicks = internalMutation({
  handler: async (ctx) => {
    const runningStacks = await ctx.db
      .query("agent_stacks")
      .filter((q) => q.eq(q.field("execution_state"), "running"))
      .collect();

    for (const stack of runningStacks) {
      await ctx.scheduler.runAfter(
        0,
        internal.orchestration.processSingleTick,
        {
          stackId: stack._id,
        }
      );
    }
  },
});

// Schedule every 10 seconds
export default defineSchedule({
  runAgentTicks: {
    schedule: "0/10 * * * * *",
    handler: runAgentTicks,
  },
});
```

### Pros ✅

1. **Fully Integrated**
   - Convex is already your database, real-time sync, and API layer
   - No additional service dependencies
   - State changes propagate automatically to UI via subscriptions
   - Single deployment (Convex hosts everything)

2. **Performance & Scale**
   - Sub-100ms database queries (Convex is optimized for this)
   - Built-in parallelization (scheduled functions can spawn parallel actions)
   - Automatic retries and error handling
   - Can scale to 100s of concurrent operations

3. **Developer Experience**
   - TypeScript-native with auto-generated types
   - Built-in observability (Convex dashboard shows all function calls)
   - Hot-reload during development
   - Simple deployment (`npx convex deploy`)

4. **Cost-Effective**
   - Convex free tier covers 100+ agents easily
   - Paid tier scales linearly ($25/month base + usage)
   - No additional orchestration service costs
   - Predictable pricing

5. **Real-Time Native**
   - Dashboard updates instantly when agents act
   - Visitors see changes in <1s
   - No polling needed
   - Optimistic updates built-in

6. **Simplified Architecture**
   ```
   Browser → Convex (DB + Functions + Scheduled Jobs + Real-time)
              ↓
         Agent Logic (TypeScript)
   ```

### Cons ❌

1. **Execution Limits**
   - Convex actions have max 10-minute timeout
   - Scheduled functions run in isolated context
   - Must carefully manage concurrency to avoid rate limits

2. **Custom Agent Logic**
   - You've already built custom agents
   - No built-in agent abstractions (you write your own)
   - More code to maintain

3. **Not Agent-Framework-Native**
   - Convex is a database/backend, not an agent framework
   - Missing agent-specific features (memory consolidation, tool orchestration)
   - Need to implement patterns yourself

---

## Option 2: Mastra-Based Orchestration (Alternative)

### Architecture

```typescript
// packages/agent-engine/src/mastra-orchestrator.ts
import { Mastra } from "@mastra/core";
import { Agent, Workflow } from "@mastra/agents";

const mastra = new Mastra({
  agents: [plannerAgent, builderAgent, communicatorAgent, reviewerAgent],
  workflows: [hackathonWorkflow],
  storage: convexAdapter, // Custom adapter to write to Convex
});

// Mastra handles the loop, state transitions, and coordination
await mastra.start();
```

### Pros ✅

1. **Agent-First Framework**
   - Built specifically for multi-agent systems
   - Has abstractions for agent loops, state machines, workflows
   - Memory management patterns included
   - Tool orchestration built-in

2. **Sophisticated State Management**
   - State machines for agent phases
   - Built-in workflow engine
   - Automatic state persistence
   - Rollback and recovery mechanisms

3. **Advanced Patterns**
   - Agent collaboration patterns
   - Tool chaining and composition
   - Event-driven architecture
   - Built-in monitoring/observability

4. **Less Custom Code**
   - Framework handles tick loops, state transitions
   - Focus on agent behavior, not infrastructure
   - Built-in best practices

### Cons ❌

1. **Additional Complexity**
   - Another framework to learn and maintain
   - More dependencies (Mastra + its deps)
   - Potential version conflicts
   - Framework lock-in

2. **Integration Overhead**
   - Must build custom Convex adapter for state persistence
   - Two systems to coordinate (Mastra + Convex)
   - Mastra's state store vs Convex's database
   - Potential sync issues between systems

3. **Real-Time Complications**

   ```
   Browser → Convex (Real-time UI updates)
              ↑ (custom adapter)
           Mastra (Agent orchestration)
              ↑
           Agent Logic
   ```

   - Extra layer between agents and UI
   - Must write adapter to sync Mastra state → Convex
   - Could introduce latency or inconsistencies

4. **Deployment Complexity**
   - Mastra needs to run somewhere (separate service?)
   - Not a Convex-hosted solution
   - Need to manage Mastra process lifecycle
   - Additional monitoring/logging setup

5. **Cost Uncertainty**
   - If Mastra runs as separate service (cloud function/container)
   - Additional infrastructure costs
   - More complex cost modeling

6. **Already Built Custom Agents**
   - You have 4 working custom agents
   - Would need to refactor to Mastra's abstractions
   - Risk of breaking existing work
   - Time investment to migrate

7. **Unknown Scalability**
   - Mastra is newer framework
   - Less proven at 100+ agent scale
   - Community/docs may be limited
   - Debugging harder without deep expertise

---

## Performance Analysis

### Convex Performance (100 agents, 10s ticks)

**Per Tick Cycle:**

- 100 DB queries to check execution_state: ~50ms total (parallelized)
- 100 agent ticks (parallelized via scheduler): ~2-5s per tick
- 400 DB writes (4 agents × 100 stacks): ~100ms total
- Real-time propagation: <50ms to all connected clients

**Bottlenecks:**

- LLM API calls (Groq: 1-3s per agent)
- Not Convex itself

**Can Convex Handle It?**
✅ **YES** - Convex is designed for this:

- Handles 1000s of function calls/sec
- Parallel execution built-in
- Scheduled functions don't block each other
- Can spawn 100+ parallel actions easily

### Mastra Performance

**Unknown factors:**

- How does Mastra's runtime scale to 100+ agents?
- What's the overhead of state machine transitions?
- How efficient is the workflow engine?
- Does it batch operations or run serially?

**Additional overhead:**

- Mastra → Convex adapter on every state change
- Potential N+1 query problem if adapter is naive
- Framework overhead (abstraction layers)

---

## Architectural Fit

### Your Current System

```
✅ Convex schema (7 tables, strongly typed)
✅ 4 custom agents (planner, builder, communicator, reviewer)
✅ Convex-based memory provider
✅ Convex-based messaging system
✅ Dashboard using Convex React hooks (real-time!)
```

**Question**: Where does Mastra fit?

**Option A: Mastra manages state**

- Problem: Now you have two sources of truth (Convex DB + Mastra state)
- Requires complex sync logic
- Real-time updates may lag

**Option B: Mastra uses Convex as storage**

- Must write custom storage adapter
- Mastra's abstractions may not map cleanly to your schema
- You lose some Convex benefits (optimistic updates, subscriptions)

**Option C: Hybrid**

- Mastra orchestrates, Convex stores
- Most complex: two systems to reason about
- Debugging becomes harder

---

## Recommendations

### ✅ **Use Convex for Orchestration** (Recommended)

**Why:**

1. **Already 80% there**
   - You have working agents, schema, and dashboard
   - Just need to add scheduled functions + play/pause UI
   - 1-2 days of work vs weeks refactoring to Mastra

2. **Proven at scale**
   - Convex handles 100s of agents easily
   - Real-time is core strength
   - Your bottleneck is LLM APIs, not Convex

3. **Simpler mental model**
   - One system: Convex
   - One language: TypeScript
   - One deployment: `npx convex deploy`

4. **Better for your use case**
   - You need real-time UI updates (Convex excels here)
   - You have custom agents (no need for framework abstractions)
   - You want to ship fast (PRD says 10-16 days)

5. **Lower risk**
   - Convex is mature, well-documented
   - No framework lock-in
   - Easy to optimize later if needed

### Implementation Path

```typescript
// 1. Create packages/convex/convex/orchestration.ts
export const runAgentTicks = internalMutation({
  handler: async (ctx) => {
    const runningStacks = await ctx.db
      .query("agent_stacks")
      .filter((q) => q.eq(q.field("execution_state"), "running"))
      .collect();

    // Spawn parallel actions for each stack
    await Promise.all(
      runningStacks.map((stack) =>
        ctx.scheduler.runAfter(0, internal.orchestration.processSingleTick, {
          stackId: stack._id,
        })
      )
    );
  },
});

export const processSingleTick = internalAction({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, { stackId }) => {
    // Call your existing orchestrator from agent-engine
    await runAgentTick(stackId, ctx);
  },
});
```

```typescript
// 2. Refactor packages/agent-engine/src/orchestrator.ts
export async function runAgentTick(stackId: string, convexContext: ActionCtx) {
  // Your existing orchestrator logic
  // Now callable from Convex actions
  const planner = new PlannerAgent(stackId, convexContext);
  const builder = new BuilderAgent(stackId, convexContext);
  // ... etc
}
```

```typescript
// 3. Add to packages/convex/convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "run-agent-ticks",
  { seconds: 10 },
  internal.orchestration.runAgentTicks
);

export default crons;
```

**Effort**: 1-2 days  
**Risk**: Low

---

### ❌ **Don't Use Mastra** (Not Recommended Now)

**Why not now:**

1. **Too late in the build**
   - Core system already built around Convex
   - Would need major refactoring
   - Timeline pressure (10-16 days to MVP)

2. **Doesn't solve your bottleneck**
   - LLM API latency is the constraint, not orchestration
   - Mastra won't make Groq faster

3. **Adds complexity without clear benefit**
   - Your agents are simple enough (4 types, clear flow)
   - Don't need advanced workflow engine yet
   - Real-time is more important than agent abstractions

4. **Integration is non-trivial**
   - Building Convex adapter would take days
   - Risk of subtle bugs in sync logic
   - Harder to debug

**When Mastra might make sense:**

- **Post-MVP**, if you need:
  - Complex multi-step workflows with branching
  - Advanced memory consolidation (beyond key-value)
  - Tool composition and chaining
  - Agent marketplace/plugin system
- **If you were starting from scratch**
  - No existing Convex schema
  - No custom agents built yet
  - More time to integrate properly

---

## Decision

### ✅ **Go with Convex-based orchestration**

**Action items:**

1. Create `packages/convex/convex/orchestration.ts` with scheduled function
2. Refactor agent-engine orchestrator to be callable from Convex actions
3. Add play/pause mutations to update `execution_state`
4. Build play/pause UI in dashboard (in progress)
5. Test with 1 agent → 10 agents → 50 agents
6. Monitor performance and tune tick intervals

**Estimated time**: 1-2 days  
**Risk level**: Low  
**Confidence**: High

---

## Monitoring & Optimization

Once implemented, monitor:

1. **Latency**
   - Time from tick trigger → trace appears in UI
   - Target: <5s for full cycle

2. **Concurrency**
   - How many agents can run simultaneously?
   - Convex supports 100+ parallel actions easily

3. **Cost**
   - Track function execution time
   - Track LLM token usage
   - Convex usage metrics

4. **Errors**
   - Failed ticks (retry logic)
   - LLM API failures (fallback to OpenAI)
   - DB write conflicts (rare with Convex)

**If you hit limits**, optimization options:

- Batch operations more aggressively
- Reduce tick frequency for idle agents
- Use Convex's streaming for long operations
- Add priority queues (high-priority agents first)

---

## Conclusion

**Convex can absolutely handle autonomous agent orchestration at your scale.**

The framework is designed for exactly this: real-time, reactive, event-driven systems with 100s of concurrent operations. Your bottleneck will be LLM APIs (Groq latency), not Convex.

**Mastra** is interesting but would add unnecessary complexity without solving your actual constraint (LLM speed). It's a solution looking for a problem you don't have.

**Ship with Convex. Revisit Mastra post-MVP if you need advanced agent orchestration features.**

---

_Decision logged: 2025-10-18_
