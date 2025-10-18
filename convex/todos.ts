import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new todo
export const create = mutation({
  args: {
    stack_id: v.id("agent_stacks"),
    content: v.string(),
    assigned_by: v.string(),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("todos", {
      stack_id: args.stack_id,
      content: args.content,
      status: "pending",
      assigned_by: args.assigned_by,
      priority: args.priority,
      created_at: Date.now(),
    });
  },
});

// Get all todos for a stack
export const list = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("todos")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .collect();
  },
});

// Get pending todos for a stack
export const getPending = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_status", (q: any) =>
        q.eq("stack_id", args.stackId).eq("status", "pending")
      )
      .collect();

    return todos.sort((a: any, b: any) => b.priority - a.priority);
  },
});

// Update todo status
export const updateStatus = mutation({
  args: {
    todoId: v.id("todos"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
    };

    if (args.status === "completed") {
      updates.completed_at = Date.now();
    }

    await ctx.db.patch(args.todoId, updates);
  },
});

// Delete a todo
export const remove = mutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.todoId);
  },
});
