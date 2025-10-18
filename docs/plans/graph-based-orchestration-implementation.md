# Graph-Based Agentic Orchestration - Comprehensive Implementation Plan

## Executive Summary

**Goal**: Transform from round-robin cron-based execution to intelligent graph-based workflow orchestration with parallel agent execution.

**Timeline**: 2-3 weeks (phased approach)
**Risk**: High (core architecture redesign)
**Inspiration**: LangGraph, LangChain Agents, CrewAI, AutoGen

---

## Part 1: Quick Fix - Team Creation Issue

### Problem
Dashboard form collects initial project idea but doesn't pass it to backend.

### Solution
```typescript
// apps/dashboard/components/Admin/CreateTeamForm.tsx (line 35)

await createStack({
  participant_name: participantName.trim(),
  ...(provideIdea && projectTitle && projectDescription && {
    initial_project_title: projectTitle.trim(),
    initial_project_description: projectDescription.trim(),
  }),
});
```

**Estimated Time**: 5 minutes
**Risk**: None
**Testing**: Create team with idea, verify it shows in project_ideas table

---

## Part 2: Graph-Based Orchestration - Full Plan

### Current vs Target Architecture

**CURRENT (Round-Robin):**
```
Cron (5s) → Execute ONE agent (P/B/C/R)
            → Wait 5s
            → Execute NEXT agent
            → Repeat forever
```

