# Recursor Living Scratchpad

**Last Updated**: 2025-10-18 (Major Update: Autonomous Execution COMPLETE)
**Current Phase**: Testing & Refinement → Communication Systems → Judging & Leaderboards

---

## 🎯 Quick Status Overview

- **Backend Infrastructure**: ✅ Complete
- **Core Agent System**: ✅ Complete
- **Deployment & Environment**: ✅ Complete
- **Observability Dashboard**: ✅ Complete
- **Autonomous Execution**: ✅ COMPLETE (major milestone!)
- **Agent Communication System**: 🚨 CRITICAL - NOT STARTED (inter-agent + user chat)
- **Live Event Frontend**: ❌ Not Started
- **Judging System**: 🚨 CRITICAL - NOT STARTED (MUST DELIVER)
- **Leaderboards**: 🚨 CRITICAL - NOT STARTED (MUST DELIVER)
- **Admin Console**: 🚨 CRITICAL - NOT STARTED (MUST DELIVER)
- **Voting System**: ❌ Not Started
- **Discord Integration**: ❌ Not Started
- **Video/Media**: ❌ Not Started

---

## ✅ COMPLETED (Foundation Phase)

### Backend & Database (Convex)

- ✅ Complete schema with 8 tables (agent_stacks, agent_states, project_ideas, todos, messages, artifacts, agent_traces, **agent_executions**)
- ✅ All Convex functions (agents.ts, messages.ts, artifacts.ts, todos.ts, project_ideas.ts, traces.ts)
- ✅ Type-safe API with auto-generated types
- ✅ Real-time subscriptions built-in
- ✅ **NEW**: Agent execution logic moved to Convex (`convex/lib/agents/`)
- ✅ **NEW**: Scheduled execution system (`agentExecution.ts` with 5-second cron)
- ✅ **NEW**: `agent_executions` table for tracking execution status
- ✅ **NEW**: Internal actions and queries for agent orchestration

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
- ✅ **NEW**: Autonomous Orchestrator (846 lines, work-based execution)
- ✅ **NEW**: Execution Controller (multi-stack coordination)
- ✅ **NEW**: Work detection system (smart agent activation)
- ✅ **NEW**: All agents refactored to delegate to Convex backend
- ✅ **NEW**: Priority queue system for agent tasks

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

### Autonomous Agent Execution System ✅ COMPLETE

**Major Architectural Achievement**: Agents now run autonomously via Convex!

**What Was Built**:

✅ **Convex Backend Agent Execution**:
- ✅ All agent logic migrated to Convex actions (`packages/convex/convex/lib/agents/`)
  - `executePlanner()` - Handles planning logic in Convex
  - `executeBuilder()` - Handles building logic in Convex
  - `executeCommunicator()` - Handles communication logic in Convex
  - `executeReviewer()` - Handles review logic in Convex
- ✅ Agent classes in `agent-engine` are now thin wrappers that delegate to Convex
- ✅ Single source of truth for agent logic (works in CLI, cron, dashboard)

✅ **Scheduled Execution System** (`packages/convex/convex/agentExecution.ts`):
- ✅ `scheduledExecutor` runs every 5 seconds via Convex cron
- ✅ Finds all stacks with `execution_state: 'running'`
- ✅ Executes agent ticks automatically
- ✅ Respects execution state (running, paused, stopped)
- ✅ 30-second timeout protection for stuck executions
- ✅ New `agent_executions` table tracks execution status

✅ **Client-Side Orchestration** (`packages/agent-engine/src/`):
- ✅ `AutonomousOrchestrator` (846 lines) - Advanced work-based orchestration:
  - Work detection interface (`WorkStatus`) for smart agent activation
  - Priority queue system for agent task scheduling
  - Configurable concurrency (max concurrent agents)
  - Pause/resume/stop controls
  - Real-time Convex subscriptions for state changes
- ✅ `ExecutionController` - Manages multiple orchestrators
  - Multi-stack coordination
  - Graceful shutdown handling
  - Monitoring and health checks
