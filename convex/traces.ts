import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Log a trace
export const log = mutation({
  args: {
    stack_id: v.id("agent_stacks"),
    agent_type: v.string(),
    thought: v.string(),
    action: v.string(),
    result: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agent_traces", {
      stack_id: args.stack_id,
      agent_type: args.agent_type,
      thought: args.thought,
      action: args.action,
      result: args.result,
      timestamp: Date.now(),
    });
  },
});

// Get traces for a stack
export const list = query({
  args: {
    stackId: v.id("agent_stacks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("agent_traces")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.collect();
  },
});

// Get recent traces across all stacks
export const getRecentAll = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("agent_traces")
      .withIndex("by_time")
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.take(100); // Default to 100
  },
});

// Get recent traces for a specific stack
export const getRecent = query({
  args: {
    stackId: v.id("agent_stacks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const query = ctx.db
      .query("agent_traces")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc");

    if (args.limit) {
      return await query.take(args.limit);
    }

    return await query.collect();
  },
});

// Get traces for a specific agent type
export const getByAgentType = query({
  args: {
    stackId: v.id("agent_stacks"),
    agentType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const traces = await ctx.db
      .query("agent_traces")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .collect();

    const filtered = traces.filter((t) => t.agent_type === args.agentType);

    if (args.limit) {
      return filtered.slice(0, args.limit);
    }

    return filtered;
  },
});
