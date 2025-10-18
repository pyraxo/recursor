# Multi-Agent System Implementation for Recursor

## Overview

This document describes the implementation of a scalable multi-agent system where each Recursor hackathon participant is represented by an **Agent Stack** containing 4 specialized sub-agents that work together autonomously.

## Architecture

### Agent Stack Composition

Each participant = 1 agent stack with 4 sub-agents:

1. **Planner Agent**
   - Strategic planning and roadmap creation
   - Todo management and prioritization
   - Decision-making about project direction
   - Receives and acts on Reviewer's advice

2. **Builder Agent**
   - Executes todos from the Planner
   - Builds working prototypes
   - Generates single-file HTML/JS applications
   - Manages artifact versioning

3. **Communicator Agent**
   - Handles inter-agent messaging
   - Processes broadcasts and direct messages
   - Collects feedback from other agents and visitors
   - Summarizes insights for the Reviewer

4. **Reviewer Agent**
   - Analyzes project progress and quality
   - Reviews feedback collected by Communicator
   - Generates recommendations for the Planner
   - Identifies risks and opportunities

### Technology Stack

#### Core Framework

- **Language**: TypeScript
- **Package Manager**: pnpm (Turborepo workspace)
- **Location**: `packages/agent-engine/`

#### Backend & State

- **Convex** (Primary Backend - Sponsor)
  - Real-time reactive database
  - Automatic client synchronization (<1s latency)
  - TypeScript-first with auto-generated types
  - Built-in serverless functions
  - Scheduled functions for agent tick loops
  - No infrastructure management

#### LLM Providers (Sponsors)

- **Groq**: Primary provider (fast inference, cost-effective)
- **OpenAI**: Fallback for complex reasoning
- **Gemini**: Alternative provider for diversity

#### Memory Strategy

- **Custom memory with Convex**
  - Short-term: `current_context` field (active task, recent messages, focus)
  - Long-term: `memory` field (learned facts, accumulated learnings)
  - Real-time sync across all agents
  - No external memory service needed (mem0 optional for future)

## Database Schema (Convex)

### Core Tables

**agent_stacks**

- One per participant
- Fields: participant_name, phase, created_at

**agent_states**

- 4 per stack (one for each agent type)
- Fields: stack_id, agent_type, memory (long-term), current_context (short-term), updated_at
- Index: by_stack

**project_ideas**

- Mapped 1:1 to each participant
- Fields: stack_id, title, description, status, created_by, created_at
- Index: by_stack

**todos**

- Scoped to each participant via stack_id
- Fields: stack_id, content, status, assigned_by, priority, created_at, completed_at
- Indexes: by_stack, by_status

**messages**

- Global broadcasts (to_stack_id: null) OR direct participant-to-participant
- Fields: from_stack_id, to_stack_id, from_agent_type, content, message_type, read_by[], created_at
- Indexes: by_recipient, by_sender, broadcasts

**artifacts**

- Build outputs linked to participant
- Fields: stack_id, type, version, content, url, metadata, created_at
- Index: by_stack
- Versioning: auto-incremented per stack

**agent_traces**

- Observability logging
- Fields: stack_id, agent_type, thought, action, result, timestamp
- Indexes: by_stack, by_time

## Messaging System

### Two Message Channels

1. **Global Message Buffer (Broadcasts)**
   - Any agent can post to global channel
   - Stored with `to_stack_id: null` and `message_type: 'broadcast'`
   - All agents can query broadcasts using Convex index
   - Use case: General announcements, hackathon-wide updates

2. **Participant-to-Participant Direct Messages**
   - Messages with specific `to_stack_id`
   - Indexed by recipient for fast querying
   - `read_by` array tracks which agents have seen it
   - Use case: Collaboration requests, specific feedback

### Message Flow

```typescript
// Communicator reads unread messages
const broadcasts = await messaging.getBroadcasts(stackId);
const directs = await messaging.getDirectMessages(stackId);

// Process and respond
await messaging.sendBroadcast(stackId, agentType, response);
// OR
await messaging.sendDirect(fromStackId, toStackId, agentType, message);

// Mark as read
await messaging.markAsRead(messageId, stackId);
```

## Artifact Building Strategy

### Phase 1: Single HTML/JS Files (Current)

- **Approach**: Builder generates complete single-file applications
- **Format**: HTML with inline CSS and JavaScript
- **Storage**: Directly in Convex `artifacts.content` field
- **Hosting**: Can be served from Convex or via data URLs for iframe embedding
- **Benefits**:
  - Simple to generate with LLMs
  - Easy to version and diff
  - No external dependencies
  - Fast iteration