- ✅ Enhanced `BaseAgent` with work detection:
  - `hasWork()` method to detect available work
  - `processWork()` for custom work handling
  - `handleNoWork()` for idle state (no unnecessary LLM calls)

✅ **Schema Enhancements**:
- ✅ `agent_executions` table for execution tracking
- ✅ `current_agent_index` in `agent_stacks` (cycle through 4 agents)
- ✅ Execution state fields in `agent_states.memory`
- ✅ Work tracking metadata

**Status**: Core autonomous execution is COMPLETE. Ready for testing and refinement.

**Next**: Focus shifts to testing, UI polish, and MUST-DELIVER features (Communication, Judging, Leaderboards, Admin)

### Testing & Validation (Ready after Autonomous Execution)

- [ ] Test agents run automatically on `pnpm dev`
- [ ] Verify play/pause controls work
- [ ] Test single agent through full tick cycle
- [ ] Verify artifacts are generated correctly
- [ ] Test messaging between 2+ agent stacks
- [ ] Monitor costs during test runs

---

## 📋 TODO: MVP (Phase 1)

### 1. ✅ AUTONOMOUS EXECUTION (COMPLETED!)

- [x] ~~Run `npx convex dev` to initialize deployment~~ ✅ DONE
- [x] ~~Create `.env.local` with Convex URL and API keys~~ ✅ DONE
- [x] ~~Build observability dashboard~~ ✅ DONE
- [x] ✅ **DONE**: Create Convex scheduled function (`agentExecution.ts`)
  - ✅ Runs every 5 seconds via Convex cron
  - ✅ Finds all agent_stacks with `execution_state: 'running'`
  - ✅ Executes tick for each stack using Convex actions
  - ✅ Updates traces, artifacts, todos, messages in Convex
- [x] ✅ **DONE**: Refactor agent-engine to work with Convex
  - ✅ All agent logic moved to Convex backend (`convex/lib/agents/`)
  - ✅ Agent classes delegate to Convex actions
  - ✅ Single source of truth for agent execution
- [x] ✅ **DONE**: Build autonomous orchestration system
  - ✅ `AutonomousOrchestrator` with work detection
  - ✅ `ExecutionController` for multi-stack management
  - ✅ Priority queue for agent tasks
  - ✅ Real-time state monitoring
- [ ] **TEST**: Create a team and start it running
- [ ] **TEST**: Verify agents execute autonomously
- [ ] **TEST**: Monitor execution via dashboard
- [ ] **TEST**: Verify play/pause controls work

### 2. AGENT COMMUNICATION SYSTEM (CRITICAL - MUST DELIVER)

**Why Critical**: Agents need to collaborate with each other AND respond to real users chatting with their team.

#### Inter-Agent Communication

- [ ] Enhance messaging system for multi-team collaboration
  - [ ] Direct team-to-team messaging
  - [ ] Broadcast channels for discovery/announcements
  - [ ] Message routing and delivery tracking
- [ ] Add communication triggers to agent logic
  - [ ] When to reach out to other teams (collaboration, advice, feedback)
  - [ ] How to respond to incoming messages from other agents
  - [ ] Message priority and handling in tick cycle
- [ ] Update schema if needed
  - [ ] Ensure messages table supports team-to-team communication
  - [ ] Track conversation threads and context

#### Agent-to-User Chat

- [ ] Real-time chat interface for users to talk to agent teams
  - [ ] Chat UI component in project detail pages
  - [ ] Message history display
  - [ ] Typing indicators
- [ ] Backend support for user messages
  - [ ] Store user messages in messages table (with user_id/session_id)
  - [ ] Queue user messages for agent processing
  - [ ] Rate limiting per user/session
- [ ] Agent response system
  - [ ] Communicator agent processes user questions
  - [ ] Context-aware responses (project state, current phase, etc.)
  - [ ] Personality and tone consistency
  - [ ] Response prioritization (user messages vs agent messages)
- [ ] Moderation for user input
  - [ ] Content filtering
  - [ ] Spam detection
  - [ ] Abuse prevention

### 3. JUDGING SYSTEM (CRITICAL - MUST DELIVER)

**Why Critical**: Core feature for hackathon simulation - cannot launch without judging.

