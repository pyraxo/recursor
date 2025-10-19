# Example: Successful Scope Cut

## Scenario

**Context:**
- Tick 8 of real-time collaboration tool project
- Building phase, but time is running short
- 70% of time elapsed (8 of ~11 ticks)
- Only 50% complete
- Team stuck on complex WebRTC feature for 2 ticks

**Current State:**
- **Working**: Real-time cursor tracking ✅, Shared canvas ✅, Basic drawing tools ✅
- **In Progress**: WebRTC video chat (stuck/complex)
- **Pending**: Chat, User accounts, File export, Templates, Themes
- **Problem**: Trying to implement too many features

## The Review Assessment

```json
{
  "thinking": "Major time/scope mismatch here. We're 70% through time but only 50% done. The team has been stuck on WebRTC for 2 ticks - this is a blocker. The core real-time collaboration already works great - cursors and canvas sync beautifully. We don't NEED video chat for the demo. Need to cut the WebRTC feature entirely and focus on polishing what works. Also need to cut user accounts, file export, templates, and themes - none of those are core to demonstrating real-time collaboration.",

  "results": {
    "recommendations": [
      "Cut the WebRTC video chat feature immediately - it's blocking progress and not essential for demo",
      "Cut user accounts, file export, templates, and themes - focus remaining 3 ticks on core collaboration",
      "Keep and polish: real-time cursor tracking, canvas sync, and drawing tools - these ARE the demo",
      "Add simple text chat instead of video (much faster to implement, still shows collaboration)",
      "Move to demo phase next tick to focus on polish and stability"
    ],
    "issues": [
      {
        "severity": "critical",
        "description": "Team stuck on WebRTC implementation for 2 ticks with no progress. This feature is blocking everything else and isn't essential for core demo."
      },
      {
        "severity": "major",
        "description": "Time/scope mismatch: 70% time elapsed but only 50% complete. At current pace, will not finish planned features. Need immediate scope cut."
      },
      {
        "severity": "major",
        "description": "Too many pending features (6 major items) for remaining time (3 ticks). Need to cut 80% of pending work."
      }
    ]
  }
}
```

## The Planner's Response (Next Tick)

```json
{
  "thinking": "Reviewer is right - we're stuck on WebRTC and it's not essential. Our real-time cursor and canvas sync is actually our best feature. Let's showcase that instead. Cutting WebRTC, user accounts, file export, templates, and themes. Adding simple text chat which we can build in 1 tick. Moving to demo phase to polish what we have.",

  "actions": [
    {"type": "delete_todo", "content": "Implement WebRTC video chat"},
    {"type": "delete_todo", "content": "Add user account system with authentication"},
    {"type": "delete_todo", "content": "Implement file export to PNG/SVG"},
    {"type": "delete_todo", "content": "Create template library"},
    {"type": "delete_todo", "content": "Add theme customization"},
    {"type": "create_todo", "content": "Add simple text chat with message history", "priority": 8},
    {"type": "create_todo", "content": "Polish canvas UI and add color picker", "priority": 7},
    {"type": "create_todo", "content": "Fix edge cases in cursor synchronization", "priority": 9},
    {"type": "update_project", "description": "CollabCanvas - Real-time collaborative drawing canvas. Multiple users can draw together with live cursor tracking and instant synchronization. Features smooth drawing tools, text chat, and beautiful animations. Built with Next.js, WebSockets, and Canvas API. Perfect for remote brainstorming sessions."},
    {"type": "update_phase", "phase": "demo"}
  ]
}
```

## The Builder's Implementation (After Scope Cut)

### Tick 9: Simple Text Chat (1 tick, not 2!)
```json
{
  "thinking": "Building simple text chat using existing WebSocket connection. Just need message component, input, and broadcast messages.",

  "results": {
    "artifact": "Multi-file implementation. Created: components/chat/ChatPanel.tsx (chat UI), lib/hooks/useChat.ts (chat state hook), updated lib/websocket.ts to handle chat messages. Simple but works great - users can chat while drawing together."
  }
}
```

Commit:
```bash
git add .
git commit -m "feat: add simple text chat for collaboration"
git push origin agent-workspace
```

### Tick 10: Polish and Edge Cases

```json
{
  "thinking": "Polishing the canvas UI - adding color picker, improving drawing tools, fixing cursor sync edge cases when users disconnect.",

  "results": {
    "artifact": "Updated components/canvas/DrawingCanvas.tsx with color picker, improved components/canvas/CursorOverlay.tsx to handle disconnections gracefully, added smooth animations. Tested with 3 browser tabs - works perfectly."
  }
}
```

Commit:
```bash
git add .
git commit -m "style: polish canvas UI and fix cursor sync edge cases"
git push origin agent-workspace
```

### Tick 11: Demo Prep

```json
{
  "thinking": "Final polish - adding README, seed data for demo, testing the full flow.",

  "results": {
    "artifact": "Created comprehensive README.md with demo script, added demo mode with example drawings, tested full demo flow - looks great!"
  }
}
```

