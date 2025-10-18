import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Create a new agent stack
export const createStack = mutation({
  args: {
    participant_name: v.string(),
    initial_project_title: v.optional(v.string()),
    initial_project_description: v.optional(v.string()),
    team_type: v.optional(v.union(v.literal("standard"), v.literal("cursor"))),
  },
  handler: async (ctx, args) => {
    const teamType = args.team_type || "standard";

    const stackId = await ctx.db.insert("agent_stacks", {
      participant_name: args.participant_name,
      phase: "ideation",
      created_at: Date.now(),
      team_type: teamType,
      // Initialize cursor_config for cursor teams
      ...(teamType === "cursor" && {
        cursor_config: {
          agent_id: undefined,
          repository_url: undefined,
          repository_name: undefined,
          workspace_branch: undefined,
          last_prompt_at: undefined,
          total_prompts_sent: 0,
        },
      }),
    });

    // Only create agent_states for standard teams
    // Cursor teams use a single background agent, no sub-agents needed
    if (teamType === "standard") {
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
    }

    // Create initial project idea if provided
    if (args.initial_project_title && args.initial_project_description) {
      await ctx.db.insert("project_ideas", {
        stack_id: stackId,
        title: args.initial_project_title,
        description: args.initial_project_description,
        status: "ideation",
        created_by: teamType === "cursor" ? "cursor-agent" : "admin",
        created_at: Date.now(),
      });
    }

    return stackId;
  },
});

// Get all agent stacks
export const listStacks = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agent_stacks").collect();
  },
});

// Get a specific agent stack with all its agents
export const getStack = query({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    const stack = await ctx.db.get(args.stackId);
    if (!stack) return null;

    const agents = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
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
  handler: async (ctx, args) => {
    const agentState = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .filter((q) => q.eq(q.field("agent_type"), args.agentType))
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
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .filter((q) => q.eq(q.field("agent_type"), args.agentType))
      .first();
  },
});

// Update stack phase
export const updatePhase = mutation({
  args: {
    stackId: v.id("agent_stacks"),
    phase: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stackId, {
      phase: args.phase,
    });
  },
});

// Delete an agent stack
export const deleteStack = mutation({
  args: {
    stackId: v.id("agent_stacks"),
    cascadeDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.cascadeDelete) {
      // Delete all related data
      const agentStates = await ctx.db
        .query("agent_states")
        .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
        .collect();
      for (const state of agentStates) {
        await ctx.db.delete(state._id);
      }

      const projectIdeas = await ctx.db
        .query("project_ideas")
        .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
        .collect();
      for (const idea of projectIdeas) {
        await ctx.db.delete(idea._id);
      }

      const todos = await ctx.db
        .query("todos")
        .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
        .collect();
      for (const todo of todos) {
        await ctx.db.delete(todo._id);
      }

      const artifacts = await ctx.db
        .query("artifacts")
        .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
        .collect();
      for (const artifact of artifacts) {
        await ctx.db.delete(artifact._id);
      }

      const traces = await ctx.db
        .query("agent_traces")
        .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
        .collect();
      for (const trace of traces) {
        await ctx.db.delete(trace._id);
      }

      const sentMessages = await ctx.db
        .query("messages")
        .withIndex("by_sender", (q) => q.eq("from_stack_id", args.stackId))
        .collect();
      for (const msg of sentMessages) {
        await ctx.db.delete(msg._id);
      }

      const receivedMessages = await ctx.db
        .query("messages")
        .withIndex("by_recipient", (q) => q.eq("to_stack_id", args.stackId))
        .collect();
      for (const msg of receivedMessages) {
        await ctx.db.delete(msg._id);
      }
    }

    // Delete the stack itself
    await ctx.db.delete(args.stackId);
  },
});

// Execution control mutations
export const startExecution = mutation({
  args: {
    stackId: v.id('agent_stacks'),
  },
  handler: async (ctx, args) => {
    const stack = await ctx.db.get(args.stackId);
    if (!stack) throw new Error('Stack not found');

    const wasStopped = stack.execution_state === 'stopped';

    await ctx.db.patch(args.stackId, {
      execution_state: 'running',
      started_at: Date.now(),
      last_activity_at: Date.now(),
      paused_at: undefined,
      stopped_at: undefined,
      // Reset cycle count if starting after stop
      ...(wasStopped && { total_cycles: 0 }),
    });

    // If starting after stop, clear old work detection cache
    if (wasStopped) {
      const oldCache = await ctx.db
        .query("work_detection_cache")
        .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
        .collect();

      for (const entry of oldCache) {
        await ctx.db.delete(entry._id);
      }
    }

    return { success: true, wasReset: wasStopped };
  },
});

export const pauseExecution = mutation({
  args: {
    stackId: v.id('agent_stacks'),
  },
  handler: async (ctx, args) => {
    const stack = await ctx.db.get(args.stackId);
    if (!stack) throw new Error('Stack not found');

    await ctx.db.patch(args.stackId, {
      execution_state: 'paused',
      paused_at: Date.now(),
    });

    console.log(`[ExecutionControl] Paused stack ${args.stackId} (${stack.participant_name})`);

    return { success: true };
  },
});

