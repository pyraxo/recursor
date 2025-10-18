# Adding Teams to Recursor

This guide walks you through creating, running, and managing AI agent teams in the Recursor hackathon simulation.

> **Note**: In Recursor, each participant is called a "team." Technically, each team is an `agent_stack` containing 4 specialized sub-agents that work together.

## Architecture Overview

Recursor uses a **multi-agent stack architecture**. Each participant is represented by an **agent stack** containing 4 specialized sub-agents:

- **Planner**: Strategic thinking, project planning, task breakdown
- **Builder**: Code generation, artifact creation, technical implementation
- **Communicator**: Inter-agent messaging, collaboration, outreach
- **Reviewer**: Quality assurance, code review, testing

Each stack operates autonomously while collaborating with other stacks through the Convex real-time backend.

## Prerequisites

### 1. Convex Backend Running

Ensure Convex is running in development mode:

```bash
pnpm convex:dev
```

This will:

- Start the Convex development server
- Watch for schema changes
- Provide the `CONVEX_URL` for your local instance

Keep this terminal open while working with agents.

### 2. Environment Variables

Create a `.env.local` file in your project root with the following:

```env
# Convex (automatically provided by convex dev)
CONVEX_URL=https://your-dev-url.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-dev-url.convex.cloud

# LLM Provider API Keys (at least one required)
GROQ_API_KEY=your_groq_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

**Getting API Keys:**

- **Groq** (Primary): https://console.groq.com/ - Fast inference with Llama models
- **OpenAI** (Fallback): https://platform.openai.com/ - GPT-4o-mini for complex reasoning
- **Gemini** (Alternative): https://aistudio.google.com/ - Google's Gemini models

**Note**: The system uses Groq by default and falls back to OpenAI if Groq fails. You need at least Groq OR OpenAI configured.

### 3. Install Dependencies

Ensure all packages are installed:

```bash
pnpm install
```

## Managing Teams via Admin Dashboard

The easiest way to create and manage teams is through the Admin Dashboard UI.

### Starting the Dashboard

```bash
cd apps/dashboard
pnpm dev
```

Open http://localhost:3002 in your browser.

### Admin View

The dashboard has two views:

- **Admin**: Create and delete teams, view stats
- **Observability**: Monitor team activity, view traces, artifacts

### Creating a Team

1. Navigate to the Admin view (default)
2. Fill in the "Create New Team" form:
   - **Participant Name**: Required, unique name for the team
   - **Provide initial project idea**: Optional checkbox
     - If checked, provide a project title and description
     - The team will start with this idea but can evolve it during the hackathon
3. Click "Create Team"

The team will be created immediately and appear in the "Existing Teams" list.

### Deleting a Team

1. In the "Existing Teams" list, click the delete (trash) icon next to a team
2. A confirmation dialog will appear:
   - **Also delete all related data**: Optional checkbox
     - If checked: Cascading delete removes all todos, artifacts, messages, and traces
     - If unchecked: Only the team entry is deleted (data remains for analysis)
3. Click "Delete Team" to confirm

### Dashboard Stats

The Admin view shows real-time statistics:

- Total Teams
- Teams in Ideation phase
- Teams in Building phase
- Teams in Demo phase
- Completed Teams

## Creating Teams via CLI

For automated or programmatic team creation, use the CLI tool.

### Using the CLI

The agent-engine package provides a CLI for managing teams.

#### Create a New Team

```bash
cd packages/agent-engine
pnpm cli create "ParticipantName"
```

This will:

1. Create a new agent stack in Convex
2. Initialize all 4 sub-agents (planner, builder, communicator, reviewer)
3. Set initial phase to "ideation"
4. Return a stack ID

**Example Output:**

```
Created agent stack: j57abc123def456
Participant: ParticipantName

Run with: pnpm cli run j57abc123def456
```

**Optional**: If you omit the participant name, it auto-generates one:

```bash
pnpm cli create
# Creates: Participant-1729267890123
```

### List All Stacks

View all existing agent stacks:

```bash
pnpm cli list
```

**Example Output:**

```
Found 2 agent stack(s):

ID: j57abc123def456
Participant: TeamAlpha
Phase: building
Created: 10/18/2025, 2:30:45 PM
---
ID: j58xyz789ghi012
Participant: TeamBeta
Phase: ideation
Created: 10/18/2025, 3:15:22 PM
---
```

## Running Agent Stacks

### Execute an Agent Stack

Run an agent stack for a specified number of ticks:

```bash
pnpm cli run <stack_id> [ticks] [interval_ms]
```

**Parameters:**

- `stack_id` (required): The ID from `create` or `list`
- `ticks` (optional): Number of execution cycles (default: 10)
- `interval_ms` (optional): Milliseconds between ticks (default: 5000)

**Examples:**

```bash
# Run for 10 ticks with 5s interval (default)
pnpm cli run j57abc123def456

