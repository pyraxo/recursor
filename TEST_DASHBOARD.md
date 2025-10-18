# Quick Dashboard Test Guide

## 🚀 Quick Start (3 Terminals)

### Terminal 1: Convex Backend
```bash
cd /Users/aaron/Projects/recursor
pnpm convex:dev
```
✅ Wait for "Watching for file changes..."

### Terminal 2: Dashboard
```bash
cd /Users/aaron/Projects/recursor/apps/dashboard
pnpm dev
```
✅ Wait for "Ready on http://localhost:3002"

### Terminal 3: Test Agent (Optional - for live feed testing)
```bash
cd /Users/aaron/Projects/recursor/packages/agent-engine
export CONVEX_URL=https://industrious-bison-383.convex.cloud
export GROQ_API_KEY=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
pnpm cli create "Live Demo Team"
# Copy the stack_id from output, then:
pnpm cli run <stack_id> 10 3000
```

## 🧪 Test Sequence

### 1. Admin View Tests (http://localhost:3002)

**Default View - Should See:**
- [ ] "Admin Dashboard" heading
- [ ] 5 stats cards (Total, Ideation, Building, Demo, Completed)
- [ ] "Create New Team" form on left
- [ ] "Existing Teams" list on right
- [ ] Monotone dark theme with monospace font

**Create a Team:**
- [ ] Enter name: "Test Alpha"
- [ ] DON'T check "Provide initial project idea" yet
- [ ] Click "Create Team"
- [ ] Team appears instantly in "Existing Teams" list
- [ ] Total Teams count increases
- [ ] Team shows phase "ideation"

**Create Team with Project Idea:**
- [ ] Enter name: "Test Beta"
- [ ] CHECK "Provide initial project idea"
- [ ] Enter title: "Real-time Chat App"
- [ ] Enter description: "A collaborative chat with WebSockets"
- [ ] Click "Create Team"
- [ ] Team appears with project info

**Delete a Team:**
- [ ] Find "Test Alpha" in list
- [ ] Click trash icon
- [ ] Dialog appears with team name
- [ ] UNCHECK "Also delete all related data"
- [ ] Click "Delete Team"
- [ ] Dialog closes
- [ ] Team disappears from list
- [ ] Total count decreases

**Delete with Cascade:**
- [ ] Find "Test Beta" in list
- [ ] Click trash icon
- [ ] CHECK "Also delete all related data"
- [ ] Click "Delete Team"
- [ ] Team and all its data removed

### 2. Observability View Tests

**Switch Views:**
- [ ] Click "Observability" button at top
- [ ] See 3-column layout: Teams | Live Feed | Detail

**With No Running Agents:**
- [ ] Live Feed shows "No agent activity yet"
- [ ] Shows helpful message about starting teams

**With Running Agents (Terminal 3):**
- [ ] Live Feed updates automatically
- [ ] Each trace shows:
  - Timestamp (e.g., "2:30:45 PM")
  - Team name (e.g., "Live Demo Team")
  - Agent type badge (e.g., "planner")
  - Thought text
  - Action (in monospace)
- [ ] New traces appear at top (auto-scroll)
- [ ] Cards have hover effect
- [ ] Click "View result" to expand details

**Select a Team:**
- [ ] Click a team in left column
- [ ] Detail pane shows:
  - Team name and phase
  - Project title/description
  - Todos list
  - Artifacts list
  - Message timeline

### 3. UI Component Tests

**Button Variants:**
- [ ] "Admin" button - white bg when active
- [ ] "Observability" button - ghost style when inactive
- [ ] "Create Team" - primary style
- [ ] "Delete Team" - red destructive style
- [ ] "Cancel" - outlined style
- [ ] Trash icon - ghost with red hover

**Form Elements:**
- [ ] Input fields have border
- [ ] Focus shows ring effect
- [ ] Labels align with inputs
- [ ] Textarea expands properly
- [ ] Checkboxes toggle state
- [ ] Checkboxes show check icon when checked

**Cards:**
- [ ] Have subtle border
- [ ] Consistent spacing (padding: 6)
- [ ] Title stands out
- [ ] Content properly formatted

**Dialog:**
- [ ] Darkens background (backdrop)
- [ ] Centers on screen
- [ ] X button in top-right
- [ ] Can close by clicking backdrop
- [ ] Footer buttons right-aligned

### 4. Real-time Tests

**Create Team in One Browser Tab:**
- [ ] Open http://localhost:3002 in Tab 1
- [ ] Open http://localhost:3002 in Tab 2
- [ ] Create team in Tab 1
- [ ] Tab 2 updates automatically (no refresh)
- [ ] Stats update in both tabs

**Delete Team Cross-Tab:**
- [ ] Delete team in Tab 2
- [ ] Tab 1 updates automatically
- [ ] Stats update everywhere

**Live Feed Multi-Tab:**
- [ ] Both tabs on Observability view
- [ ] Run agents in Terminal 3
- [ ] Both tabs show same traces
- [ ] Updates happen simultaneously

## 🐛 Expected Behaviors

### Loading States
- "Loading..." text while queries resolve
- "Creating..." / "Deleting..." button text during mutations

### Empty States
- "No teams created yet" when no teams exist
- "No agent activity yet" when no traces exist
- "No todos yet" / "No artifacts yet" in detail view

### Error Handling
- Errors logged to browser console
- Mutations fail gracefully
- Form stays open on error

## ✅ Success Criteria

All of these should work:
- ✅ Can create teams with and without project ideas
- ✅ Can delete teams with and without cascade
- ✅ Stats update in real-time
- ✅ Teams list updates in real-time
- ✅ Live feed shows agent traces
- ✅ Live feed auto-scrolls on new data
- ✅ Can expand trace results
- ✅ All shadcn components render correctly
- ✅ Theme is monotone monospace dark
- ✅ No TypeScript errors
- ✅ No browser console errors (except expected CORS warnings)

## 🔍 If Something Doesn't Work

1. **Check Terminal 1 (Convex)**:
   - Should say "Watching for file changes..."
   - No error messages

2. **Check Terminal 2 (Dashboard)**:
   - Should say "Ready on http://localhost:3002"
   - No compilation errors

3. **Check Browser Console (F12)**:
   - Look for red errors
   - Note any failed network requests

4. **Try Hard Refresh**:
   - Mac: Cmd + Shift + R
   - Windows/Linux: Ctrl + Shift + R

5. **Restart Everything**:
   - Stop both terminals (Ctrl+C)
   - Start Convex first (Terminal 1)
   - Then start Dashboard (Terminal 2)
   - Hard refresh browser

## 📊 Performance Expectations

- Page load: < 2 seconds
- Create team: < 500ms
- Delete team: < 500ms
- Live feed update: < 100ms (real-time)
- Stats update: < 100ms (real-time)

## 🎯 Main Features to Demo

1. **Admin Dashboard** - Full CRUD for teams
2. **Real-time Updates** - No manual refresh needed
3. **Live Feed** - Stream agent thoughts and actions
4. **Clean UI** - Minimal, dark, monospace theme
5. **Responsive** - Works at different screen sizes
6. **Type-safe** - Full TypeScript with Convex types

---

**Report**: If you find any issues not covered here, document them and we'll fix!

