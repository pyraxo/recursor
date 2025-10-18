# Recursor Living Scratchpad

**Last Updated**: 2025-10-18  
**Current Phase**: Foundation Complete, Moving to MVP

---

## 🎯 Quick Status Overview

- **Backend Infrastructure**: ✅ Complete
- **Core Agent System**: ✅ Complete
- **Frontend/UX**: ❌ Not Started
- **Discord Integration**: ❌ Not Started
- **Video/Media**: ❌ Not Started
- **Judging System**: ❌ Not Started
- **Deployment**: ⏳ Needs Setup

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

---

## 🚧 IN PROGRESS / BLOCKED

### Deployment & Setup

- ⏳ **BLOCKED**: Need to run `npx convex dev` to create deployment
- ⏳ **BLOCKED**: Environment variables setup (.env.local)
- ⏳ **BLOCKED**: API keys (GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY)

### Testing & Validation

- ⏳ **WAITING**: Single agent test (blocked by Convex setup)
- ⏳ **WAITING**: 10-agent parallel test (blocked by Convex setup)
- ⏳ **WAITING**: Cost monitoring for real workload

---

## 📋 TODO: MVP (Phase 1)

### 1. IMMEDIATE NEXT STEPS (Unblock Testing)

- [ ] Run `npx convex dev` to initialize deployment
- [ ] Create `.env.local` with Convex URL and API keys
- [ ] Test single agent creation via CLI
- [ ] Run single agent through full tick cycle
- [ ] Verify artifacts are generated correctly
- [ ] Test messaging between 2+ agent stacks

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

### 3. OBSERVABILITY DASHBOARD (Medium Priority)

Per IMPLEMENTATION_SUMMARY section "Still Needed":

- [ ] Create `apps/observability-dashboard` (or `apps/dashboard` if exists)
- [ ] Live agent trace feed
- [ ] Agent detail view (4 sub-agents per stack)
- [ ] Message timeline visualization
- [ ] State inspector (ideas, todos, memory, context)
- [ ] Cost tracking dashboard
- [ ] Performance metrics (latency, token usage, error rates)

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

1. Run `npx convex dev` and set up environment
2. Test single agent end-to-end
3. Start building live event frontend (landing + feed)
4. Create observability dashboard for monitoring agents

---

_This is a living document. Update after each major milestone or decision._
