import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new agent stack
export const createStack = mutation({
  args: {
    participant_name: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const stackId = await ctx.db.insert("agent_stacks", {
      participant_name: args.participant_name,
      phase: "ideation",
      created_at: Date.now(),
    });

    // Initialize agent states for all 4 sub-agents
    const agentTypes = ["planner", "builder", "communicator", "reviewer"];
    for (const agentType of agentTypes) {
      await ctx.db.insert("agent_states", {
        stack_id: stackId,
        agent_type: agentType,
        memory: {
          facts: [],
          learnings: [],
        },
        current_context: {
          active_task: undefined,
          recent_messages: [],
          focus: undefined,
        },
        updated_at: Date.now(),
      });
    }

    return stackId;
  },
});

// Get all agent stacks
export const listStacks = query({
  args: {},
  handler: async (ctx: any) => {
    return await ctx.db.query("agent_stacks").collect();
  },
});

// Get a specific agent stack with all its agents
export const getStack = query({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx: any, args: any) => {
    const stack = await ctx.db.get(args.stackId);
    if (!stack) return null;

    const agents = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stackId))
      .collect();

    return { ...stack, agents };
  },
});

// Update agent state
export const updateAgentState = mutation({
  args: {
    stackId: v.id("agent_stacks"),
    agentType: v.string(),
    memory: v.optional(
      v.object({
        facts: v.array(v.string()),
        learnings: v.array(v.string()),
      })
    ),
    currentContext: v.optional(
      v.object({
        active_task: v.optional(v.string()),
        recent_messages: v.array(v.string()),
        focus: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx: any, args: any) => {
    const agentState = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stackId))
      .filter((q: any) => q.eq(q.field("agent_type"), args.agentType))
      .first();

    if (!agentState) {
      throw new Error(`Agent state not found for ${args.agentType}`);
    }

    await ctx.db.patch(agentState._id, {
      ...(args.memory && { memory: args.memory }),
      ...(args.currentContext && { current_context: args.currentContext }),
      updated_at: Date.now(),
    });
  },
});

// Get agent state
export const getAgentState = query({
  args: {
    stackId: v.id("agent_stacks"),
    agentType: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stackId))
      .filter((q: any) => q.eq(q.field("agent_type"), args.agentType))
      .first();
  },
});

// Update stack phase
export const updatePhase = mutation({
  args: {
    stackId: v.id("agent_stacks"),
    phase: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    await ctx.db.patch(args.stackId, {
      phase: args.phase,
    });
  },
});
