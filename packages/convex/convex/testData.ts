import { mutation } from "./_generated/server";

// Seed test teams for viewer showcase (creates 6 teams)
export const createTestTeams = mutation({
  handler: async (ctx) => {
    const teamNames = [
      "Team Alpha",
      "Team Beta",
      "Team Gamma",
      "Team Delta",
      "Team Epsilon",
      "Team Zeta"
    ];

    for (const name of teamNames) {
      const stackId = await ctx.db.insert("agent_stacks", {
        participant_name: name,
        phase: "building",
        created_at: Date.now() - Math.random() * 3600000,
      });

      const agentTypes = ["planner", "builder", "reviewer", "communicator"];
      for (const agentType of agentTypes) {
        await ctx.db.insert("agent_states", {
          stack_id: stackId,
          agent_type: agentType,
          memory: {
            facts: ["Building an awesome project"],
            learnings: ["Collaboration is key"],
          },
          current_context: {
            active_task: `Working on ${name}'s project`,
            recent_messages: [],
            focus: "Implementation phase",
          },
          updated_at: Date.now(),
        });
      }

      await ctx.db.insert("project_ideas", {
        stack_id: stackId,
        title: `${name}'s Hackathon Project`,
        description: `An innovative solution to make the world a better place. ${name} is working hard on implementing cool features!`,
        status: "in_progress",
        created_by: "planner",
        created_at: Date.now() - Math.random() * 3600000,
      });

      const todoCount = Math.floor(Math.random() * 5) + 3;
      for (let i = 0; i < todoCount; i++) {
        await ctx.db.insert("todos", {
          stack_id: stackId,
          content: `Implement feature ${i + 1}`,
          status: i < 2 ? "completed" : "in_progress",
          assigned_by: "planner",
          priority: Math.floor(Math.random() * 5) + 1,
          created_at: Date.now() - Math.random() * 1800000,
          completed_at: i < 2 ? Date.now() - Math.random() * 900000 : undefined,
        });
      }
    }

    return { success: true, teamsCreated: teamNames.length };
  },
});

// Cleanup extra teams to keep exactly 5 for viewer
export const deleteExtraTeams = mutation({
  handler: async (ctx) => {
    const stacks = await ctx.db.query("agent_stacks").collect();

    if (stacks.length > 5) {
      const toDelete = stacks.slice(5);

      for (const stack of toDelete) {
        const agentStates = await ctx.db
          .query("agent_states")
          .withIndex("by_stack", (q) => q.eq("stack_id", stack._id))
          .collect();
        for (const state of agentStates) {
          await ctx.db.delete(state._id);
        }

        const projectIdeas = await ctx.db
          .query("project_ideas")
          .withIndex("by_stack", (q) => q.eq("stack_id", stack._id))
          .collect();
        for (const idea of projectIdeas) {
          await ctx.db.delete(idea._id);
        }

        const todos = await ctx.db
          .query("todos")
          .withIndex("by_stack", (q) => q.eq("stack_id", stack._id))
          .collect();
        for (const todo of todos) {
          await ctx.db.delete(todo._id);
        }

        await ctx.db.delete(stack._id);
      }

      return { deleted: toDelete.length, remaining: 5 };
    }

    return { deleted: 0, remaining: stacks.length };
  },
});
