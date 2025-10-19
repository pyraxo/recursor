# Cursor Agent Workflow System - Rollout Guide

## Overview

This document outlines the remaining implementation phases for measuring decision quality and rolling out the repository-based workflow system for Cursor agents.

**Status**: Phases 1-5 and 6.1 complete. This document covers Phases 6.2-6.4.

---

## Phase 6.2: Decision Quality Metrics

### Objective

Implement quantitative metrics to measure the quality of agent decisions and validate that workflow guides improve outcomes.

### Key Metrics to Track

#### 1. Phase Transition Metrics
```typescript
interface PhaseTransitionMetrics {
  // Timing metrics
  ticks_in_ideation: number;
  ticks_in_building: number;
  ticks_in_demo: number;
  total_ticks_to_complete: number;

  // Transition quality
  transition_justifications_provided: boolean[];
  premature_transitions: number; // Transitions before ready
  stuck_in_phase: boolean; // >5 ticks in same phase

  // Outcome
  reached_complete_phase: boolean;
  demo_ready_at_completion: boolean;
}
```

#### 2. Priority Scoring Metrics
```typescript
interface PriorityMetrics {
  // Distribution
  priority_variance: number; // Higher = better differentiation
  priority_distribution: Record<number, number>; // Count per priority level

  // Framework alignment
  setup_todos_avg_priority: number; // Should be 9-10
  core_feature_avg_priority: number; // Should be 7-9
  enhancement_avg_priority: number; // Should be 4-6
  polish_avg_priority: number; // Should be 1-3

  // Consistency
  priority_changes_per_todo: number; // Lower = more consistent
  framework_alignment_score: number; // 0-1, how well priorities match framework
}
```

#### 3. Scope Management Metrics
```typescript
interface ScopeManagementMetrics {
  // Time awareness
  time_mismatch_detected: boolean; // Did agent recognize being behind?
  time_mismatch_detection_tick: number; // How quickly recognized?

  // Scope cutting
  todos_cut: number;
  todos_cut_percentage: number;
  todos_cut_were_low_priority: boolean;

  // Outcome
  completed_on_time: boolean;
  final_completion_percentage: number;
}
```

#### 4. Communication Quality Metrics
```typescript
interface CommunicationMetrics {
  // Response metrics
  messages_received: number;
  messages_responded_to: number;
  response_latency_ticks: number[];

  // Quality scoring (manual or LLM-judged)
  tone_score: number; // 1-5: formal to conversational
  helpfulness_score: number; // 1-5
  context_awareness_score: number; // 1-5
  length_appropriateness: number; // 1-5
}
```

#### 5. Execution Log Metrics
```typescript
interface ExecutionLogMetrics {
  // Creation
  logs_created: number;
  logs_expected: number; // = total_ticks
  log_creation_rate: number; // logs_created / logs_expected

  // Quality
  template_sections_filled: number[];
  decisions_documented: boolean[];
  cross_tick_references: number; // References to previous logs

  // Utilization
  previous_logs_read: boolean[];
  learning_from_logs_evident: boolean; // Qualitative
}
```

### Implementation Steps

1. **Create Metrics Schema** (in `packages/convex/convex/schema.ts`):
```typescript
decision_quality_metrics: defineTable({
  stack_id: v.id("agent_stacks"),
  tick_number: v.number(),

  // Phase metrics
  current_phase: v.string(),
  phase_transition_occurred: v.boolean(),
  phase_transition_justified: v.optional(v.boolean()),

  // Priority metrics
  todos_created_this_tick: v.number(),
  priority_variance: v.number(),
  avg_priority_this_tick: v.optional(v.number()),

  // Scope metrics
  todos_deleted_this_tick: v.number(),
  time_elapsed_percent: v.number(),
  completion_estimate_percent: v.optional(v.number()),

  // Communication metrics
  messages_responded_to: v.number(),

  // Log metrics
  execution_log_created: v.boolean(),
  previous_logs_referenced: v.boolean(),

  timestamp: v.number(),
}).index("by_stack", ["stack_id"]),
```

2. **Add Metrics Collection to Orchestrator** (in `cursor-team-orchestrator.ts`):
```typescript
private async collectDecisionMetrics(
  tickNumber: number,
  todosCreated: number,
  todosDeleted: number,
  priorities: number[]
): Promise<void> {
  const variance = this.calculateVariance(priorities);
  const stack = await this.client.query(api.agents.getStack, {
    stackId: this.stackId,
  });

  await this.client.mutation(api.metrics.recordDecisionQuality, {
    stackId: this.stackId,
    tickNumber,
    currentPhase: stack?.phase || 'unknown',
    phaseTransitionOccurred: false, // Track from state changes
    todosCreatedThisTick: todosCreated,
    priorityVariance: variance,
    todosDeletedThisTick: todosDeleted,
    timeElapsedPercent: Math.round((tickNumber / 12) * 100),
    messagesRespondedTo: 0, // Track from communicator
    executionLogCreated: false, // Check workspace for log file
    previousLogsReferenced: false, // Parse prompt/log for references
    timestamp: Date.now(),
  });
}
```

