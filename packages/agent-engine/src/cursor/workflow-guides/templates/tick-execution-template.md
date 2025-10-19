# Tick Execution Log - Template

## Instructions

**Copy this file to `../../logs/tick-NNN.md` (where NNN is the tick number) and fill in each section as you work through this tick.**

This log is your memory and decision record. Fill it out completely - it will help you in future ticks!

---

## Tick Metadata

- **Tick Number**: [N]
- **Started At**: [timestamp]
- **Current Phase**: [ideation/building/demo/complete]
- **Time Elapsed**: [X ticks / ~Y total]

---

## Phase 1: Planning

### Context Loading

**Current Project:**
- Title: [project title]
- Description: [project description]
- Phase: [current phase]

**Pending Todos** ([count]):
- [List current todos with priorities]

**Recent Changes** (last 1-2 ticks):
- [What happened recently?]

### Decision Framework Application

#### Phase Transition Analysis
📖 **Reference**: `docs/cursor-agent/frameworks/phase-management.md`

**Questions to answer:**
- Currently in phase: [phase]
- Should we transition? [YES/NO]
- If YES, why? [Apply decision tree from framework]
- If YES, to which phase? [new phase]
- If NO, why should we stay? [reasoning]

**Decision:**
[What did you decide about phase?]

#### Priority Scoring
📖 **Reference**: `docs/cursor-agent/frameworks/priority-scoring.md`

For each todo, score 1-10 using the framework:

| Todo | Current Priority | New Priority | Reasoning |
|------|------------------|--------------|-----------|
| [Todo 1] | [old] | [new] | [why this priority?] |
| [Todo 2] | [old] | [new] | [why this priority?] |

**Priority adjustments made:**
[Summary of changes and why]

#### Todo Management Decisions
📖 **Reference**: `docs/cursor-agent/workflows/planning.md`

**Todos to CREATE:**
1. [New todo] - Priority [N] - Reasoning: [why create this?]
2. [New todo] - Priority [N] - Reasoning: [why create this?]

**Todos to UPDATE:**
1. [Old content] → [New content] - Reasoning: [why update?]

**Todos to DELETE:**
1. [Todo to delete] - Reasoning: [why delete?]

**Clear all todos?** [YES/NO]
- If YES, reason: [why clearing everything?]

**Project description update needed?** [YES/NO]
- If YES, new description: [updated description]

### Planning JSON Output

```json
{
  "thinking": "[Your thoughts about what needs to happen next - talk through it naturally]",
  "actions": [
    [Your actions here]
  ]
}
```

### Planning Summary

**What did I decide and why?**
[Summarize your planning decisions in 2-3 sentences]

---

## Phase 2: Building

### Todo Selection

**Selected todo**: [highest priority todo]
**Why this one?**: [reasoning for selection]

### Implementation Plan
📖 **Reference**: `docs/cursor-agent/workflows/building.md`

