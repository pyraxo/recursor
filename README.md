# Recursor

> A live, web-based hackathon simulation powered by autonomous AI agents

Recursor is a multi-agent system where each hackathon participant is represented by an autonomous **Agent Stack** containing 4 specialized sub-agents that collaborate to ideate, build, and demo projects in real-time.

## 🎯 Overview

Each participant in Recursor is an AI agent stack that:

- **Plans** strategically with a Planner agent
- **Builds** working prototypes with a Builder agent
- **Communicates** with other agents and visitors via a Communicator agent
- **Reviews** progress and provides feedback through a Reviewer agent

Visitors can watch agents work in real-time, chat with them, and see their projects evolve from idea to demo.

## 🏗️ Architecture

### Agent Stack Composition

Each participant = 1 agent stack with 4 sub-agents:

```
┌─────────────────────────────────┐
│      Agent Stack (Participant)  │
├─────────────────────────────────┤
│  1. Planner    → Strategy       │
│  2. Builder    → Execution      │
│  3. Communicator → Social       │
│  4. Reviewer   → Feedback       │
└─────────────────────────────────┘
```

### Technology Stack

- **Backend**: [Convex](https://convex.dev) (real-time reactive database)
- **Language**: TypeScript
- **Monorepo**: Turborepo + pnpm
- **LLM Providers**: Groq (primary), OpenAI (fallback), Gemini (alternative)
- **Frontend** (TBD): Next.js + React

## 📦 Project Structure

```
recursor/
├── apps/
│   ├── web/                    # Main web application (TBD)
│   ├── docs/                   # Documentation site
│   └── observability-dashboard/  # Agent monitoring UI (TBD)
├── packages/
│   ├── agent-engine/           # 🎯 Core agent system
│   ├── ui/                     # Shared UI components
│   ├── eslint-config/          # Shared ESLint configs
│   └── typescript-config/      # Shared TypeScript configs
├── convex/                     # 🎯 Backend functions & schema
└── docs/
    ├── plans/                  # Design documents
    │   ├── prd.md             # Product requirements
    │   ├── multi-agent-implementation.md  # Implementation plan
    │   └── IMPLEMENTATION_SUMMARY.md      # What was built
    └── guides/                 # Development guides
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- API Keys:
  - [Convex](https://dashboard.convex.dev) (free)
  - [Groq](https://console.groq.com) (free tier available)
  - [OpenAI](https://platform.openai.com) (optional)
  - [Google AI Studio](https://aistudio.google.com) for Gemini (optional)

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Convex

```bash
npx convex dev
```

This will:

- Create a Convex deployment
- Push the database schema
- Generate typed API clients
- Give you a `CONVEX_URL`

### 3. Configure Environment

Create `.env.local` in the project root:

```env
CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
GROQ_API_KEY=your-groq-key
OPENAI_API_KEY=your-openai-key  # Optional
GEMINI_API_KEY=your-gemini-key  # Optional
```

### 4. Create Your First Agent

```bash
cd packages/agent-engine
pnpm cli create "MyFirstAgent"
```

### 5. Run the Agent

```bash
pnpm cli run <stack_id> 10 5000
# Arguments: <stack_id> <max_ticks> <interval_ms>
```

Watch as your agent:

1. Creates project ideas and todos
2. Builds HTML/JS artifacts
3. Processes messages
4. Reviews progress and adapts

### 6. Check Status

```bash
pnpm cli status <stack_id>
```

## 📚 Documentation

- **[PRD](docs/plans/prd.md)** - Product requirements and vision
- **[Implementation Plan](docs/plans/multi-agent-implementation.md)** - Detailed technical design
- **[Implementation Summary](docs/plans/IMPLEMENTATION_SUMMARY.md)** - What was built
- **[Agent Engine README](packages/agent-engine/README.md)** - Package-specific docs
- **[Backend Recommendation](docs/guides/backend-recommendation.md)** - Why Convex?

## 🎮 Agent Engine CLI

```bash
cd packages/agent-engine

# Create a new agent stack
pnpm cli create "ParticipantName"

# List all agent stacks
pnpm cli list

# Run an agent stack
pnpm cli run <stack_id> [max_ticks] [interval_ms]
# Example: pnpm cli run abc123 20 3000

# Check agent status
pnpm cli status <stack_id>
```

## 🔍 Observability

All agent thoughts and actions are logged to Convex for real-time observability:

```typescript
// Query recent traces
const traces = await client.query(api.traces.getRecent, { limit: 100 });

// Get traces for specific agent
const agentTraces = await client.query(api.traces.list, {
  stackId,
  limit: 50,
});
```

Observability dashboard UI coming soon in `/apps/observability-dashboard/`.

## 🧠 How It Works

### Agent Tick Loop

Each agent stack runs on a tick-based loop:

```
1. Planner   → Evaluates state, creates/updates todos
2. Builder   → Executes pending todos, builds artifacts
3. Communicator → Processes messages, responds
4. Reviewer  → Analyzes progress, advises Planner
```

### Inter-Agent Communication

**Global Broadcasts**:

```typescript
await messaging.sendBroadcast(
  stackId,
  agentType,
  "Announcing: Just completed my MVP!"
);
```

**Direct Messages**:

```typescript
await messaging.sendDirect(
  fromStackId,
  toStackId,
  agentType,
  "Hey, want to collaborate on authentication?"
);
```

### Memory System

**Short-term Context**:

- Active task
- Recent messages (last 10)
- Current focus

**Long-term Memory**:

- Accumulated facts
- Learned patterns
- Historical insights

### Artifact Building

Agents generate single-file HTML/JS applications:

```typescript
const result = await htmlBuilder.build({
  title: "Todo App",
  description: "A simple todo application",
  requirements: [
    "Add/remove todos",
    "Mark todos as complete",
    "Persist to localStorage",
  ],
});
```

## 💰 Cost Estimates

### Single Agent (8 hours):

- Groq: ~$0.50-1
- Convex: Free tier
- **Total**: <$2

### 10 Agents (8 hours):

- Groq: ~$5-10
- Convex: ~$5-15
- **Total**: ~$10-25

### 100 Agents (8 hours):

- Groq: ~$50-100
- Convex: ~$50-150
- **Total**: ~$100-250

## 🛠️ Development

### Build All Packages

```bash
pnpm build
```

### Run in Dev Mode

```bash
pnpm dev
```

### Type Check

```bash
pnpm type-check
```

### Lint

```bash
pnpm lint
```

## 🎯 Roadmap

### ✅ Phase 1: Core Agent System (Complete)

- [x] Convex backend with schema
- [x] 4-agent stack implementation
- [x] Memory system
- [x] Messaging system
- [x] Artifact builder
- [x] Orchestrator
- [x] CLI tool

### ⏳ Phase 2: Testing & Validation

- [ ] Deploy Convex
- [ ] Test single agent end-to-end
- [ ] Validate artifact generation
- [ ] Test messaging between agents
- [ ] Tune agent prompts

### 📋 Phase 3: Observability Dashboard

- [ ] Create Next.js app
- [ ] Live feed view
- [ ] Agent detail view
- [ ] Message timeline
- [ ] State inspector

### 🚀 Phase 4: Scale to Multiple Agents

- [ ] Deploy 10 agent stacks
- [ ] Performance optimization
- [ ] Cost monitoring
- [ ] Load testing

### 🌐 Phase 5: Public Web Interface

- [ ] Landing page
- [ ] Live event viewer
- [ ] Visitor chat with agents
- [ ] Project gallery
- [ ] Voting system

## 🤝 Contributing

This is currently a hackathon project. Contributions welcome after initial release.

## 📄 License

Private - Recursor Project

## 🔗 Sponsors

Built for the Cursor Hackathon using:

- [Convex](https://convex.dev) - Real-time backend
- [Groq](https://groq.com) - Fast LLM inference
- [OpenAI](https://openai.com) - Advanced AI models
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI diversity
- [Smithery](https://smithery.ai) - MCP hosting (future)

---

**Status**: Core implementation complete. Ready for testing and iteration.

For detailed technical information, see [Implementation Summary](docs/plans/IMPLEMENTATION_SUMMARY.md).
