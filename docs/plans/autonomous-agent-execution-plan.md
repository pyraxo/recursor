# Autonomous Agent Execution System - Implementation Plan

## Executive Summary

Transform the current tick-based sequential agent execution into an autonomous, event-driven system where agents run independently based on work availability, eliminating artificial delays and enabling true concurrent processing.

## Problem Statement

Current issues with the tick-based system:
1. **All agents show "thinking" without actual work** - Agents call LLM even when idle, creating misleading traces
2. **Sequential blocking execution** - Agents wait for each other unnecessarily in a rigid 4-phase cycle
3. **5-second tick intervals** - Artificial delays between agent actions
4. **No work-based triggering** - Agents run on schedule, not when work is available
5. **Poor resource utilization** - LLM calls for idle responses waste time and API credits

## Solution Overview

### Core Architectural Changes

1. **Event-Driven Execution**: Replace tick cycles with event-based triggers
2. **Work Queue System**: Agents pull work when available, not on schedule
3. **Autonomous Orchestrator**: Manages agent pool with dynamic invocation
4. **Reactive State Management**: Instant response to pause/play via Convex subscriptions
5. **Smart Agent Activation**: Only invoke agents when they have actual work

## Detailed Implementation Plan

### Phase 1: New Orchestrator Architecture

#### 1.1 Create Autonomous Orchestrator (`packages/agent-engine/src/autonomous-orchestrator.ts`)

```typescript
export class AutonomousOrchestrator {
  private agents: Map<AgentType, BaseAgent>;
  private executionQueue: PriorityQueue<AgentTask>;
  private activeExecutions: Map<string, Promise<void>>;
  private isPaused: boolean = false;
  private shouldStop: boolean = false;

  async start() {
    // Subscribe to Convex for real-time state changes
    this.subscribeToExecutionState();

    // Start work detection loop
    this.startWorkDetection();

    // Start execution processor
    this.startExecutionProcessor();
  }

  private async startWorkDetection() {
    // Continuously check for available work
    while (!this.shouldStop) {
      if (!this.isPaused) {
        await this.detectAndQueueWork();
      }
      await this.waitForWorkSignal(); // Event-driven wait
    }
  }

  private async detectAndQueueWork() {
    // Check each agent for available work
    const workItems = await Promise.all([
      this.checkPlannerWork(),
      this.checkBuilderWork(),
      this.checkCommunicatorWork(),
      this.checkReviewerWork()
    ]);

    // Queue work items with priority
    workItems.filter(w => w.hasWork).forEach(work => {
      this.executionQueue.enqueue(work);
    });
  }

  private async startExecutionProcessor() {
    // Process work queue concurrently
    while (!this.shouldStop) {
      if (!this.isPaused && !this.executionQueue.isEmpty()) {
        const task = this.executionQueue.dequeue();

        // Execute without blocking other agents
        const execution = this.executeAgent(task);
        this.activeExecutions.set(task.id, execution);

        // Clean up completed executions
        execution.finally(() => {
          this.activeExecutions.delete(task.id);
          this.signalWorkComplete(task);
        });
      }

      await this.waitForWork(); // Sleep until work available
    }
  }
}
```

#### 1.2 Work Detection Logic

Each agent type has specific work triggers:

**Planner Work Detection**:
- No todos exist yet (initial planning)
- All todos are completed/blocked (needs new plan)
- Reviewer has provided new recommendations
- Significant time passed since last planning (e.g., 30 seconds)

**Builder Work Detection**:
- Pending todos exist with priority > 0
- Dependencies for blocked todos are resolved
- Build artifacts need updating

**Communicator Work Detection**:
- Unread messages exist
- Time to send status update (e.g., every 60 seconds)
- Other agents have broadcast requests

**Reviewer Work Detection**:
- New artifacts created
- Multiple todos completed since last review
- Planner requests strategic advice
- Periodic review interval reached (e.g., every 2 minutes)

