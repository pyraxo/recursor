# Recursor Living Scratchpad

**Last Updated**: 2025-10-18  
**Current Phase**: Testing & Validation Ready → Frontend Development

---

## 🎯 Quick Status Overview

- **Backend Infrastructure**: ✅ Complete
- **Core Agent System**: ✅ Complete
- **Deployment & Environment**: ✅ Complete
- **Observability Dashboard**: ✅ Complete (needs play/pause controls)
- **Autonomous Execution**: 🚨 CRITICAL - NOT STARTED (blocks everything else)
- **Live Event Frontend**: ❌ Not Started
- **Discord Integration**: ❌ Not Started
- **Video/Media**: ❌ Not Started
- **Judging System**: ❌ Not Started

---

## ✅ COMPLETED (Foundation Phase)

### Backend & Database (Convex)

- ✅ Complete schema with 7 tables (agent_stacks, agent_states, project_ideas, todos, messages, artifacts, agent_traces)
- ✅ All Convex functions (agents.ts, messages.ts, artifacts.ts, todos.ts, project_ideas.ts, traces.ts)
- ✅ Type-safe API with auto-generated types
- ✅ Real-time subscriptions built-in

### Agent Engine Package

- ✅ Base agent class with shared functionality
- ✅ Planner agent (strategic planning, roadmap, todo management)
- ✅ Builder agent (HTML/JS artifact generation)
- ✅ Communicator agent (message handling, responses)
- ✅ Reviewer agent (progress analysis, recommendations)
- ✅ Memory system (short-term context + long-term memory via Convex)
- ✅ Messaging system (broadcasts + direct messages)
- ✅ HTML artifact builder with LLM integration
- ✅ Orchestrator (tick-based coordination of 4 agents)
- ✅ LLM configuration (Groq primary, OpenAI/Gemini fallback)
- ✅ CLI tool for creating/running/monitoring agents

### Documentation

- ✅ PRD (prd.md)
- ✅ Multi-agent implementation plan
- ✅ Implementation summary
- ✅ Package README
- ✅ This scratchpad

### Deployment & Environment

- ✅ Convex deployment initialized (`npx convex dev`)
- ✅ Environment variables configured (.env.local)
- ✅ API keys set up (GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY)
- ✅ Convex schema pushed and types generated
- ✅ Convex package created (`packages/convex`) with all backend functions
- ✅ Schema includes execution state management (idle, running, paused, stopped)

### Observability Dashboard (`apps/dashboard`)

- ✅ Admin view with team creation and management
- ✅ Live stats dashboard (total teams, phase breakdown)
- ✅ Real-time agent trace feed (auto-scrolling)
- ✅ Agent list with phase indicators
- ✅ Agent detail view (project, todos, artifacts, message timeline)
- ✅ Team creation form (with optional project idea)
- ✅ Team deletion with confirmation dialog
- ✅ Convex React hooks integration for real-time updates
- ✅ Three-column observability layout (Teams | Live Feed | Detail)
- ✅ Runs on port 3002

---

## 🚧 IN PROGRESS / NEXT UP

### Autonomous Agent Execution System (CRITICAL)

**Key Architectural Change Needed**:

- Currently: Agent-engine orchestrator designed for CLI usage (`pnpm cli run`)
- Required: Agents run autonomously via Convex scheduled functions
- When: Starts automatically when `pnpm dev` runs, continues in background
- Control: Play/Pause/Stop via dashboard UI (updates `execution_state` in DB)

**Why This Blocks Everything**: Can't properly test, demo, or scale without autonomous execution

- [ ] **CRITICAL**: Create Convex scheduled function for agent orchestration
  - [ ] Runs agent tick loops automatically (every 5-10 seconds)
  - [ ] Respects execution_state (running, paused, stopped)
  - [ ] Calls orchestrator logic from `agent-engine` package
- [ ] **CRITICAL**: Build Play/Pause UI component (IN PROGRESS per user)
  - [ ] Global play/pause for all agents
  - [ ] Per-team play/pause controls
  - [ ] Status indicators (running, paused, stopped)
- [ ] **CRITICAL**: Connect agent-engine orchestrator to Convex
  - [ ] Update orchestrator to use Convex mutations/queries
  - [ ] Remove CLI dependency for agent execution
  - [ ] Make it callable from Convex scheduled functions

### Testing & Validation (Ready after Autonomous Execution)

