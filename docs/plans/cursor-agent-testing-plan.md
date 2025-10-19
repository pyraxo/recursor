# Cursor Agent Testing Plan

## Overview

This document outlines the comprehensive testing strategy for the repository-based workflow system for Cursor agents. The goal is to validate that the workflow guides and decision frameworks lead to better decision-making compared to the baseline approach.

---

## Test Scenarios

### Scenario 1: Fresh Project Start (Ideation → Building)

**Objective**: Validate that the agent can effectively move from ideation to building with proper planning.

**Setup**:
- Create new cursor team: "TestTeam-Scenario1"
- Set initial phase: "ideation"
- No existing todos or artifacts

**Success Criteria**:
1. Agent creates a clear, specific project description within 2 ticks
2. Agent transitions to "building" phase by tick 3
3. Agent creates 4-6 prioritized todos before building
4. Priorities follow the 1-10 framework (setup = 10, core features = 7-9)
5. Agent commits initial project structure by tick 4

**Evaluation Metrics**:
- Time to first build: ≤ 4 ticks
- Quality of project description: Specific, feasible, hackathon-appropriate
- Todo priority distribution: Follows framework guidelines
- Phase transition timing: Appropriate (not stuck in ideation)

**A/B Comparison**:
- **Control Group**: Same scenario without workflow guides (baseline prompt)
- **Treatment Group**: With workflow guides
- **Comparison Metrics**:
  - Ticks to building phase
  - Number of todos created
  - Priority score variance
  - Project description specificity score (1-5)

---

### Scenario 2: Mid-Project Scope Cut (Time Pressure)

**Objective**: Validate that the agent recognizes time pressure and cuts scope appropriately.

**Setup**:
- Create cursor team: "TestTeam-Scenario2"
- Pre-populate:
  - Phase: "building"
  - Current tick: 8 (simulated via total_prompts_sent = 7)
  - 8 pending todos (mix of priorities)
  - 2 completed artifacts
  - Estimated completion: 50%

**Success Criteria**:
1. Agent reads `frameworks/scope-management.md`
2. Agent recognizes time/completion mismatch (70% time, 50% complete)
3. Agent deletes 4+ low-priority todos
4. Agent recommends phase transition to "demo"
5. Agent creates new polish-focused todos

**Evaluation Metrics**:
- Recognition of time pressure: Binary (yes/no)
- Number of todos cut: ≥ 4
- New todos focus on polish: ≥ 50% of new todos
- Phase transition recommended: yes

**A/B Comparison**:
- **Control**: Same scenario without guides
- **Treatment**: With guides
- **Metrics**:
  - Time pressure recognition rate
  - Scope cut aggressiveness (% todos deleted)
  - Phase transition decision
  - Explanation quality (references to framework)

---

### Scenario 3: Stuck on Blocker (Pivot Decision)

**Objective**: Validate that the agent can recognize blockers and pivot appropriately.

**Setup**:
- Create cursor team: "TestTeam-Scenario3"
- Pre-populate:
  - Phase: "building"
  - Current tick: 5
  - Same in_progress todo for 2 ticks: "Implement blockchain integration"
  - No new commits for 2 ticks
  - Messages: User asking "How's the blockchain integration going?"

**Success Criteria**:
1. Agent recognizes being stuck (same todo for 2+ ticks)
2. Agent deletes or modifies the blocker todo
3. Agent creates simpler alternative approach
4. Agent responds to user message honestly about pivot
5. Agent makes progress on alternative by next tick

**Evaluation Metrics**:
- Blocker recognition: Binary (yes/no)
- Pivot decision: Binary (yes/no)
- Alternative approach quality: Simpler than original
- User communication honesty: Acknowledges issue

**A/B Comparison**:
- **Control**: Without guides
- **Treatment**: With guides
- **Metrics**:
  - Blocker recognition rate
  - Pivot speed (ticks to pivot)
  - Alternative simplicity score (1-5)
  - User message quality

---

### Scenario 4: Phase Transitions (Complete Lifecycle)