### Phase 2: Agent Refactoring

#### 2.1 Base Agent Changes (`packages/agent-engine/src/agents/base-agent.ts`)

```typescript
abstract class BaseAgent {
  // Add work detection method
  abstract async hasWork(): Promise<WorkStatus>;

  // Refactor think to only run with work
  async think(): Promise<string> {
    const workStatus = await this.hasWork();

    if (!workStatus.hasWork) {
      // Don't call LLM, just return quickly
      return this.handleNoWork();
    }

    // Only trace when actually working
    await this.logTrace(
      `Processing ${workStatus.workDescription}`,
      'agent_working',
      { workType: workStatus.type }
    );

    // Call LLM only when there's real work
    return this.processWork(workStatus);
  }

  protected handleNoWork(): string {
    // Silent return, no LLM call, no trace
    return `${this.agentType}: Idle`;
  }
}
```

#### 2.2 Planner Agent Refactoring

```typescript
class PlannerAgent extends BaseAgent {
  async hasWork(): Promise<WorkStatus> {
    // Check multiple conditions
    const [todos, recommendations, lastPlanned] = await Promise.all([
      this.getTodos(),
      this.getReviewerRecommendations(),
      this.getLastPlanningTime()
    ]);

    const needsPlanning =
      todos.length === 0 || // No todos yet
      todos.every(t => t.status === 'completed') || // All done
      recommendations.length > 0 || // New advice
      (Date.now() - lastPlanned) > 30000; // 30s timeout

    return {
      hasWork: needsPlanning,
      type: 'planning',
      workDescription: this.getPlanningReason(todos, recommendations),
      priority: this.calculatePriority()
    };
  }

  async processWork(workStatus: WorkStatus): Promise<string> {
    // Only call LLM when actually planning
    const llmResponse = await this.llm.complete({
      messages: this.buildPlanningPrompt(workStatus),
      temperature: 0.7
    });

    // Parse and create todos
    const actions = this.parseActions(llmResponse);
    await this.executeTodoActions(actions);

    return llmResponse;
  }
}
```

#### 2.3 Similar refactoring for Builder, Communicator, and Reviewer agents

Each agent implements:
- `hasWork()` - Check if work is available
- `processWork()` - Execute work with LLM
- `handleNoWork()` - Quick return without LLM

### Phase 3: Event-Driven Execution

#### 3.1 Convex Work Signals (`packages/convex/convex/workSignals.ts`)

```typescript
// Table for work signals
export const workSignals = defineTable({
  stack_id: v.id('agent_stacks'),
  agent_type: v.string(),
  signal_type: v.string(), // 'todo_created', 'message_received', etc.
  payload: v.optional(v.any()),
  processed: v.boolean(),
  created_at: v.number(),
});

// Mutations to signal work
export const signalTodoCreated = internalMutation({
  args: { stackId: v.id('agent_stacks') },
  handler: async (ctx, { stackId }) => {
    await ctx.db.insert('work_signals', {
      stack_id: stackId,
      agent_type: 'builder',
      signal_type: 'todo_created',
      processed: false,
      created_at: Date.now(),
    });
  },
});

export const signalMessageReceived = internalMutation({
  args: { stackId: v.id('agent_stacks') },
  handler: async (ctx, { stackId }) => {
    await ctx.db.insert('work_signals', {
      stack_id: stackId,
      agent_type: 'communicator',
      signal_type: 'message_received',
      processed: false,
      created_at: Date.now(),
    });
  },
});

// Query for pending work
export const getPendingWork = query({
  args: { stackId: v.id('agent_stacks') },
  handler: async (ctx, { stackId }) => {
    return await ctx.db
      .query('work_signals')
      .filter(q =>
        q.and(
          q.eq(q.field('stack_id'), stackId),
          q.eq(q.field('processed'), false)
        )
      )
      .order('desc')
      .take(10);
  },
});
```