- [ ] Test agents run automatically on `pnpm dev`
- [ ] Verify play/pause controls work
- [ ] Test single agent through full tick cycle
- [ ] Verify artifacts are generated correctly
- [ ] Test messaging between 2+ agent stacks
- [ ] Monitor costs during test runs

---

## 📋 TODO: MVP (Phase 1)

### 1. IMMEDIATE NEXT STEPS (Autonomous Execution)

- [x] ~~Run `npx convex dev` to initialize deployment~~ ✅ DONE
- [x] ~~Create `.env.local` with Convex URL and API keys~~ ✅ DONE
- [x] ~~Build observability dashboard~~ ✅ DONE
- [ ] **DO NOW**: Create Convex scheduled function (`orchestration.ts`)
  - Runs every 5-10 seconds
  - Finds all agent_stacks with `execution_state: 'running'`
  - Executes tick for each stack using agent-engine
  - Updates traces, artifacts, todos, messages in Convex
- [ ] **DO NOW**: Refactor agent-engine orchestrator to work with Convex
  - Remove dependency on CLI
  - Export function that can be called from Convex actions
  - Accept stackId and run one tick
- [ ] **DO NOW**: Build Play/Pause controls in dashboard
  - Add to Admin view
  - Mutation to update execution_state
  - Visual indicators for running/paused/stopped states
- [ ] **TEST**: Create a team and start it running
- [ ] **TEST**: Verify agents execute autonomously
- [ ] **TEST**: Verify play/pause works

### 2. FRONTEND - Live Event Experience (High Priority)

Per PRD sections 5 & 6:

#### Landing Page

- [ ] Create `apps/web` as main public site (or repurpose existing)
- [ ] Hero section: "Watch hundreds of agents build live"
- [ ] Live stats display (total agents, builds in progress, demos published, votes)
- [ ] Distinctive aesthetic (NOT purple gradient - ASCII/dot motifs, Cloudflare-inspired)
- [ ] CTA to enter live event

#### Live Event Dashboard

- [ ] Global activity feed (real-time agent updates, messages, milestones)
- [ ] Search/filter by topic, track, tags
- [ ] Agent/team cards showing:
  - [ ] Name, avatar, idea summary, current phase
  - [ ] Buttons: View Project, Chat, Vote
- [ ] Project detail page:
  - [ ] Idea statement, progress timeline, team members
  - [ ] Embedded prototype (iframe for HTML apps)
  - [ ] Demo video player (placeholder for now)
  - [ ] Feedback thread (visitor ↔ agent chat)
  - [ ] Vote button (with anti-spam)
- [ ] Leaderboard page:
  - [ ] Overall rankings
  - [ ] Track-specific rankings
  - [ ] Toggle judge vs community vs blended

#### Real-time Integration

- [ ] Integrate Convex React hooks (`useQuery`, `useMutation`)
- [ ] Live feed auto-updates
- [ ] Optimistic UI updates
- [ ] WebSocket/SSE fallback if needed

### 3. OBSERVABILITY DASHBOARD ENHANCEMENTS (Low Priority)

Dashboard exists and works! Future enhancements:

- [x] ~~Create `apps/dashboard`~~ ✅ DONE
- [x] ~~Live agent trace feed~~ ✅ DONE
- [x] ~~Agent detail view~~ ✅ DONE
- [x] ~~Message timeline visualization~~ ✅ DONE
- [x] ~~State inspector (ideas, todos, artifacts)~~ ✅ DONE
- [ ] Cost tracking dashboard (calculate from traces)
- [ ] Performance metrics (latency, token usage, error rates)
- [ ] Individual sub-agent views (Planner, Builder, Communicator, Reviewer)
- [ ] Memory/context visualization (expand current state display)

### 4. DISCORD DATA INGESTION (Medium Priority)

Per PRD section 6:

- [ ] Discord bot or API integration
- [ ] Import messages from team-formation channel
- [ ] LLM-based parsing (extract ideas, teams, skills)
- [ ] Pseudonymization toggle
- [ ] Dry-run preview before import
- [ ] Batch agent creation from Discord data
- [ ] Consent workflow (if using real handles)

### 5. DEMO VIDEO GENERATION (Low Priority - MVP)

Per PRD section 6:

- [ ] FAL integration for video generation
- [ ] Script/voiceover generation (LLM)
- [ ] Screen capture or storyboard scenes
- [ ] Retry/fallback logic
- [ ] Store video URLs in artifacts table
- [ ] Video player component in project pages

### 6. JUDGING SYSTEM (Medium Priority)

Per PRD sections 6 & Appendix:

- [ ] LLM-as-judge implementation
- [ ] Rubric definition (problem fit, execution, UX, originality, impact)
- [ ] Scoring functions (numeric + qualitative feedback)
- [ ] Multiple judging rounds (checkpoint, final)
- [ ] Calibration tool (optional: train on real judge notes)
- [ ] Store scores in database (new table or extend projects)

### 7. VOTING & LEADERBOARDS (Medium Priority)

Per PRD section 6:

- [ ] Visitor voting API (rate limited)
- [ ] IP-based anti-spam
- [ ] Optional account sign-in for verified votes
- [ ] Real-time leaderboard calculation
- [ ] Vote weight system (community vs judge)
- [ ] Track-based filtering

### 8. MODERATION (Low Priority - MVP)

Per PRD section 6:

- [ ] Content moderation pipeline (LLM + blocklists)
- [ ] Profanity filters
- [ ] Anti-spam cooldowns
- [ ] Admin override controls (mute/ban)
- [ ] Message flagging system

### 9. ADMIN CONSOLE (Low Priority - Can Use CLI for Now)

Per PRD section 5:

- [ ] Discord import UI
- [ ] Agent batch generator with templates
- [ ] Simulation controls (phase, tick rate, pause/resume)
- [ ] Prompt/rubric editors
- [ ] Moderation dashboard
- [ ] Cost/usage observability

---

## 🔮 FUTURE (Post-MVP)

### Phase 2 Enhancements

- [ ] "Vibecode Portal" for standardized project hosting
- [ ] Incremental mode with visible checkpoints
- [ ] Sponsor tracks integration
- [ ] Track-based leaderboards
- [ ] Enhanced analytics

### Phase 3: 3D Map

- [ ] Three.js scene with agent nodes/particles
- [ ] Visual movement during phases
- [ ] Click-through to team pages
- [ ] Simulated interaction events

### Advanced Features

- [ ] External build platforms (v0, Lovable, Replit)
- [ ] Multi-file project support
- [ ] Search/web tools for agents
- [ ] Code execution sandboxes
- [ ] Bi-directional Discord bridge (requires permissions)
- [ ] mem0 integration for sophisticated memory
- [ ] MCP server integration via Smithery

---

## 🐛 KNOWN ISSUES / TECH DEBT

- None yet (system untested)

---

## 💰 COST TRACKING

### Estimated Costs (Per IMPLEMENTATION_SUMMARY)

- **Single agent (8 hours)**: <$2
- **10 agents (8 hours)**: ~$10-25
- **100 agents (8 hours)**: ~$100-250

### Actual Costs

- TBD (need to run first tests)

---

## 📊 SUCCESS METRICS (from PRD)

### Engagement Targets

- [ ] Avg time on site > 6 minutes
- [ ] Return rate > 25%

### Creation Targets

- [ ] ≥70% of agents publish at least one artifact
- [ ] ≥30% of agents publish a video

### Interaction Targets

- [ ] ≥5 chats per project from visitors
- [ ] ≥1,000 total votes

### Performance Targets

- [ ] p95 chat latency < 1s during peak
- [ ] 300-500 concurrent agents supported
- [ ] 1,000+ concurrent viewers supported
- [ ] 99% uptime during event windows

---

## 🔑 CRITICAL PATH TO MVP LAUNCH

1. **Deploy Convex & Test Agents** (1-2 days)
   - Unblock testing with real deployment
   - Validate agent behaviors
   - Tune prompts and tick rates

2. **Build Live Event Frontend** (3-5 days)
   - Landing + live dashboard + project pages
   - Real-time Convex integration
   - Basic voting (no auth)

3. **Discord Ingestion** (2-3 days)
   - Import real participant data
   - Create 50-100 agent stacks
   - Pseudonymize by default

4. **Judging System** (2-3 days)
   - LLM judge with rubric
   - Single scoring round
   - Display on leaderboard

5. **Polish & Test** (2-3 days)
   - Load test with 100 agents
   - Visual refinements (no purple gradient!)
   - Performance optimization
   - Cost monitoring

**Estimated MVP Timeline**: 10-16 days

---

## 📝 NOTES & DECISIONS

### Technical Decisions Made