### Phase 2: Enhanced Builds (Future)

- External platforms: v0.dev, Lovable, Replit
- Multi-file projects stored as zip or separate entries
- Rich metadata tracking (tech stack, build time, dependencies)

### Versioning

- Each build creates new artifact entry with incremented `version`
- Query latest: `artifacts.withIndex("by_stack").filter(stack_id).order("desc")`
- Enables rollback and comparison

## Orchestration Flow

### Tick Loop

Each tick executes agents in sequence:

```typescript
async tick() {
  // 1. Planner evaluates state, creates/updates plan
  const plannerThought = await planner.think();

  // 2. Builder executes next todo item
  const builderResult = await builder.think();

  // 3. Communicator checks for messages, responds
  const communications = await communicator.think();

  // 4. Reviewer analyzes communications, advises planner
  const review = await reviewer.think();
  const recommendations = await reviewer.getRecommendationsForPlanner();
  await planner.receiveAdvice(recommendations.join('\n'));

  // 5. Log everything to observability
  // (each agent logs its own traces)
}
```

### Continuous Operation

- Scheduled via Convex scheduled functions OR
- Manual loop with configurable interval (default: 5000ms)
- Graceful shutdown handling
- Error recovery and logging

## Agent Interaction Pattern

### Data Flow

```
Project Ideas ←──→ Planner ──→ Todos
                     ↓           ↑
                   Advice    (Builder reads)
                     ↑           ↓
                  Reviewer    Builder ──→ Artifacts
                     ↑
                  Feedback
                     ↑
                Communicator ←──→ Messages
```

### Memory Updates

- Each agent can update its own memory (facts, learnings)
- Each agent can update its own context (active task, focus, recent messages)
- Reviewer's recommendations stored in Planner's context
- Communicator's feedback summaries stored for Reviewer

## Observability Stack

### Backend (Convex Functions)

- **No separate API needed** - Convex functions ARE the API
- **Real-time by default** - Convex subscriptions
- Key functions:
  - `traces.log()`: Log agent thoughts and actions
  - `traces.list()`: Query traces for a stack
  - `traces.getRecent()`: Recent traces across all stacks
  - `agents.getStack()`: Current state snapshot
  - `messages.getTimeline()`: Message history

### Frontend (Future: `apps/observability-dashboard/`)

- Next.js + React + Convex React hooks
- Views:
  - **Live Feed**: Auto-updating stream of all agent activity
  - **Agent Detail**: Per-participant drill-down with 4 sub-agents
  - **Message Flow**: Visual graph of message exchanges
  - **State Inspector**: Current ideas, todos, memory, context
- Real-time updates via Convex subscriptions (no manual WebSockets)

## Implementation Files

### Convex (Backend)

```
convex/
  schema.ts             # Complete database schema
  agents.ts             # Agent stack CRUD operations
  messages.ts           # Messaging functions
  artifacts.ts          # Artifact management
  todos.ts              # Todo operations
  project_ideas.ts      # Project idea management
  traces.ts             # Observability trace logging
  tsconfig.json         # TypeScript config
```

### Agent Engine Package

```
packages/agent-engine/
  src/
    agents/
      base-agent.ts       # Base class with shared functionality
      planner.ts          # Planner agent implementation
      builder.ts          # Builder agent implementation
      communicator.ts     # Communicator agent implementation
      reviewer.ts         # Reviewer agent implementation
    memory/
      convex-memory.ts    # Memory provider using Convex
    messaging/
      convex-messages.ts  # Messaging provider using Convex
    artifacts/
      html-builder.ts     # HTML/JS generator using LLMs
    orchestrator.ts       # Coordinates all 4 agents
    config.ts             # LLM provider configuration
    cli.ts                # CLI for testing
    index.ts              # Package exports
  package.json            # Dependencies & scripts
  tsconfig.json           # TypeScript config
  README.md               # Documentation
```

## CLI Usage

### Create an Agent Stack

```bash
cd packages/agent-engine
pnpm cli create "ParticipantName"
```

### List Stacks

```bash
pnpm cli list
```

### Run an Agent Stack

```bash
pnpm cli run <stack_id> [max_ticks] [interval_ms]
# Example: pnpm cli run abc123 20 3000
```

### Check Status

```bash
pnpm cli status <stack_id>
```

## Environment Setup

Required environment variables:

```
CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
GROQ_API_KEY=your-groq-key
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
```

## Scaling Strategy

### Phase 1: Single Agent Stack (MVP)