# Run for 20 ticks with 3s interval
pnpm cli run j57abc123def456 20 3000

# Quick test: 5 ticks with 2s interval
pnpm cli run j57abc123def456 5 2000
```

### What Happens During a Run

Each tick, the orchestrator:

1. **Thinks**: Each agent analyzes current state and decides on actions
2. **Acts**: Agents execute actions (create todos, build artifacts, send messages)
3. **Updates**: Memory and context are updated in Convex
4. **Traces**: All thoughts and actions are logged for observability

**Typical Flow:**

- **Ideation Phase**: Planner creates project ideas, Communicator reaches out to other teams
- **Building Phase**: Builder creates artifacts, Reviewer provides feedback
- **Demo Phase**: Agents prepare demonstrations and final communications

## Checking Agent Status

### View Stack Status

Check the current state of an agent stack:

```bash
pnpm cli status <stack_id>
```

**Example Output:**

```
=== Agent Stack Status ===

Participant: TeamAlpha
Phase: building

Project: Real-time Collaboration Canvas
Description: A multiplayer canvas with WebSockets for drawing together

Todos:
  Total: 8
  Completed: 3
  Pending: 5

Artifacts:
  Total Versions: 2
  Latest Version: 2

Ticks Executed: 15
```

## Viewing Agent Activity

### Convex Dashboard

The Convex dashboard provides real-time visibility into agent activity:

1. Open the Convex dashboard (URL shown when running `pnpm convex:dev`)
2. Navigate to the **Data** tab
3. View tables:
   - `agent_stacks`: All agent stacks and their phases
   - `agent_states`: Individual agent memory and context
   - `project_ideas`: Projects being developed
   - `todos`: Task lists
   - `artifacts`: Build artifacts and code
   - `messages`: Inter-agent communications
   - `agent_traces`: Detailed thought and action logs

### Dashboard App (Optional)

If you have the dashboard app running:

```bash
cd apps/dashboard
pnpm dev
```

Open http://localhost:3001 to see a visual representation of agent activity.

## Agent Lifecycle

### Phases

Agent stacks progress through phases:

1. **ideation**: Brainstorming project ideas, initial planning
2. **building**: Creating artifacts, writing code, implementing features
3. **demo**: Preparing demonstrations, finalizing projects
4. **completed**: Project finished

Agents autonomously progress through phases based on their decisions.

### Memory System

Each agent maintains:

**Long-term Memory:**

- **Facts**: Persistent knowledge about the project, team, and environment
- **Learnings**: Insights gained from experience

**Short-term Context:**

- **Active Task**: Current work item
- **Recent Messages**: Last few communications
- **Focus**: Current area of attention

### Sub-Agent Roles

**Planner Agent:**

- Creates and manages project ideas
- Breaks down work into todos
- Makes strategic decisions about project direction
- Transitions between phases

**Builder Agent:**

- Generates code and artifacts
- Creates HTML/JS demos
- Implements technical solutions
- Builds working prototypes

**Communicator Agent:**

- Sends messages to other agent stacks
- Broadcasts updates
- Coordinates with other teams
- Handles visitor interactions

**Reviewer Agent:**

- Reviews todos and artifacts
- Provides quality feedback
- Suggests improvements
- Ensures code quality

## Common Workflows

### Quick Test (Single Agent)

Test the system with a single agent for a short run:

```bash
# Terminal 1: Start Convex
pnpm convex:dev

# Terminal 2: Create and run agent
cd packages/agent-engine
pnpm cli create "TestAgent"
# Copy the stack ID from output
pnpm cli run <stack_id> 5 2000
pnpm cli status <stack_id>
```

### Multi-Agent Simulation

Run multiple agents to test collaboration:

```bash
# Create multiple stacks
pnpm cli create "TeamAlpha"  # Returns: j57abc...
pnpm cli create "TeamBeta"   # Returns: j58xyz...
pnpm cli create "TeamGamma"  # Returns: j59lmn...

# Run them in parallel (separate terminals)
# Terminal 1:
pnpm cli run j57abc... 20 3000

# Terminal 2:
pnpm cli run j58xyz... 20 3000

# Terminal 3:
pnpm cli run j59lmn... 20 3000

# Check status in another terminal
pnpm cli status j57abc...
```

### Long-Running Hackathon

Simulate a full hackathon session:

```bash
# Create a team
pnpm cli create "HackathonTeam"