#### 3.2 Real-time Subscriptions

```typescript
// In autonomous-orchestrator.ts
private async subscribeToExecutionState() {
  // Use Convex client subscription
  this.convexClient.subscribe(
    api.agents.watchExecutionState,
    { stackId: this.stackId },
    (state) => {
      this.handleStateChange(state);
    }
  );
}

private async subscribeToWorkSignals() {
  this.convexClient.subscribe(
    api.workSignals.watchSignals,
    { stackId: this.stackId },
    (signals) => {
      // Wake up execution processor
      this.workAvailable.signal();
    }
  );
}

private handleStateChange(state: ExecutionState) {
  switch(state) {
    case 'paused':
      this.pauseExecution();
      break;
    case 'running':
      this.resumeExecution();
      break;
    case 'stopped':
      this.stopExecution();
      break;
  }
}
```

### Phase 4: Execution Management

#### 4.1 Priority Queue Implementation

```typescript
interface AgentTask {
  id: string;
  agentType: 'planner' | 'builder' | 'communicator' | 'reviewer';
  priority: number; // 0-10, higher = more urgent
  workStatus: WorkStatus;
  createdAt: number;
  stackId: string;
}

class PriorityQueue<T extends { priority: number }> {
  private items: T[] = [];

  enqueue(item: T): void {
    // Insert maintaining priority order
    const index = this.items.findIndex(i => i.priority < item.priority);
    if (index === -1) {
      this.items.push(item);
    } else {
      this.items.splice(index, 0, item);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }
}
```

#### 4.2 Concurrent Execution Control

```typescript
class ExecutionController {
  private maxConcurrentAgents = 3; // Configurable

  async executeAgent(task: AgentTask): Promise<void> {
    // Check concurrency limit
    while (this.activeExecutions.size >= this.maxConcurrentAgents) {
      await this.waitForSlot();
    }

    // Update execution state
    await this.updateAgentState(task.agentType, 'executing');

    try {
      // Execute agent
      const agent = this.agents.get(task.agentType);
      const result = await agent.processWork(task.workStatus);

      // Log success
      await this.logExecution(task, result, 'success');

    } catch (error) {
      // Handle errors gracefully
      await this.logExecution(task, error, 'error');

      // Retry logic if appropriate
      if (this.shouldRetry(error)) {
        this.requeueTask(task);
      }
    } finally {
      // Update state
      await this.updateAgentState(task.agentType, 'idle');
    }
  }
}
```

### Phase 5: Dashboard Updates

#### 5.1 New Execution State Display

```typescript
// ExecutionStatus component
export function ExecutionStatus({ stackId }: { stackId: Id<'agent_stacks'> }) {
  const executionState = useQuery(api.agents.getExecutionState, { stackId });
  const activeAgents = useQuery(api.agents.getActiveAgents, { stackId });
  const workQueue = useQuery(api.workSignals.getQueuedWork, { stackId });

  return (
    <div className="execution-status">
      {/* Overall state */}
      <div className="state-indicator">
        <StatusIcon state={executionState} />
        <span>{executionState}</span>
      </div>

      {/* Active agents */}
      <div className="active-agents">
        {activeAgents.map(agent => (
          <AgentActivity
            key={agent.type}
            agent={agent}
            isActive={agent.status === 'executing'}
          />
        ))}
      </div>

      {/* Work queue depth */}
      <div className="queue-status">
        <QueueIcon />
        <span>{workQueue.length} tasks queued</span>
      </div>
    </div>
  );
}
```

#### 5.2 Real-time Agent Activity

```typescript
// AgentActivity component
export function AgentActivity({ agent, isActive }) {
  return (
    <div className={`agent-activity ${isActive ? 'active' : 'idle'}`}>
      <div className="agent-name">{agent.type}</div>
      {isActive ? (
        <>
          <Spinner />
          <span className="status">Processing: {agent.currentWork}</span>
          <span className="duration">{formatDuration(agent.startedAt)}</span>
        </>
      ) : (
        <span className="status">Idle</span>
      )}
    </div>
  );
}
```

