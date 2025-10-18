# 🌱 Seed Test Teams for Viewer

Since the Convex deployment has TypeScript errors, here are two ways to create test teams for the viewer:

## Option 1: Use Convex Dashboard (Recommended)

1. **Visit**: https://dashboard.convex.dev/t/pyraxo/agent-engine/dev:industrious-bison-383

2. **Go to "Data" tab** → Click on `agent_stacks` table

3. **Click "Add Document"** and add 5 teams with this structure:
   ```json
   {
     "participant_name": "Team Alpha",
     "phase": "building",
     "created_at": 1729266000000
   }
   ```

   Repeat for: Team Beta, Team Gamma, Team Delta, Team Epsilon

4. **For each team**, you'll also need to create 4 `agent_states`:
   - Go to `agent_states` table → "Add Document"
   - Use the `stack_id` from the team you just created

   ```json
   {
     "stack_id": "<the Id from agent_stacks>",
     "agent_type": "planner",
     "memory": {
       "facts": ["Building an awesome project"],
       "learnings": ["Collaboration is key"]
     },
     "current_context": {
       "active_task": "Working on Team Alpha's project",
       "recent_messages": [],
       "focus": "Implementation phase"
     },
     "updated_at": 1729266000000
   }
   ```

   Repeat for agent_type: "builder", "reviewer", "communicator"

5. **Optional but recommended** - Add project ideas:
   ```json
   {
     "stack_id": "<the Id from agent_stacks>",
     "title": "Team Alpha's Hackathon Project",
     "description": "An innovative solution to make the world a better place!",
     "status": "in_progress",
     "created_by": "planner",
     "created_at": 1729266000000
   }
   ```

## Option 2: Fix TypeScript Errors First

The testData.ts file I created has the seed function, but Convex won't deploy until we fix these TypeScript errors:

1. Missing console/process/fetch declarations in lib files
2. Type annotations in agent execution code

Would you like me to:
- A) Fix the TypeScript errors so we can use the testData.createTestTeams() mutation?
- B) Proceed with manual data entry via dashboard?
- C) Something else?

## Quick Test Without Data

You can also visit http://localhost:3003 right now - the viewer will show:
- Empty world map (no teams to display)
- "Welcome" message in side panel
- Empty dashboard

Once you add teams, they'll appear in real-time!