export const resumeExecution = mutation({
  args: {
    stackId: v.id('agent_stacks'),
  },
  handler: async (ctx, args) => {
    const stack = await ctx.db.get(args.stackId);
    if (!stack) throw new Error('Stack not found');

    await ctx.db.patch(args.stackId, {
      execution_state: 'running',
      paused_at: undefined,
      last_activity_at: Date.now(),
    });

    return { success: true };
  },
});

export const stopExecution = mutation({
  args: {
    stackId: v.id('agent_stacks'),
  },
  handler: async (ctx, args) => {
    const stack = await ctx.db.get(args.stackId);
    if (!stack) throw new Error('Stack not found');

    await ctx.db.patch(args.stackId, {
      execution_state: 'stopped',
      stopped_at: Date.now(),
      process_id: undefined,
    });

    console.log(`[ExecutionControl] Stopped stack ${args.stackId} (${stack.participant_name}). State will be reset on next start.`);

    return { success: true };
  },
});

export const updateActivityTimestamp = mutation({
  args: {
    stackId: v.id('agent_stacks'),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stackId, {
      last_activity_at: Date.now(),
    });

    return { success: true };
  },
});

// Execution status queries
export const getExecutionStatus = query({
  args: {
    stackId: v.id('agent_stacks'),
  },
  handler: async (ctx, args) => {
    const stack = await ctx.db.get(args.stackId);
    if (!stack) return null;

    return {
      execution_state: stack.execution_state || 'idle',
      last_activity_at: stack.last_activity_at,
      started_at: stack.started_at,
      paused_at: stack.paused_at,
      stopped_at: stack.stopped_at,
      process_id: stack.process_id,
    };
  },
});

export const listRunningStacks = query({
  args: {},
  handler: async (ctx) => {
    const stacks = await ctx.db
      .query('agent_stacks')
      .collect();

    return stacks.filter(stack => stack.execution_state === 'running');
  },
});

// ========= INTERNAL FUNCTIONS FOR AGENT ADAPTERS =========

// Internal mutation: Update agent memory (full replacement)
export const updateAgentMemory = internalMutation({
  args: {
    stackId: v.id("agent_stacks"),
    agentType: v.string(),
    memory: v.any(),
  },
  handler: async (ctx, args) => {
    const agentState = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .filter((q) => q.eq(q.field("agent_type"), args.agentType))
      .first();

    if (agentState) {
      await ctx.db.patch(agentState._id, {
        memory: args.memory,
        updated_at: Date.now(),
      });
    }
  },
});

// Internal mutation: Clear reviewer recommendations from planner's memory
export const clearPlannerRecommendations = internalMutation({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const plannerState = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .filter((q) => q.eq(q.field("agent_type"), "planner"))
      .first();

    if (plannerState && plannerState.memory?.reviewer_recommendations) {
      await ctx.db.patch(plannerState._id, {
        memory: {
          ...plannerState.memory,
          reviewer_recommendations: [],
          recommendations_timestamp: undefined,
        },
        updated_at: Date.now(),
      });
    }
  },
});

// Legacy - kept for compatibility but unused
export const clearReviewerRecommendations = internalMutation({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const reviewerState = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .filter((q) => q.eq(q.field("agent_type"), "reviewer"))
      .first();

    if (reviewerState && reviewerState.memory?.recommendations) {
      await ctx.db.patch(reviewerState._id, {
        memory: {
          ...reviewerState.memory,
          recommendations: [],
        },
        updated_at: Date.now(),
      });
    }
  },
});

// ========= CURSOR TEAM SUPPORT =========

/**
 * Update cursor configuration for a cursor-type agent stack
 * Used by CursorTeamOrchestrator to track agent state
 */
export const updateCursorConfig = mutation({
  args: {
    stackId: v.id("agent_stacks"),
    cursorConfig: v.object({
      agent_id: v.optional(v.string()),
      repository_url: v.optional(v.string()),
      repository_name: v.optional(v.string()),
      workspace_branch: v.optional(v.string()),
      last_prompt_at: v.optional(v.number()),
      total_prompts_sent: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const stack = await ctx.db.get(args.stackId);
    if (!stack) {
      throw new Error(`Stack ${args.stackId} not found`);
    }

    if (stack.team_type !== "cursor") {
      throw new Error(
        `Cannot update cursor_config for non-cursor team (team_type: ${stack.team_type})`
      );
    }

    await ctx.db.patch(args.stackId, {
      cursor_config: args.cursorConfig,
    });

    return { success: true };
  },
});

/**
 * Get cursor configuration for a cursor-type agent stack
 */
export const getCursorConfig = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const stack = await ctx.db.get(args.stackId);
    if (!stack) return null;

    if (stack.team_type !== "cursor") {
      return null;
    }

    return stack.cursor_config || null;
  },
});
