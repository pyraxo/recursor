import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

// Send a user message to a team
export const send = mutation({
  args: {
    team_id: v.id("agent_stacks"),
    sender_name: v.string(),
    content: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const messageId = await ctx.db.insert("user_messages", {
      team_id: args.team_id,
      sender_name: args.sender_name,
      content: args.content,
      timestamp: Date.now(),
      processed: false,
      response_id: undefined,
    });
    return messageId;
  },
});

// Get unprocessed user messages for a team (for Planner to analyze)
export const getUnprocessed = query({
  args: {
    team_id: v.id("agent_stacks"),
  },
  handler: async (ctx: any, args: any) => {
    const messages = await ctx.db
      .query("user_messages")
      .withIndex("by_team_processed", (q: any) =>
        q.eq("team_id", args.team_id).eq("processed", false)
      )
      .collect();

    return messages.sort((a: any, b: any) => a.timestamp - b.timestamp);
  },
});

// Internal query: Get unprocessed messages (for orchestrator)
export const internalGetUnprocessed = internalQuery({
  args: {
    team_id: v.id("agent_stacks"),
  },
  handler: async (ctx: any, args: any) => {
    const messages = await ctx.db
      .query("user_messages")
      .withIndex("by_team_processed", (q: any) =>
        q.eq("team_id", args.team_id).eq("processed", false)
      )
      .collect();

    return messages.sort((a: any, b: any) => a.timestamp - b.timestamp);
  },
});

// Mark a user message as processed and link it to the response
export const markProcessed = mutation({
  args: {
    message_id: v.id("user_messages"),
    response_id: v.optional(v.id("messages")),
  },
  handler: async (ctx: any, args: any) => {
    const message = await ctx.db.get(args.message_id);
    if (!message) return;

    await ctx.db.patch(args.message_id, {
      processed: true,
      response_id: args.response_id,
    });
  },
});

// Internal mutation: Mark message as processed
export const internalMarkProcessed = internalMutation({
  args: {
    message_id: v.id("user_messages"),
    response_id: v.optional(v.id("messages")),
  },
  handler: async (ctx: any, args: any) => {
    const message = await ctx.db.get(args.message_id);
    if (!message) return;

    await ctx.db.patch(args.message_id, {
      processed: true,
      response_id: args.response_id,
    });
  },
});

// Get chat history for a team (all user messages and their responses)
export const getChatHistory = query({
  args: {
    team_id: v.id("agent_stacks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx: any, args: any) => {
    const limit = args.limit || 50;

    const messages = await ctx.db
      .query("user_messages")
      .withIndex("by_team", (q: any) => q.eq("team_id", args.team_id))
      .collect();

    // Sort by timestamp descending and limit
    const sortedMessages = messages
      .sort((a: any, b: any) => b.timestamp - a.timestamp)
      .slice(0, limit);

    // Fetch response messages if they exist
    const messagesWithResponses = await Promise.all(
      sortedMessages.map(async (msg: any) => {
        let response = null;
        if (msg.response_id) {
          response = await ctx.db.get(msg.response_id);
        }
        return {
          ...msg,
          response,
        };
      })
    );

    // Return in chronological order (oldest first)
    return messagesWithResponses.reverse();
  },
});

// Get all messages for a team (for dashboard display)
export const getAllForTeam = query({
  args: {
    team_id: v.id("agent_stacks"),
  },
  handler: async (ctx: any, args: any) => {
    const messages = await ctx.db
      .query("user_messages")
      .withIndex("by_team", (q: any) => q.eq("team_id", args.team_id))
      .collect();

    return messages.sort((a: any, b: any) => a.timestamp - b.timestamp);
  },
});