### Phase 6: Migration Strategy

#### 6.1 Parallel Implementation
1. Build `AutonomousOrchestrator` alongside existing `AgentStackOrchestrator`
2. Add feature flag to switch between implementations
3. Test with single agent stack first
4. Gradually migrate all stacks

#### 6.2 Backwards Compatibility
- Keep existing tick-based APIs functional
- Provide migration path for existing traces
- Maintain dashboard compatibility during transition

#### 6.3 Rollback Plan
- Feature flag to instantly revert to tick-based system
- Keep old orchestrator code until stability proven
- Database schema supports both models

## Implementation Timeline

### Week 1: Core Infrastructure
- [ ] Day 1-2: Implement AutonomousOrchestrator class
- [ ] Day 3-4: Create work detection system
- [ ] Day 5: Build priority queue and execution controller

### Week 2: Agent Refactoring
- [ ] Day 1-2: Refactor BaseAgent with hasWork()
- [ ] Day 3: Update PlannerAgent
- [ ] Day 4: Update BuilderAgent
- [ ] Day 5: Update Communicator and Reviewer

### Week 3: Event System
- [ ] Day 1-2: Implement Convex work signals
- [ ] Day 3: Add real-time subscriptions
- [ ] Day 4-5: Test event-driven execution

### Week 4: Dashboard & Testing
- [ ] Day 1-2: Update dashboard components
- [ ] Day 3: Integration testing
- [ ] Day 4: Performance testing
- [ ] Day 5: Documentation and deployment

## Success Metrics

1. **Performance**
   - Agent response time < 500ms when work available
   - No unnecessary LLM calls for idle agents
   - 80% reduction in "thinking without work" traces

2. **Efficiency**
   - LLM API usage reduced by 60%
   - Agent utilization rate > 70% during active periods
   - Queue processing time < 2 seconds

3. **User Experience**
   - Instant pause/resume response (< 100ms)
   - Clear visibility of actual agent work
   - No misleading "thinking" messages

4. **System Health**
   - Zero deadlocks in concurrent execution
   - Graceful handling of agent failures
   - Memory usage stable over 24-hour runs

## Risk Mitigation

### Risk 1: Race Conditions
**Mitigation**: Use Convex transactions for all state updates, implement proper locking mechanisms

### Risk 2: Message Queue Overflow
**Mitigation**: Implement backpressure, rate limiting, and queue size monitoring

### Risk 3: Agent Starvation
**Mitigation**: Fair scheduling algorithm, minimum execution guarantees per agent type

### Risk 4: Debugging Complexity
**Mitigation**: Comprehensive trace logging, execution timeline visualization, replay capabilities

## Testing Strategy

### Unit Tests
- Work detection logic for each agent
- Priority queue operations
- State transition handling

### Integration Tests
- End-to-end agent execution flow
- Pause/resume during active execution
- Error recovery scenarios

### Load Tests
- 10+ concurrent agent stacks
- 1000+ tasks in queue
- Sustained 24-hour operation

### User Acceptance Tests
- Dashboard responsiveness
- Trace clarity and accuracy
- Play/pause reliability

## Documentation Requirements

1. **Architecture Guide**: Explain autonomous vs tick-based models
2. **Migration Guide**: Steps for transitioning existing systems
3. **API Documentation**: New Convex functions and subscriptions
4. **Troubleshooting Guide**: Common issues and solutions
5. **Performance Tuning**: Configuration options for different workloads

## Conclusion

This transformation from tick-based to autonomous agent execution will:
- Eliminate artificial delays and unnecessary LLM calls
- Enable true concurrent agent processing
- Provide instant responsiveness to control commands
- Create a more efficient and scalable system

The phased approach ensures minimal disruption while delivering immediate value through improved performance and user experience.