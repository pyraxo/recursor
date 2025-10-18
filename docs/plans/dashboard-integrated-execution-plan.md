# Dashboard-Integrated Agent Execution System

## Executive Summary

Transform the agent system from CLI-dependent to fully dashboard-integrated, enabling complete agent lifecycle management through the web UI without any external processes or CLI tools.

## Current State vs Target State

### Current State ❌
```
User → CLI → Node.js Process → Orchestrator → Convex → LLMs
         ↓
    Separate Process Management Required
```

### Target State ✅
```
User → Dashboard → Convex Actions → LLMs
         ↓
    Fully Serverless & Scalable
```

## Key Architectural Decision

**Selected Approach: Convex Scheduled Actions**

Why this approach wins:
- ✅ **80% already implemented** - Cron job and schema exist
- ✅ **Fully serverless** - No external processes needed
- ✅ **Auto-scaling** - Convex handles concurrency
- ✅ **Dashboard-native** - Everything controlled via web UI
- ✅ **Vercel-compatible** - Deploys without configuration

## Implementation Architecture

```
┌─────────────────────────────────────────┐
│         Dashboard (Next.js/Vercel)       │
│  ┌─────────────────────────────────────┐ │
│  │  • Create agents via form           │ │
│  │  • Start/pause/stop controls        │ │
│  │  • Real-time status monitoring      │ │
│  │  • Scale up/down agent counts       │ │
│  └────────────┬────────────────────────┘ │
└───────────────┼──────────────────────────┘
                │ Mutations & Queries
                ↓
┌─────────────────────────────────────────┐
│          Convex Backend                 │
│  ┌─────────────────────────────────────┐ │
│  │  Cron Job (every 5 seconds):        │ │
│  │   1. Find stacks with state=running │ │
│  │   2. Check for available work       │ │
│  │   3. Spawn agent execution actions  │ │
│  └────────────┬────────────────────────┘ │
│               ↓                          │
│  ┌─────────────────────────────────────┐ │
│  │  Agent Execution Actions:           │ │
│  │   • Load agent context              │ │
│  │   • Build prompts                   │ │
│  │   • Call LLM APIs                   │ │
│  │   • Process responses               │ │
│  │   • Update database                 │ │
│  └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
                ↓
        External LLM APIs
      (Groq, OpenAI, Gemini)
```

## Implementation Phases

### Phase 1: LLM Integration in Convex (Day 1-2)

**1.1 Create LLM Provider Module**
```typescript
// packages/convex/convex/lib/llm-provider.ts
export class ConvexLLMProvider {
  async chat(messages: Message[], options?: ChatOptions) {
    // Primary: Groq (fast, cheap)
    // Fallback: OpenAI
    // Alternative: Gemini
  }
}
```

**1.2 Environment Variables**
```bash
npx convex env set GROQ_API_KEY "gsk_..."
npx convex env set OPENAI_API_KEY "sk-..."
npx convex env set GEMINI_API_KEY "..."
```

### Phase 2: Agent Adapters (Day 2-3)

**2.1 Create Agent Execution Functions**
```typescript
// packages/convex/convex/lib/agents/planner.ts
export async function executePlanner(ctx, stackId) {
  // 1. Load context
  const todos = await loadTodos(ctx, stackId);
  const projectIdea = await loadProjectIdea(ctx, stackId);
  const memory = await loadAgentMemory(ctx, stackId, 'planner');

  // 2. Build prompt
  const prompt = buildPlannerPrompt({ todos, projectIdea, memory });

  // 3. Call LLM
  const response = await llm.chat(prompt);

  // 4. Parse and execute actions
  const actions = parsePlannerResponse(response);
  await executePlannerActions(ctx, stackId, actions);

  return response;
}
```

**2.2 Similar for Builder, Communicator, Reviewer**
- Each agent gets its own execution function
- All share common utilities (LLM, parsing, database)

### Phase 3: Complete Execution Action (Day 3-4)

**3.1 Update executeAgentTick**
```typescript
// packages/convex/convex/agentExecution.ts
export const executeAgentTick = internalAction({
  handler: async (ctx, { stackId }) => {
    // Determine which agent to run
    const currentAgent = await determineNextAgent(ctx, stackId);

    // Check if agent has work
    const hasWork = await checkAgentWork(ctx, stackId, currentAgent);
    if (!hasWork) return; // Skip if no work

    // Execute agent
    const result = await executeAgent(ctx, stackId, currentAgent);

    // Update state and traces
    await updateAgentState(ctx, stackId, currentAgent, result);

    // Move to next agent in cycle
    await advanceAgentCycle(ctx, stackId);
  }
});
```

**3.2 Work Detection**
```typescript
async function checkAgentWork(ctx, stackId, agentType) {
  switch(agentType) {
    case 'planner':
      // Has work if: no todos, all completed, or timeout
      return checkPlannerWork(ctx, stackId);
    case 'builder':
      // Has work if: pending todos exist
      return checkBuilderWork(ctx, stackId);
    // ... etc
  }
}
```

### Phase 4: Dashboard Enhancements (Day 4-5)

