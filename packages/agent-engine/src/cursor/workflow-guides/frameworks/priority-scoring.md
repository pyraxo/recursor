# Priority Scoring Framework

## Priority Scale: 1-10

Use this systematic approach to score todo priorities. Higher number = more important.

```
10 ─── Critical Blocker
 9 ─── Major Feature (Highest)
 8 ─── Major Feature (High)
 7 ─── Major Feature (Standard)
 6 ─── Important Enhancement (High)
 5 ─── Important Enhancement (Standard)
 4 ─── Important Enhancement (Low)
 3 ─── Nice-to-Have (High)
 2 ─── Nice-to-Have (Standard)
 1 ─── Nice-to-Have (Low)
```

## Priority Definitions

### Priority 10: Critical Blocker

**When to use**:
- Blocks ALL other work
- System doesn't work without it
- Must be done first, no exceptions

**Characteristics**:
- Prevents any progress
- Foundational requirement
- Usually occurs early in project or after breaking change

**Examples**:
- ✅ "Set up project structure and install dependencies"
- ✅ "Fix critical bug: app crashes on startup"
- ✅ "Create database schema and connection"
- ✅ "Resolve build error preventing compilation"

**Not Priority 10**:
- ❌ "Implement user authentication" (important but not blocking everything)
- ❌ "Optimize database queries" (not blocking)
- ❌ "Add dark mode" (feature, not blocker)

---

### Priority 9: Major Feature (Critical)

**When to use**:
- Core functionality that's absolutely essential for demo
- First features to implement after setup
- Part of minimum viable product

**Characteristics**:
- Cannot demo without it
- Primary user-facing feature
- Defines the product

**Examples**:
- ✅ "Implement quiz creation form" (for quiz app)
- ✅ "Build real-time chat interface" (for chat app)
- ✅ "Create authentication flow" (if auth is core to concept)
- ✅ "Build main dashboard UI"

**Not Priority 9**:
- ❌ "Add profile pictures" (nice but not core)
- ❌ "Implement advanced search" (enhancement, not core)

---

### Priority 8: Major Feature (High Importance)

**When to use**:
- Important core features
- Key differentiators
- Essential for good demo

**Characteristics**:
- Significantly improves demo
- Key user experience feature
- Important but not first thing to build

**Examples**:
- ✅ "Implement real-time synchronization"
- ✅ "Add file upload functionality"
- ✅ "Build notification system"
- ✅ "Create admin dashboard"

---

### Priority 7: Major Feature (Standard)

**When to use**:
- Core features that can come after Priority 8-9
- Valuable but not most critical
- Still part of main demo

**Characteristics**:
- Core feature but can be delayed
- Enhances but doesn't define the product
- Should be completed before demo phase

**Examples**:
- ✅ "Add search functionality"
- ✅ "Implement data export"
- ✅ "Create settings page"
- ✅ "Build analytics dashboard"

---

### Priority 6: Important Enhancement (High)

**When to use**:
- Significantly improves UX
- Important quality-of-life features
- Makes demo more impressive

**Characteristics**:
- Not core but valuable
- Users would miss it
- Enhances existing features

**Examples**:
- ✅ "Add form validation with helpful error messages"
- ✅ "Implement loading states and skeleton screens"
- ✅ "Add keyboard shortcuts"
- ✅ "Create onboarding tutorial"

---

### Priority 5: Important Enhancement (Standard)

**When to use**:
- Good enhancements
- Standard features users expect
- Improves completeness

**Characteristics**:
- Makes things better
- Expected functionality
- Nice to have before demo

**Examples**:
- ✅ "Add confirmation dialogs"
- ✅ "Implement error handling"
- ✅ "Add tooltips for complex features"
- ✅ "Create help documentation"

---

### Priority 4: Important Enhancement (Low)

**When to use**:
- Useful improvements
- Quality enhancements
- Can be deferred if needed

**Characteristics**:
- Minor improvements
- Quality of life
- First candidates for scope cutting

**Examples**:
- ✅ "Add undo/redo functionality"
- ✅ "Implement auto-save"
- ✅ "Add customizable themes"
- ✅ "Create advanced filters"

---

### Priority 3: Nice-to-Have (High)

**When to use**:
- Polish features
- Extras that impress
- Time permitting

**Characteristics**:
- Doesn't affect core functionality
- Visual polish
- Demo wow-factor

**Examples**:
- ✅ "Add smooth page transitions"
- ✅ "Implement confetti animation on success"
- ✅ "Add sound effects"
- ✅ "Create beautiful 404 page"

---

### Priority 2: Nice-to-Have (Standard)

**When to use**:
- Polish and refinements
- Non-essential features
- Likely to be cut if time runs short

**Characteristics**:
- Pure polish
- Minimal user impact
- Can skip without consequence

**Examples**:
- ✅ "Add loading animations"
- ✅ "Optimize bundle size"
- ✅ "Add Easter eggs"
- ✅ "Create custom favicon"

---

### Priority 1: Nice-to-Have (Low)

**When to use**:
- Future improvements
- Very low priority
- Almost certainly will be cut

**Characteristics**:
- Future feature
- Not needed for demo
- Aspirational

**Examples**:
- ✅ "Add internationalization support"
- ✅ "Implement advanced analytics"
- ✅ "Add A/B testing framework"
- ✅ "Create API documentation"

---

## Decision Matrix

Use this matrix to determine priority:

| Is it blocking all work? | YES → Priority 10 |
| Is it core to the demo? | YES → Priority 7-9 |
| Does it significantly improve UX? | YES → Priority 5-6 |
| Is it polish/extras? | YES → Priority 1-4 |

