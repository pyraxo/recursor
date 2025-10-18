# Dashboard Play/Pause Implementation Plan

## Executive Summary
Replace CLI-based agent execution (`pnpm cli run <task_id>`) with dashboard-controlled Play/Pause functionality, allowing users to start, pause, and resume agent execution directly from the web interface. Agents will continue their execution from exactly where they left off when resumed.

## 1. Feature Requirements

### 1.1 Functional Requirements
- **Play Button**: Start or resume agent execution for a specific team
- **Pause Button**: Temporarily halt agent execution (preserve complete state)
- **Stop Button**: Permanently stop execution and cleanup resources
- **Execution Status Indicator**: Show current state (running/paused/stopped)
- **Multi-Team Control**: Independent control for each team
- **Activity Indicator**: Show when agents are actively processing

### 1.2 Non-Functional Requirements
- **Real-time Updates**: Status changes reflect immediately
- **Graceful Pause**: Complete current agent action before pausing
- **State Persistence**: Maintain complete execution state across pauses
- **Error Handling**: Clear feedback on control failures
- **Performance**: Control actions complete within 500ms
- **Scalability**: Support multiple teams running simultaneously

## 2. Architecture Design

### 2.1 System Architecture
```
┌─────────────────────────────────────────────────────┐
│                  Dashboard (Next.js)                │
│  ┌─────────────────────────────────────────────┐   │
│  │   Play/Pause Control Component               │   │
│  │   - UI Controls (Play/Pause/Stop buttons)    │   │
│  │   - Status Display (Running/Paused/Stopped)  │   │
│  │   - Activity Indicator (agent processing)    │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ Convex Mutations
                       ▼
┌─────────────────────────────────────────────────────┐
│            Convex Backend (Database)                │
│  ┌─────────────────────────────────────────────┐   │
│  │   agent_stacks Table Extensions:            │   │
│  │   - execution_state: 'idle'|'running'|      │   │
│  │                     'paused'|'stopped'      │   │
│  │   - last_activity_at: timestamp             │   │
│  │   - started_at: timestamp                   │   │
│  │   - paused_at: timestamp                    │   │
│  │   - process_id: string (service identifier) │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ Query State
                       ▼
┌─────────────────────────────────────────────────────┐
│         Agent Execution Service (Node.js)           │
│  ┌─────────────────────────────────────────────┐   │
│  │   Execution Controller:                     │   │
│  │   - Monitors execution_state from Convex    │   │
│  │   - Manages AgentStackOrchestrator          │   │
│  │   - Handles Play/Pause/Stop signals         │   │
│  │   - Maintains execution continuity          │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

#### Play Action Flow:
1. User clicks Play button on dashboard
2. Dashboard calls Convex mutation `startExecution(stackId)`
3. Convex updates `execution_state` to 'running'
4. Execution Service detects state change
5. Service starts/resumes orchestrator execution loop
6. Agents continue processing from their last state
7. Dashboard reflects running state via subscription

#### Pause Action Flow:
1. User clicks Pause button
2. Dashboard calls Convex mutation `pauseExecution(stackId)`
3. Convex updates `execution_state` to 'paused'
4. Execution Service detects state change
5. Service completes current agent action (graceful pause)
6. Service preserves complete execution context
7. Dashboard reflects paused state

#### Resume Action Flow:
1. User clicks Play button (when paused)
2. Dashboard calls Convex mutation `resumeExecution(stackId)`
3. Convex updates `execution_state` to 'running'
4. Execution Service detects state change
5. Service restores execution context
6. Agents continue exactly where they left off
7. Execution resumes with preserved state

## 3. Implementation Phases

### Phase 1: Backend Infrastructure (2-3 days)
1. **Database Schema Updates**
   - Extend `agent_stacks` table
   - Add execution control fields
   - Create migration script

2. **Convex API Endpoints**
   - `startExecution(stackId)`
   - `pauseExecution(stackId)`
   - `resumeExecution(stackId)`
   - `stopExecution(stackId)`
   - `getExecutionStatus(stackId)`
   - `updateActivityTimestamp(stackId)`

3. **Execution Service Refactor**
   - Create `ExecutionController` class
   - Implement state monitoring mechanism
   - Refactor orchestrator to support pause/resume
   - Add graceful pause/resume handling

### Phase 2: Dashboard UI Components (2-3 days)
1. **Control Component**
   - Play/Pause toggle button
   - Stop button (confirmation dialog)
   - Status indicator (with color coding)
   - Activity indicator (pulsing when active)

2. **Integration Points**
   - Team detail view integration
   - Admin dashboard integration
   - Live feed status display

3. **State Management**
   - Real-time status updates via Convex subscriptions
   - Optimistic UI updates
   - Error state handling

### Phase 3: Execution Service Implementation (3-4 days)
1. **Service Architecture**
   - Long-running process management
   - Multiple team orchestration
   - Resource management (prevent memory leaks)

2. **Execution Logic**
   ```typescript
   class ExecutionController {
     private orchestrators: Map<string, AgentStackOrchestrator>
     private controllers: Map<string, AbortController>

     async start(stackId: string) {
       const state = await getExecutionState(stackId)
       if (state.execution_state !== 'running') return

       const orchestrator = new AgentStackOrchestrator(stackId)
       await orchestrator.initialize()

       const controller = new AbortController()
       this.controllers.set(stackId, controller)
       this.orchestrators.set(stackId, orchestrator)

       // Continuous execution loop
       this.runContinuous(stackId, controller.signal)
     }

     async runContinuous(stackId: string, signal: AbortSignal) {
       const orchestrator = this.orchestrators.get(stackId)

       while (!signal.aborted) {
         const state = await getExecutionState(stackId)

         if (state.execution_state === 'paused') {
           // Wait while paused, checking every second
           await new Promise(resolve => setTimeout(resolve, 1000))
           continue
         }

         if (state.execution_state === 'stopped') {
           this.cleanup(stackId)
           return
         }

         // Execute next agent action
         await orchestrator.executeNextAction()
         await updateActivityTimestamp(stackId)

         // Small delay between actions to prevent CPU overload
         await new Promise(resolve => setTimeout(resolve, 100))
       }
     }

     async pause(stackId: string) {
       // State change handled by Convex
       // Execution loop will detect and pause gracefully
     }

     async resume(stackId: string) {
       const orchestrator = this.orchestrators.get(stackId)
       if (orchestrator) {
         // Already running, just update state
         await resumeExecution(stackId)
       } else {
         // Restart from saved state
         await this.start(stackId)
       }
     }

     cleanup(stackId: string) {
       const controller = this.controllers.get(stackId)
       controller?.abort()
       this.controllers.delete(stackId)
       this.orchestrators.delete(stackId)
     }
   }
   ```

### Phase 4: Testing & Polish (2 days)
1. **Unit Tests**
   - Control component tests
   - API endpoint tests
   - Execution controller tests

2. **Integration Tests**
   - End-to-end flow testing
   - Multi-team concurrent execution
   - Error recovery scenarios

3. **UI Polish**
   - Loading states
   - Animation transitions
   - Responsive design
   - Accessibility

## 4. Technical Implementation Details

### 4.1 Orchestrator Refactoring

The current orchestrator runs in a tick-based loop. We need to refactor it to support pause/resume:

```typescript
// packages/agent-engine/src/orchestrator.ts

