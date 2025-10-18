# Dashboard Play/Pause Implementation Plan

## Executive Summary
Replace CLI-based agent execution (`pnpm cli run <task_id>`) with dashboard-controlled Play/Pause functionality, allowing users to start, pause, and resume agent execution directly from the web interface.

## 1. Feature Requirements

### 1.1 Functional Requirements
- **Play Button**: Start or resume agent execution for a specific team
- **Pause Button**: Temporarily halt agent execution (preserve state)
- **Stop Button**: Permanently stop execution (optional, phase 2)
- **Execution Status Indicator**: Show current state (running/paused/stopped)
- **Multi-Team Control**: Independent control for each team
- **Tick Counter**: Display current tick count and progress
- **Configuration Controls**: Set interval and max ticks from dashboard

### 1.2 Non-Functional Requirements
- **Real-time Updates**: Status changes reflect immediately
- **Graceful Pause**: Complete current tick before pausing
- **State Persistence**: Maintain state across dashboard refreshes
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
│  │   - Configuration (interval, maxTicks)       │   │
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
│  │   - tick_count: number                      │   │
│  │   - max_ticks: number                       │   │
│  │   - interval_ms: number                     │   │
│  │   - last_tick_at: timestamp                 │   │
│  └─────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────┘
                       │ Query State
                       ▼
┌─────────────────────────────────────────────────────┐
│         Agent Execution Service (Node.js)           │
│  ┌─────────────────────────────────────────────┐   │
│  │   Execution Controller:                     │   │
│  │   - Polls execution_state from Convex       │   │
│  │   - Manages AgentStackOrchestrator          │   │
│  │   - Handles Play/Pause/Stop signals         │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 2.2 Data Flow

#### Play Action Flow:
1. User clicks Play button on dashboard
2. Dashboard calls Convex mutation `startExecution(stackId, config)`
3. Convex updates `execution_state` to 'running'
4. Execution Service detects state change
5. Service starts orchestrator tick loop
6. Each tick updates `tick_count` and `last_tick_at`
7. Dashboard reflects running state via subscription

#### Pause Action Flow:
1. User clicks Pause button
2. Dashboard calls Convex mutation `pauseExecution(stackId)`
3. Convex updates `execution_state` to 'paused'
4. Execution Service detects state change
5. Service completes current tick (if any)
6. Service suspends tick loop
7. Dashboard reflects paused state

## 3. Implementation Phases

### Phase 1: Backend Infrastructure (2-3 days)
1. **Database Schema Updates**
   - Extend `agent_stacks` table
   - Add execution control fields
   - Create migration script

2. **Convex API Endpoints**
   - `startExecution(stackId, config)`
   - `pauseExecution(stackId)`
   - `stopExecution(stackId)`
   - `getExecutionStatus(stackId)`
   - `updateTickCount(stackId, count)`

3. **Execution Service Refactor**
   - Create `ExecutionController` class
   - Implement state polling mechanism
   - Refactor orchestrator to support pause/resume
   - Add graceful shutdown handling

