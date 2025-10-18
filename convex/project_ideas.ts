import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new project idea
export const create = mutation({
  args: {
    stack_id: v.id("agent_stacks"),
    title: v.string(),
    description: v.string(),
    created_by: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("project_ideas", {
      stack_id: args.stack_id,
      title: args.title,
      description: args.description,
      status: "ideation",
      created_by: args.created_by,
      created_at: Date.now(),
    });
  },
});

// Get project idea for a stack
export const get = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("project_ideas")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .first();
  },
});

// Alias for get (for backward compatibility)
export const getByStack = get;

// List all project ideas for a stack
export const list = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("project_ideas")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .collect();
  },
});

// Update project idea status
export const updateStatus = mutation({
  args: {
    ideaId: v.id("project_ideas"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.ideaId, {
      status: args.status,
    });
  },
});

// Update project idea
export const update = mutation({
  args: {
    ideaId: v.id("project_ideas"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {};
    if (args.title) updates.title = args.title;
    if (args.description) updates.description = args.description;
    if (args.status) updates.status = args.status;

    await ctx.db.patch(args.ideaId, updates);
  },
});