Per PRD sections 6 & Appendix:

- [ ] Create judges table in Convex schema
  - [ ] Judge profile (name, expertise, LLM config)
  - [ ] Scoring history
  - [ ] Calibration data
- [ ] LLM-as-judge implementation
  - [ ] Multiple judge personas (technical, design, product, etc.)
  - [ ] Consistent scoring across all projects
  - [ ] Detailed feedback generation
- [ ] Rubric definition and configuration
  - [ ] Problem fit (0-10)
  - [ ] Execution quality (0-10)
  - [ ] UX/Design (0-10)
  - [ ] Originality (0-10)
  - [ ] Potential impact (0-10)
  - [ ] Weighted total score calculation
- [ ] Scoring functions
  - [ ] Numeric scores with confidence intervals
  - [ ] Qualitative feedback per criterion
  - [ ] Overall comments and highlights
- [ ] Multiple judging rounds
  - [ ] Checkpoint judging (mid-hackathon)
  - [ ] Final judging (end of hackathon)
  - [ ] Round-specific criteria adjustments
- [ ] Store scores in database
  - [ ] New judgments table or extend projects
  - [ ] Track judge, project, round, scores, feedback
  - [ ] Timestamp and version all judgments
- [ ] Admin judging controls
  - [ ] Trigger judging for specific projects or all
  - [ ] View and compare judge scores
  - [ ] Override or adjust scores if needed
  - [ ] Re-run judging with updated rubrics

### 4. LEADERBOARDS (CRITICAL - MUST DELIVER)

**Why Critical**: Central engagement feature for public viewing experience.

Per PRD section 6:

- [ ] Real-time leaderboard calculation
  - [ ] Combined score (judge scores + community votes)
  - [ ] Configurable weights (e.g., 70% judge, 30% community)
  - [ ] Recalculate on score/vote changes
- [ ] Multiple leaderboard views
  - [ ] Overall ranking (all projects)
  - [ ] Track-specific rankings (if using sponsor tracks)
  - [ ] "Rising stars" (momentum-based)
  - [ ] "Community favorites" (pure vote count)
- [ ] Display modes
  - [ ] Toggle between judge-only, community-only, and blended
  - [ ] Show score breakdowns (hover/click for details)
  - [ ] Historical position tracking (up/down indicators)
- [ ] Leaderboard UI components
  - [ ] Main leaderboard page in `apps/web`
  - [ ] Mini leaderboard widget (top 5) for landing page
  - [ ] Project card showing rank badge
- [ ] Real-time updates
  - [ ] Live rank changes as votes/scores come in
  - [ ] Smooth animations for position changes
  - [ ] Highlight recent changes
- [ ] Track-based filtering (if applicable)
  - [ ] Filter by sponsor track
  - [ ] Filter by project category/tags
  - [ ] Combined track winners + overall winner

### 5. VOTING SYSTEM (High Priority)

Per PRD section 6:

- [ ] Visitor voting API
  - [ ] Vote endpoint (up/down or 1-5 stars)
  - [ ] Rate limiting per IP/session
  - [ ] Vote storage in database
- [ ] IP-based anti-spam
  - [ ] Track votes by IP address
  - [ ] Limit votes per IP (e.g., 1 per project per IP)
  - [ ] CAPTCHA for suspicious activity
- [ ] Optional account sign-in for verified votes
  - [ ] Higher vote weight for authenticated users
  - [ ] GitHub/Google OAuth integration
  - [ ] Persistent vote history
- [ ] Vote weight system
  - [ ] Anonymous votes: 1x weight
  - [ ] Authenticated votes: 2x weight
  - [ ] Judge scores: 10x weight (configured per rubric)
- [ ] Vote UI components
  - [ ] Vote button on project cards
  - [ ] Vote count display
  - [ ] User feedback after voting
  - [ ] Indication if user already voted

### 6. ADMIN CONSOLE (CRITICAL - MUST DELIVER)

**Why Critical**: Need operational controls to run the live event successfully.

Per PRD section 5:

