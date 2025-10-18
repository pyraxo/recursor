import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

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
        await ctx.scheduler.runAfter(0, internal.agentExecution.executeAgentTick, {
          stackId: stack._id,
        });

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

// Action that actually runs the agent logic
export const executeAgentTick = action({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args): Promise<void> => {
    const { stackId } = args;

    try {
      // Get stack details
      const stack = await ctx.runQuery(internal.agentExecution.getStackForExecution, {
        stackId,
      });

      if (!stack || stack.execution_state !== "running") {
        return;
      }

      // Get current phase to determine which agent to run
      const agentOrder = ["planner", "builder", "communicator", "reviewer"];
      const currentAgentIndex = stack.current_agent_index || 0;
      const currentAgent = agentOrder[currentAgentIndex];

      // Get agent state
      const agentState = await ctx.runQuery(internal.agentExecution.getAgentState, {
        stackId,
        agentType: currentAgent,
      });

      // Get project idea and todos
      const projectIdea = await ctx.runQuery(internal.agentExecution.getProjectIdea, {
        stackId,
      });

      const todos = await ctx.runQuery(internal.agentExecution.getTodos, { stackId });

      // Here you would call the LLM with the agent's context
      // For now, this is a placeholder - you'd integrate with your LLM providers
      const thought = await executeAgentLogic({
        agentType: currentAgent,
        stack,
        agentState,
        projectIdea,
        todos,
      });

      // Update agent's memory/context
      await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
        stackId,
        agentType: currentAgent,
        thought,
      });

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

      // Log the execution
      await ctx.runMutation(internal.traces.internalLog, {
        stack_id: stackId,
        agent_type: currentAgent,
        thought,
        action: "tick_completed",
        result: { success: true },
      });
    } catch (error) {
      console.error(`Error executing agent tick for stack ${stackId}:`, error);

      // Mark execution as failed
      await ctx.runMutation(internal.agentExecution.markExecutionFailed, {
        stackId,
        error: error instanceof Error ? error.message : "Unknown error",
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

// Placeholder for agent logic - this would integrate with your LLM providers
async function executeAgentLogic(params: {
  agentType: string;
  stack: any;
  agentState: any;
  projectIdea: any;
  todos: any[];
}): Promise<string> {
  // This is where you'd call your LLM (Groq, OpenAI, etc.)
  // For now, return a placeholder thought
  return `${params.agentType} agent thinking about ${params.projectIdea?.title || "project"}...`;
}