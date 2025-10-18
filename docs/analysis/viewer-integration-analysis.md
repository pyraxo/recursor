# 📊 COMPREHENSIVE VIEWER INTEGRATION ANALYSIS & IMPLEMENTATION PLAN

## 🔍 EXECUTIVE SUMMARY

**CRITICAL FINDING**: The `apps/viewer` application **DOES NOT have its own convex/ folder**. It is **ALREADY FULLY INTEGRATED** with `packages/convex` and shares the same Convex deployment as the dashboard and web apps.

**NO MIGRATION NEEDED** - The integration is already complete!

---

## 📋 CURRENT STATE ANALYSIS

### 1. Convex Architecture Overview

```
Repository Structure:
├── convex/                         ❌ REFERENCE ONLY (not active deployment)
│   ├── schema.ts                   📝 Simplified schema copy
│   ├── agents.ts                   📝 Basic function definitions
│   ├── artifacts.ts                📝 No execution logic
│   └── ...                         📝 Created in commit 81e1b08 for documentation
│
├── packages/convex/                ✅ ACTIVE DEPLOYMENT
│   ├── convex/
│   │   ├── schema.ts               ✅ Full schema with execution state tracking
│   │   ├── agents.ts               ✅ Complete agent stack operations
│   │   ├── agentExecution.ts       ✅ Orchestration logic (NOT in root convex/)
│   │   ├── crons.ts                ✅ 5-second execution cycle (NOT in root convex/)
│   │   ├── lib/agents/             ✅ Agent implementations (NOT in root convex/)
│   │   └── _generated/             ✅ Auto-generated types & API
│   ├── package.json                ✅ Workspace package configuration
│   └── .env.local                  ✅ Deployment: industrious-bison-383.convex.cloud
│
└── apps/
    ├── dashboard/                  ✅ Uses @recursor/convex
    ├── web/                        ✅ Uses @recursor/convex
    └── viewer/                     ✅ Uses @recursor/convex (NO own convex/ folder!)
        ├── package.json            → depends on "@recursor/convex": "workspace:*"
        ├── components/             → import { api } from "@recursor/convex/_generated/api"
        └── NO convex/ folder!      ❌ This folder does NOT exist
```

### 2. Viewer App Integration Status

#### ✅ ALREADY INTEGRATED - Evidence:

**A. Package Dependencies** (`apps/viewer/package.json`):
```json
{
  "dependencies": {
    "@recursor/convex": "workspace:*",  // ← Uses main Convex package
    "convex": "^1.28.0",
    "react": "19.1.0",
    // ...
  }
}
```

**B. All 14 Components Import from @recursor/convex**:
```typescript
// apps/viewer/components/World/TeamPanel/ReadmeTab.tsx
import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";

const stack = useQuery(api.agents.getStack, { stackId });
const projectIdea = useQuery(api.project_ideas.getByStack, { stackId });
```

**C. Shared Convex Deployment**:
- **Root .env.local**: `CONVEX_URL=https://industrious-bison-383.convex.cloud`
- **Turbo.json**: Propagates `NEXT_PUBLIC_CONVEX_URL` to all apps via `globalEnv`
- **Same deployment** used by dashboard (port 3002), web (port 3000), and viewer (port 3003)

#### 📊 Component → Query Mapping (All Using packages/convex)

