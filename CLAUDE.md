# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Recursor is a multi-agent system that simulates hackathon participants using autonomous AI agents. Each participant is represented by an Agent Stack containing 4 specialized sub-agents (Planner, Builder, Communicator, Reviewer) that collaborate to ideate, build, and demo projects in real-time.

## Architecture

This is a TypeScript monorepo using Turborepo and pnpm workspaces with the following structure:

- **apps/dashboard**: Next.js 15.5 agent monitoring UI (port 3002)
- **apps/web**: Main web interface (port 3000 with Turbopack)
- **apps/docs**: Documentation site
- **packages/agent-engine**: Core agent orchestration system
- **packages/convex**: Backend database schema and API functions
- **packages/ui**: Shared React components (Radix UI based)
- **packages/eslint-config**: Shared ESLint configurations
- **packages/typescript-config**: Shared TypeScript configurations

## Key Commands

### Development
```bash
# Install dependencies
pnpm install

# Start all dev servers (Turborepo orchestrated)
pnpm dev

# Start specific app dev servers
pnpm --filter dashboard dev        # Port 3002
pnpm --filter web dev              # Port 3000

# Start Convex backend
pnpm convex:dev                    # Keep running in separate terminal
```

### Agent Management (from packages/agent-engine/)
```bash
# Create new agent
pnpm cli create "AgentName"

# Run agent
pnpm cli run <stack_id> [max_ticks] [interval_ms]

# Check agent status
pnpm cli status <stack_id>

# List all agents
pnpm cli list
```

### Testing
```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage reports
pnpm test:coverage

# Open Vitest UI
pnpm test:ui

# Test specific package
pnpm --filter @repo/ui test
pnpm --filter @recursor/agent-engine test
```

### Code Quality
```bash
# Lint all packages
pnpm lint

# Type check all packages
pnpm check-types

# Format code (Prettier)
pnpm format

# Build all packages
pnpm build
```

## Agent System Architecture

Recursor supports **two team architectures**:

### Standard Multi-Agent Teams (Default)
The traditional system operates on a tick-based loop where each Agent Stack executes 4 agents in sequence:

1. **PlannerAgent**: Evaluates state, creates/updates todos
2. **BuilderAgent**: Executes todos, generates HTML/JS artifacts
3. **CommunicatorAgent**: Processes and responds to messages
4. **ReviewerAgent**: Analyzes progress, provides strategic feedback

Key components:
- **Orchestrator** (`packages/agent-engine/src/orchestrator.ts`): Manages the 4-agent cycle
- **Memory System**: Short-term (current_context) and long-term (memory) storage
- **Messaging**: Broadcasts and direct messages between agents
- **Artifact Builder**: Generates single-file HTML/JS applications

### Cursor Background Agent Teams (Optional)
Single autonomous agent with full IDE tooling in isolated VM:

1. **Single Agent**: Unified role handling planning, building, communication, and review
2. **GitHub Workspace**: Temporary repository per team for professional workflow
3. **IDE Tooling**: grep, lint, test, git integration
4. **Multi-file Projects**: Full project structure support (vs single HTML files)

Key components:
- **Orchestrator** (`packages/agent-engine/src/cursor/cursor-team-orchestrator.ts`): Manages single Cursor agent
- **Workspace Manager**: GitHub repository lifecycle management
- **Artifact Sync**: Bidirectional sync between Convex and Git
- **Factory Pattern** (`packages/agent-engine/src/orchestrator-factory.ts`): Auto-selects orchestrator based on team type

## Backend Architecture (Convex)

The backend uses Convex for real-time reactive database operations. Key tables:
- `agent_stacks`: One per participant
- `agent_states`: 4 per stack (memory + context)
- `project_ideas`: Project concepts
- `todos`: Task management
- `messages`: Inter-agent communication
- `artifacts`: Build outputs (HTML/JS)
- `agent_traces`: Observability logs

API functions are in `packages/convex/convex/*.ts`:
- `agents.ts`: Agent stack operations
- `todos.ts`: Todo management
- `messages.ts`: Message handling
- `artifacts.ts`: Artifact storage
- `traces.ts`: Observability logging

## LLM Configuration

Multi-provider setup with automatic fallback:
1. **Primary**: Groq (llama-3.3-70b-versatile) - Fast inference, cost-effective
2. **Fallback**: OpenAI (gpt-4o-mini) - Complex reasoning
3. **Alternative**: Google Gemini (gemini-2.0-flash-exp) - Diversity

Configuration in `packages/agent-engine/src/config.ts`.

## Environment Setup

Required environment variables in `.env.local`:
```
CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
GROQ_API_KEY=gsk_...
```

Optional (for additional LLM providers):
```
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

**For Cursor Teams** (required only if using Cursor Background Agent teams):
```
CURSOR_API_KEY=cur_...        # Get from https://cursor.com/settings (paid plan required)
GITHUB_TOKEN=ghp_...           # Personal Access Token with 'repo' and 'delete_repo' scopes
```

See [`docs/CURSOR_TEAM_SETUP.md`](docs/CURSOR_TEAM_SETUP.md) for detailed setup instructions.

## Testing Infrastructure

- **Framework**: Vitest 3.2.4 with workspace configuration
- **Component Testing**: React Testing Library + JSDOM
- **Coverage**: V8 provider with HTML/JSON reporters
- **CI/CD**: GitHub Actions with Node.js 18.x/20.x matrix

Test files co-located with source (`.test.ts` or `.test.tsx`).

## Development Workflow

1. **Start Convex backend**: `pnpm convex:dev` (keep running)
2. **Start dev servers**: `pnpm dev` (in new terminal)
3. **Create agents**: Use CLI in `packages/agent-engine/`
4. **Monitor**: Check Convex dashboard for real-time data
5. **Test changes**: Run tests with `pnpm test:watch`

## Key Files

- **Orchestrator**: `packages/agent-engine/src/orchestrator.ts`
- **Agent implementations**: `packages/agent-engine/src/agents/*.ts`
- **Database schema**: `packages/convex/convex/schema.ts`
- **Dashboard components**: `apps/dashboard/components/`
- **Shared UI components**: `packages/ui/src/`
- **Build configuration**: `turbo.json`

## Current Status

**Completed**: Core agent system, Convex backend, memory system, messaging, artifact builder, CLI tool, testing infrastructure

**In Progress**: Dashboard improvements (see uncommitted DASHBOARD_FIXES.md)

**Planned**: Deploy Convex, test agents end-to-end, scale to multiple agents, public web interface