3. **Create Metrics Queries** (in `packages/convex/convex/metrics.ts`):
```typescript
export const getDecisionQualityTimeline = query({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("decision_quality_metrics")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("asc")
      .collect();
  },
});

export const compareControlVsTreatment = query({
  args: {
    controlStackIds: v.array(v.id("agent_stacks")),
    treatmentStackIds: v.array(v.id("agent_stacks")),
  },
  handler: async (ctx, args) => {
    // Aggregate metrics for both groups
    const controlMetrics = await aggregateMetrics(ctx, args.controlStackIds);
    const treatmentMetrics = await aggregateMetrics(ctx, args.treatmentStackIds);

    return {
      control: controlMetrics,
      treatment: treatmentMetrics,
      improvement: calculateImprovement(controlMetrics, treatmentMetrics),
    };
  },
});
```

---

## Phase 6.3: Decision Quality Dashboard

### Objective

Create a real-time dashboard to visualize decision quality metrics and compare control vs. treatment groups during A/B testing.

### Dashboard Components

#### 1. Overview Panel
- Current active teams (control vs. treatment count)
- Average metrics across all teams
- Statistical significance indicators

#### 2. Phase Transition Chart
- Timeline showing phase transitions for each team
- Comparison: control vs. treatment transition speed
- Highlight premature/delayed transitions

#### 3. Priority Distribution
- Histogram of priority scores (1-10)
- Variance comparison
- Framework alignment heatmap

#### 4. Scope Management Timeline
- Time elapsed vs. completion chart
- Scope cut events marked
- Success/failure outcomes

#### 5. Communication Quality
- Response latency trends
- Tone/helpfulness scores
- Message volume over time

#### 6. Execution Log Health
- Log creation rate
- Template completeness
- Cross-reference frequency

### Implementation Location

Add to `apps/dashboard/components/Metrics/`:

```
Metrics/
├── DecisionQualityDashboard.tsx    # Main dashboard
├── PhaseTransitionChart.tsx        # Phase visualization
├── PriorityDistribution.tsx        # Priority metrics
├── ScopeManagementTimeline.tsx     # Scope tracking
├── CommunicationQuality.tsx        # Communication metrics
├── ExecutionLogHealth.tsx          # Log metrics
└── ABComparisonPanel.tsx           # Control vs. treatment
```

### Key Visualizations

1. **Phase Flow Diagram**
```typescript
// Using Recharts or similar
<AreaChart data={phaseData}>
  <Area dataKey="control" stroke="#8884d8" fill="#8884d8" />
  <Area dataKey="treatment" stroke="#82ca9d" fill="#82ca9d" />
</AreaChart>
```

2. **Priority Heatmap**
```typescript
// Priority distribution comparison
<HeatMap
  rows={['Control', 'Treatment']}
  columns={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
  data={priorityDistribution}
  colorScale="YlOrRd"
/>
```

3. **Time Management Quadrant**
```typescript
// Scatter plot: time elapsed vs. completion
<ScatterChart>
  <Scatter name="On Track" data={onTrackTeams} fill="#00C49F" />
  <Scatter name="Behind" data={behindTeams} fill="#FF8042" />
  <ReferenceLine x={70} y={70} stroke="red" /> // Danger zone
</ScatterChart>
```

---

## Phase 6.4: Gradual Rollout Plan

### Objective

Safely roll out the workflow guide system to production with monitoring and rollback capabilities.

### Rollout Stages

#### Stage 1: Internal Testing (Week 1)
**Scope**: Development teams only
**Teams**: 5 control, 5 treatment
**Feature Flag**: `use_workflow_guides = false` for control, `true` for treatment

**Success Criteria**:
- No critical bugs or crashes
- Treatment group shows ≥20% improvement in ≥3 metrics
- No regressions in any metric

**Actions**:
- Monitor dashboard daily
- Collect qualitative feedback
- Document issues and improvements

#### Stage 2: Pilot Rollout (Week 2)
**Scope**: 25% of new teams
**Teams**: 10 control, 10 treatment
**Feature Flag**: Randomized assignment (75% baseline, 25% guides)

**Success Criteria**:
- Metrics improvements hold at scale
- Performance acceptable (no latency issues)
- Positive user feedback

**Actions**:
- Weekly metric reviews
- Address any performance bottlenecks
- Refine workflow guides based on learnings

#### Stage 3: Expanded Rollout (Week 3)
**Scope**: 50% of new teams
**Feature Flag**: 50/50 split

