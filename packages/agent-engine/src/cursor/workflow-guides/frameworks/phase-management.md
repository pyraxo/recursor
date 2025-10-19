# Phase Management Framework

## Phase Lifecycle

```
ideation → building → demo → complete
   ↓          ↓        ↓       ↓
  2-3       4-8      2-3     done
  ticks     ticks    ticks
```

You can also move backwards if needed (e.g., building → ideation for a major pivot).

## Phase: Ideation

### Purpose
Define what you're building

### Entry Criteria
- New project started
- Pivoting from previous direction
- Need to clarify project concept

### Success Criteria
- ✅ Clear project description (2-3 sentences)
- ✅ Identified target users/use case
- ✅ High-level feature list
- ✅ Tech stack decision made

### Typical Duration
2-3 ticks maximum

### What to Do
- Define project concept
- Refine project description
- Identify key features
- Choose tech stack
- Create initial architectural todos

### What NOT to Do
- ❌ Don't spend >5 ticks here
- ❌ Don't over-plan details
- ❌ Don't create 20+ todos
- ❌ Don't start coding yet

### Transition to Building When
- ✅ Project concept is clear
- ✅ First 3-5 implementation todos created
- ✅ Ready to write code
- ✅ Tech stack decided

### Red Flags (Need to Transition)
- 🚩 More than 3 ticks in ideation
- 🚩 Continuously refining description instead of building
- 🚩 Over-planning details that could be figured out while building

### Example Transition
```
Tick 2 in ideation:
"We've defined the project: a real-time quiz platform with multiplayer support.
The concept is clear, I know we'll use Next.js + WebSockets, and I have
concrete todos for implementation. Time to start building."

Action: {"type": "update_phase", "phase": "building"}
```

---

## Phase: Building

### Purpose
Implement core features

### Entry Criteria
- Clear project description
- Implementation todos created
- Ready to write code

### Success Criteria
- ✅ Core functionality works end-to-end
- ✅ Main user flow functional
- ✅ Key features implemented
- ✅ Can demonstrate basic usage

### Typical Duration
4-8 ticks

### What to Do
- Implement features from todos
- Commit working code frequently
- Test features as you build
- Update description with technical details
- Mark todos as completed

### What NOT to Do
- ❌ Don't add new major features mid-stream
- ❌ Don't refactor working code extensively
- ❌ Don't switch tech stack after starting
- ❌ Don't polish UI instead of building features

### Transition to Demo When
- ✅ Core functionality works
- ✅ Main user flow is complete
- ✅ Can show meaningful demo
- ✅ ~70-80% feature complete

### Red Flags (Problems)
- 🚩 No commits for 2+ ticks
- 🚩 Same todos stuck for 3+ ticks
- 🚩 Scope growing instead of narrowing
- 🚩 More than 8 ticks in building without core features working

### Transition to Ideation When (Rare)
- Major pivot needed
- Fundamental approach not working
- Complete direction change

### Example Transition
```
Tick 7 in building:
"Core quiz functionality works - users can create quizzes, join sessions, and
answer in real-time. There are rough edges in the UI and some nice-to-haves
pending, but the main flow is solid. Time to polish for demo."

Action: {"type": "update_phase", "phase": "demo"}
```

---

## Phase: Demo

### Purpose
Polish for presentation

### Entry Criteria
- Core features work
- Can demonstrate main functionality
- No critical bugs blocking usage