| Component | Convex Query | Data Source | Status |
|-----------|-------------|-------------|---------|
| `WorldMap.tsx` | `api.agents.listStacks` | agent_stacks table | ✅ Ready |
| `TopBar.tsx` | `api.agents.listStacks` | agent_stacks (for elapsed time) | ✅ Ready |
| `ReadmeTab.tsx` | `api.agents.getStack`<br>`api.project_ideas.getByStack` | agent_stacks<br>project_ideas | ✅ Ready |
| `ChatTab.tsx` | `api.messages.getTimeline`<br>`api.messages.send` | messages table | ✅ Ready |
| `LivestreamTab.tsx` | `api.traces.getRecent`<br>`api.todos.getByStack`<br>`api.agents.getStack` | agent_traces<br>todos<br>agent_states | ✅ Ready |
| `MetricsBar.tsx` | `api.agents.listStacks` | agent_stacks (count, time) | ✅ Ready |
| `LeaderboardTable.tsx` | `api.agents.listStacks` | agent_stacks | ⚠️ Scores are MOCK |
| `ProgressChart.tsx` | `api.agents.listStacks` | agent_stacks | ⚠️ Progress is MOCK |

---

## 🎯 WHAT WAS ACTUALLY ADDED IN COMMIT 81e1b08

The commit "Add viewer app and improve Convex query compatibility" did three things:

### 1. Created apps/viewer (Pixel-Art Spectator UI)
- ✅ World map with 5 team positions
- ✅ Dashboard with metrics/leaderboard/charts
- ✅ Real-time team panels (README/Chat/Livestream tabs)
- ✅ Connected to existing `packages/convex` deployment

### 2. Added Root convex/ Folder (Documentation Reference)
- 📝 Simplified schema copy (93 lines vs 138 lines in packages/convex)
- 📝 Basic function files (no execution logic, crons, or agent libraries)
- 📝 **Purpose**: Quick reference at repository root level
- ❌ **NOT** an active deployment
- ❌ **NOT** used by any application

### 3. Enhanced packages/convex with Backward Compatibility
Added viewer-friendly query aliases:

**packages/convex/convex/project_ideas.ts:39**
```typescript
export const getByStack = get;  // Alias for viewer
```

**packages/convex/convex/todos.ts:39**
```typescript
export const getByStack = list;  // Alias for viewer
```

**packages/convex/convex/traces.ts**
- Split `getRecent` into stack-specific (`getRecent(stackId)`) and global (`getRecentAll()`)

---

## 🔍 ROOT CONVEX vs PACKAGES CONVEX - DETAILED COMPARISON

### Root `/convex/` (Reference Copy)

| Aspect | Details |
|--------|---------|
| **Purpose** | Documentation/reference for schema structure |
| **Type** | Standalone .ts files (no package.json) |
| **Schema** | Basic 93-line version (missing execution state fields) |
| **Functions** | Read-only copies (agents, artifacts, messages, todos, traces, project_ideas) |
| **Execution Logic** | ❌ None (no agentExecution.ts, no crons.ts) |
| **Agent Libraries** | ❌ None (no lib/ directory) |
| **Generated Files** | ❌ None (no _generated/ directory) |
| **Environment** | ❌ None (no .env.local) |
| **Deployment** | ❌ NOT deployed |
| **Used By** | ❌ No applications reference this |

### Packages `/packages/convex/` (Active Deployment)

| Aspect | Details |
|--------|---------|
| **Purpose** | Production backend for all apps |
| **Type** | Full pnpm workspace package |
| **Schema** | Enhanced 138-line version with execution tracking |
| **Functions** | Complete API (all queries, mutations, actions) |
| **Execution Logic** | ✅ agentExecution.ts, crons.ts (5-second cycle) |
| **Agent Libraries** | ✅ lib/agents/ (planner, builder, communicator, reviewer) |
| **Generated Files** | ✅ _generated/ (api.ts, server.ts, dataModel.ts) |
| **Environment** | ✅ .env.local with deployment ID |
| **Deployment** | ✅ https://industrious-bison-383.convex.cloud |
| **Used By** | ✅ dashboard, web, **viewer** |

### Key Schema Differences

**Root convex/schema.ts** (93 lines) - Basic:
```typescript
agent_stacks: {
  participant_name: string
  phase: string
  created_at: number
  // Missing: execution_state, current_agent_index, process_id, etc.
}
```