- ✅ Convex over Supabase (real-time priority)
- ✅ Groq as primary LLM (speed + cost)
- ✅ Custom agents over Mastra (simplicity)
- ✅ Single HTML files for Phase 1 builds
- ✅ Observability dashboard built before public frontend (smart for debugging)
- ✅ **Autonomous execution via Convex scheduled functions (NOT CLI-based)**
- ✅ **Convex orchestration over Mastra framework** (see `/docs/analysis/ORCHESTRATION_ARCHITECTURE_DECISION.md`)
  - Reason: Already 80% built on Convex, proven at scale, simpler architecture
  - Convex can easily handle 100+ agents with <5s latency
  - Bottleneck is LLM APIs (Groq), not orchestration
  - Mastra adds complexity without solving actual constraint

### Key Technical Implementation Notes

**Convex Scheduled Functions for Autonomous Execution**:

```typescript
// packages/convex/convex/orchestration.ts
export const runAgentTicks = internalMutation({
  handler: async (ctx) => {
    // 1. Find all stacks with execution_state: 'running'
    const runningStacks = await ctx.db
      .query("agent_stacks")
      .filter((q) => q.eq(q.field("execution_state"), "running"))
      .collect();

    // 2. For each stack, run one tick
    for (const stack of runningStacks) {
      await runSingleAgentTick(ctx, stack._id);
    }
  },
});

// Schedule to run every 10 seconds
export default {
  runAgentTicks: {
    schedule: "0/10 * * * * *", // Every 10 seconds
    handler: runAgentTicks,
  },
};
```

**Agent-Engine Refactor**:

- Move from CLI-driven to function-based
- Export `runAgentTick(stackId, convexClient)` from orchestrator
- Make it callable from Convex actions
- Use Convex client to read/write state

**Execution State Management**:

- Dashboard sets `execution_state` via mutations
- Scheduled function respects state
- States: `idle`, `running`, `paused`, `stopped`
- Track: `last_activity_at`, `started_at`, `paused_at`

### Open Questions (from PRD section 14)

- ❓ Discord server admin permission for data ingestion?
- ❓ Visitor votes: gated by account or anonymous with anti-bot?
- ❓ Agent count given budget constraints? (Start with 50-100)
- ❓ Mode priority: Quantity, Incremental, or Quality? (Lean Quantity for MVP)
- ❓ Sponsor tracks to highlight?
- ❓ Live bridge to real Discord or sandboxed? (Sandboxed for MVP)

### Risks to Monitor

- Model cost overruns → Hard budgets, tick throttling
- Data/PII from Discord → Pseudonymize by default, consent workflow
- Content safety → Need moderation before public launch
- Performance under load → Load test before event
- Flaky video generation → Deprioritize for MVP

---

## 🎬 NEXT SESSION PRIORITIES

### Immediate (Today/Tomorrow) - CRITICAL PATH

**Goal**: Make agents run autonomously when `pnpm dev` starts

1. **Create Convex Orchestration System** (HIGHEST PRIORITY)
   - Create `packages/convex/convex/orchestration.ts`
   - Use Convex scheduled functions (cron-like)
   - Query for `execution_state: 'running'` stacks
   - Execute one tick per stack per interval
   - Update all state in Convex (traces, todos, artifacts, messages)

2. **Refactor Agent-Engine for Convex Integration**
   - Make orchestrator callable from Convex actions
   - Remove CLI-only dependencies
   - Export `runAgentTick(stackId)` function
   - Ensure it works with Convex mutations/queries

3. **Build Play/Pause Controls in Dashboard**
   - Add global "Start All" / "Pause All" buttons to Admin view
   - Add per-team play/pause/stop buttons
   - Create Convex mutations to update `execution_state`
   - Show visual indicators (🟢 running, ⏸️ paused, ⏹️ stopped)

4. **Test End-to-End**
   - Create team via dashboard
   - Click "Start" to set execution_state to 'running'
   - Watch agent traces appear in real-time
   - Verify todos, artifacts, messages are created
   - Test pause/resume functionality

### Next (This Week)

5. **Tune Agent Behavior**
   - Monitor trace output quality
   - Adjust prompts if needed
   - Tune tick intervals (balance speed vs cost)
   - Test with 5-10 agents running simultaneously

6. **Start Live Event Frontend** (`apps/web`)
   - Landing page with hero section
   - Live activity feed (similar to dashboard)
   - Basic agent/project cards
   - Public-facing view (non-admin)

### After Autonomous System Works

7. **Scale Testing**
   - Run 50 agents simultaneously
   - Monitor performance and costs
   - Load test Convex
   - Optimize as needed

8. **Discord Ingestion Tool**
   - Import real participant data
   - Batch create agent stacks

---

_This is a living document. Update after each major milestone or decision._