- 1 participant
- Manual tick execution via CLI
- Validate full ideation → build → demo cycle
- Test messaging between agents
- Verify artifact generation

### Phase 2: Multiple Agents (10 Participants)

- Deploy 10 agent stacks
- Parallel execution
- Load test Convex and LLM providers
- Monitor costs (Groq, Convex)
- Tune tick rates based on performance

### Phase 3: Full Scale (100 Participants)

- Convex scheduled functions for automation
- Graceful degradation if rate limits hit
- Cost controls and budget monitoring
- Observability dashboard for real-time monitoring

## Key Technical Decisions

### Why Convex over Supabase?

- **Real-time is primary requirement**: Convex built for this
- **<1s latency**: Optimistic updates built-in
- **TypeScript-first**: Auto-generated types, no manual API
- **Simpler for MVP**: No WebSocket setup, no manual sync
- **Developer velocity**: 1-2 days vs 4-5 days for core features

### Why Groq as Primary LLM?

- Fastest inference (critical for tight agent loops)
- Cost-effective ($0.10/1M tokens)
- Good for high-frequency operations (Planner, Communicator)
- Automatic fallback to OpenAI for complex tasks (Builder)

### Memory: Custom vs mem0?

- **Start with custom Convex-based memory**
  - Simpler, TypeScript-native
  - Leverages Convex's real-time capabilities
  - Sufficient for MVP
- **Add mem0 later if needed**
  - Only for sophisticated extraction/consolidation
  - Currently Python-focused (integration complexity)

### MCP Integration (Optional)

- Smithery can host custom MCP servers
- Primary messaging via Convex (simpler, faster)
- Can add MCP later for advanced tool orchestration

## Cost Estimation

### Per 10 agents, 8-hour simulation:

- **Groq**: ~$5-10 (10K tokens/agent/hour @ $0.10/1M tokens)
- **Convex**: Free tier covers MVP; paid tier ~$5-15
- **Smithery** (if used): Likely free for hackathon
- **Total**: <$30 for 10-agent test run

### At scale (100 agents):

- **Groq**: ~$50-100
- **Convex**: ~$50-150 depending on usage
- **Total**: ~$100-250 for 8-hour hackathon simulation

## Success Criteria

✓ Single agent stack completes ideation → build → demo cycle autonomously
✓ Communicator handles both broadcasts AND direct messages correctly
✓ Builder generates valid single HTML/JS file artifacts
✓ Reviewer influences Planner's decisions based on feedback
✓ Observability traces show real-time agent thoughts/actions
✓ Project ideas and todos correctly mapped to each participant
✓ 10 agent stacks run concurrently without crashes
✓ <1s latency for state updates
✓ Total cost < $30 for 10-agent, 8-hour simulation

## Next Steps

1. **Complete Convex Setup**
   - Run `npx convex dev` to create deployment
   - Push schema to Convex
   - Set up environment variables

2. **Install Dependencies**

   ```bash
   pnpm install
   ```

3. **Test Single Agent**

   ```bash
   cd packages/agent-engine
   pnpm cli create "TestAgent"
   pnpm cli run <stack_id> 5 5000
   ```

4. **Build Observability Dashboard**
   - Create `apps/observability-dashboard` Next.js app
   - Integrate Convex React hooks
   - Build live feed and agent detail views

5. **Scale to 10 Agents**
   - Create 10 agent stacks
   - Run in parallel
   - Monitor performance and costs

6. **Iterate and Optimize**
   - Tune agent prompts based on output quality
   - Adjust tick rates for optimal performance
   - Add more sophisticated planning logic
   - Enhance HTML builder with better templates

## Troubleshooting

### Convex Connection Issues

- Verify `CONVEX_URL` is set correctly
- Check Convex deployment status: `npx convex dev`
- Regenerate types: `npx convex codegen`

### LLM API Errors

- Check API keys are valid
- Monitor rate limits (Groq has limits)
- Fallback to OpenAI if Groq fails
- Add exponential backoff for retries

### Agent Not Making Progress

- Check traces in Convex dashboard
- Verify todos are being created
- Check agent memory/context for issues
- Adjust agent prompts if reasoning is off

## References

- [PRD: /docs/plans/prd.md](./prd.md)
- [Backend Recommendation: /docs/guides/backend-recommendation.md](../guides/backend-recommendation.md)
- [Convex Documentation](https://docs.convex.dev)
- [Groq Documentation](https://console.groq.com/docs)
- [Mastra Framework](https://mastra.ai) (optional, not used in initial implementation)
