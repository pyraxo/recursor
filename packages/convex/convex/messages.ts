import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { Message, EnrichedMessage } from "./lib/types";
import type { Id } from "./_generated/dataModel";

// Send a message (broadcast or direct)
export const send = mutation({
  args: {
    from_stack_id: v.id("agent_stacks"),
    to_stack_id: v.optional(v.id("agent_stacks")),
    from_agent_type: v.string(),
    content: v.string(),
    message_type: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      from_stack_id: args.from_stack_id,
      to_stack_id: args.to_stack_id,
      from_agent_type: args.from_agent_type,
      content: args.content,
      message_type: args.message_type,
      read_by: [],
      created_at: Date.now(),
    });
  },
});

// Get broadcasts (unread)
export const getBroadcasts = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("broadcasts", (q) => q.eq("message_type", "broadcast"))
      .collect();

    return messages.filter((msg) => !msg.read_by.includes(args.stackId));
  },
});

// Get direct messages (unread)
export const getDirectMessages = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_recipient", (q) => q.eq("to_stack_id", args.stackId))
      .collect();

    return messages.filter((msg) => !msg.read_by.includes(args.stackId));
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    messageId: v.id("messages"),
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    if (!message.read_by.includes(args.stackId)) {
      await ctx.db.patch(args.messageId, {
        read_by: [...message.read_by, args.stackId],
      });
    }
  },
});

// Get all messages for a stack (for observability)
export const getTimeline = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const sent = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q) => q.eq("from_stack_id", args.stackId))
      .collect();

    const received = await ctx.db
      .query("messages")
      .withIndex("by_recipient", (q) => q.eq("to_stack_id", args.stackId))
      .collect();

    const broadcasts = await ctx.db
      .query("messages")
      .withIndex("broadcasts", (q) => q.eq("message_type", "broadcast"))
      .collect();

    const all = [...sent, ...received, ...broadcasts];
    const unique = Array.from(
      new Map(all.map((m) => [m._id, m])).values()
    );

    return unique.sort((a, b) => a.created_at - b.created_at);
  },
});

// Get ALL messages across all teams (for global Messages tab)
export const getAllMessages = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").collect();

    // Enrich messages with team names
    const enriched: EnrichedMessage[] = await Promise.all(
      messages.map(async (msg) => {
        const fromStack = msg.from_stack_id ? await ctx.db.get(msg.from_stack_id) : null;
        const toStack = msg.to_stack_id ? await ctx.db.get(msg.to_stack_id) : null;

        return {
          ...msg,
          from_team_name: fromStack?.participant_name || "Unknown",
          to_team_name: toStack?.participant_name || null,
        } as EnrichedMessage & { from_team_name: string; to_team_name: string | null };
      })
    );

    return enriched.sort((a, b) => a.created_at - b.created_at);
  },
});

// ========= INTERNAL FUNCTIONS FOR AGENT ADAPTERS =========

// Internal query: Get unread messages for a stack (both direct and broadcast)
// IMPORTANT: Filters out messages from the same stack (agents don't respond to their own messages)
export const getUnreadForStack = internalQuery({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    // Get broadcast messages
    const broadcasts = await ctx.db
      .query("messages")
      .withIndex("broadcasts", (q) => q.eq("message_type", "broadcast"))
      .collect();

    // Get direct messages to this stack
    const directMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipient", (q) => q.eq("to_stack_id", args.stackId))
      .collect();

    // Combine and filter for unread AND exclude own messages
    const allMessages = [...broadcasts, ...directMessages];
    return allMessages.filter(
      (msg) =>
        !msg.read_by.includes(args.stackId) && // Not already read
        msg.from_stack_id !== args.stackId      // Not from this stack (don't respond to own messages!)
    );
  },
});

// Internal mutation: Mark message as read
export const internalMarkAsRead = internalMutation({
  args: {
    messageId: v.id("messages"),
    stackId: v.id("agent_stacks"), // The stack that is reading the message
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    // Add the stack to the read_by array if not already there
    const readBy = message.read_by || [];
    if (!readBy.includes(args.stackId)) {
      readBy.push(args.stackId);
      await ctx.db.patch(args.messageId, {
        read_by: readBy,
      });
    }
  },
});

// Simpler version for communicator - just marks as read
// export const markAsRead = internalMutation({
//   args: {
//     messageId: v.id("messages"),
//   },
//   handler: async (ctx, args) => {
//     const message = await ctx.db.get(args.messageId);
//     if (!message) return;

//     await ctx.db.patch(args.messageId, {
//       read_at: Date.now(),
//     });
//   },
// });

// Internal mutation: Send a message
export const internalSend = internalMutation({
  args: {
    sender_id: v.id("agent_stacks"),
    message_type: v.string(),
    content: v.string(),
    to_stack_id: v.optional(v.id("agent_stacks")), // Optional for direct messages
  },
  handler: async (ctx, args) => {
    const messageData: {
      from_stack_id: Id<"agent_stacks">;
      from_agent_type: string;
      content: string;
      message_type: string;
      read_by: Id<"agent_stacks">[];
      created_at: number;
      to_stack_id?: Id<"agent_stacks">;
    } = {
      from_stack_id: args.sender_id,
      from_agent_type: "communicator",
      content: args.content,
      message_type: args.message_type,
      read_by: [],
      created_at: Date.now(),
    };

    // Only add to_stack_id if it's provided (for direct messages)
    // For broadcasts, we omit it entirely (not null)
    if (args.to_stack_id) {
      messageData.to_stack_id = args.to_stack_id;
    }

    const messageId = await ctx.db.insert("messages", messageData);
    return messageId;
  },
});

// Query: Get unread messages (for dashboard)
export const getUnreadMessages = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    // Get broadcast messages
    const broadcasts = await ctx.db
      .query("messages")
      .withIndex("broadcasts", (q) => q.eq("message_type", "broadcast"))
      .collect();

    // Get direct messages to this stack
    const directMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipient", (q) => q.eq("to_stack_id", args.stackId))
      .collect();

    // Combine and filter for unread AND exclude own messages
    const allMessages = [...broadcasts, ...directMessages];
    return allMessages.filter(
      (msg) =>
        !msg.read_by.includes(args.stackId) && // Not already read
        msg.from_stack_id !== args.stackId      // Not from this stack
    );
  },
});