**Problems:**
- No intelligence (runs agents with no work)
- Fixed order (can't prioritize)
- Sequential only (no parallelization)
- Time-based (not need-based)

**TARGET (Graph-Based):**
```
Orchestrator → Detect work for all agents
             → Build execution graph
             → Execute in parallel waves
             → Analyze results
             → Decide: Continue or Pause?
             → Loop
```

**Benefits:**
- Intelligent (only runs agents with work)
- Dynamic order (prioritizes based on needs)
- Parallel execution (multiple agents simultaneously)
- Need-based (runs when there's work)

---

## Implementation Phases

### Phase 1: Foundation (Days 1-3)

#### 1.1 Create Orchestrator Agent

**File**: `packages/convex/convex/lib/agents/orchestrator.ts`

```typescript
export async function executeOrchestrator(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<OrchestratorDecision> {

  // 1. Detect what work is available
  const workStatus = await detectWorkForAgents(ctx, stackId);

  // 2. Build execution graph
  const graph = buildExecutionGraph(workStatus);

  // 3. If no work, pause
  if (graph.nodes.length === 0) {
    return { action: 'pause', duration: 5000, reason: 'No work available' };
  }

  // 4. Execute graph (parallel where possible)
  const results = await executeGraph(ctx, graph, stackId);

  // 5. Decide next action
  return analyzeAndDecide(results, workStatus);
}
```

#### 1.2 Implement Work Detection

**File**: `packages/convex/convex/lib/workDetection.ts`

```typescript
export async function detectWorkForAgents(ctx: ActionCtx, stackId: Id<"agent_stacks">) {
  const [todos, messages, artifacts, agentStates, projectIdea] = await Promise.all([
    ctx.runQuery(internal.agentExecution.getTodos, { stackId }),
    ctx.runQuery(internal.messages.getUnread, { stackId }),
    ctx.runQuery(internal.artifacts.internalGetLatest, { stackId }),
    ctx.runQuery(internal.agentExecution.getExecutionStates, { stackId }),
    ctx.runQuery(internal.agentExecution.getProjectIdea, { stackId })
  ]);

  return {
    planner: detectPlannerWork(todos, projectIdea, agentStates),
    builder: detectBuilderWork(todos, agentStates),
    communicator: detectCommunicatorWork(messages),
    reviewer: detectReviewerWork(todos, artifacts, agentStates)
  };
}

function detectPlannerWork(todos, projectIdea, agentStates) {
  // No project idea? Definitely need planner
  if (!projectIdea) {
    return { hasWork: true, priority: 10, reason: 'No project idea', dependencies: [] };
  }

  // No pending todos? Need planner
  const pending = todos?.filter(t => t.status === 'pending') || [];
  if (pending.length === 0) {
    return { hasWork: true, priority: 9, reason: 'No pending todos', dependencies: [] };
  }

  // Has reviewer recommendations? Need planner
  const plannerState = agentStates.find(s => s.agentType === 'planner');
  if (plannerState?.memory?.reviewer_recommendations?.length > 0) {
    return { hasWork: true, priority: 8, reason: 'Reviewer recommendations', dependencies: [] };
  }

  // Time for periodic review? (3 minutes)
  const lastPlanning = plannerState?.memory?.last_planning_time || 0;
  if (Date.now() - lastPlanning > 180000) {
    return { hasWork: true, priority: 4, reason: 'Periodic planning', dependencies: [] };
  }

  return { hasWork: false, priority: 0, reason: 'No planning needed', dependencies: [] };
}

function detectBuilderWork(todos, agentStates) {
  const pending = todos?.filter(t => t.status === 'pending' && (t.priority || 0) > 0) || [];

  if (pending.length === 0) {
    return { hasWork: false, priority: 0, reason: 'No pending todos', dependencies: [] };
  }

  return {
    hasWork: true,
    priority: 8,
    reason: `${pending.length} pending todos`,
    dependencies: []
  };
}

function detectCommunicatorWork(messages) {
  const unread = messages?.filter(m => /* unread logic */) || [];

  if (unread.length === 0) {
    return { hasWork: false, priority: 0, reason: 'No unread messages', dependencies: [] };
  }

  return {
    hasWork: true,
    priority: 7,
    reason: `${unread.length} unread messages`,
    dependencies: []
  };
}

function detectReviewerWork(todos, artifacts, agentStates) {
  const reviewerState = agentStates.find(s => s.agentType === 'reviewer');
  const lastReview = reviewerState?.memory?.last_review_time || 0;

  // Count completed todos since last review
  const completedSince = todos?.filter(t =>
    t.status === 'completed' && (t.completed_at || 0) > lastReview
  ).length || 0;

  // New artifacts?
  const hasNewArtifact = artifacts && artifacts.created_at > lastReview;

  // Time check (3 minutes)
  const timeSince = Date.now() - lastReview;

  if (completedSince >= 2) {
    return { hasWork: true, priority: 6, reason: `${completedSince} todos completed`, dependencies: [] };
  }

  if (hasNewArtifact) {
    return { hasWork: true, priority: 6, reason: 'New artifact', dependencies: [] };
  }

  if (timeSince > 180000) {
    return { hasWork: true, priority: 4, reason: 'Periodic review', dependencies: [] };
  }

  return { hasWork: false, priority: 0, reason: 'No review needed', dependencies: [] };
}
```

#### 1.3 Implement Graph Execution

**File**: `packages/convex/convex/lib/graphExecution.ts`

```typescript
export interface ExecutionGraph {
  nodes: GraphNode[];
  metadata: {
    stackId: Id<"agent_stacks">;
    createdAt: number;
  };
}

export interface GraphNode {
  id: string;
  agentType: 'planner' | 'builder' | 'communicator' | 'reviewer';
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: number;
  dependencies: string[];
  result?: string;
  error?: string;
  startTime?: number;
  endTime?: number;
}

export function buildExecutionGraph(workStatus: WorkStatus): ExecutionGraph {
  const nodes: GraphNode[] = [];

  // Add nodes for agents that have work
  Object.entries(workStatus).forEach(([agentType, status]) => {
    if (status.hasWork) {
      nodes.push({
        id: `${agentType}-${Date.now()}`,
        agentType: agentType as any,
        status: 'pending',
        priority: status.priority,
        dependencies: status.dependencies,
      });
    }
  });

  // Sort by priority (highest first)
  nodes.sort((a, b) => b.priority - a.priority);

  return {
    nodes,
    metadata: {
      stackId: workStatus.stackId,
      createdAt: Date.now()
    }
  };
}

export async function executeGraph(
  ctx: ActionCtx,
  graph: ExecutionGraph,
  stackId: Id<"agent_stacks">
): Promise<ExecutionGraph> {

  // Compute execution waves (respecting dependencies)
  const waves = computeExecutionWaves(graph.nodes);

  // Execute each wave
  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i];
    console.log(`[Orchestrator] Wave ${i + 1}/${waves.length}: ${wave.length} agents`);

    // Mark as running
    wave.forEach(node => {
      node.status = 'running';
      node.startTime = Date.now();
    });

    // Execute in parallel
    const promises = wave.map(node => executeAgentNode(ctx, node, stackId));
    const results = await Promise.allSettled(promises);

    // Update nodes with results
    results.forEach((result, index) => {
      const node = wave[index];
      node.endTime = Date.now();

      if (result.status === 'fulfilled') {
        node.status = 'completed';
        node.result = result.value;
      } else {
        node.status = 'failed';
        node.error = String(result.reason);
      }
    });
  }

  return graph;
}

function computeExecutionWaves(nodes: GraphNode[]): GraphNode[][] {
  const waves: GraphNode[][] = [];
  const completed = new Set<string>();
  const remaining = [...nodes];

  while (remaining.length > 0) {
    // Find nodes whose dependencies are satisfied
    const currentWave = remaining.filter(node =>
      node.dependencies.every(dep => completed.has(dep) || !nodes.find(n => n.id === dep))
    );

    if (currentWave.length === 0) {
      console.error('[Orchestrator] Cannot resolve dependencies:', remaining);
      break;
    }

    waves.push(currentWave);

    // Remove from remaining
    currentWave.forEach(node => {
      completed.add(node.id);
      const index = remaining.indexOf(node);
      if (index > -1) remaining.splice(index, 1);
    });
  }

  return waves;
}

async function executeAgentNode(
  ctx: ActionCtx,
  node: GraphNode,
  stackId: Id<"agent_stacks">
): Promise<string> {
  switch (node.agentType) {
    case 'planner':
      return await executePlanner(ctx, stackId);
    case 'builder':
      return await executeBuilder(ctx, stackId);
    case 'communicator':
      return await executeCommunicator(ctx, stackId);
    case 'reviewer':
      return await executeReviewer(ctx, stackId);
    default:
      throw new Error(`Unknown agent type: ${node.agentType}`);
  }
}
```

### Phase 2: Integration (Days 4-7)

#### 2.1 Create Orchestration Layer

**File**: `packages/convex/convex/orchestration.ts`

```typescript
export const scheduledOrchestrator = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find running stacks
    const stacks = await ctx.db
      .query("agent_stacks")
      .filter((q) => q.eq(q.field("execution_state"), "running"))
      .collect();

    for (const stack of stacks) {
      // Check if orchestrator is already running
      const lastExec = await ctx.db
        .query("orchestrator_executions")
        .withIndex("by_stack", (q) => q.eq("stack_id", stack._id))
        .order("desc")
        .first();

      const shouldExecute =
        !lastExec ||
        lastExec.status === "completed" ||
        lastExec.status === "paused" ||
        (lastExec.status === "running" && Date.now() - lastExec.started_at > 60000);

      if (shouldExecute) {
        // Schedule orchestrator
        await ctx.scheduler.runAfter(
          0,
          internal.orchestration.executeOrchestratorCycle,
          { stackId: stack._id }
        );

        // Record execution
        await ctx.db.insert("orchestrator_executions", {
          stack_id: stack._id,
          status: "running",
          started_at: Date.now(),
        });
      }
    }
  },
});

export const executeOrchestratorCycle = internalAction({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    try {
      // Run orchestrator
      const decision = await executeOrchestrator(ctx, args.stackId);

      // Mark completed
      await ctx.runMutation(internal.orchestration.markOrchestratorComplete, {
        stackId: args.stackId,
        decision: decision.action,
      });

      // Continue or pause?
      if (decision.action === 'continue') {
        // Immediate next cycle
        await ctx.scheduler.runAfter(
          0,
          internal.orchestration.executeOrchestratorCycle,
          { stackId: args.stackId }
        );
      } else if (decision.action === 'pause') {
        // Will be picked up by next cron
        await ctx.runMutation(internal.orchestration.markOrchestratorPaused, {
          stackId: args.stackId,
          duration: decision.duration,
        });
      }

    } catch (error) {
      await ctx.runMutation(internal.orchestration.markOrchestratorFailed, {
        stackId: args.stackId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
```

#### 2.2 Update Cron Job

```typescript
// packages/convex/convex/crons.ts

const crons = cronJobs();

// Use orchestrator instead of direct agent execution
crons.interval(
  "orchestrator scheduler",
  { seconds: 5 },
  internal.orchestration.scheduledOrchestrator
);

export default crons;
```

#### 2.3 Schema Updates

```typescript
// packages/convex/convex/schema.ts

// Add orchestrator_executions table
orchestrator_executions: defineTable({
  stack_id: v.id("agent_stacks"),
  status: v.union(
    v.literal("running"),
    v.literal("completed"),
    v.literal("paused"),
    v.literal("failed")
  ),
  started_at: v.number(),
  completed_at: v.optional(v.number()),
  decision: v.optional(v.string()),
  pause_duration: v.optional(v.number()),
  error: v.optional(v.string()),
  graph_summary: v.optional(v.object({
    agents_run: v.array(v.string()),
    waves: v.number(),
    parallel_executions: v.number(),
  })),
}).index("by_stack", ["stack_id"]),

// Add execution_graphs table (for debugging)
execution_graphs: defineTable({
  stack_id: v.id("agent_stacks"),
  orchestrator_execution_id: v.id("orchestrator_executions"),
  graph: v.any(),
  created_at: v.number(),
}).index("by_stack", ["stack_id"]),
```

### Phase 3: Dashboard & Testing (Days 8-14)

#### 3.1 Orchestrator Visualization

**New Components:**
- `ExecutionGraphView`: Visualize current graph
- `OrchestratorReasoningLog`: Show decision-making
- `WorkDetectionStatus`: Display what work exists
- `WaveTimeline`: Show parallel execution

#### 3.2 Testing Strategy

1. **Unit Tests**: Work detection logic
2. **Integration Tests**: Graph execution
3. **E2E Tests**: Full orchestration cycle
4. **Load Tests**: Multiple stacks running
5. **Chaos Tests**: Agent failures, timeouts

---

## Migration Strategy

### Option 1: Feature Flag (Recommended)

```typescript
// Support both systems during migration

const useGraphOrchestration = await isFeatureEnabled(
  ctx,
  stackId,
  'GRAPH_ORCHESTRATION'
);

if (useGraphOrchestration) {
  return await executeOrchestratorCycle(ctx, args);
} else {
  return await executeLegacyRoundRobin(ctx, args);
}
```

**Rollout Plan:**
1. Week 1: Deploy with feature flag OFF (default to old system)
2. Week 2: Enable for 1-2 test stacks
3. Week 3: Enable for 25% of stacks
4. Week 4: Enable for 100%
5. Week 5: Remove legacy code

### Option 2: Blue-Green Deployment

- Keep old system running
- Deploy new system in parallel
- Gradually migrate stacks
- Remove old system when complete

---

## Success Metrics

**Performance:**
- 50% reduction in idle agent executions
- 30% faster time-to-completion for projects
- Parallel execution utilization > 40%

**Quality:**
- No increase in error rate
- Improved agent coordination
- Better resource utilization

**Observability:**
- Clear orchestrator decision logs
- Visible execution graphs
- Real-time work detection status

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Circular dependencies in graph | High | Low | Dependency validation |
| Parallel execution bugs | High | Medium | Thorough testing |
| Orchestrator crashes | High | Low | Error handling + timeouts |
| Performance degradation | Medium | Low | Load testing |
| Migration issues | Medium | Medium | Feature flag + rollback |

---

## Timeline

**Week 1**: Foundation (orchestrator, work detection, graph execution)
**Week 2**: Integration (cron update, schema, testing)
**Week 3**: Dashboard + migration prep
**Week 4**: Gradual rollout + monitoring

---

## Next Steps

1. **Approve Plan**: Review and approve architecture
2. **Create Branch**: `feature/graph-orchestration`
3. **Implement Phase 1**: Foundation components
4. **Test Locally**: Verify work detection + graph execution
5. **Deploy with Feature Flag OFF**: Safety first
6. **Enable for Test Stack**: Validate in production
7. **Gradual Rollout**: Increase adoption
8. **Monitor & Iterate**: Watch metrics

---

## Appendix: Code Snippets

### Quick Fix: Team Creation

```typescript
// apps/dashboard/components/Admin/CreateTeamForm.tsx

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!participantName.trim()) return;

  setIsCreating(true);
  try {
    await createStack({
      participant_name: participantName.trim(),
      ...(provideIdea && projectTitle && projectDescription && {
        initial_project_title: projectTitle.trim(),
        initial_project_description: projectDescription.trim(),
      }),
    });

    // Reset form
    setParticipantName("");
    setProvideIdea(false);
    setProjectTitle("");
    setProjectDescription("");
  } catch (error) {
    console.error("Failed to create team:", error);
  } finally {
    setIsCreating(false);
  }
};
```

---

**Document Version**: 1.0
**Last Updated**: 2025-01-18
**Author**: Implementation Planning Team