**packages/convex/convex/schema.ts** (138 lines) - Enhanced:
```typescript
agent_stacks: {
  participant_name: string
  phase: string
  created_at: number
  execution_state: "idle" | "running" | "paused" | "stopped"  // ← Added
  current_agent_index: number                                  // ← Added
  last_executed_at: number                                     // ← Added
  process_id: string                                           // ← Added
  started_at: number                                           // ← Added
  paused_at: number                                            // ← Added
  stopped_at: number                                           // ← Added
}
```

---

## ✅ VERIFICATION: ALL VIEWER FUNCTIONS ARE AVAILABLE

### Functions the Viewer Requires

| Function | Used By | Available in packages/convex? |
|----------|---------|-------------------------------|
| `api.agents.listStacks` | WorldMap, TopBar, Metrics, Leaderboard, Chart | ✅ Yes |
| `api.agents.getStack` | ReadmeTab, LivestreamTab | ✅ Yes |
| `api.project_ideas.getByStack` | ReadmeTab | ✅ Yes (alias added in 81e1b08) |
| `api.messages.getTimeline` | ChatTab | ✅ Yes |
| `api.messages.send` | ChatTab (mutation) | ✅ Yes |
| `api.todos.getByStack` | LivestreamTab | ✅ Yes (alias added in 81e1b08) |
| `api.traces.getRecent` | LivestreamTab | ✅ Yes (refactored in 81e1b08) |

**Result**: ✅ **ALL FUNCTIONS AVAILABLE** - No migration needed!

---

## 🚀 CURRENT STATUS & WHAT NEEDS TO BE DONE

### ✅ What's Already Working

1. **Viewer App Running**: Successfully started on port 3003
2. **Convex Integration**: All components import from `@recursor/convex`
3. **Environment Configuration**: `NEXT_PUBLIC_CONVEX_URL` propagated via turbo.json
4. **Schema Compatibility**: All required tables exist in packages/convex
5. **Function Compatibility**: All required queries/mutations available
6. **Real-time Subscriptions**: `useQuery()` hooks properly configured

### ⚠️ What's Currently Mock/Placeholder

1. **Leaderboard Scores** (`LeaderboardTable.tsx`):
   - Currently generates random scores (60-100) for Technical, Execution, Polish, Wow Factor
   - Formula: `Math.floor(60 + Math.random() * 40)`
   - **Recommendation**: Create a scoring system in Convex or keep as visualization demo

2. **Progress Chart** (`ProgressChart.tsx`):
   - Currently generates mock time-series data
   - Formula: `baseScore + (growth * index) + noise`
   - **Recommendation**: Track real metrics over time (todos completed, artifacts built, etc.)

3. **Artifact Display** (`ReadmeTab.tsx:57-66`):
   - Shows placeholder: "Project artifacts will appear here when ready"
   - Artifacts table exists in Convex but not rendered
   - **Recommendation**: Fetch `api.artifacts.getLatest` and display HTML/JS previews

4. **Speech Bubbles** (`SpeechBubbles.tsx`):
   - Currently shows generic messages ("Planning...", "Building...", etc.)
   - **Recommendation**: Fetch real agent traces and show actual thoughts/actions

### ❌ What's Missing (Optional Enhancements)

1. **Viewer-Specific .env.local** (optional but recommended):
   - Currently relies on root .env.local + turbo.json propagation
   - **Recommendation**: Create `apps/viewer/.env.local` for local overrides

2. **Real Data in Database**:
   - Need to create agent stacks to populate viewer
   - **Recommendation**: Use CLI to create test agents or wait for production data

3. **Enhanced Artifact Rendering**:
   - Current schema supports `type: 'html_js' | 'video' | 'external_link'`
   - Viewer shows placeholder instead of rendering
   - **Recommendation**: Add iframe or sandboxed HTML preview

---

## 📋 RECOMMENDED IMPLEMENTATION PLAN

Since the viewer is **already integrated**, here's what we should focus on:

### Phase 1: Environment Setup (5 minutes)

**Goal**: Ensure viewer has explicit environment configuration

**Tasks**:
1. Create `apps/viewer/.env.local`:
   ```bash
   NEXT_PUBLIC_CONVEX_URL=https://industrious-bison-383.convex.cloud
   ```

2. Verify viewer connects to Convex:
   - Visit http://localhost:3003
   - Open browser console
   - Check for Convex WebSocket connection
   - Verify no CORS or connection errors

### Phase 2: Data Population (10 minutes)

**Goal**: Create real agent stacks to populate the viewer

**Option A - Use Existing CLI**:
```bash
cd packages/agent-engine
pnpm cli create "Team Alpha"
pnpm cli create "Team Beta"
pnpm cli create "Team Gamma"
pnpm cli create "Team Delta"
pnpm cli create "Team Epsilon"
```

**Option B - Use Convex Dashboard**:
1. Visit https://dashboard.convex.dev
2. Manually insert test data into `agent_stacks` table
3. System auto-creates 4 agent_states per stack

**Expected Result**: Viewer shows 5 teams on world map

### Phase 3: Enhance Artifact Display (30 minutes)

**Goal**: Replace placeholder with real artifact rendering

**Implementation**:

**Step 1**: Add artifact query to `ReadmeTab.tsx`:
```typescript
// Add after line 13:
const artifact = useQuery(api.artifacts.getLatest, { stackId });
```

**Step 2**: Replace placeholder section (lines 57-66) with:
```typescript
{artifact && artifact.type === 'html_js' && (
  <div className="border-t-2 border-[var(--panel-border)] pt-4">
    <h4 className="text-[var(--accent-secondary)] font-bold mb-2">
      See the Project (v{artifact.version})
    </h4>
    <div className="bg-white p-3 border-2 border-[var(--panel-border)] rounded">
      <iframe
        srcDoc={artifact.content}
        className="w-full h-96 border-0"
        sandbox="allow-scripts"
        title="Project Artifact"
      />
    </div>
  </div>
)}
```

**Expected Result**: Shows live preview of builder-generated HTML/JS artifacts

### Phase 4: Enhance Speech Bubbles (20 minutes)

**Goal**: Show real agent activity instead of generic messages

**Implementation**:

**Step 1**: Modify `SpeechBubbles.tsx` to fetch real traces:
```typescript
// Add at top:
import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";

// Inside component:
const allStacks = useQuery(api.agents.listStacks);
const recentTraces = useQuery(api.traces.getRecentAll, { limit: 50 });

// Map traces to agent positions and display latest thought/action
```

**Expected Result**: Bubbles show actual agent reasoning ("Analyzing project requirements...", "Implementing authentication system...", etc.)

### Phase 5: Real Metrics (Optional - 45 minutes)

**Goal**: Replace mock leaderboard and charts with real data

**Implementation**:

**Step 1**: Add scoring fields to schema:
```typescript
// In packages/convex/convex/schema.ts
agent_stacks: {
  // ... existing fields
  metrics: v.optional(v.object({
    todos_completed: v.number(),
    artifacts_built: v.number(),
    messages_sent: v.number(),
    execution_time_ms: v.number(),
  }))
}
```

**Step 2**: Create aggregation queries:
```typescript
// packages/convex/convex/metrics.ts
export const getStackMetrics = query({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_stack", q => q.eq("stack_id", args.stackId))
      .filter(q => q.eq(q.field("status"), "completed"))
      .collect();

    const artifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_stack", q => q.eq("stack_id", args.stackId))
      .collect();

    // Calculate score based on real activity
    return {
      technical: calculateTechnicalScore(todos, artifacts),
      execution: calculateExecutionScore(todos),
      polish: calculatePolishScore(artifacts),
      wowFactor: calculateWowFactor(artifacts, todos)
    };
  }
});
```

**Step 3**: Update `LeaderboardTable.tsx` to use real scores