**4.1 Agent Management Page**
```typescript
// apps/dashboard/app/agents/page.tsx
export default function AgentsPage() {
  return (
    <div>
      <CreateAgentPanel />
      <ActiveAgentsGrid />
      <ExecutionMetrics />
      <GlobalControls />
    </div>
  );
}
```

**4.2 Create Agent Panel**
```typescript
// apps/dashboard/components/Agents/CreateAgentPanel.tsx
export function CreateAgentPanel() {
  const createStack = useMutation(api.agents.createStack);
  const startExecution = useMutation(api.agents.startExecution);

  const handleCreate = async (data) => {
    // 1. Create stack
    const stackId = await createStack(data);

    // 2. Auto-start if requested
    if (data.autoStart) {
      await startExecution({ stackId });
    }
  };

  return <CreateForm onSubmit={handleCreate} />;
}
```

**4.3 Bulk Operations**
```typescript
// apps/dashboard/components/Controls/BulkControls.tsx
export function BulkControls() {
  return (
    <div>
      <Button onClick={startAll}>Start All Agents</Button>
      <Button onClick={pauseAll}>Pause All Agents</Button>
      <Button onClick={stopAll}>Stop All Agents</Button>
      <Slider
        label="Agent Count"
        onChange={scaleAgents}
        min={0}
        max={20}
      />
    </div>
  );
}
```

### Phase 5: Remove CLI Dependencies (Day 5)

**5.1 Mark CLI as Development-Only**
```typescript
// packages/agent-engine/src/cli.ts
console.warn("⚠️  CLI is for development only. Use dashboard for production.");
```

**5.2 Update Package Scripts**
```json
// package.json
{
  "scripts": {
    "dev:cli": "tsx src/cli.ts",  // Development only
    "start": "pnpm convex:dev",    // Production uses Convex
    "dashboard": "pnpm --filter dashboard dev"
  }
}
```

**5.3 Deprecate execution-controller.ts**
```typescript
// packages/agent-engine/src/execution-controller.ts
// [DEPRECATED] - Functionality moved to Convex scheduled actions
```

## Database Schema (Already Complete ✅)

```typescript
// packages/convex/convex/schema.ts
agent_stacks: {
  execution_state: 'idle' | 'running' | 'paused' | 'stopped',
  participant_name: string,
  current_agent_index: number,
  // ... existing fields
}

agent_executions: {
  stack_id: Id<'agent_stacks'>,
  status: 'running' | 'completed' | 'failed',
  started_at: number,
  completed_at?: number,
  // ... tracking fields
}
```

## Scaling Strategy

### Concurrent Execution
```
Time 00:00: Cron runs
  ├→ 10 stacks in 'running' state
  ├→ Spawns 10 parallel actions
  └→ Each executes independently

Time 00:05: Cron runs again
  ├→ Checks agent_executions table
  ├→ Only spawns for completed executions
  └→ Respects concurrency limits
```

### Performance Targets
- **Agent Creation**: < 500ms
- **Start Execution**: < 1 second
- **LLM Response**: 2-30 seconds (avg 5s)
- **Dashboard Update**: Real-time via subscriptions
- **Concurrent Agents**: 20+ without issues

## Migration Strategy

### Week 1: Development
- Complete LLM integration in Convex
- Create agent adapter functions
- Test with single agent

### Week 2: Testing
- Multi-agent stress testing
- Dashboard UI enhancements
- Error handling improvements

### Week 3: Production
- Deploy to Vercel
- Monitor performance
- Gather user feedback

### Week 4: Optimization
- Fine-tune cron intervals
- Optimize LLM prompts
- Add advanced features

## Success Criteria

1. ✅ Create 10 agents via dashboard
2. ✅ Start/stop all agents with one click
3. ✅ Real-time status updates
4. ✅ No CLI required for production
5. ✅ Zero external services
6. ✅ Deploys to Vercel without config
7. ✅ Handles 20+ concurrent agents
8. ✅ < 1% execution failure rate

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Convex action timeout (10 min) | Average LLM call is 5s, plenty of margin |
| LLM rate limits | Multi-provider fallback (Groq → OpenAI → Gemini) |
| Concurrent write conflicts | Convex handles transactions automatically |
| Cron overwhelming system | 5-second interval is conservative, can adjust |
| Dashboard performance | React Query caching, pagination for large lists |

## Cost Analysis

### Current (CLI-based)
- Requires dedicated server/VM
- Complex deployment
- Manual scaling
- Higher operational overhead

### New (Dashboard-based)
- Serverless (pay per use)
- Auto-scaling
- Zero operational overhead
- Predictable costs based on usage

### Estimated Monthly Costs (10 agents)
- Convex: ~$20 (database + actions)
- Vercel: Free tier sufficient
- LLMs: ~$50 (depends on usage)
- **Total: ~$70/month**

## Conclusion

This migration transforms the agent system into a modern, scalable, dashboard-controlled platform. The implementation leverages existing infrastructure (80% complete) and can be completed in 5-7 days. The result is a production-ready system that scales automatically and requires zero external dependencies.