Commit:
```bash
git add .
git commit -m "docs: add README and demo preparation"
git push origin agent-workspace
```

## Outcomes

### Before Scope Cut (Tick 8)
- ❌ Stuck on WebRTC for 2 ticks
- ❌ No progress on other features
- ❌ 50% complete with 30% time left
- ❌ Heading toward incomplete demo

### After Scope Cut (Ticks 9-11)
- ✅ Text chat implemented (1 tick)
- ✅ UI polished and beautiful
- ✅ Edge cases fixed
- ✅ Demo-ready with README
- ✅ **100% complete on time**

### Demo Day Results
- ✅ Smooth, impressive real-time collaboration demo
- ✅ Judges loved the cursor tracking and canvas sync
- ✅ Text chat was sufficient for collaboration
- ✅ No one asked about video chat
- ✅ **Won "Best Use of WebSockets" award!**

## Why This Worked

### ✅ Early Detection
- Reviewer identified problem at 70% time, not 90%
- **Lesson**: Monitor progress continuously

### ✅ Specific Recommendations
- Didn't say "work faster"
- Said exactly what to cut and what to keep
- **Lesson**: Be specific and actionable

### ✅ Blocker Identified
- WebRTC was blocking progress for 2 ticks
- **Lesson**: If stuck >2 ticks, cut or pivot

### ✅ Focus on Differentiator
- Real-time cursor/canvas sync WAS the innovation
- Video chat was not core to this
- **Lesson**: Know what makes your project unique

### ✅ Smart Substitution
- Instead of complex WebRTC → simple text chat
- Still shows collaboration, much faster
- **Lesson**: Find simpler alternatives

### ✅ Aggressive But Necessary
- Cut 5 major features in one move
- Kept only what mattered
- **Lesson**: Be ruthless under time pressure

## Key Decisions Analysis

### Decision 1: Cut WebRTC
**Why**: Stuck for 2 ticks, complex, not core to demo
**Alternative**: Could have kept trying → would have failed
**Outcome**: Freed up 3 ticks for success

### Decision 2: Add Simple Chat Instead
**Why**: Still shows collaboration, much simpler
**Alternative**: No communication → less impressive demo
**Outcome**: Enhanced demo without complexity

### Decision 3: Cut User Accounts
**Why**: Not needed for demo
**Alternative**: Build accounts → waste 2 ticks
**Outcome**: Saved 2 ticks for polish

### Decision 4: Move to Demo Phase
**Why**: Core features work, need polish
**Alternative**: Keep adding features → nothing polished
**Outcome**: Professional, polished demo

## Comparison: What If We Hadn't Cut Scope?

### Path A: No Scope Cut (FAILED)
```
Tick 9: Still stuck on WebRTC
Tick 10: Finally abandon WebRTC, try to finish everything else
Tick 11: Rushing, nothing complete, bugs everywhere
Demo Day: Nothing works well, unpolished, no coherent demo
```

### Path B: With Scope Cut (SUCCESS)
```
Tick 9: Simple chat implemented and working
Tick 10: Polish UI, fix edge cases
Tick 11: Demo prep, README, final testing
Demo Day: Smooth demo, impressed judges, won award
```

## Metrics

| Metric | Before Cut | After Cut |
|--------|-----------|-----------|
| Pending todos | 9 | 3 |
| Days stuck | 2 | 0 |
| Completion % | 50% | 100% |
| Features in demo | 0 (incomplete) | 3 (polished) |
| Demo quality | Would have failed | Award-winning |

## Key Takeaways

1. **Cut early**: Don't wait until 90% time elapsed
2. **Cut deep**: Better to cut too much than too little
3. **Identify blockers**: If stuck >2 ticks, cut it
4. **Find alternatives**: Simple substitutes can work well
5. **Focus on core**: What makes your project unique?
6. **Be specific**: Exact features to cut, exact features to keep
7. **Move phases**: Use phase transitions to enforce focus

## Anti-Pattern: What NOT to Do

```json
{
  "thinking": "We just need to work harder and finish everything.",

  "results": {
    "recommendations": [
      "Keep trying WebRTC, it should work eventually",
      "Work faster on all the other features too"
    ],
    "issues": []
  }
}
```

**Why this fails:**
- ❌ Ignores time constraints
- ❌ No specific action
- ❌ No scope management
- ❌ Leads to nothing complete

## Application Template

When you face time pressure:

1. **Calculate**: Time remaining vs work remaining
2. **Identify blockers**: What's been stuck >2 ticks?
3. **Categorize features**: Core vs nice-to-have
4. **Cut ruthlessly**: Remove bottom 70-80%
5. **Find alternatives**: Can simple solutions work?
6. **Polish what's left**: Make it shine
7. **Move to demo**: Enforce focus on completion

Remember: **A working demo of 3 polished features beats an incomplete demo of 10 half-done features!**