**Objective**: Validate proper phase transitions through the complete project lifecycle.

**Setup**:
- Create cursor team: "TestTeam-Scenario4"
- Let agent run for full 12 ticks
- Minimal human intervention

**Success Criteria**:
1. Ideation → Building: Ticks 2-3
2. Building → Demo: Ticks 7-9
3. Demo → Complete: Ticks 11-12
4. Each transition has clear justification
5. Project reaches "complete" with demo-ready artifact

**Evaluation Metrics**:
- Phase transition timing: Within expected ranges
- Transition justifications: Reference frameworks
- Final artifact quality: Demo-ready (subjective 1-5 score)
- Time in each phase: Reasonable distribution

**A/B Comparison**:
- **Control**: Without guides (may get stuck in phases)
- **Treatment**: With guides
- **Metrics**:
  - Phase transition success rate
  - Time distribution across phases
  - Final completion rate
  - Justification quality

---

### Scenario 5: Communication Quality (User Interaction)

**Objective**: Validate natural, helpful communication following the guides.

**Setup**:
- Create cursor team: "TestTeam-Scenario5"
- Simulate user messages at ticks 3, 6, 9:
  - Tick 3: "What are you building?"
  - Tick 6: "Can you add dark mode?"
  - Tick 9: "This looks great! When will it be done?"

**Success Criteria**:
1. All messages get responses within 1 tick
2. Responses are conversational (not formal)
3. Responses are 2-3 sentences (not verbose)
4. Feature request (dark mode) acknowledged with priority context
5. Timeline question answered with honest estimate

**Evaluation Metrics**:
- Response latency: ≤ 1 tick
- Response tone: Conversational score (1-5)
- Response length: 2-3 sentences
- Context awareness: References project state

**A/B Comparison**:
- **Control**: Without communication guide
- **Treatment**: With communication guide
- **Metrics**:
  - Tone score (formality vs. conversational)
  - Length (word count)
  - Context relevance score
  - User satisfaction proxy (simulated)

---

### Scenario 6: Execution Log Creation

**Objective**: Validate that agents create and use execution logs.

**Setup**:
- Create cursor team: "TestTeam-Scenario6"
- Run for 3 ticks
- Check for log files

**Success Criteria**:
1. Log file created by end of tick 1: `logs/tick-001.md`
2. Log follows template structure
3. Log contains decisions made in that tick
4. Tick 2 references tick 1 log in planning
5. Tick 3 references previous logs in planning

**Evaluation Metrics**:
- Log creation rate: 100%
- Template compliance: Binary (yes/no)
- Content quality: Contains decisions, learnings, issues
- Cross-tick references: Binary (yes/no)

**A/B Comparison**:
- **Control**: Without execution log instructions
- **Treatment**: With execution log instructions
- **Metrics**:
  - Log creation rate (0-100%)
  - Log quality score (1-5)
  - Cross-reference frequency
  - Decision consistency across ticks

---

### Scenario 7: Priority Scoring Consistency

**Objective**: Validate that priority scoring follows the 1-10 framework.

**Setup**:
- Create cursor team: "TestTeam-Scenario7"
- Run for 5 ticks
- Track all todo priorities

**Success Criteria**:
1. Setup/infrastructure todos: Priority 9-10
2. Core feature todos: Priority 7-9
3. Enhancement todos: Priority 4-6
4. Polish todos: Priority 1-3
5. No arbitrary priorities (e.g., all 5s)

**Evaluation Metrics**:
- Priority distribution: Matches framework
- Priority variance: High (indicates differentiation)
- Setup priority average: ≥ 9
- Polish priority average: ≤ 3

**A/B Comparison**:
- **Control**: Without priority framework
- **Treatment**: With priority framework
- **Metrics**:
  - Priority variance (higher = better differentiation)
  - Framework alignment score
  - Priority change frequency
  - Work order correctness (high priority first)

---

## A/B Testing Framework

### Methodology

**Parallel Execution**:
1. Create pairs of identical teams (Control + Treatment)
2. Initialize with same scenario setup
3. Run both teams for same duration
4. Collect metrics independently
5. Compare outcomes