### Success Criteria
- ✅ Smooth demo flow
- ✅ UI is presentable (doesn't need to be perfect)
- ✅ Key features highlighted
- ✅ Documentation exists (README)
- ✅ Demo script prepared

### Typical Duration
2-3 ticks

### What to Do
- Fix critical bugs
- Polish UI/UX
- Add demo-specific features (tooltips, examples, seed data)
- Write README/docs
- Practice demo flow
- Add smooth transitions

### What NOT to Do
- ❌ Don't add new major features
- ❌ Don't refactor core logic
- ❌ Don't optimize unless broken
- ❌ Don't spend ticks on minor visual tweaks

### Transition to Complete When
- ✅ Demo flows smoothly
- ✅ No critical bugs
- ✅ Documentation complete
- ✅ Confident in presentation

### Red Flags (Problems)
- 🚩 Adding features instead of polishing
- 🚩 Breaking working functionality
- 🚩 Scope creep returning
- 🚩 More than 3 ticks in demo without completion

### Transition to Building When (Rare)
- Core feature fundamentally broken
- Missing essential functionality for demo

### Example Transition
```
Tick 10 in demo:
"UI is polished, demo flow is smooth, README is written, and we've practiced
the presentation. Everything works great. We're done!"

Action: {"type": "update_phase", "phase": "complete"}
```

---

## Phase: Complete

### Purpose
Ready to present

### Entry Criteria
- Demo is polished
- Documentation complete
- Confident in presentation
- No critical issues

### Success Criteria
- ✅ Ready to show judges/audience
- ✅ Team is proud of the work
- ✅ Demo script practiced
- ✅ All code committed

### What to Do
- Final review
- Prepare presentation
- Celebrate! 🎉

### What NOT to Do
- ❌ Don't make last-minute changes
- ❌ Don't add features
- ❌ Don't refactor

---

## Decision Tree

```
Start
  ↓
  Do you have a clear project concept? (2-3 sentence description)
  ├─ NO → Stay in IDEATION
  └─ YES
      ↓
      Does core functionality work end-to-end?
      ├─ NO → Move to BUILDING (or stay in BUILDING)
      └─ YES
          ↓
          Is the demo polished and ready to present?
          ├─ NO → Move to DEMO (or stay in DEMO)
          └─ YES → Move to COMPLETE
```

## Time-Based Guidelines

### If You're Running Out of Time

**At 50% time elapsed**:
- Should be in building phase
- Core architecture should be in place
- At least 1-2 features working

**At 70% time elapsed**:
- Should be transitioning to demo phase
- Core features should work
- Focus shifts to polish and cuts

**At 85% time elapsed**:
- Should be in demo phase
- Cut all non-essential features
- Focus only on making demo smooth

## Common Mistakes

### ❌ Staying in Ideation Too Long
**Problem**: Still ideating after 5 ticks
**Solution**: Force transition to building after 3 ticks

### ❌ Building Without Direction
**Problem**: Building phase but no clear todos or direction
**Solution**: Go back to ideation, clarify concept, then return to building

### ❌ Adding Features in Demo Phase
**Problem**: Adding new features when should be polishing
**Solution**: Strict feature freeze, only fix bugs and polish

### ❌ Never Completing
**Problem**: Perfectionism prevents completion
**Solution**: Set hard deadline, move to complete when "good enough"

## Examples of Phase Transitions

### Example 1: Ideation → Building

```json
{
  "thinking": "We've spent 2 ticks refining the quiz platform concept. The description is solid - real-time multiplayer quizzes with Next.js and WebSockets. I have clear first todos. Time to start coding.",
  "actions": [
    {"type": "update_phase", "phase": "building"},
    {"type": "create_todo", "content": "Set up Next.js project with TypeScript", "priority": 10},
    {"type": "create_todo", "content": "Create quiz creation form", "priority": 9}
  ]
}
```

### Example 2: Building → Demo

```json
{
  "thinking": "Core quiz features are working - create quiz, join session, answer questions, see results in real-time. Some UI rough edges and nice-to-haves pending, but the main flow is solid. 70% complete with 8 ticks elapsed. Time to focus on demo polish.",
  "actions": [
    {"type": "update_phase", "phase": "demo"},
    {"type": "delete_todo", "content": "Add user profiles"},
    {"type": "delete_todo", "content": "Implement leaderboard history"},
    {"type": "create_todo", "content": "Polish quiz UI with smooth animations", "priority": 7},
    {"type": "create_todo", "content": "Write README with setup instructions and demo script", "priority": 8}
  ]
}
```

### Example 3: Demo → Complete

```json
{
  "thinking": "Demo runs smoothly, UI looks polished, README is comprehensive, all features work well. We've tested the demo flow multiple times. Ready to present!",
  "actions": [
    {"type": "update_phase", "phase": "complete"}
  ]
}
```

### Example 4: Building → Ideation (Pivot)

```json
{
  "thinking": "After 3 ticks trying to implement blockchain integration, it's clear this won't work in our timeframe. The complexity is too high. Need to pivot to a traditional database approach and redefine scope.",
  "actions": [
    {"type": "update_phase", "phase": "ideation"},
    {"type": "clear_all_todos", "reason": "Pivoting from blockchain to traditional database - previous todos no longer relevant"},
    {"type": "update_project", "description": "Quiz platform with traditional database backend instead of blockchain. Focus on real-time features and smooth UX."}
  ]
}
```

## Quick Reference

| Phase | Duration | Entry | Exit | Focus |
|-------|----------|-------|------|-------|
| **Ideation** | 2-3 ticks | Project start / Pivot | Clear concept + todos | Define what to build |
| **Building** | 4-8 ticks | Ready to code | Core features work | Implement features |
| **Demo** | 2-3 ticks | Features work | Demo-ready | Polish and fix bugs |
| **Complete** | Done | Demo polished | N/A | Present! |

## Remember

- **Move forward aggressively**: Don't get stuck in any phase
- **It's okay to move backwards**: If you need to pivot, go back to ideation
- **Time is limited**: Use phase transitions to manage scope
- **Good enough is good enough**: This is a hackathon, not production