### More Detailed Decision Tree

```
Is it blocking ALL work?
├─ YES → Priority 10
└─ NO
    ↓
    Is it core to minimum viable demo?
    ├─ YES → Priority 7-9
    │   ├─ Can't demo without it? → Priority 9
    │   ├─ Key differentiator? → Priority 8
    │   └─ Core but can wait? → Priority 7
    └─ NO
        ↓
        Does it significantly improve UX?
        ├─ YES → Priority 5-6
        │   ├─ Major UX improvement? → Priority 6
        │   └─ Standard enhancement? → Priority 5
        └─ NO → Priority 1-4
            ├─ Good to have? → Priority 3-4
            └─ Pure polish? → Priority 1-2
```

## Priority Adjustment Rules

### When to Increase Priority

1. **Time Running Out**: Increase priority of features needed for minimal demo
2. **Blocker Emerged**: Something became blocking → Priority 10
3. **Demo Dependency**: Needed for demo flow → Increase to 7-9
4. **User Feedback**: User requested and it's important → Increase 1-2 points

### When to Decrease Priority

1. **Time Running Short**: Decrease nice-to-haves to 1-3
2. **Scope Cut Needed**: Move enhancements down to 3-4
3. **Dependency Missing**: Can't do yet → Decrease temporarily
4. **Feature Creep**: Added in excitement → Re-evaluate down

## Common Mistakes

### ❌ Everything is Priority 9-10
**Problem**: If everything is critical, nothing is
**Solution**: Force rank - only true blockers are 10, only core features are 9

### ❌ No Priorities Below 5
**Problem**: No clear candidates for cutting
**Solution**: Be honest about nice-to-haves (1-4)

### ❌ Never Adjusting Priorities
**Problem**: Initial priorities don't reflect current reality
**Solution**: Regularly re-evaluate and adjust

### ❌ Priority Inflation
**Problem**: Everything drifts upward over time
**Solution**: Stick to definitions, be disciplined

## Phase-Specific Priorities

### Ideation Phase
- Priority 10: N/A (no implementation todos yet)
- Priority 7-9: Initial architectural todos
- Priority 1-6: Don't create implementation todos yet

### Building Phase
- Priority 10: Critical blockers preventing progress
- Priority 7-9: Core features being built
- Priority 5-6: Enhancements to core features
- Priority 1-4: Polish for later

### Demo Phase
- Priority 10: Critical bugs breaking demo
- Priority 7-9: Polish core demo flow
- Priority 5-6: Fix obvious issues
- Priority 1-4: Skip unless time available

### Complete Phase
- Don't create new todos, you're done!

## Examples with Reasoning

### Example 1: Quiz App

```json
{
  "thinking": "Setting up core quiz app priorities. Setup is blocking (10), core features are 8-9, UX improvements are 5-6, polish is 1-4.",
  "actions": [
    {"type": "create_todo", "content": "Set up Next.js project with dependencies", "priority": 10},
    {"type": "create_todo", "content": "Create quiz creation form with questions", "priority": 9},
    {"type": "create_todo", "content": "Implement real-time quiz sessions with WebSockets", "priority": 8},
    {"type": "create_todo", "content": "Add form validation for quiz creation", "priority": 6},
    {"type": "create_todo", "content": "Add smooth transitions between questions", "priority": 3}
  ]
}
```

### Example 2: Re-prioritizing Under Time Pressure

```json
{
  "thinking": "We have 3 ticks left and are at 60% complete. Need to ruthlessly prioritize. Core quiz functionality is 9-10, everything else drops to 1-4 for cutting consideration.",
  "actions": [
    {"type": "update_todo", "oldContent": "Add user profiles", "newContent": "Add user profiles", "priority": 2},
    {"type": "update_todo", "oldContent": "Implement leaderboard history", "newContent": "Implement leaderboard history", "priority": 1},
    {"type": "update_todo", "oldContent": "Polish quiz UI with animations", "newContent": "Polish quiz UI with animations", "priority": 7},
    {"type": "update_todo", "oldContent": "Fix critical bug in quiz scoring", "newContent": "Fix critical bug in quiz scoring", "priority": 10}
  ]
}
```

### Example 3: Blocker Emerged

```json
{
  "thinking": "The database connection is broken and nothing works. This just became a Priority 10 blocker. Everything else waits.",
  "actions": [
    {"type": "create_todo", "content": "Fix database connection error preventing app startup", "priority": 10}
  ]
}
```

## Quick Reference Table

| Priority | Type | Description | When to Cut |
|----------|------|-------------|-------------|
| 10 | Blocker | Blocks everything | Never |
| 9 | Core Feature | Must-have for demo | Never |
| 8 | Core Feature | Key differentiator | Rarely |
| 7 | Core Feature | Important but can delay | If desperate |
| 6 | Enhancement | Major UX improvement | Under time pressure |
| 5 | Enhancement | Standard quality | Under time pressure |
| 4 | Enhancement | Nice improvement | Likely cut |
| 3 | Polish | Impressive extras | Cut if <50% time left |
| 2 | Polish | Minor improvements | Cut if <70% time left |
| 1 | Polish | Future features | Cut immediately |

## Remember

- **Be honest**: Don't inflate priorities to make everything seem important
- **Be ruthless**: Under time pressure, cut 1-6, focus on 7-10
- **Be flexible**: Adjust priorities as context changes
- **Be systematic**: Use the decision tree, don't guess

The priority scale is your tool for managing scope under tight deadlines!