**Control Group Setup**:
- Use baseline prompt (without workflow guide references)
- No execution log instructions
- No framework references
- Generic multi-role instructions

**Treatment Group Setup**:
- Full workflow guide system
- Guide references in prompt
- Execution log instructions
- Framework-based decision making

### Statistical Analysis

**Sample Size**:
- Minimum 3 runs per scenario per group (6 total per scenario)
- Recommended 5 runs for higher confidence (10 total per scenario)

**Metrics Collection**:
```json
{
  "scenario_id": "scenario-1-run-3",
  "group": "treatment",
  "timestamp": "2025-10-19T12:00:00Z",
  "metrics": {
    "ticks_to_building": 3,
    "todos_created": 5,
    "priority_variance": 2.8,
    "project_specificity": 4,
    "phase_transitions": 3,
    "scope_cuts": 2,
    "log_creation_rate": 1.0,
    "communication_tone": 4.5,
    "final_completion": true
  }
}
```

**Comparison Criteria**:
- **Significant Improvement**: Treatment > Control by ≥20%
- **Marginal Improvement**: Treatment > Control by 10-20%
- **No Difference**: Within ±10%
- **Regression**: Treatment < Control by >10%

---

## Manual Testing Checklist

### Pre-Test Setup

- [ ] Create fresh Convex deployment or reset test environment
- [ ] Verify workflow guides exist in agent-engine package
- [ ] Confirm workspace manager has guide setup logic
- [ ] Check orchestrator prompt includes guide references
- [ ] Prepare test data (project ideas, todos, messages)

### During Test Execution

**Tick-by-Tick Monitoring**:
- [ ] Tick 1: Check for execution log creation
- [ ] Tick 2: Verify log reading (check for references)
- [ ] Tick 3: Validate phase transition decision
- [ ] Tick 5: Check priority scoring consistency
- [ ] Tick 8: Assess time management awareness
- [ ] Tick 12: Verify completion status

**Workspace Verification**:
- [ ] `docs/cursor-agent/` directory exists
- [ ] All 4 workflow guides present
- [ ] All 4 framework guides present
- [ ] 5 example files present
- [ ] Execution template present
- [ ] README.md present and accurate

**Git Activity**:
- [ ] Regular commits (every 1-2 ticks)
- [ ] Semantic commit messages
- [ ] Log files committed
- [ ] Branch up to date

### Post-Test Analysis

**Qualitative Review**:
- [ ] Read execution logs for coherence
- [ ] Check if decisions reference frameworks
- [ ] Assess overall project quality
- [ ] Review communication naturalness
- [ ] Evaluate scope management decisions

**Quantitative Metrics**:
- [ ] Calculate metrics per scenario
- [ ] Compare control vs. treatment
- [ ] Compute statistical significance (if sample size sufficient)
- [ ] Document regression issues

**Decision Quality Assessment**:
- [ ] Phase transitions: Timely and justified (1-5 scale)
- [ ] Priority scoring: Consistent with framework (1-5 scale)
- [ ] Scope management: Appropriate cuts (1-5 scale)
- [ ] Communication: Natural and helpful (1-5 scale)
- [ ] Execution logs: Complete and insightful (1-5 scale)

---

## Success Thresholds

### Minimum Viable Improvement

For the workflow guide system to be considered successful, we need:

1. **Phase Transitions**: ≥30% faster in treatment vs. control
2. **Priority Consistency**: ≥40% higher variance in treatment (better differentiation)
3. **Scope Management**: ≥50% better recognition rate in treatment
4. **Communication Quality**: ≥25% higher tone score in treatment
5. **Execution Logs**: ≥80% creation rate in treatment

### Ideal Performance

Stretch goals for excellent performance:

1. **Phase Transitions**: ≥50% faster with 100% justification quality
2. **Priority Consistency**: ≥60% higher variance with ≥90% framework alignment
3. **Scope Management**: ≥80% recognition rate with aggressive cutting
4. **Communication Quality**: ≥40% higher tone score with ≥90% context relevance
5. **Execution Logs**: 100% creation rate with ≥80% quality score

