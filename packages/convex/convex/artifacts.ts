import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

// Create a new artifact
export const create = mutation({
  args: {
    stack_id: v.id("agent_stacks"),
    type: v.string(),
    content: v.optional(v.string()),
    url: v.optional(v.string()),
    metadata: v.object({
      description: v.optional(v.string()),
      tech_stack: v.optional(v.array(v.string())),
      build_time_ms: v.optional(v.number()),
    }),
  },
  handler: async (ctx: any, args: any) => {
    // Get the latest version for this stack
    const latestArtifact = await ctx.db
      .query("artifacts")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stack_id))
      .order("desc")
      .first();

    const version = latestArtifact ? latestArtifact.version + 1 : 1;

    return await ctx.db.insert("artifacts", {
      stack_id: args.stack_id,
      type: args.type,
      version,
      content: args.content,
      url: args.url,
      metadata: args.metadata,
      created_at: Date.now(),
    });
  },
});

// Get latest artifact for a stack
export const getLatest = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("artifacts")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stackId))
      .order("desc")
      .first();
  },
});

// Get all artifacts for a stack
export const list = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("artifacts")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stackId))
      .order("desc")
      .collect();
  },
});

// Get a specific artifact by version
export const getByVersion = query({
  args: {
    stackId: v.id("agent_stacks"),
    version: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    const artifacts = await ctx.db
      .query("artifacts")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stackId))
      .collect();

    return artifacts.find((a: any) => a.version === args.version);
  },
});

// ========= INTERNAL FUNCTIONS FOR AGENT ADAPTERS =========

// Internal query: Get latest artifact for a stack
export const internalGetLatest = internalQuery({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("artifacts")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stackId))
      .order("desc")
      .first();
  },
});

// Internal mutation: Create a new artifact
export const internalCreate = internalMutation({
  args: {
    stack_id: v.id("agent_stacks"),
    content: v.string(),
    type: v.string(),
    version: v.number(),
    created_by: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db.insert("artifacts", {
      stack_id: args.stack_id,
      type: args.type,
      version: args.version,
      content: args.content,
      created_by: args.created_by,
      created_at: Date.now(),
      url: null,
      metadata: {
        description: `Created by ${args.created_by}`,
      },
    });
  },
});

// Internal query: Get artifacts by stack ID
export const getByStackId = internalQuery({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db
      .query("artifacts")
      .withIndex("by_stack", (q: any) => q.eq("stack_id", args.stackId))
      .order("desc")
      .collect();
  },
});
