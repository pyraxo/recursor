import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import type { TypedQueryCtx, TypedMutationCtx, TodoUpdate, Todo } from "./lib/types";

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

// Alias for list (for backward compatibility)
export const getByStack = list;

// Get pending todos for a stack
export const getPending = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_status", (q) =>
        q.eq("stack_id", args.stackId).eq("status", "pending")
      )
      .collect();

    return todos.sort((a, b) => b.priority - a.priority);
  },
});

// Update todo status
export const updateStatus = mutation({
  args: {
    todoId: v.id("todos"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const updates: TodoUpdate = {
      status: args.status as Todo["status"],
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

// ========= INTERNAL MUTATIONS FOR AGENTS =========

// Internal: Create a new todo
export const internalCreate = internalMutation({
  args: {
    stack_id: v.id("agent_stacks"),
    content: v.string(),
    status: v.optional(v.string()),
    assigned_by: v.string(),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("todos", {
      stack_id: args.stack_id,
      content: args.content,
      status: args.status || "pending",
      assigned_by: args.assigned_by,
      priority: args.priority,
      created_at: Date.now(),
    });
  },
});

// Internal: Update todo status
export const internalUpdateStatus = internalMutation({
  args: {
    todoId: v.id("todos"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if the todo exists before updating
    const todo = await ctx.db.get(args.todoId);
    if (!todo) {
      console.warn(`[todos:internalUpdateStatus] Todo ${args.todoId} does not exist, skipping update`);
      return;
    }

    const updates: TodoUpdate = {
      status: args.status as Todo["status"],
    };

    if (args.status === "completed") {
      updates.completed_at = Date.now();
    }

    await ctx.db.patch(args.todoId, updates);
  },
});

// Internal: Update todo content and/or priority
export const internalUpdate = internalMutation({
  args: {
    todoId: v.id("todos"),
    content: v.optional(v.string()),
    priority: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if the todo exists before updating
    const todo = await ctx.db.get(args.todoId);
    if (!todo) {
      console.warn(`[todos:internalUpdate] Todo ${args.todoId} does not exist, skipping update`);
      return args.todoId;
    }

    const updates: TodoUpdate = {};

    if (args.content !== undefined) {
      updates.content = args.content;
    }

    if (args.priority !== undefined) {
      updates.priority = args.priority;
    }

    if (args.status !== undefined) {
      updates.status = args.status as Todo["status"];
      if (args.status === "completed") {
        updates.completed_at = Date.now();
      }
    }

    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.todoId, updates);
    }

    return args.todoId;
  },
});

// Internal: Delete a todo
export const internalDelete = internalMutation({
  args: {
    todoId: v.id("todos"),
  },
  handler: async (ctx, args) => {
    // Check if the todo exists before deleting (defensive against race conditions)
    const todo = await ctx.db.get(args.todoId);
    if (todo) {
      await ctx.db.delete(args.todoId);
    } else {
      console.warn(`[todos:internalDelete] Todo ${args.todoId} does not exist, skipping deletion`);
    }
  },
});

// Internal: Clear all todos for a stack
export const internalClearAll = internalMutation({
  args: {
    stack_id: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const todos = await ctx.db
      .query("todos")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stack_id))
      .collect();

    let deletedCount = 0;
    for (const todo of todos) {
      await ctx.db.delete(todo._id);
      deletedCount++;
    }

    return deletedCount;
  },
});

// Query: Get todos by stack ID (for use in agent adapters)
export const getByStackId = query({
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

export const internalList = internalQuery({
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