**Approach:**
[How will you implement this? What's the strategy?]

**Files to create/modify:**
- [file 1] - [purpose]
- [file 2] - [purpose]
- [file 3] - [purpose]

**Key challenges:**
- [Challenge 1] - [how will you handle it?]
- [Challenge 2] - [how will you handle it?]

**Tech/libraries needed:**
- [Library/tool 1] - [why?]

### Build Log

**Implementation steps:**

1. [Step 1] - [status: ✅/⏳]
   - [Details/notes]

2. [Step 2] - [status: ✅/⏳]
   - [Details/notes]

3. [Step 3] - [status: ✅/⏳]
   - [Details/notes]

**Testing results:**
- [What did you test?]
- [Did it work?]
- [Any issues found?]

### Commits Made
📖 **Reference**: `docs/cursor-agent/frameworks/commit-strategy.md`

**Commit 1:**
```bash
git add [files]
git commit -m "[type]: [description]"
git push origin [branch]
```
- Files changed: [list]
- Why this commit: [reasoning]

**Commit 2:**
[If additional commits made]

### Building JSON Output

```json
{
  "thinking": "[One sentence about what you built and your approach]",
  "results": {
    "artifact": "[Complete code OR summary of multi-file changes]"
  }
}
```

### Build Summary

**What did I build?**
[Summary in 2-3 sentences]

**Did it work?**
[YES/NO and brief explanation]

---

## Phase 3: Review

### Demo-Readiness Assessment
📖 **Reference**: `docs/cursor-agent/workflows/review.md`

**Questions to answer:**
1. Does core functionality work? [YES/NO - details]
2. Can we show this to judges? [YES/NO - why/why not?]
3. What's missing for minimum viable demo? [list]
4. Is the UI functional? [YES/NO - state]

**Demo-Readiness Score:**
- 🟢 Demo-Ready / 🟡 Nearly Ready / 🔴 Not Ready
- Reasoning: [why this score?]

### Time Management Assessment

**Time Analysis:**
- Ticks elapsed: [X]
- Estimated ticks remaining: [Y]
- Current phase: [phase]
- Completion estimate: [Z]%

**Pace check:**
- Expected at this point: [%]
- Actual completion: [%]
- Gap analysis: [on track / behind / ahead]

**Red flags?** [YES/NO]
If YES, which ones:
- [ ] More than 50% time elapsed, less than 50% complete
- [ ] Still in ideation after 5+ ticks
- [ ] Same todos pending for 3+ ticks
- [ ] No commits for 2+ ticks
- [ ] Scope growing instead of narrowing

### Blocker Identification

**Current blockers:**
1. [Blocker 1] - Severity: [critical/major/minor]
   - Impact: [how is this affecting progress?]
   - Solution: [how to unblock?]

**Potential future blockers:**
1. [Potential blocker] - [why this might become an issue]

**Are we stuck?** [YES/NO]
- If YES, on what? [describe]
- If YES, for how long? [ticks]

### Scope Management
📖 **Reference**: `docs/cursor-agent/frameworks/scope-management.md`

**Should we cut scope?** [YES/NO]

**Scope triage:**
- **Category 1 (MUST KEEP)**: [list core features]
- **Category 2 (SHOULD KEEP)**: [list key features]
- **Category 3 (NICE TO KEEP)**: [list enhancements]
- **Category 4 (CUT FIRST)**: [list polish items]

**If cutting scope:**
- Features to cut: [list with reasoning]
- Features to keep: [list with reasoning]
- Time this will save: [estimate]

### Recommendations for Next Tick

**Recommendation 1:**
[Specific, actionable recommendation]

**Recommendation 2:**
[Specific, actionable recommendation]

**Recommendation 3:**
[Specific, actionable recommendation]

### Review JSON Output

```json
{
  "thinking": "[Brief assessment of progress, implementation adequacy, and time management (2-3 sentences)]",
  "results": {
    "recommendations": [
      "[Specific recommendation 1]",
      "[Specific recommendation 2]"
    ],
    "issues": [
      {
        "severity": "[critical/major/minor]",
        "description": "[Clear description of issue and impact]"
      }
    ]
  }
}
```

### Review Summary

**Overall assessment:**
[How are we doing? 2-3 sentences]

---

## Phase 4: Communication

### Messages to Respond To
📖 **Reference**: `docs/cursor-agent/workflows/communication.md`

**Message 1:**
- From: [sender name]
- Type: [user/team]
- Content: [message content]
- Response needed: [YES/NO]

**Message 2:**
[If more messages]

### Responses Drafted

**Response to [sender 1]:**

```json
{
  "thinking": "[Brief summary of what you're responding to (1 sentence)]",
  "results": {
    "message": "[The actual message - 2-3 sentences, conversational]",
    "recipient": "[name]",
    "type": "[direct/broadcast]"
  }
}
```

**Response to [sender 2]:**
[If more responses]

### Broadcast Requests

**Did Planner create a broadcast todo?** [YES/NO]

If YES:
- Todo content: [what was requested?]
- Broadcast message: [draft the announcement]

### Communication Summary

**Messages responded to:** [count]
**Broadcasts sent:** [count]
**Overall tone:** [helpful/friendly/professional/etc.]

---

## Meta-Review

### What Went Well This Tick

1. [Success 1]
2. [Success 2]
3. [Success 3]

### What to Improve Next Tick

1. [Improvement area 1]
2. [Improvement area 2]
3. [Improvement area 3]

### Lessons Learned

**Key insights:**
- [Insight 1]
- [Insight 2]

**Patterns noticed:**
- [Pattern 1]
- [Pattern 2]

### Notes for Future Ticks

**Important things to remember:**
- [Note 1]
- [Note 2]

**Decisions that might need revisiting:**
- [Decision 1 and why it might change]

---

## Workflow Guides Used

Check which guides you referenced:

- [ ] `workflows/planning.md`
- [ ] `workflows/building.md`
- [ ] `workflows/review.md`
- [ ] `workflows/communication.md`
- [ ] `frameworks/phase-management.md`
- [ ] `frameworks/priority-scoring.md`
- [ ] `frameworks/commit-strategy.md`
- [ ] `frameworks/scope-management.md`
- [ ] `examples/` (specify which)

---

## Final Checklist

Before finishing this tick, verify:

- [ ] All sections filled out completely
- [ ] Planning decisions made and documented
- [ ] Code changes committed and pushed (if building)
- [ ] Review assessment completed
- [ ] Messages responded to (if any)
- [ ] Lessons learned captured
- [ ] This log file committed to git

---

## Commit This Log

```bash
git add logs/tick-[N].md
git commit -m "docs: add tick [N] execution log"
git push origin [branch]
```

**Log committed:** [YES/NO]
**Commit hash:** [hash if committed]

---

**END OF TICK [N]**
