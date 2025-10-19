# Scope Management Framework

## Core Principle

In a hackathon, **shipping something impressive beats building everything perfectly**.

Scope management is about making hard choices to ensure you finish with a working demo rather than running out of time with unfinished features.

## When to Cut Scope

### The Time/Completion Mismatch

Cut scope when:

```
Time Remaining < (100% - Current Completion) * 1.5
```

**Examples**:
- 30% time left, 60% complete → **CUT SCOPE** (need 40%, have 30%)
- 50% time left, 50% complete → **OK** (need 50%, have 50%)
- 40% time left, 80% complete → **GOOD** (need 20%, have 40%)

### Time-Based Triggers

| Time Remaining | Action Required |
|----------------|-----------------|
| **85%+ elapsed** | Emergency cuts - only keep what works |
| **70-85% elapsed** | Aggressive cuts - only core features |
| **50-70% elapsed** | Moderate cuts - remove nice-to-haves |
| **<50% elapsed** | Review scope, identify potential cuts |

### Progress-Based Triggers

Cut scope if:
- 🚩 Same todos pending for 3+ ticks
- 🚩 Not completing todos at steady pace
- 🚩 Scope growing instead of shrinking
- 🚩 Too many Priority 1-4 todos still pending
- 🚩 Building phase lasting >8 ticks

## The Scope Triage System

### Category 1: MUST KEEP (Core Demo)

**Criteria**:
- Absolutely required to demonstrate the concept
- Without this, there's no demo
- Core user flow depends on it

**Examples** (for quiz app):
- ✅ Create quiz with questions
- ✅ Join and participate in quiz
- ✅ See results after quiz

**Never cut these** - if you must cut a "must keep", you need to pivot the entire project

### Category 2: SHOULD KEEP (Key Features)

**Criteria**:
- Significantly enhances the demo
- Makes the product compelling
- Key differentiator

**Examples** (for quiz app):
- ✅ Real-time synchronization
- ✅ Live participant tracking
- ✅ Smooth UI animations

**Cut only under time pressure** (>70% time elapsed, <50% complete)

### Category 3: NICE TO KEEP (Enhancements)

**Criteria**:
- Improves user experience
- Quality of life features
- Makes things more polished

**Examples** (for quiz app):
- ✅ Form validation
- ✅ Loading states
- ✅ Error handling

**Cut if >60% time elapsed and not complete**

### Category 4: CUT FIRST (Polish)

**Criteria**:
- Pure polish
- Future features
- Non-essential improvements

**Examples** (for quiz app):
- ✅ User profiles
- ✅ Leaderboard history
- ✅ Quiz templates library
- ✅ Advanced analytics

**Cut immediately if >50% time elapsed**

## Scope Cutting Decision Tree

```
Start: Need to cut scope?
  ↓
  What % of time is remaining?
  ├─ <15% → EMERGENCY MODE
  │         Keep only what currently works
  │         Cut everything incomplete
  │         Focus on demo polish
  │
  ├─ 15-30% → AGGRESSIVE CUTS
  │         Keep only Categories 1-2
  │         Cut all Category 3-4
  │         Stop starting new features
  │
  ├─ 30-50% → MODERATE CUTS
  │         Keep Categories 1-3
  │         Cut Category 4
  │         Be selective about new features
  │
  └─ >50% → REVIEW
            Keep all categories
            Identify potential cuts for later
            Continue as planned
```

## How to Cut Scope

### Step 1: Categorize All Pending Todos

Go through your todo list and categorize each item:

```json
{
  "thinking": "Reviewing todos to identify cuts. Categorizing each by must/should/nice/cut.",
  "actions": []
}
```

### Step 2: Delete Category 4 Todos

```json
{
  "actions": [
    {"type": "delete_todo", "content": "Add user profile pages"},
    {"type": "delete_todo", "content": "Implement leaderboard history"},
    {"type": "delete_todo", "content": "Add quiz templates library"}
  ]
}
```

### Step 3: Downgrade Category 3 Priorities

```json
{
  "actions": [
    {"type": "update_todo", "oldContent": "Add form validation", "newContent": "Add form validation", "priority": 2},
    {"type": "update_todo", "oldContent": "Implement error handling", "newContent": "Implement error handling", "priority": 2}
  ]
}
```

### Step 4: Focus on Category 1-2

```json
{
  "actions": [
    {"type": "update_todo", "oldContent": "Polish quiz UI", "newContent": "Polish quiz UI", "priority": 8},
    {"type": "update_todo", "oldContent": "Fix real-time sync bugs", "newContent": "Fix real-time sync bugs", "priority": 9}
  ]
}
```

## Scope Cutting Examples

### Example 1: Moderate Cuts (50% time, 40% complete)

```json
{
  "thinking": "We're 50% through time but only 40% complete. Need to cut scope to get to demo. Removing nice-to-haves and focusing on core quiz functionality. Keeping real-time features as they're our differentiator, cutting profiles and leaderboard history.",
  "actions": [
    {"type": "delete_todo", "content": "Add user profile pages"},
    {"type": "delete_todo", "content": "Implement leaderboard history"},
    {"type": "delete_todo", "content": "Add quiz templates library"},
    {"type": "update_todo", "oldContent": "Add form validation", "newContent": "Add form validation", "priority": 3},
    {"type": "update_todo", "oldContent": "Polish quiz results UI", "newContent": "Polish quiz results UI", "priority": 7}
  ]
}
```

### Example 2: Aggressive Cuts (70% time, 50% complete)