export class AgentStackOrchestrator {
  private shouldPause = false
  private isPaused = false
  private currentAction: Promise<void> | null = null

  async runContinuous(): Promise<void> {
    while (true) {
      // Check execution state from Convex
      const state = await this.getExecutionState()

      if (state === 'stopped') {
        break
      }

      if (state === 'paused') {
        this.isPaused = true
        await new Promise(resolve => setTimeout(resolve, 1000))
        continue
      }

      this.isPaused = false

      // Execute next action for each agent
      await this.executeNextAction()

      // Small delay to prevent CPU overload
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  async executeNextAction(): Promise<void> {
    // Save current action for graceful pause
    this.currentAction = this.runAgentCycle()
    await this.currentAction
    this.currentAction = null
  }

  private async runAgentCycle(): Promise<void> {
    // Run each agent in sequence
    await this.plannerAgent.think()
    if (this.shouldPause) return

    await this.builderAgent.think()
    if (this.shouldPause) return

    await this.communicatorAgent.think()
    if (this.shouldPause) return

    await this.reviewerAgent.think()
  }

  async gracefulPause(): Promise<void> {
    this.shouldPause = true
    // Wait for current action to complete
    if (this.currentAction) {
      await this.currentAction
    }
  }
}
```

### 4.2 Database Schema Changes
```typescript
// packages/convex/convex/schema.ts
agent_stacks: defineTable({
  // Existing fields...

  // New execution control fields
  execution_state: v.optional(v.union(
    v.literal('idle'),
    v.literal('running'),
    v.literal('paused'),
    v.literal('stopped')
  )),
  last_activity_at: v.optional(v.number()),
  started_at: v.optional(v.number()),
  paused_at: v.optional(v.number()),
  stopped_at: v.optional(v.number()),
  process_id: v.optional(v.string()), // Track which service instance is running this
})
```

### 4.2 Convex Mutations
```typescript
// packages/convex/convex/agents.ts

export const startExecution = mutation({
  args: {
    stackId: v.id('agent_stacks'),
  },
  handler: async (ctx, args) => {
    const stack = await ctx.db.get(args.stackId)
    if (!stack) throw new Error('Stack not found')

    await ctx.db.patch(args.stackId, {
      execution_state: 'running',
      started_at: Date.now(),
      last_activity_at: Date.now(),
      paused_at: undefined,
    })

    return { success: true }
  },
})

export const pauseExecution = mutation({
  args: {
    stackId: v.id('agent_stacks'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stackId, {
      execution_state: 'paused',
      paused_at: Date.now(),
    })

    return { success: true }
  },
})

export const resumeExecution = mutation({
  args: {
    stackId: v.id('agent_stacks'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stackId, {
      execution_state: 'running',
      paused_at: undefined,
      last_activity_at: Date.now(),
    })

    return { success: true }
  },
})

export const stopExecution = mutation({
  args: {
    stackId: v.id('agent_stacks'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stackId, {
      execution_state: 'stopped',
      stopped_at: Date.now(),
      process_id: undefined,
    })

    return { success: true }
  },
})
```

### 4.3 Dashboard Component
```tsx
// apps/dashboard/components/Controls/ExecutionControls.tsx

import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Play, Pause, Square } from 'lucide-react'
import { Id } from '@/convex/_generated/dataModel'

export function ExecutionControls({ stackId }: { stackId: Id<'agent_stacks'> }) {
  const stack = useQuery(api.agents.getStack, { stackId })
  const start = useMutation(api.agents.startExecution)
  const pause = useMutation(api.agents.pauseExecution)
  const resume = useMutation(api.agents.resumeExecution)
  const stop = useMutation(api.agents.stopExecution)

  const handlePlayPause = async () => {
    if (stack?.execution_state === 'running') {
      await pause({ stackId })
    } else if (stack?.execution_state === 'paused') {
      await resume({ stackId })
    } else {
      await start({ stackId })
    }
  }

  const handleStop = async () => {
    if (confirm('Stop execution? This will permanently halt all agents.')) {
      await stop({ stackId })
    }
  }

  const isRunning = stack?.execution_state === 'running'
  const isPaused = stack?.execution_state === 'paused'
  const isStopped = stack?.execution_state === 'stopped'
  const isActive = isRunning || isPaused

  // Calculate if agents are actively processing (based on last_activity_at)
  const isProcessing = isRunning && stack?.last_activity_at &&
    (Date.now() - stack.last_activity_at < 5000)

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
      <div className="flex gap-2">
        {!isStopped && (
          <button
            onClick={handlePlayPause}
            className={`p-2 rounded transition-colors ${
              isRunning
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-green-600 hover:bg-green-700'
            }`}
            title={isRunning ? 'Pause execution' : isPaused ? 'Resume execution' : 'Start execution'}
          >
            {isRunning ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </button>
        )}

        {isActive && (
          <button
            onClick={handleStop}
            className="p-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
            title="Stop execution"
          >
            <Square className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm">
        <span className={`px-3 py-1 rounded font-medium ${
          isRunning ? 'bg-green-900 text-green-300' :
          isPaused ? 'bg-yellow-900 text-yellow-300' :
          isStopped ? 'bg-red-900 text-red-300' :
          'bg-gray-800 text-gray-400'
        }`}>
          {stack?.execution_state?.toUpperCase() || 'IDLE'}
        </span>

        {isProcessing && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-gray-400">Processing...</span>
          </div>
        )}

        {isPaused && (
          <span className="text-gray-500">
            Execution paused - agents will resume from current state
          </span>
        )}
      </div>
    </div>
  )
}
```

## 5. UI/UX Considerations

### 5.1 Visual States
- **Idle**: Gray indicators, Play button enabled
- **Running**: Green indicators, animated pulse, Pause button shown
- **Paused**: Yellow indicators, Resume (Play) button shown
- **Stopped**: Red indicators, all controls disabled

### 5.2 User Feedback
- Toast notifications for state changes
- Confirmation dialogs for destructive actions
- Activity indicator for active processing
- Time elapsed since start
- Last activity timestamp

### 5.3 Responsive Design
- Mobile: Stacked controls with icons only
- Tablet: Side-by-side with abbreviated labels
- Desktop: Full controls with labels and configuration

## 6. Testing Strategy

### 6.1 Unit Tests
```typescript
// ExecutionControls.test.tsx
describe('ExecutionControls', () => {
  it('shows play button when idle')
  it('shows pause button when running')
  it('disables controls when stopped')
  it('updates state optimistically')
  it('handles API errors gracefully')
})
```

### 6.2 Integration Tests
```typescript
// execution-flow.test.ts
describe('Execution Flow', () => {
  it('starts execution on play')
  it('pauses mid-tick gracefully')
  it('resumes from pause correctly')
  it('stops and cleans up resources')
  it('handles multiple teams concurrently')
})
```

### 6.3 E2E Tests
- Start execution from dashboard
- Monitor tick progress
- Pause and resume
- Verify state persistence
- Test error recovery

## 7. Migration & Deployment

### 7.1 Database Migration
```typescript
// Migration script for existing stacks
await ctx.db.query('agent_stacks')
  .filter(q => q.eq(q.field('execution_state'), undefined))
  .collect()
  .then(stacks => {
    for (const stack of stacks) {
      await ctx.db.patch(stack._id, {
        execution_state: 'idle',
        last_activity_at: undefined,
        started_at: undefined,
        paused_at: undefined,
        stopped_at: undefined,
      })
    }
  })
```

### 7.2 Deployment Steps
1. Deploy database schema changes
2. Deploy Convex functions
3. Deploy execution service
4. Deploy dashboard updates
5. Verify existing teams unaffected
6. Monitor for errors

### 7.3 Rollback Plan
- Feature flag for new controls
- Keep CLI command functional
- Database fields nullable
- Gradual rollout by team

## 8. Future Enhancements

### 8.1 Phase 2 Features
- Batch controls (start/pause all)
- Execution scheduling
- Speed controls (slow/normal/fast)
- Breakpoints on specific events
- Step-through debugging mode

### 8.2 Phase 3 Features
- Execution history and replay
- Performance metrics dashboard
- Resource usage monitoring
- Auto-pause on errors
- Execution templates/presets

## 9. Success Metrics

### 9.1 Technical Metrics
- Control action latency < 500ms
- State sync accuracy 100%
- Zero data loss on pause/resume
- Memory usage stable over time

### 9.2 User Experience Metrics
- Reduced time to start execution
- Increased control granularity
- Better debugging capability
- Improved team management

## 10. Risk Assessment

### 10.1 Technical Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| State desync | Medium | High | Implement state reconciliation |
| Memory leaks | Low | High | Proper cleanup, monitoring |
| Concurrent control conflicts | Medium | Medium | Optimistic locking, queue controls |
| Service crash | Low | High | Auto-restart, state recovery |

### 10.2 User Experience Risks
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Accidental stop | Medium | Medium | Confirmation dialog |
| Confusion over states | Low | Low | Clear visual indicators |
| Performance degradation | Low | Medium | Limit concurrent executions |

## 11. Implementation Timeline

### Week 1
- Days 1-2: Backend infrastructure
- Days 3-4: Dashboard UI components
- Day 5: Initial integration

### Week 2
- Days 1-3: Execution service
- Days 4-5: Testing and bug fixes

### Week 3
- Days 1-2: Polish and edge cases
- Days 3-4: Documentation
- Day 5: Deployment preparation

## 12. Documentation Requirements

### 12.1 Technical Documentation
- API endpoint documentation
- Service architecture diagram
- Database schema changes
- Deployment procedures

### 12.2 User Documentation
- Feature overview
- Control descriptions
- State explanations
- Troubleshooting guide

## 13. Key Changes from Original Plan

### Simplified Execution Model
- **No tick counting**: Agents run continuously until paused or stopped
- **No interval configuration**: Agents execute at their natural pace
- **State-based control**: Simple running/paused/stopped states
- **Complete state preservation**: Resume exactly where paused

### Benefits of This Approach
1. **Simpler implementation**: No tick management complexity
2. **More natural execution**: Agents work at optimal speed
3. **Better user experience**: Clear Play/Pause semantics
4. **Easier debugging**: Execution state is straightforward
5. **Resource efficient**: No unnecessary delays between actions

## 14. Conclusion

This updated implementation plan provides a streamlined approach to adding Play/Pause functionality to the dashboard. By removing tick-based execution in favor of continuous processing with pause/resume capability, we achieve a more intuitive and efficient system.

Key success factors:
1. Simple state management (idle/running/paused/stopped)
2. Graceful pause that completes current action
3. Complete state preservation for seamless resume
4. Real-time status updates via Convex
5. Clear visual feedback in the dashboard

By following this plan, we'll transform agent execution from a CLI-driven process to a user-friendly, dashboard-controlled experience where agents can be started, paused, and resumed at will, maintaining their complete execution context throughout.