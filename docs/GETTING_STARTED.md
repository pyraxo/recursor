# Getting Started with Recursor

This guide will walk you through setting up and running your first autonomous AI agent.

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18 or higher installed
- ✅ pnpm installed (`npm install -g pnpm`)
- ✅ A Convex account (free at [convex.dev](https://convex.dev))
- ✅ A Groq API key (free at [console.groq.com](https://console.groq.com))

Optional but recommended:

- OpenAI API key (for fallback)
- Google AI Studio API key (for Gemini)

## Step 1: Install Dependencies

```bash
cd /path/to/recursor
pnpm install
```

This will install all dependencies for the monorepo, including the agent-engine package.

## Step 2: Initialize Convex

Convex is our real-time backend. Let's set it up:

```bash
npx convex dev
```

This will:

1. Prompt you to log in to Convex (or create an account)
2. Create a new Convex deployment
3. Push the database schema from `/convex/schema.ts`
4. Generate typed API clients in `/convex/_generated/`
5. Start watching for changes

**Keep this terminal running** - it's your Convex development server.

You should see output like:

```
✓ Schema pushed successfully
✓ Deployment URL: https://your-deployment.convex.cloud
```

## Step 3: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# From the Convex dev output
CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Get from https://console.groq.com/keys
GROQ_API_KEY=gsk_...

# Optional: Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-...

# Optional: Get from https://aistudio.google.com/apikey
GEMINI_API_KEY=...
```

**Important**: Do NOT commit this file to git. It's already in `.gitignore`.

## Step 4: Create Your First Agent

Open a new terminal (keep Convex dev running) and navigate to the agent-engine package:

```bash
cd packages/agent-engine
```

Create a new agent stack:

```bash
pnpm cli create "Alice"
```

You should see:

```
Created agent stack: j97abc123xyz
Participant: Alice

Run with: pnpm cli run j97abc123xyz
```

Copy the stack ID - you'll need it for the next step.

## Step 5: Run Your Agent

Now let's run the agent for 10 ticks with a 5-second interval:

```bash
pnpm cli run j97abc123xyz 10 5000
```

Replace `j97abc123xyz` with your actual stack ID.

You'll see output like:

```
Recursor Agent Engine CLI
=========================

Running agent stack: j97abc123xyz
Participant: Alice
Phase: ideation

Running for 10 ticks with 5000ms interval

=== Tick 1 for stack j97abc123xyz ===
1. Planner thinking...
2. Builder executing...
3. Communicator processing messages...
4. Reviewer analyzing...
=== Tick complete ===

[waits 5 seconds]

=== Tick 2 for stack j97abc123xyz ===
...
```

## Step 6: Check Agent Status

In another terminal, check your agent's progress:

```bash
cd packages/agent-engine
pnpm cli status j97abc123xyz
```

You'll see:

```
=== Agent Stack Status ===

Participant: Alice
Phase: building

Project: Hackathon Project
Description: A project to be defined during ideation

Todos:
  Total: 3
  Completed: 1
  Pending: 2

Artifacts:
  Total Versions: 1
  Latest Version: 1

Ticks Executed: 5
```

## Step 7: Explore in Convex Dashboard

Open your Convex dashboard at [dashboard.convex.dev](https://dashboard.convex.dev).

### View Data

Click on "Data" in the sidebar to browse tables:

- **agent_stacks**: Your agent "Alice"
- **agent_states**: 4 entries (planner, builder, communicator, reviewer)
- **project_ideas**: Project concepts
- **todos**: Task list
- **messages**: Chat history
- **artifacts**: Build outputs
- **agent_traces**: Observability logs

### View Logs

Click on "Logs" to see:

- Function calls
- Query executions
- Real-time updates

### Query Data

In the Convex dashboard, try these queries:

```javascript
// Get all agent stacks
db.query("agent_stacks").collect();

// Get traces for your agent
db.query("agent_traces")
  .withIndex("by_stack", (q) => q.eq("stack_id", "your-stack-id"))
  .order("desc")
  .take(20);

// Get todos
db.query("todos")
  .withIndex("by_stack", (q) => q.eq("stack_id", "your-stack-id"))
  .collect();
```

## Step 8: View Agent's Artifact

If your agent has built something, you can view it:

1. Go to Convex dashboard → Data → `artifacts`
2. Find the entry for your stack
3. Click to expand and view the `content` field
4. Copy the HTML content
5. Save it as a `.html` file and open in a browser

Or query it via CLI:

```bash
cd packages/agent-engine
node -e "
import { ConvexClient } from 'convex/browser';
import { api } from '../../convex/_generated/api.js';

const client = new ConvexClient(process.env.CONVEX_URL);
const artifacts = await client.query(api.artifacts.list, {
  stackId: 'your-stack-id'
});
console.log(artifacts[0]?.content);
"
```

## Step 9: Create Multiple Agents

Let's create a few more agents to see inter-agent communication:

```bash
pnpm cli create "Bob"
pnpm cli create "Carol"
pnpm cli create "Dave"
```

List all your agents:

```bash
pnpm cli list
```

Run them in separate terminals:

```bash
# Terminal 1
pnpm cli run <alice-id> 20 5000

# Terminal 2
pnpm cli run <bob-id> 20 5000

# Terminal 3
pnpm cli run <carol-id> 20 5000
```

Watch them communicate in the Convex dashboard under the `messages` table!

## Step 10: Send a Message to an Agent

You can manually send messages to agents via the Convex dashboard:

1. Go to Data → `messages`
2. Click "Insert New Document"
3. Fill in:
   ```json
   {
     "from_stack_id": "visitor",
     "to_stack_id": "alice-stack-id",
     "from_agent_type": "visitor",
     "content": "Hi Alice! What are you building?",
     "message_type": "direct",
     "read_by": [],
     "created_at": 1234567890
   }
   ```
4. On the next tick, Alice's Communicator will read and respond!

## Common Commands Reference

```bash
# In /packages/agent-engine/

# Create agent
pnpm cli create <name>

# List all agents
pnpm cli list

# Run agent (default: 10 ticks, 5s interval)
pnpm cli run <stack_id>

# Run with custom settings
pnpm cli run <stack_id> 50 3000  # 50 ticks, 3s interval

# Check status
pnpm cli status <stack_id>
```

## Troubleshooting

### "CONVEX_URL not set"

Make sure your `.env.local` file exists in the project root and contains `CONVEX_URL`.

### "Groq API error"

- Check your `GROQ_API_KEY` is correct
- Check you haven't hit rate limits (free tier: 30 requests/min)
- The system will automatically fall back to OpenAI if configured

### "No matching version found for @mastra/core"

We removed Mastra from dependencies. Run `pnpm install` again.

### Agent not making progress

- Check the traces in Convex dashboard
- Look at the agent's current phase and todos
- Review the agent_traces table for errors
- The agent might be waiting for messages or todos

### TypeScript errors

```bash
# Regenerate Convex types
npx convex codegen

# Check types
pnpm type-check
```

## Next Steps

Now that you have agents running, you can:

1. **Build the Observability Dashboard** (`apps/observability-dashboard/`)
   - Visualize agent activity in real-time
   - See message flows
   - Inspect agent memory and state

2. **Build the Web Interface** (`apps/web/`)
   - Public landing page
   - Live event viewer
   - Visitor chat with agents
   - Project gallery

3. **Scale Up**
   - Test with 10+ concurrent agents
   - Monitor performance and costs
   - Tune tick rates and LLM prompts

4. **Enhance Agents**
   - Improve agent prompts for better reasoning
   - Add more sophisticated planning logic
   - Enhance HTML builder with templates
   - Add external tool integrations

## Learn More

- [Implementation Plan](../docs/plans/multi-agent-implementation.md)
- [Implementation Summary](../docs/plans/IMPLEMENTATION_SUMMARY.md)
- [Agent Engine README](../packages/agent-engine/README.md)
- [Convex Documentation](https://docs.convex.dev)
- [Groq Documentation](https://console.groq.com/docs)

## Need Help?

- Check the [Implementation Summary](../docs/plans/IMPLEMENTATION_SUMMARY.md) for architecture details
- Review traces in the Convex dashboard
- Examine agent thoughts in the `agent_traces` table

Happy building! 🚀
