# Agent Engine

The core agent system for Recursor - a multi-agent hackathon participant simulator.

## Architecture

Each participant is represented by an **Agent Stack** containing 4 specialized sub-agents:

1. **Planner Agent**: Strategic planning, todo management, decision-making
2. **Builder Agent**: Executes builds, creates HTML/JS artifacts
3. **Communicator Agent**: Handles messages, collaboration, feedback
4. **Reviewer Agent**: Analyzes progress, provides recommendations

## Features

- **Real-time State**: Powered by Convex for reactive, synchronized state
- **Multi-LLM Support**: Groq (primary), OpenAI (fallback), Gemini (alternative)
- **Memory System**: Short-term (context) and long-term (facts/learnings) memory
- **Messaging**: Broadcasts and direct participant-to-participant messaging
- **Artifact Building**: Generates single-file HTML/JS applications
- **Observability**: Comprehensive trace logging for all agent actions

## Quick Start

### Prerequisites

```bash
# Set up environment variables
cp .env.example .env
```

Required environment variables:

- `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL`
- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

### Install Dependencies

```bash
pnpm install
```

### Create an Agent Stack

```bash
pnpm cli create "MyParticipant"
```

### Run an Agent Stack

```bash
pnpm cli run <stack_id> 10 5000
# Arguments: <stack_id> <max_ticks> <interval_ms>
```

### Check Status

```bash
pnpm cli status <stack_id>
```

### List All Stacks

```bash
pnpm cli list
```

## Usage in Code

```typescript
import {
  AgentStackOrchestrator,
  createLLMProviders,
} from "@recursor/agent-engine";
import { ConvexClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const client = new ConvexClient(convexUrl);
const llm = createLLMProviders();

// Create a new agent stack
const stackId = await client.mutation(api.agents.createStack, {
  participant_name: "Alice",
});

// Initialize orchestrator
const orchestrator = new AgentStackOrchestrator(stackId, llm, convexUrl);
await orchestrator.initialize();

// Run a single tick
const result = await orchestrator.tick();

// Run continuously
await orchestrator.runContinuous(5000, 50); // 5s interval, 50 ticks max
```

## Agent Flow

Each tick executes in sequence:

```
1. Planner → Evaluates state, creates/updates todos
2. Builder → Executes pending todos, builds artifacts
3. Communicator → Processes messages, responds
4. Reviewer → Analyzes progress, advises Planner
```

## Data Models

See `convex/schema.ts` for complete schema.

Key tables:

- `agent_stacks`: One per participant
- `agent_states`: 4 per stack (planner, builder, communicator, reviewer)
- `project_ideas`: Project concepts mapped to stacks
- `todos`: Task list for each stack
- `messages`: Inter-agent communication
- `artifacts`: Build outputs (HTML/JS files)
- `agent_traces`: Observability logs

## Development

```bash
# Type check
pnpm type-check

# Watch mode
pnpm dev
```

## Architecture Decisions

### Why Convex?

- Real-time reactive state synchronization
- TypeScript-first with auto-generated types
- <1s latency for updates
- No manual WebSocket setup needed

### Why Groq as Primary LLM?

- Fastest inference (critical for agent loops)
- Cost-effective for high-frequency operations
- Automatic fallback to OpenAI for complex tasks

### Memory Strategy

- **Short-term**: `current_context` field for active tasks
- **Long-term**: `memory` field for accumulated facts/learnings
- Stored in Convex for automatic sync
- No external memory service needed for MVP

## License

Private - Recursor Project
