import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

// Create a new project idea
export const create = mutation({
  args: {
    stack_id: v.id("agent_stacks"),
    title: v.string(),
    description: v.string(),
    created_by: v.string(),
  },
  handler: async (ctx: any, args: any) => {
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
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("project_ideas")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stackId))
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
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("project_ideas")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stackId))
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
  handler: async (ctx: any, args: any) => {
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
  handler: async (ctx: any, args: any) => {
    const updates: any = {};
    if (args.title) updates.title = args.title;
    if (args.description) updates.description = args.description;
    if (args.status) updates.status = args.status;

    await ctx.db.patch(args.ideaId, updates);
  },
});

// Internal: Update project idea for a stack (used by agents)
// Creates a new project idea if one doesn't exist (upsert behavior)
export const internalUpdate = internalMutation({
  args: {
    stack_id: v.id("agent_stacks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    // Get the current project idea for this stack
    const projectIdea = await ctx.db
      .query("project_ideas")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stack_id))
      .order("desc")
      .first();

    if (!projectIdea) {
      // Create a new project idea if it doesn't exist
      const newIdeaId = await ctx.db.insert("project_ideas", {
        stack_id: args.stack_id,
        title: args.title || "Untitled Project",
        description: args.description || "Project description pending",
        status: args.status || "ideation",
        created_by: "planner",
        created_at: Date.now(),
      });
      return newIdeaId;
    }

    const updates: any = {};
    if (args.title) updates.title = args.title;
    if (args.description) updates.description = args.description;
    if (args.status) updates.status = args.status;

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(projectIdea._id, updates);
    }

    return projectIdea._id;
  },
});