**Success Criteria**:
- Statistical significance achieved
- Dashboard shows consistent improvement
- No major issues reported

**Actions**:
- Prepare for full rollout
- Document best practices
- Train team on guide maintenance

#### Stage 4: Full Rollout (Week 4)
**Scope**: 100% of new teams
**Feature Flag**: `use_workflow_guides = true` (default)

**Success Criteria**:
- Smooth transition
- Metrics maintain improvement
- System stable

**Actions**:
- Monitor for 1 week
- Deprecate baseline prompt (keep for emergencies)
- Celebrate success!

### Rollback Plan

**Trigger Conditions**:
- Critical bug affecting >10% of teams
- Metric regression >20% from baseline
- Performance degradation (latency >2x)
- User complaints indicating quality issues

**Rollback Process**:
1. Set feature flag to `false` for all new teams
2. Investigate root cause
3. Fix issues in guides or implementation
4. Re-test with small group
5. Resume rollout from appropriate stage

### Monitoring During Rollout

**Real-Time Alerts**:
- Error rate >5%
- Phase stuck >8 ticks
- Log creation rate <50%
- Response latency >10 seconds

**Daily Reviews**:
- Metric dashboard review
- User feedback triage
- Performance monitoring
- Incident tracking

**Weekly Reports**:
- Aggregate metrics comparison
- Success rate by scenario
- Issues resolved vs. outstanding
- Rollout progress update

---

## Integration with Existing Systems

### Convex Integration

The metrics and feature flag system integrates seamlessly with existing Convex infrastructure:

1. **Schema Extensions**: Add new tables without breaking existing data
2. **Queries**: Leverage existing real-time query system
3. **Mutations**: Use existing mutation patterns for metrics collection
4. **Indexes**: Optimize queries with proper indexing

### Dashboard Integration

Add new routes and components to existing dashboard:

```typescript
// apps/dashboard/app/metrics/page.tsx
export default function MetricsPage() {
  return (
    <div>
      <DecisionQualityDashboard />
      <ABComparisonPanel />
    </div>
  );
}
```

### Orchestrator Integration

Metrics collection happens automatically during tick execution:

```typescript
async runTick(): Promise<void> {
  const tickNumber = this.getTickNumber();

  // ... existing tick logic ...

  // Collect metrics after tick completes
  await this.collectDecisionMetrics(
    tickNumber,
    todosCreated,
    todosDeleted,
    currentPriorities
  );
}
```

---

## Success Metrics

### Quantitative

- ≥30% faster phase transitions
- ≥40% higher priority variance
- ≥50% better scope management recognition
- ≥80% execution log creation rate
- No performance regressions

### Qualitative

- Agents make more strategic decisions
- Clearer reasoning in execution logs
- Better communication with users
- More consistent behavior across teams
- Easier to debug and understand agent thinking

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| 1: Workflow Guides | 2 days | ✅ Complete |
| 2: Workspace Setup | 1 day | ✅ Complete |
| 3: Prompt Refactoring | 1 day | ✅ Complete |
| 4: Meta-Learning | 1 day | ✅ Complete |
| 5: Testing Plan | 1 day | ✅ Complete |
| 6.1: Feature Flag | 1 day | ✅ Complete |
| 6.2: Metrics | 2 days | 📝 Documented |
| 6.3: Dashboard | 3 days | 📝 Documented |
| 6.4: Rollout | 4 weeks | 📝 Documented |

**Total Time**: ~2 weeks development + 4 weeks rollout = ~6 weeks

---

## Next Steps

1. **Immediate** (this week):
   - Review this rollout guide
   - Prioritize Phase 6.2 (metrics)
   - Begin schema design

2. **Short-term** (next week):
   - Implement metrics collection
   - Create basic dashboard
   - Run internal tests (Stage 1)

3. **Medium-term** (weeks 3-4):
   - Refine dashboard
   - Begin pilot rollout (Stage 2)
   - Collect data for statistical analysis

4. **Long-term** (weeks 5-6):
   - Expand rollout (Stage 3)
   - Achieve full rollout (Stage 4)
   - Document learnings and best practices

---

## Maintenance Plan

### Guide Updates

Workflow guides should be versioned and updated based on:
- Agent performance patterns
- User feedback
- New scenarios discovered
- Framework refinements

**Process**:
1. Identify improvement opportunity
2. Update guide in `packages/agent-engine/src/cursor/workflow-guides/`
3. Test with small group
4. Deploy to all teams
5. Monitor metrics for impact

### Metric Refinement

As we learn more, metrics may need adjustment:
- Add new metrics for discovered patterns
- Remove metrics that don't correlate with success
- Adjust thresholds based on actual performance
- Add new visualizations to dashboard

---

**Last Updated**: 2025-10-19
**Version**: 1.0
**Status**: Ready for Phase 6.2 implementation
**Owner**: Engineering Team