- [ ] Extend existing dashboard (`apps/dashboard`) with admin features
  - [ ] Simulation controls
    - [ ] Global phase control (force phase transitions)
    - [ ] Tick rate adjustment (slow down/speed up)
    - [ ] Emergency pause/resume all agents
    - [ ] Kill switch for individual teams
  - [ ] Discord import UI
    - [ ] File upload or API connection
    - [ ] Preview imported data
    - [ ] Map Discord users to agent personas
    - [ ] Batch create teams
  - [ ] Agent batch generator
    - [ ] Templates for different agent types
    - [ ] Bulk create with CSV/JSON
    - [ ] Assign random or specific project ideas
  - [ ] Prompt & rubric editors
    - [ ] Edit agent system prompts
    - [ ] Edit judging rubric criteria
    - [ ] Version control for prompts
    - [ ] Test prompts before deploying
  - [ ] Moderation dashboard
    - [ ] Flagged messages queue
    - [ ] Quick mute/ban actions
    - [ ] Content review interface
    - [ ] Appeal handling
  - [ ] Cost & usage observability
    - [ ] Real-time cost tracking (by LLM provider)
    - [ ] Token usage per agent/stack
    - [ ] Cost alerts and budget enforcement
    - [ ] Export cost reports
  - [ ] Judging administration
    - [ ] Trigger judging rounds
    - [ ] View all scores and feedback
    - [ ] Adjust judge weights
    - [ ] Override scores if needed

### 7. FRONTEND - Live Event Experience (High Priority)

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

#### Real-time Integration

- [ ] Integrate Convex React hooks (`useQuery`, `useMutation`)
- [ ] Live feed auto-updates
- [ ] Optimistic UI updates
- [ ] WebSocket/SSE fallback if needed

### 8. OBSERVABILITY DASHBOARD ENHANCEMENTS (Low Priority)

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

### 9. DISCORD DATA INGESTION (Medium Priority)

Per PRD section 6:

- [ ] Discord bot or API integration
- [ ] Import messages from team-formation channel
- [ ] LLM-based parsing (extract ideas, teams, skills)
- [ ] Pseudonymization toggle
- [ ] Dry-run preview before import
- [ ] Batch agent creation from Discord data
- [ ] Consent workflow (if using real handles)

### 10. DEMO VIDEO GENERATION (Low Priority - MVP)

Per PRD section 6:

- [ ] FAL integration for video generation
- [ ] Script/voiceover generation (LLM)
- [ ] Screen capture or storyboard scenes
- [ ] Retry/fallback logic
- [ ] Store video URLs in artifacts table
- [ ] Video player component in project pages

### 11. MODERATION (Low Priority - MVP)

Per PRD section 6:

- [ ] Content moderation pipeline (LLM + blocklists)
- [ ] Profanity filters
- [ ] Anti-spam cooldowns
- [ ] Admin override controls (mute/ban)
- [ ] Message flagging system

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

1. ✅ **Autonomous Execution System** (COMPLETED!)
   - ✅ Convex scheduled functions for agent orchestration
   - ✅ Advanced work-based orchestration with priority queuing
   - ✅ All agent logic migrated to Convex backend
   - ✅ Execution state management and monitoring
   - 🔄 **Testing in progress**

2. **Agent Communication System** (2-3 days) - MUST DELIVER - NEXT PRIORITY
   - Inter-agent messaging (team-to-team collaboration)
   - Agent-to-user chat (real-time Q&A on project pages)
   - Message routing and prioritization
   - Core feature for engagement

3. **Judging System** (2-3 days) - MUST DELIVER
   - LLM-as-judge with multiple personas
   - Rubric implementation (5 criteria, weighted scoring)
   - Multiple judging rounds (checkpoint + final)
   - Store scores and feedback in database

4. **Leaderboards** (1-2 days) - MUST DELIVER
   - Real-time calculation (judge scores + community votes)
   - Multiple views (overall, track-specific, rising stars)
   - Live updates with animations
   - Display in public frontend

5. **Admin Console** (2-3 days) - MUST DELIVER
   - Simulation controls (phase, tick rate, emergency pause)
   - Judging administration (trigger rounds, view scores, override)
   - Prompt/rubric editors
   - Cost tracking and budget enforcement

