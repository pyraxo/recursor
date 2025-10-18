import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { executeAgentByType } from "./lib/agents";

// This runs every 5 seconds to check for agent stacks that need execution
export const scheduledExecutor = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Get all stacks that should be running
    const stacks = await ctx.db
      .query("agent_stacks")
      .filter((q) => q.eq(q.field("execution_state"), "running"))
      .collect();

    for (const stack of stacks) {
      // Check if this stack is already being processed
      const lastExecution = await ctx.db
        .query("agent_executions")
        .withIndex("by_stack", (q) => q.eq("stack_id", stack._id))
        .order("desc")
        .first();

      // If no recent execution or last one completed, schedule a new tick
      const shouldExecute =
        !lastExecution ||
        lastExecution.status === "completed" ||
        (lastExecution.status === "running" &&
          Date.now() - lastExecution.started_at > 30000); // 30 second timeout

      if (shouldExecute) {
        // Schedule the agent tick action
        await ctx.scheduler.runAfter(
          0,
          internal.agentExecution.executeAgentTick,
          {
            stackId: stack._id,
          }
        );

        // Record that we're starting execution
        await ctx.db.insert("agent_executions", {
          stack_id: stack._id,
          status: "running",
          started_at: Date.now(),
        });
      }
    }
  },
});

// Internal action that actually runs the agent logic
export const executeAgentTick = internalAction({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args): Promise<void> => {
    const { stackId } = args;

    // Define agent order and current agent outside try block for error handling
    const agentOrder = ["planner", "builder", "communicator", "reviewer"];
    let currentAgent: string = "unknown";

    try {
      // Get stack details
      const stack = await ctx.runQuery(
        internal.agentExecution.getStackForExecution,
        {
          stackId,
        }
      );

      if (!stack || stack.execution_state !== "running") {
        return;
      }

      // Get current phase to determine which agent to run
      const currentAgentIndex = stack.current_agent_index || 0;
      currentAgent = agentOrder[currentAgentIndex % agentOrder.length]!;

      // Update last activity to show processing
      await ctx.runMutation(internal.agentExecution.updateStackActivity, {
        stackId,
      });

      // Execute the agent using the new adapters
      console.log(`Executing ${currentAgent} agent for stack ${stackId}`);
      const thought = await executeAgentByType(ctx, currentAgent, stackId);

      // Note: Agent adapters handle their own memory updates and traces

      // Move to next agent
      const nextAgentIndex = (currentAgentIndex + 1) % agentOrder.length;
      await ctx.runMutation(internal.agentExecution.updateStackProgress, {
        stackId,
        currentAgentIndex: nextAgentIndex,
        lastExecutedAt: Date.now(),
      });

      // Mark execution as completed
      await ctx.runMutation(internal.agentExecution.markExecutionComplete, {
        stackId,
      });

      // Note: Detailed traces are logged by agent adapters
      console.log(`${currentAgent} agent completed for stack ${stackId}`);
    } catch (error) {
      // Mark execution as failed
      await ctx.runMutation(internal.agentExecution.markExecutionFailed, {
        stackId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      // Log the error through the traces system
      await ctx.runMutation(internal.traces.internalLog, {
        stack_id: stackId,
        agent_type: currentAgent,
        thought: "",
        action: "tick_failed",
        result: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });
    }
  },
});

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

// Internal mutation to update stack progress
export const updateStackProgress = internalMutation({
  args: {
    stackId: v.id("agent_stacks"),
    currentAgentIndex: v.number(),
    lastExecutedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.stackId, {
      current_agent_index: args.currentAgentIndex,
      last_executed_at: args.lastExecutedAt,
    });
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

// ========= PUBLIC WRAPPERS FOR AUTONOMOUS ORCHESTRATOR =========

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