**Expected Result**: Leaderboard reflects actual agent performance

---

## 🎯 CLARIFICATION ON USER REQUEST

### What the User Asked For:
> "I want to migrate these information into the current convex deployment - BUT as much as possible I want the viewer to use pre-existing schema and information from packages/convex!"

### Reality:
✅ **The viewer ALREADY uses packages/convex exclusively!**

There is NO separate viewer convex deployment to migrate. The confusion likely stems from:

1. **Root /convex/ folder existence** → But this is just a reference copy, not used by viewer
2. **Assumption that new app = new backend** → But viewer reuses `@recursor/convex` package
3. **Commit message mentioning "root convex/ directory"** → Created for documentation, not deployment

### What the User ACTUALLY Wants (Interpretation):

Based on the request to "propagate actual teams" and "use information provided by convex," I believe the user wants:

1. **Populate viewer with REAL data from Convex database** ← We need to create agent stacks
2. **Replace mock UI elements** (leaderboard scores, charts) **with real metrics** ← Optional enhancement
3. **Show actual artifacts built by agents** ← Need to implement artifact rendering
4. **Display real agent activity** (thoughts, actions) **instead of placeholders** ← Use traces

---

## 🔧 IMMEDIATE ACTION ITEMS (Priority Order)

### Priority 1: Environment & Verification (NOW)
- [ ] Create `apps/viewer/.env.local` with `NEXT_PUBLIC_CONVEX_URL`
- [ ] Test viewer at http://localhost:3003
- [ ] Verify Convex connection in browser console
- [ ] Confirm no errors or warnings

### Priority 2: Data Population (NEXT)
- [ ] Create 5 test agent stacks using CLI or Convex dashboard
- [ ] Verify teams appear on viewer world map
- [ ] Check that team panels show correct data
- [ ] Test chat functionality (send message to a team)

### Priority 3: Artifact Display (HIGH VALUE)
- [ ] Add `api.artifacts.getLatest` query to ReadmeTab
- [ ] Replace placeholder with iframe rendering
- [ ] Test with sample HTML/JS artifact
- [ ] Add error handling for missing artifacts

### Priority 4: Real Activity Feed (MEDIUM VALUE)
- [ ] Fetch real traces in SpeechBubbles component
- [ ] Display latest agent thoughts/actions
- [ ] Add rotation logic to cycle through recent activity
- [ ] Style bubbles to match agent colors

### Priority 5: Real Metrics (OPTIONAL)
- [ ] Design scoring algorithm based on actual activity
- [ ] Create metrics aggregation queries
- [ ] Update LeaderboardTable to use real scores
- [ ] Add time-series tracking for ProgressChart

---

## 📊 ARCHITECTURE DECISION RECORD

### Decision: Single Convex Deployment for All Apps

**Status**: ✅ IMPLEMENTED (Already in place)

**Context**:
- Monorepo with 3 frontend apps (dashboard, web, viewer)
- Single shared backend (packages/convex)
- Real-time collaboration between agents and viewers

**Decision**:
All applications share a single Convex deployment via `@recursor/convex` workspace package.

**Consequences**:

✅ **Benefits**:
- Single source of truth for all data
- Real-time updates propagate to all apps instantly
- Simplified deployment (one backend, not three)
- Easier schema evolution (one place to update)
- Shared authentication and permissions
- Lower Convex costs (one deployment)

⚠️ **Trade-offs**:
- Tightly coupled apps (schema changes affect all)
- Single point of failure (backend down = all apps down)
- Harder to version independently (breaking changes affect all apps)

✅ **Mitigation**:
- Use TypeScript types from `_generated/` to catch breaking changes at compile time
- Implement backward-compatible query aliases (e.g., `getByStack`)
- Maintain root /convex/ as documentation for schema reference

---

## 📚 APPENDIX: FILE LOCATIONS