6. **Live Event Frontend** (3-5 days)
   - Landing page with live stats
   - Project cards and detail pages
   - Embedded chat interface
   - Vote buttons and leaderboard page

7. **Voting System** (1-2 days)
   - Vote API with rate limiting
   - Anonymous + authenticated voting
   - Weight system integration
   - Anti-spam measures

8. **Discord Ingestion** (2-3 days)
   - Import participant data
   - Create 50-100 agent stacks
   - Pseudonymize by default

9. **Polish & Test** (2-3 days)
   - Load test with 100 agents
   - Visual refinements (no purple gradient!)
   - Performance optimization
   - Cost monitoring
   - End-to-end validation

**Estimated MVP Timeline**: 14-23 days remaining (autonomous execution complete, saved ~3 days)

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
- ✅ **Judging, Leaderboards, Admin Console, and Communication are MUST-DELIVER features**
  - Cannot launch without these critical systems
  - Reprioritized from "medium" to "critical"
  - Timeline extended to accommodate (17-26 days vs 10-16 days)

### Key Technical Implementation Notes

**✅ IMPLEMENTED: Convex Scheduled Execution System**:

```typescript
// packages/convex/convex/agentExecution.ts
export const scheduledExecutor = internalMutation({
  handler: async (ctx) => {
    // 1. Find all stacks with execution_state: 'running'
    const stacks = await ctx.db
      .query("agent_stacks")
      .filter((q) => q.eq(q.field("execution_state"), "running"))
      .collect();

    // 2. For each stack, schedule an agent tick
    for (const stack of stacks) {
      await ctx.scheduler.runAfter(0, internal.agentExecution.executeAgentTick, {
        stackId: stack._id,
      });
    }
  },
});

// Runs every 5 seconds (configured in Convex cron settings)
```

**✅ IMPLEMENTED: Agent Logic Migration to Convex**:

All agent execution logic has been moved from `packages/agent-engine/src/agents/` to Convex backend:

```
packages/convex/convex/lib/agents/
├── index.ts          # executeAgentByType() dispatcher
├── planner.ts        # executePlanner() - planning logic
├── builder.ts        # executeBuilder() - building logic
├── communicator.ts   # executeCommunicator() - communication logic
└── reviewer.ts       # executeReviewer() - review logic
```

**Agent Classes Now Delegate to Convex**:

```typescript
// packages/agent-engine/src/agents/planner.ts (simplified)
export class PlannerAgent extends BaseAgent {
  async think(): Promise<string> {
    // Call Convex backend to execute planner logic
    const result = await this.client.action(api.agentExecution.runPlanner, {
      stackId: this.stackId,
    });
    return result;
  }
}
```

**✅ IMPLEMENTED: Advanced Orchestration Features**:

1. **Work Detection System**:
   - `WorkStatus` interface for detecting available work
   - `hasWork()` method in BaseAgent
   - `handleNoWork()` for idle states (no wasted LLM calls)

2. **Priority Queue**:
   - Agent tasks ordered by priority
   - Configurable concurrency (max agents running)
   - Fair scheduling across multiple stacks

3. **Execution Monitoring**:
   - `agent_executions` table tracks status
   - 30-second timeout protection
   - Real-time state updates via Convex subscriptions

**Execution State Management**:

- Dashboard updates `execution_state` via mutations
- Scheduled function respects state changes
- States: `idle`, `running`, `paused`, `stopped`
- Tracking: `last_activity_at`, `started_at`, `current_agent_index`

**✅ IMPLEMENTED: Schema Extensions**:

```typescript
// ✅ agent_executions table (for autonomous execution tracking)
agent_executions: defineTable({
  stack_id: v.id("agent_stacks"),
  status: v.union(v.literal("running"), v.literal("completed"), v.literal("failed")),
  started_at: v.number(),
  completed_at: v.optional(v.number()),
  error: v.optional(v.string()),
}).index("by_stack", ["stack_id"]);

// New tables needed for MUST-DELIVER features:

// 1. Judges table
judges: defineTable({
  name: v.string(),
  persona: v.string(), // "technical", "design", "product", etc.
  expertise: v.array(v.string()),
  llm_config: v.object({
    model: v.string(),
    temperature: v.number(),
  }),
  calibration_data: v.optional(v.any()),
});

// 2. Judgments table
judgments: defineTable({
  project_id: v.id("agent_stacks"),
  judge_id: v.id("judges"),
  round: v.string(), // "checkpoint", "final"
  scores: v.object({
    problem_fit: v.number(), // 0-10
    execution: v.number(),
    ux_design: v.number(),
    originality: v.number(),
    impact: v.number(),
    total: v.number(), // weighted
  }),
  feedback: v.object({
    problem_fit: v.string(),
    execution: v.string(),
    ux_design: v.string(),
    originality: v.string(),
    impact: v.string(),
    overall: v.string(),
  }),
  confidence: v.optional(v.number()),
})
  .index("by_project", ["project_id"])
  .index("by_round", ["round"]);

// 3. Votes table
votes: defineTable({
  project_id: v.id("agent_stacks"),
  voter_id: v.optional(v.string()), // IP hash or user ID
  voter_type: v.string(), // "anonymous", "authenticated"
  vote_value: v.number(), // 1-5 stars or +1
  weight: v.number(), // vote multiplier
  ip_hash: v.optional(v.string()),
})
  .index("by_project", ["project_id"])
  .index("by_voter", ["voter_id"]);

// 4. Extend messages table for user chat
messages: defineTable({
  // ... existing fields ...
  sender_type: v.string(), // "agent", "user"
  user_id: v.optional(v.string()), // session ID for anonymous users
  session_id: v.optional(v.string()),
  requires_response: v.optional(v.boolean()),
  response_priority: v.optional(v.number()),
  // ... existing fields ...
});
```

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

**Goal**: ✅ Autonomous execution is COMPLETE! Now test and move to MUST-DELIVER features.

1. **Test Autonomous Execution End-to-End** (HIGHEST PRIORITY)
   - Create a test team via dashboard
   - Set execution_state to 'running'
   - Monitor agent traces in real-time
   - Verify todos, artifacts, messages are created correctly
   - Test pause/resume functionality
   - Identify and fix any bugs
   - Monitor LLM costs during test runs

2. **Verify Dashboard Integration**
   - Confirm play/pause controls work
   - Check real-time updates via Convex subscriptions
   - Test multi-stack execution (2-3 teams running simultaneously)
   - Validate execution_state transitions
   - Check error handling and recovery

### Next (This Week) - MUST DELIVER FEATURES

3. **Agent Communication System** (CRITICAL)
   - Inter-agent messaging (team-to-team)
   - Agent-to-user chat interface
   - Update Communicator agent to handle user messages
   - Real-time chat UI in project pages
   - Message routing and prioritization

4. **Judging System** (CRITICAL)
   - Create judges table in Convex
   - LLM-as-judge implementation (multiple personas)
   - Rubric definition (5 criteria)
   - Scoring functions
   - Store judgments in database
   - Admin trigger controls

5. **Leaderboards** (CRITICAL)
   - Real-time calculation (judge + vote scores)
   - Multiple views (overall, track, rising stars)
   - Leaderboard UI components
   - Live updates with animations

6. **Admin Console Extensions** (CRITICAL)
   - Simulation controls (phase, tick rate, emergency pause)
   - Judging administration panel
   - Prompt/rubric editors
   - Cost tracking dashboard
   - Budget enforcement

### After Core Systems Work

7. **Live Event Frontend** (`apps/web`)
   - Landing page with hero section
   - Live activity feed
   - Project cards and detail pages
   - Chat interface integration
   - Vote buttons

8. **Voting System**
    - Vote API with rate limiting
    - Anonymous + authenticated voting
    - Weight system
    - Anti-spam measures

9. **Discord Ingestion Tool**
    - Import participant data
    - Batch create agent stacks
    - Pseudonymize by default

10. **Scale Testing**
    - Run 50-100 agents simultaneously
    - Monitor performance and costs
    - Load test Convex
    - Optimize as needed

---

_This is a living document. Update after each major milestone or decision._
