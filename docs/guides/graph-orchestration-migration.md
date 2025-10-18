# Autonomous Orchestration Deployment Guide

**Last Updated:** 2025-10-18
**Status:** ✅ Ready for Deployment

**⚠️ IMPORTANT:** This system is **fully autonomous only**. All legacy round-robin code and feature flags have been removed. There is no gradual migration - all stacks will use intelligent graph-based orchestration immediately upon deployment.

---

## Overview

The autonomous graph-based orchestration system has been fully implemented. This guide covers:

1. **Architecture**: What changed and why
2. **Deployment Process**: Single deployment for all stacks
3. **Monitoring**: How to track performance
4. **Issue Response**: How to handle problems if they arise

---

## What Changed?

### Before (Legacy Round-Robin) - REMOVED
```
Cron (5s) → Execute ONE agent (P/B/C/R) → Wait → Next agent
```

**Problems that existed:**
- ❌ Ran agents even when no work available
- ❌ Fixed sequential order (couldn't prioritize)
- ❌ No parallelization
- ❌ Time-based (not need-based)

**This code has been completely removed.**

### After (Autonomous Graph-Based Orchestration) - CURRENT
```
Orchestrator → Detect Work → Build Graph → Execute in Parallel Waves → Decide
```

**Benefits:**
- ✅ Only runs agents with actual work
- ✅ Dynamic priority-based execution
- ✅ Parallel execution (multiple agents at once)
- ✅ Need-based (intelligent pausing)
- ✅ Adaptive timing (adjusts based on activity)
- ✅ Fully autonomous (no configuration needed)

---

## System Architecture

### Core Components

**1. Work Detection System**
- `packages/convex/convex/lib/orchestration/workDetection.ts`
- Analyzes todos, messages, artifacts, agent states
- Returns work status with priority levels (0-10)
- Cached for performance (5 second TTL)

**2. Graph Execution Engine**
- `packages/convex/convex/lib/orchestration/graphExecution.ts`
- Builds execution graphs from work status
- Computes parallel execution waves
- Handles dependencies and failures

**3. Orchestrator Core**
- `packages/convex/convex/lib/orchestration/orchestrator.ts`
- Main decision-making engine
- Determines next action (continue/pause/stop)
- Adaptive pause duration based on activity

**4. Public API Layer**
- `packages/convex/convex/orchestration.ts`
- Cron-callable functions
- State management mutations
- Performance optimization (caching)

### Data Flow

```
┌─────────────┐
│  Cron (5s)  │
└──────┬──────┘
       │
       ▼
┌──────────────────────────────────────┐
│ scheduledOrchestrator (checks stacks)│
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ executeOrchestratorCycle             │
│  ├─ detectWorkForAgents              │
│  ├─ buildExecutionGraph              │
│  ├─ executeGraph (parallel waves)    │
│  └─ decideNextAction                 │
└──────────────┬───────────────────────┘
               │
      ┌────────┴─────────┐
      │                  │
      ▼                  ▼
   Continue           Pause
   (immediate)     (wait for cron)
```

---

## Deployment Process

### Step 1: Deploy (Day 1)

**Goal:** Deploy autonomous orchestration for all stacks

```bash
# Deploy Convex functions
cd packages/convex
pnpm convex deploy
```

**What happens:**
- ✅ New tables created (orchestrator_executions, execution_graphs, work_detection_cache)
- ✅ Autonomous orchestrator cron job registered (every 5s)
- ✅ Legacy round-robin cron removed
- ✅ All running stacks immediately use autonomous orchestration
- ✅ No configuration or manual enablement needed

**Verify:**
```bash
# Check Convex dashboard
# - New tables should appear in schema
# - Single cron job "autonomous orchestrator" should be visible
# - No legacy cron jobs should remain
```

---

### Step 2: Monitor All Stacks (Day 1-2)

**Goal:** Verify autonomous orchestration working for all stacks

**Via Dashboard (Primary Method):**

1. Open the **Dashboard** at `http://localhost:3002`
2. For each running team:
   - Click on the team name to view details
   - Navigate to the **Orchestration** tab
   - Review the statistics cards:
     - **Total Cycles**: Should be increasing over time
     - **Avg Duration**: Should be reasonable (1-10 seconds)
     - **Parallel Exec**: Should show > 1.0 for efficiency
     - **Success Rate**: Should be > 95%
   - Check **Work Detection Status**:
     - Verify agents showing appropriate priorities
     - Confirm reasons make sense for current stack state
   - Review **Recent Orchestration Cycles**:
     - Look for successful completions
     - Check for any errors or stuck cycles
     - Verify decisions (continue/pause) are appropriate

**Via Convex Dashboard (Database Level):**

```sql
-- Recent orchestrator executions
SELECT * FROM orchestrator_executions
ORDER BY started_at DESC
LIMIT 100;

-- Check for failures
SELECT status, COUNT(*) as count
FROM orchestrator_executions
WHERE started_at > NOW() - INTERVAL 24 HOUR
GROUP BY status;

-- View execution graphs
SELECT * FROM execution_graphs
ORDER BY created_at DESC
LIMIT 50;
```

**Success Criteria:**
- ✅ Orchestrator cycles completing successfully for all stacks
- ✅ Agents executing when work detected
- ✅ Parallel execution happening (visible in Orchestration tab)
- ✅ No significant error increase (check stats)
- ✅ Todos being created/completed normally (visible in Todos tab)

---

### Step 3: Performance Validation (Week 1)

**Key Metrics to Track:**

1. **Orchestration Cycle Performance**
```sql
-- Average cycle duration
SELECT
  AVG(completed_at - started_at) as avg_duration_ms,
  COUNT(*) as total_cycles
FROM orchestrator_executions
WHERE status = 'completed'
  AND started_at > NOW() - INTERVAL 1 DAY;
```

2. **Work Detection Efficiency**
```sql
-- How often is work detected?
SELECT
  (planner_has_work OR builder_has_work OR
   communicator_has_work OR reviewer_has_work) as has_work,
  COUNT(*) as count
FROM work_detection_cache
WHERE computed_at > NOW() - INTERVAL 1 DAY
GROUP BY has_work;
```

3. **Parallel Execution Utilization**
```sql
-- Check parallel execution stats
SELECT
  graph_summary->>'parallel_executions' as max_parallel,
  COUNT(*) as count
FROM orchestrator_executions
WHERE graph_summary IS NOT NULL
GROUP BY max_parallel
ORDER BY max_parallel DESC;
```

4. **Error Rates**
```sql
-- Compare error rates
SELECT
  status,
  COUNT(*) as count
FROM orchestrator_executions
WHERE started_at > NOW() - INTERVAL 1 DAY
GROUP BY status;
```

---

## Issue Response Procedure

**Note:** There is no rollback to legacy mode since all legacy code has been removed.

### If Issues Are Detected

**Strategy:** Pause affected stacks, investigate, fix, and resume.

### Emergency Response (Pause Affected Stacks)

**Via Dashboard (Recommended):**

1. Navigate to the **Dashboard** at `http://localhost:3002`
2. Select the problematic team from the list
3. Click the **Pause** button in the Execution Controls section
4. The stack will pause immediately and display status change

**Via CLI (Alternative):**

```bash
# Pause a specific stack
pnpm convex run agents:pauseExecution '{"stackId":"j97abc123..."}'

# Or pause multiple stacks programmatically
# (Create a script in your project)
```

### Investigation Tools

**Via Dashboard (Recommended):**

1. Navigate to the team's detail page
2. Click the **Orchestration** tab to view:
   - **Statistics**: Total cycles, average duration, success rate
   - **Work Detection Status**: Current priorities for all agents
   - **Recent Executions**: Detailed cycle history with timing and decisions
3. Use the filters and time range selectors to analyze patterns

**Via Convex Queries (Advanced):**

The dashboard uses these public queries that you can also call directly:

```typescript
// 1. Check orchestrator executions for patterns
const executions = await convex.query(api.orchestration.getRecentExecutions, {
  stackId: "problematic_stack_id",
  limit: 20
});

// 2. Get work detection status
const workStatus = await convex.query(api.orchestration.getWorkDetectionStatus, {
  stackId: "problematic_stack_id"
});

// 3. Get orchestration statistics
const stats = await convex.query(api.orchestration.getOrchestrationStats, {
  stackId: "problematic_stack_id",
  timeRangeMs: 24 * 60 * 60 * 1000 // Last 24 hours
});

// 4. Examine execution graphs (for debugging)
const graphs = await convex.query(api.orchestration.getExecutionGraphs, {
  stackId: "problematic_stack_id",
  limit: 10
});
```

### Fix and Resume

**Via Dashboard (Recommended):**

1. After deploying your hotfix to Convex
2. Navigate to the paused team's page
3. Click the **Resume** button in the Execution Controls section
4. Monitor the Orchestration tab for normal activity

**Via CLI (Alternative):**

```bash
# Resume a specific stack
pnpm convex run agents:resumeExecution '{"stackId":"j97abc123..."}'
```

**Data Preservation:**
- ✅ All orchestration data retained during pause
- ✅ Agent traces preserved for debugging
- ✅ No data loss
- ✅ Execution resumes from last successful state

---

## Debugging & Troubleshooting

### Check Orchestrator Activity

**Via Dashboard:**
1. Navigate to team detail page
2. Go to **Orchestration** tab
3. View **Recent Orchestration Cycles** section
4. Click on individual cycles to see details

**Via Code:**
```typescript
// Get recent orchestrator executions for a stack
const executions = await convex.query(
  api.orchestration.getRecentExecutions,
  { stackId: "j97abc123...", limit: 10 }
);
```

### View Work Detection Status

**Via Dashboard:**
1. Navigate to team detail page
2. Go to **Orchestration** tab
3. View **Work Detection Status** section
4. See real-time priorities and reasons for all agents

**Via Code:**
```typescript
// Get current work detection status
const workStatus = await convex.query(
  api.orchestration.getWorkDetectionStatus,
  { stackId: "j97abc123..." }
);

console.log("Planner:", {
  hasWork: workStatus.planner.hasWork,
  priority: workStatus.planner.priority,
  reason: workStatus.planner.reason
});
```

### View Execution Graphs

**Via Code (Advanced Debugging):**
```typescript
// Get execution graph details
const graphs = await convex.query(
  api.orchestration.getExecutionGraphs,
  { stackId: "j97abc123..." }
);

// Analyze graph structure
for (const graph of graphs) {
  console.log("Graph nodes:", graph.graph.nodes);
  console.log("Metadata:", graph.graph.metadata);
}
```

### Common Issues

**Issue 1: Orchestrator not running**
```
Symptom: No cycles appearing in Orchestration tab
Dashboard Check:
  1. Go to Orchestration tab
  2. Check if "Total Cycles" is 0 or not increasing
  3. Verify execution state is "running" (check ExecutionControls)
Fix:
  - Ensure stack execution state is "running"
  - Check Convex dashboard cron jobs are active
  - Review browser console for errors
```

**Issue 2: Agents not executing**
```
Symptom: Cycles running but no agent activity
Dashboard Check:
  1. Go to Orchestration tab
  2. Check Work Detection Status section
  3. See if hasWork is always false for all agents
Debug:
  - Review Todos tab - are there pending todos?
  - Check Project tab - is there a project idea?
  - View Messages tab - are there unread messages?
Fix: May need to adjust work detection thresholds
```

**Issue 3: Too many parallel executions**
```
Symptom: System overload, API rate limits
Dashboard Check:
  1. Go to Orchestration tab
  2. Look at "Parallel Exec" statistic
  3. Check Recent Cycles for parallel execution counts
Fix: Adjust priority thresholds in lib/orchestration/workDetection.ts
```

**Issue 4: High failure rate**
```
Symptom: Success Rate < 90% in dashboard
Dashboard Check:
  1. Go to Orchestration tab
  2. Review "Success Rate" statistic
  3. Look at Recent Cycles for error messages
Debug:
  - Click on failed cycles to see error details
  - Check agent traces for specific errors
  - Review Convex logs for infrastructure issues
```

---

## Performance Benchmarks

### Expected Improvements

| Metric | Legacy (Before) | Graph (After) | Improvement |
|--------|----------------|---------------|-------------|
| Idle executions | ~40% of cycles | <5% of cycles | **87% reduction** |
| Agent response time | 5-20 seconds | 1-8 seconds | **60% faster** |
| Parallel utilization | 0% (sequential) | 30-50% | **+40% efficiency** |
| Resource usage | Fixed (high) | Adaptive (lower) | **30% cost savings** |

### Actual Results (Update after testing)

| Metric | Legacy | Graph | Improvement |
|--------|---------|-------|-------------|
| Idle executions | TBD | TBD | TBD |
| Agent response time | TBD | TBD | TBD |
| Parallel utilization | TBD | TBD | TBD |

---

## Next Steps

### Week 1: Deployment & Monitoring
- [ ] Deploy autonomous orchestration
- [ ] Monitor all stacks for 48 hours
- [ ] Validate performance metrics
- [ ] Confirm parallel execution working

### Week 2: Optimization
- [ ] Collect performance data
- [ ] Tune work detection thresholds if needed
- [ ] Optimize cache duration based on patterns
- [ ] Adjust pause durations if needed

### Week 3: Dashboard Integration
- [ ] Visualize execution graphs in dashboard
- [ ] Show work detection status per stack
- [ ] Display parallel execution metrics
- [ ] Add orchestration performance charts

### Week 4: Documentation & Training
- [ ] Create operational runbook
- [ ] Document common troubleshooting scenarios
- [ ] Train team on autonomous system
- [ ] Share performance improvements with stakeholders

---

## Support & Questions

**Slack Channel:** #graph-orchestration
**Documentation:** `/docs/analysis/convex-graph-orchestration-feasibility.md`
**Code Location:** `packages/convex/convex/lib/orchestration/`

**Key Contacts:**
- Architecture questions: [Team Lead]
- Performance issues: [DevOps]
- Bug reports: GitHub Issues

---

## Appendix: Quick Reference

### Dashboard Locations

**Execution Controls:**
- Location: Top of team detail page
- Actions: Start, Pause, Resume, Stop
- Displays: Execution state, activity indicator, time elapsed

**Orchestration Tab:**
- Location: Team detail page > Orchestration tab
- Sections:
  - Statistics cards (cycles, duration, parallel exec, success rate)
  - Work Detection Status (current priorities for all agents)
  - Recent Orchestration Cycles (execution history with details)

### Available Public Queries

```typescript
import { api } from "@recursor/convex/_generated/api";

// Get recent orchestrator executions
api.orchestration.getRecentExecutions({ stackId, limit: 20 })

// Get work detection status
api.orchestration.getWorkDetectionStatus({ stackId })

// Get orchestration statistics
api.orchestration.getOrchestrationStats({ stackId, timeRangeMs: 86400000 })

// Get execution graphs (advanced)
api.orchestration.getExecutionGraphs({ stackId, limit: 10 })
```

### CLI Commands (Alternative Access)

```bash
# Pause a stack
pnpm convex run agents:pauseExecution '{"stackId":"j97abc123..."}'

# Resume a stack
pnpm convex run agents:resumeExecution '{"stackId":"j97abc123..."}'

# Check execution status
pnpm convex run agents:getExecutionStatus '{"stackId":"j97abc123..."}'

# Query orchestration stats (via Convex CLI)
pnpm convex run orchestration:getOrchestrationStats '{"stackId":"j97abc123..."}'
```

### Monitoring Best Practices

1. **Daily Health Check**:
   - Open dashboard
   - Review all teams' Orchestration tabs
   - Look for success rates > 95%
   - Check for any stuck cycles

2. **Weekly Analysis**:
   - Compare parallel execution metrics
   - Review average cycle duration trends
   - Analyze work detection patterns
   - Identify optimization opportunities

3. **Issue Response**:
   - Pause affected stack immediately
   - Review Orchestration tab for patterns
   - Check work detection status
   - Deploy fix and resume

---

**Document Version:** 2.0
**Architecture:** Fully Autonomous (no feature flags, no legacy code)
**Implementation Status:** ✅ Complete - Ready for Deployment
**Next Review:** After 1 week of production use