```json
{
  "thinking": "We're at 70% time with only 50% done. Need aggressive cuts to finish. Keeping only core quiz create/join/play flow and real-time sync. Everything else gets cut. Moving to demo phase to focus on polish.",
  "actions": [
    {"type": "delete_todo", "content": "Add user profiles"},
    {"type": "delete_todo", "content": "Implement leaderboard history"},
    {"type": "delete_todo", "content": "Add quiz templates"},
    {"type": "delete_todo", "content": "Create admin dashboard"},
    {"type": "delete_todo", "content": "Add advanced search"},
    {"type": "update_todo", "oldContent": "Fix minor UI bugs", "newContent": "Fix minor UI bugs", "priority": 2},
    {"type": "update_phase", "phase": "demo"}
  ]
}
```

### Example 3: Emergency Mode (85% time, 60% complete)

```json
{
  "thinking": "Emergency: 85% time elapsed, only 60% done. Stop all new work. Keep only what currently works. Focus entirely on making the demo smooth. Clear all incomplete todos and just polish what we have.",
  "actions": [
    {"type": "clear_all_todos", "reason": "Emergency scope cut at 85% time - keeping only working features, focusing on demo polish"},
    {"type": "create_todo", "content": "Fix critical bug in quiz scoring", "priority": 10},
    {"type": "create_todo", "content": "Polish the quiz creation and play flow UI", "priority": 8},
    {"type": "create_todo", "content": "Write README with demo script", "priority": 7},
    {"type": "update_phase", "phase": "demo"}
  ]
}
```

## What to Keep vs Cut

### Always Keep

- ✅ Core user flow that demonstrates the concept
- ✅ Key differentiators that make it unique
- ✅ What's already working
- ✅ Critical bug fixes

### Often Cut

- ❌ User accounts/profiles
- ❌ Admin features
- ❌ Analytics/reporting
- ❌ Advanced search/filtering
- ❌ Settings pages
- ❌ Multiple themes
- ❌ Internationalization
- ❌ Complex permissions

### Always Cut

- ❌ Future features
- ❌ Performance optimizations
- ❌ Extensive test suites
- ❌ API documentation
- ❌ Deployment configuration
- ❌ Email notifications
- ❌ Social sharing

## The "Fake It" Strategy

Sometimes you can **describe** features instead of building them:

### Can Describe in Demo

Instead of building:
- ❌ "Add user profiles with avatars and bios"

Do this:
- ✅ Add a "Profiles Coming Soon" button
- ✅ In demo: "We're planning to add user profiles next"
- ✅ Mock up one static profile page

### Can Show with Seed Data

Instead of building:
- ❌ "Implement quiz history and statistics"

Do this:
- ✅ Add hardcoded example history in the UI
- ✅ In demo: "Here's how history will look"
- ✅ Doesn't need working backend

### Can Use Placeholders

Instead of building:
- ❌ "Add admin dashboard with analytics"

Do this:
- ✅ Create beautiful placeholder charts
- ✅ Use dummy data
- ✅ In demo: "Admin dashboard tracks usage patterns"

## Communication About Scope Cuts

### In Project Description

Update to reflect reality:

**Before (overpromised)**:
```
"Quiz platform with user profiles, leaderboard history, quiz templates,
real-time multiplayer, analytics dashboard, and social sharing"
```

**After (realistic)**:
```
"Real-time multiplayer quiz platform with live synchronization and clean UI.
Features quiz creation, live sessions, and instant results."
```

### In Demo

Frame cuts positively:

**Don't say**:
- ❌ "We didn't have time for user profiles"
- ❌ "The leaderboard doesn't work yet"
- ❌ "We cut a bunch of features"

**Do say**:
- ✅ "We focused on nailing the core real-time experience"
- ✅ "The multiplayer sync is our key innovation"
- ✅ "We prioritized a polished demo over feature bloat"

## Preventing Scope Creep

### Red Flags

- 🚩 Adding new features mid-project
- 🚩 "While I'm here, let me also..."
- 🚩 Todo list growing instead of shrinking
- 🚩 Scope increasing in later ticks
- 🚩 Building features not in original plan

### Prevention

1. **Stick to the plan**: Build what you planned, nothing more
2. **Question every addition**: "Do we NEED this for the demo?"
3. **Time box features**: "If not done in 1 tick, cut it"
4. **Review regularly**: Check scope vs time every 2-3 ticks

## Scope Cutting Checklist

When you need to cut scope, use this checklist:

- [ ] Calculate time remaining vs completion percentage
- [ ] Categorize all pending todos (must/should/nice/cut)
- [ ] Delete all Category 4 (Cut First) todos
- [ ] Downgrade Category 3 (Nice to Keep) priorities
- [ ] Focus remaining time on Category 1-2
- [ ] Update project description to match reality
- [ ] Consider moving to demo phase
- [ ] Stop starting new features
- [ ] Polish what's working

## Success Stories

Good scope management leads to:

- ✅ **Working demo** at the deadline
- ✅ **Polished core features** instead of half-done everything
- ✅ **Impressive presentation** of focused concept
- ✅ **Less stress** from realistic goals
- ✅ **Better quality** from focused effort

Bad scope management leads to:

- ❌ **Nothing works** at deadline
- ❌ **Half-finished features** everywhere
- ❌ **Chaotic demo** that doesn't flow
- ❌ **High stress** from impossible goals
- ❌ **Low quality** from spread-too-thin effort

## Remember

- **Better to finish 5 features well than start 20 badly**
- **Cutting scope is not failure** - it's smart project management
- **The demo judges what you show** - not what you planned
- **Done is better than perfect** - ship it!
- **You can always add features later** - but you can't demo unfinished work

Ruthless scope management is the secret to hackathon success!