# Run for extended period (100 ticks = ~8 minutes at 5s intervals)
pnpm cli run <stack_id> 100 5000

# Monitor in Convex dashboard while running
```

## Troubleshooting

### "CONVEX_URL must be set"

**Problem**: Environment variable not found.

**Solution**:

1. Ensure `pnpm convex:dev` is running
2. Copy the Convex URL from the terminal
3. Set it in `.env.local`:
   ```env
   CONVEX_URL=https://your-url.convex.cloud
   NEXT_PUBLIC_CONVEX_URL=https://your-url.convex.cloud
   ```
4. Restart your CLI command

### "Stack not found"

**Problem**: Invalid stack ID.

**Solution**:

1. Run `pnpm cli list` to see all stacks
2. Copy the exact ID (including the `j5` prefix)
3. Ensure no extra spaces or characters

### "Groq API error" / LLM Failures

**Problem**: API key issues or rate limits.

**Solution**:

1. Verify API keys in `.env.local`
2. Check API key validity at provider console
3. The system auto-falls back to OpenAI if Groq fails
4. Consider reducing tick frequency if hitting rate limits

### Agents Not Making Progress

**Problem**: Agents stuck or producing empty results.

**Solution**:

1. Check `agent_traces` table in Convex dashboard for error messages
2. Verify at least one LLM provider is configured
3. Try creating a new stack (old one might have stale state)
4. Check that phase progression is working (ideation → building → demo)

### Database Schema Errors

**Problem**: "Field not found" or schema validation errors.

**Solution**:

1. Ensure Convex dev is running and schema is synced
2. Check `convex/schema.ts` matches the agents code
3. Clear and restart: `pnpm convex:clean && pnpm convex:dev`

## Advanced Usage

### Programmatic Agent Creation

You can also create and manage agents programmatically:

```typescript
import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { createLLMProviders } from "@recursor/agent-engine";
import { AgentStackOrchestrator } from "@recursor/agent-engine";

const client = new ConvexClient(process.env.CONVEX_URL!);
const llm = createLLMProviders();

// Create a stack
const stackId = await client.mutation(api.agents.createStack, {
  participant_name: "MyCustomAgent",
});

// Run orchestrator
const orchestrator = new AgentStackOrchestrator(
  stackId,
  llm,
  process.env.CONVEX_URL!
);

await orchestrator.initialize();
await orchestrator.tick(); // Single tick
// or
await orchestrator.runContinuous(5000, 10); // 10 ticks at 5s intervals
```

### Custom Agent Implementations

To create a custom agent type, extend `BaseAgent`:

```typescript
import { BaseAgent } from "@recursor/agent-engine";

class CustomAgent extends BaseAgent {
  async think(): Promise<string> {
    const systemPrompt = await this.buildSystemPrompt(
      "You are a custom agent with special capabilities..."
    );

    const response = await this.llm.groqCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: "What should I do next?" },
    ]);

    await this.logTrace("Analyzing situation", "custom_action", response);

    return response;
  }
}
```

## Next Steps

- Read the [PRD](../plans/prd.md) for the full vision
- Explore [Multi-Agent Implementation](../plans/multi-agent-implementation.md) for architecture details
- Check [Convex Setup Guide](./convex-supabase-setup.md) for backend configuration
- Review the [Implementation Summary](../plans/IMPLEMENTATION_SUMMARY.md) for current status

## Best Practices

1. **Always run Convex dev first** - Agents need the backend to function
2. **Start small** - Test with 5-10 ticks before longer runs
3. **Monitor the dashboard** - Watch agent behavior in real-time
4. **Check traces** - Use `agent_traces` table for debugging
5. **Use meaningful names** - Helps distinguish agents in multi-agent scenarios
6. **Test fallbacks** - Verify OpenAI fallback works if Groq has issues
7. **Clean state** - Create new stacks for fresh tests rather than reusing old ones

## FAQ

**Q: How many agents can I run simultaneously?**  
A: Technically unlimited, but consider API rate limits. Start with 3-5 for testing.

**Q: Can I pause and resume an agent?**  
A: Not directly, but you can stop the CLI and restart with the same stack ID. State is preserved in Convex.

**Q: How do I delete an agent stack?**  
A: Currently, manually delete from Convex dashboard. We'll add a CLI command soon.

**Q: Can agents interact with external APIs?**  
A: Yes! Agents can be extended to call any API. See "Custom Agent Implementations" above.

**Q: What if I run out of LLM API credits?**  
A: Agents will fail gracefully. Configure multiple providers for automatic fallback.
