import { mutation } from "./_generated/server";

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