### Viewer App Files
```
apps/viewer/
├── app/
│   ├── page.tsx                                    # World map entry point
│   ├── dashboard/page.tsx                          # Dashboard entry point
│   └── layout.tsx                                  # ConvexClientProvider setup
│
├── components/
│   ├── ConvexClientProvider.tsx                    # Convex client initialization
│   ├── World/
│   │   ├── WorldMap.tsx                           # Query: api.agents.listStacks
│   │   ├── TopBar.tsx                             # Query: api.agents.listStacks
│   │   ├── SidePanel.tsx                          # Displays selected team panel
│   │   ├── SpeechBubbles.tsx                      # TODO: Use api.traces.getRecentAll
│   │   └── TeamPanel/
│   │       ├── ReadmeTab.tsx                      # Queries: getStack, getByStack
│   │       ├── ChatTab.tsx                        # Queries: getTimeline, send
│   │       └── LivestreamTab.tsx                  # Queries: getRecent, getByStack
│   └── Dashboard/
│       ├── MetricsBar.tsx                         # Query: api.agents.listStacks
│       ├── LeaderboardTable.tsx                   # TODO: Use real metrics
│       └── ProgressChart.tsx                      # TODO: Use real time-series data
│
└── package.json                                   # Dependency: @recursor/convex
```

### Convex Backend Files
```
packages/convex/convex/
├── schema.ts                                      # Database schema (enhanced)
├── agents.ts                                      # Stack operations
├── messages.ts                                    # Communication
├── todos.ts                                       # Task management
├── project_ideas.ts                               # Project concepts
├── artifacts.ts                                   # Build outputs
├── traces.ts                                      # Execution logs
├── agentExecution.ts                              # Orchestration (NOT in root convex/)
├── crons.ts                                       # 5-second execution cycle (NOT in root convex/)
└── lib/
    ├── llmProvider.ts                             # LLM integration
    └── agents/
        ├── planner.ts                             # Planner agent
        ├── builder.ts                             # Builder agent
        ├── communicator.ts                        # Communicator agent
        └── reviewer.ts                            # Reviewer agent
```

### Reference Files (Not Used by Viewer)
```
convex/                                            # ❌ NOT ACTIVE DEPLOYMENT
├── schema.ts                                      # Simplified reference
├── agents.ts                                      # Basic functions only
└── ...                                            # Documentation copies
```

---

## 🎬 CONCLUSION

### Summary

1. **NO MIGRATION NEEDED** - The viewer is already fully integrated with `packages/convex`
2. **ROOT /convex/ IS REFERENCE ONLY** - It's not an active deployment
3. **ALL FUNCTIONS AVAILABLE** - Viewer has access to complete Convex API
4. **VIEWER RUNNING SUCCESSFULLY** - On port 3003, connected to shared deployment

### Next Steps

**To make the viewer fully functional with real data:**

1. ✅ Viewer app is running (http://localhost:3003)
2. 🔧 Create `.env.local` in `apps/viewer/` (optional but recommended)
3. 📊 Populate database with agent stacks (5 teams recommended)
4. 🎨 Enhance artifact display (replace placeholder with iframe)
5. 💬 Show real agent activity (use traces instead of generic messages)
6. 📈 Add real metrics (optional - replace mock scores with actual performance)

### Recommendations

**Immediate** (Do this first):
- Create `apps/viewer/.env.local`
- Create 5 test agent stacks
- Verify viewer displays teams correctly

**Short-term** (High value, low effort):
- Implement artifact rendering in ReadmeTab
- Show real traces in SpeechBubbles
- Test full viewer workflow

**Long-term** (Optional enhancements):
- Build real-time scoring system
- Add time-series metrics tracking
- Implement voting/judging features
- Add artifact download/sharing

---

**Document Version**: 1.0
**Last Updated**: 2025-10-18
**Author**: Claude Code Analysis
**Status**: ✅ Analysis Complete - Ready for Implementation