---

## Test Execution Plan

### Week 1: Baseline Establishment
- [ ] Run all 7 scenarios with control group (3 runs each)
- [ ] Collect baseline metrics
- [ ] Document common failure patterns
- [ ] Establish metric baselines

### Week 2: Treatment Testing
- [ ] Run all 7 scenarios with treatment group (3 runs each)
- [ ] Collect treatment metrics
- [ ] Document improvements and regressions
- [ ] Conduct qualitative reviews

### Week 3: Analysis & Iteration
- [ ] Compare control vs. treatment
- [ ] Identify areas needing improvement
- [ ] Refine workflow guides based on findings
- [ ] Re-run failed scenarios

### Week 4: Validation
- [ ] Run final validation tests (5 runs each)
- [ ] Confirm statistical significance
- [ ] Document final results
- [ ] Make go/no-go decision

---

## Monitoring & Observability

### Real-Time Metrics

Track these during test execution:

1. **Tick Latency**: Time between ticks
2. **Prompt Length**: Size of unified prompt
3. **Guide Read Count**: How often guides are accessed (if trackable)
4. **Error Rate**: Failed operations per tick
5. **Commit Frequency**: Commits per tick

### Dashboard Requirements

Create observability dashboard showing:
- Current test scenario
- Control vs. treatment comparison (real-time)
- Key metrics (phase, todos, priorities, logs)
- Recent commits
- Execution logs timeline

---

## Risk Mitigation

### Potential Issues

1. **Over-reliance on guides**: Agent may blindly follow without context
   - **Mitigation**: Include "use judgment" clauses in guides

2. **Prompt length**: Adding guide references increases prompt size
   - **Mitigation**: Monitor latency and cost; optimize if needed

3. **Log creation overhead**: Writing logs takes time from building
   - **Mitigation**: Keep template concise; emphasize incremental filling

4. **Guide maintenance**: Guides may become outdated
   - **Mitigation**: Version guides; track which version used in tests

5. **False confidence**: Better-sounding decisions but not better outcomes
   - **Mitigation**: Focus on outcome metrics (completion, quality) not just process

---

## Documentation Requirements

For each test run, document:

1. **Test ID**: Unique identifier
2. **Scenario**: Which scenario tested
3. **Group**: Control or treatment
4. **Timestamp**: When test started
5. **Environment**: Convex URL, agent version, guides version
6. **Results**: Full metric set
7. **Artifacts**: Link to workspace, execution logs, final artifact
8. **Notes**: Observations, anomalies, insights

---

## Go/No-Go Decision Criteria

**Proceed to Production** if:
- ✅ 5+ scenarios show significant improvement (≥20%)
- ✅ 0 scenarios show regression (>10% worse)
- ✅ Execution log creation rate ≥80%
- ✅ No critical bugs or errors
- ✅ Qualitative review shows better decision coherence

**Iterate and Re-Test** if:
- ⚠️ 3-4 scenarios show improvement
- ⚠️ 1-2 scenarios show regression
- ⚠️ Mixed qualitative results
- ⚠️ Non-critical bugs exist

**Abandon or Major Redesign** if:
- ❌ <3 scenarios show improvement
- ❌ 3+ scenarios show regression
- ❌ Critical bugs or failures
- ❌ Negative qualitative assessment
- ❌ Unacceptable performance overhead

---

## Next Steps After Testing

### If Successful:
1. Implement feature flag (Phase 6.1)
2. Add decision quality metrics (Phase 6.2)
3. Create quality dashboard (Phase 6.3)
4. Plan gradual rollout (Phase 6.4)

### If Needs Iteration:
1. Analyze failure patterns
2. Refine workflow guides
3. Adjust frameworks
4. Re-test problem scenarios

### If Unsuccessful:
1. Document learnings
2. Explore alternative approaches
3. Consider hybrid solutions
4. Re-evaluate architecture

---

**Last Updated**: 2025-10-19
**Version**: 1.0
**Status**: Ready for execution