### Phase 2: Dashboard UI Components (2-3 days)
1. **Control Component**
   - Play/Pause toggle button
   - Stop button (confirmation dialog)
   - Configuration inputs (interval, max ticks)
   - Status indicator (with color coding)

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
     private intervals: Map<string, NodeJS.Timeout>

     async start(stackId: string) {
       const state = await getExecutionState(stackId)
       if (state.execution_state !== 'running') return

       const orchestrator = new AgentStackOrchestrator(stackId)
       await orchestrator.initialize()

       const interval = setInterval(async () => {
         const currentState = await getExecutionState(stackId)

         if (currentState.execution_state === 'paused') {
           // Skip tick but keep interval alive
           return
         }

         if (currentState.execution_state === 'stopped') {
           this.cleanup(stackId)
           return
         }

         await orchestrator.tick()
         await updateTickCount(stackId, orchestrator.tickCount)

         if (orchestrator.tickCount >= currentState.max_ticks) {
           await stopExecution(stackId)
           this.cleanup(stackId)
         }
       }, state.interval_ms)

       this.intervals.set(stackId, interval)
       this.orchestrators.set(stackId, orchestrator)
     }

     cleanup(stackId: string) {
       clearInterval(this.intervals.get(stackId))
       this.intervals.delete(stackId)
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

### 4.1 Database Schema Changes
```typescript
// packages/convex/convex/schema.ts
agent_stacks: defineTable({
  // Existing fields...

  // New execution control fields
  execution_state: v.union(
    v.literal('idle'),
    v.literal('running'),
    v.literal('paused'),
    v.literal('stopped')
  ),
  tick_count: v.number(),
  max_ticks: v.number(),
  interval_ms: v.number(),
  last_tick_at: v.optional(v.number()),
  started_at: v.optional(v.number()),
  paused_at: v.optional(v.number()),
  stopped_at: v.optional(v.number()),
})
```

### 4.2 Convex Mutations
```typescript
// packages/convex/convex/agents.ts

export const startExecution = mutation({
  args: {
    stackId: v.id('agent_stacks'),
    maxTicks: v.optional(v.number()),
    intervalMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { stackId, maxTicks = 100, intervalMs = 5000 } = args

    await ctx.db.patch(stackId, {
      execution_state: 'running',
      tick_count: 0,
      max_ticks: maxTicks,
      interval_ms: intervalMs,
      started_at: Date.now(),
      paused_at: undefined,
      stopped_at: undefined,
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
```

### 4.3 Dashboard Component
```tsx
// apps/dashboard/components/Controls/ExecutionControls.tsx

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Play, Pause, Square, Settings } from 'lucide-react'

export function ExecutionControls({ stackId }: { stackId: Id<'agent_stacks'> }) {
  const stack = useQuery(api.agents.getStack, { stackId })
  const start = useMutation(api.agents.startExecution)
  const pause = useMutation(api.agents.pauseExecution)
  const stop = useMutation(api.agents.stopExecution)

  const [config, setConfig] = useState({
    maxTicks: 100,
    intervalMs: 5000,
  })

  const handlePlay = async () => {
    await start({ stackId, ...config })
  }

  const handlePause = async () => {
    await pause({ stackId })
  }

  const handleStop = async () => {
    if (confirm('Stop execution? This cannot be undone.')) {
      await stop({ stackId })
    }
  }

  const isRunning = stack?.execution_state === 'running'
  const isPaused = stack?.execution_state === 'paused'
  const isStopped = stack?.execution_state === 'stopped'

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg">
      <div className="flex gap-2">
        {!isRunning && !isStopped && (
          <button
            onClick={handlePlay}
            className="p-2 bg-green-600 hover:bg-green-700 rounded"
          >
            <Play className="w-5 h-5" />
          </button>
        )}

        {isRunning && (
          <button
            onClick={handlePause}
            className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded"
          >
            <Pause className="w-5 h-5" />
          </button>
        )}

        {(isRunning || isPaused) && (
          <button
            onClick={handleStop}
            className="p-2 bg-red-600 hover:bg-red-700 rounded"
          >
            <Square className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className={`px-2 py-1 rounded ${
          isRunning ? 'bg-green-900 text-green-300' :
          isPaused ? 'bg-yellow-900 text-yellow-300' :
          isStopped ? 'bg-red-900 text-red-300' :
          'bg-gray-800 text-gray-400'
        }`}>
          {stack?.execution_state?.toUpperCase() || 'IDLE'}
        </span>

        <span className="text-gray-400">
          Tick {stack?.tick_count || 0} / {stack?.max_ticks || 100}
        </span>
      </div>

      {/* Configuration popover/modal */}
      {!isRunning && !isStopped && (
        <button className="p-2 text-gray-400 hover:text-gray-300">
          <Settings className="w-5 h-5" />
        </button>
      )}
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
- Progress bars for tick count
- Time elapsed display
- Estimated time remaining

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
```sql
-- Add default values for existing stacks
UPDATE agent_stacks SET
  execution_state = 'idle',
  tick_count = 0,
  max_ticks = 100,
  interval_ms = 5000
WHERE execution_state IS NULL;
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

## 13. Conclusion

This implementation plan provides a comprehensive approach to adding Play/Pause functionality to the dashboard. The phased approach ensures we can deliver value incrementally while maintaining system stability. The architecture leverages existing Convex infrastructure for real-time updates while adding minimal complexity to the system.

Key success factors:
1. Clean separation of concerns
2. Graceful state transitions
3. Real-time synchronization
4. Intuitive user interface
5. Robust error handling

By following this plan, we'll transform agent execution from a CLI-driven process to a user-friendly, dashboard-controlled experience that provides better visibility and control over the agent lifecycle.