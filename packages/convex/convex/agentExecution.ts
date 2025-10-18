import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { executePlanner, executeBuilder, executeCommunicator, executeReviewer } from "./lib/agents";

/**
 * LEGACY ROUND-ROBIN EXECUTION REMOVED
 *
 * All stacks now use intelligent graph-based orchestration exclusively.
 * See: packages/convex/convex/orchestration.ts for the new autonomous system.
 *
 * Previous functions removed:
 * - scheduledExecutor (legacy cron handler)
 * - executeAgentTick (round-robin single agent execution)
 *
 * All execution now goes through:
 * - orchestration.scheduledOrchestrator
 * - orchestration.executeOrchestratorCycle
 */

// Internal query to get stack for execution
export const getStackForExecution = internalQuery({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.stackId);
  },
});

// Internal query to get agent state
export const getAgentState = internalQuery({
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

// Internal query to get project idea
export const getProjectIdea = internalQuery({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("project_ideas")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .first();
  },
});

// Internal query to get todos
export const getTodos = internalQuery({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todos")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .collect();
  },
});

// Internal mutation to update agent memory
export const updateAgentMemory = internalMutation({
  args: {
    stackId: v.id("agent_stacks"),
    agentType: v.string(),
    thought: v.string(),
  },
  handler: async (ctx, args) => {
    const agentState = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .filter((q) => q.eq(q.field("agent_type"), args.agentType))
      .first();

    if (agentState) {
      // Update with new thought in recent messages
      const recentMessages = agentState.current_context.recent_messages || [];
      recentMessages.push(args.thought);

      await ctx.db.patch(agentState._id, {
        current_context: {
          ...agentState.current_context,
          recent_messages: recentMessages.slice(-10), // Keep last 10
        },
        updated_at: Date.now(),
      });
    }
  },
});

// Internal mutation to mark execution complete
export const markExecutionComplete = internalMutation({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("agent_executions")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .first();

    if (execution && execution.status === "running") {
      await ctx.db.patch(execution._id, {
        status: "completed",
        completed_at: Date.now(),
      });
    }
  },
});

// Internal mutation to mark execution failed
export const markExecutionFailed = internalMutation({
  args: {
    stackId: v.id("agent_stacks"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const execution = await ctx.db
      .query("agent_executions")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .first();

    if (execution && execution.status === "running") {
      await ctx.db.patch(execution._id, {
        status: "failed",
        error: args.error,
        completed_at: Date.now(),
      });
    }
  },
});

// Update stack activity timestamp
export const updateStackActivity = internalMutation({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stackId, {
      last_activity_at: Date.now(),
    });
  },
});

// ========= AUTONOMOUS EXECUTION MUTATIONS =========

// Update individual agent execution state for autonomous orchestrator
export const updateAgentExecutionState = internalMutation({
  args: {
    stackId: v.id("agent_stacks"),
    agentType: v.string(),
    state: v.union(
      v.literal("idle"),
      v.literal("executing"),
      v.literal("error")
    ),
    currentWork: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    // Find the agent state
    const agentState = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .filter((q) => q.eq(q.field("agent_type"), args.agentType))
      .first();

    if (!agentState) {
      throw new Error(`Agent state not found for ${args.agentType}`);
    }

    // Update the agent state with execution info
    const memory = agentState.memory || {};
    await ctx.db.patch(agentState._id, {
      memory: {
        ...memory,
        execution_state: args.state,
        current_work: args.currentWork,
        last_execution_update: Date.now(),
      },
      updated_at: Date.now(),
    });

    // Also update the last activity timestamp on the stack
    if (args.state === "executing") {
      await ctx.db.patch(args.stackId, {
        last_activity_at: Date.now(),
      });
    }
  },
});

// Get execution states for all agents in a stack
export const getAgentExecutionStates = internalQuery({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    const agentStates = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .collect();

    return agentStates.map((state) => ({
      agentType: state.agent_type,
      executionState: state.memory?.execution_state || "idle",
      currentWork: state.memory?.current_work || null,
      lastUpdate: state.memory?.last_execution_update || 0,
    }));
  },
});

// Signal that work is available for an agent
export const signalWorkAvailable = internalMutation({
  args: {
    stackId: v.id("agent_stacks"),
    agentType: v.string(),
    workType: v.string(),
    priority: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // For now, just update the stack's last activity to trigger checks
    // In the future, this could insert into a work_signals table
    await ctx.db.patch(args.stackId, {
      last_activity_at: Date.now(),
    });

    // Log the work signal as a trace
    await ctx.db.insert("agent_traces", {
      stack_id: args.stackId,
      agent_type: args.agentType,
      thought: `Work available: ${args.workType}`,
      action: "work_signal",
      result: { workType: args.workType, priority: args.priority || 5 },
      timestamp: Date.now(),
    });
  },
});

// ========= PUBLIC WRAPPERS FOR GRAPH ORCHESTRATION =========

import { mutation, query } from "./_generated/server";

// Public wrapper for updateAgentExecutionState
export const updateExecutionState = mutation({
  args: {
    stackId: v.id("agent_stacks"),
    agentType: v.string(),
    state: v.union(
      v.literal("idle"),
      v.literal("executing"),
      v.literal("error")
    ),
    currentWork: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    // Find the agent state
    const agentState = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .filter((q) => q.eq(q.field("agent_type"), args.agentType))
      .first();

    if (!agentState) {
      throw new Error(`Agent state not found for ${args.agentType}`);
    }

    // Update the agent state with execution info
    const memory = agentState.memory || {};
    await ctx.db.patch(agentState._id, {
      memory: {
        ...memory,
        execution_state: args.state,
        current_work: args.currentWork,
        last_execution_update: Date.now(),
      },
      updated_at: Date.now(),
    });

    // Also update the last activity timestamp on the stack
    if (args.state === "executing") {
      await ctx.db.patch(args.stackId, {
        last_activity_at: Date.now(),
      });
    }
  },
});

// Public wrapper for getAgentExecutionStates
export const getExecutionStates = query({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    const agentStates = await ctx.db
      .query("agent_states")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .collect();

    return agentStates.map((state) => ({
      agentType: state.agent_type,
      executionState: state.memory?.execution_state || "idle",
      currentWork: state.memory?.current_work || null,
      lastUpdate: state.memory?.last_execution_update || 0,
    }));
  },
});

// Public actions for executing individual agents
// These can be called from external tools or manually for debugging
export const runPlanner = action({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    return await executePlanner(ctx, args.stackId);
  },
});

export const runBuilder = action({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    return await executeBuilder(ctx, args.stackId);
  },
});

export const runCommunicator = action({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    return await executeCommunicator(ctx, args.stackId);
  },
});

export const runReviewer = action({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    return await executeReviewer(ctx, args.stackId);
  },
});
