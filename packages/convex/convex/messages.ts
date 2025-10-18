import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

// Send a message (broadcast or direct)
export const send = mutation({
  args: {
    from_stack_id: v.id("agent_stacks"),
    to_stack_id: v.optional(v.id("agent_stacks")),
    from_agent_type: v.string(),
    content: v.string(),
    message_type: v.string(),
  },
  handler: async (ctx: any, args: any) => {
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
  handler: async (ctx: any, args: any) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("broadcasts", (q: any) => q.eq("message_type", "broadcast"))
      .collect();

    return messages.filter((msg: any) => !msg.read_by.includes(args.stackId));
  },
});

// Get direct messages (unread)
export const getDirectMessages = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx: any, args: any) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_recipient", (q: any) => q.eq("to_stack_id", args.stackId))
      .collect();

    return messages.filter((msg: any) => !msg.read_by.includes(args.stackId));
  },
});

// Mark messages as read
export const markAsRead = mutation({
  args: {
    messageId: v.id("messages"),
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx: any, args: any) => {
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
  handler: async (ctx: any, args: any) => {
    const sent = await ctx.db
      .query("messages")
      .withIndex("by_sender", (q: any) => q.eq("from_stack_id", args.stackId))
      .collect();

    const received = await ctx.db
      .query("messages")
      .withIndex("by_recipient", (q: any) => q.eq("to_stack_id", args.stackId))
      .collect();

    const broadcasts = await ctx.db
      .query("messages")
      .withIndex("broadcasts", (q: any) => q.eq("message_type", "broadcast"))
      .collect();

    const all = [...sent, ...received, ...broadcasts];
    const unique = Array.from(
      new Map(all.map((m: any) => [m._id, m])).values()
    );

    return unique.sort((a: any, b: any) => a.created_at - b.created_at);
  },
});

// ========= INTERNAL FUNCTIONS FOR AGENT ADAPTERS =========

// Internal query: Get unread messages for a stack (both direct and broadcast)
export const getUnreadForStack = internalQuery({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx: any, args: any) => {
    // Get broadcast messages
    const broadcasts = await ctx.db
      .query("messages")
      .withIndex("broadcasts", (q: any) => q.eq("message_type", "broadcast"))
      .collect();

    // Get direct messages to this stack
    const directMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipient", (q: any) => q.eq("to_stack_id", args.stackId))
      .collect();

    // Combine and filter for unread
    const allMessages = [...broadcasts, ...directMessages];
    return allMessages.filter(
      (msg: any) => !msg.read_by.includes(args.stackId)
    );
  },
});

// Internal mutation: Mark message as read
export const internalMarkAsRead = internalMutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx: any, args: any) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) return;

    // For now, just mark as read by adding a timestamp
    await ctx.db.patch(args.messageId, {
      read_at: Date.now(),
    });
  },
});

// Simpler version for communicator - just marks as read
// export const markAsRead = internalMutation({
//   args: {
//     messageId: v.id("messages"),
//   },
//   handler: async (ctx: any, args: any) => {
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
  handler: async (ctx: any, args: any) => {
    const messageData: any = {
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

    await ctx.db.insert("messages", messageData);
  },
});

// Query: Get unread messages (for dashboard)
export const getUnreadMessages = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx: any, args: any) => {
    // Get broadcast messages
    const broadcasts = await ctx.db
      .query("messages")
      .withIndex("broadcasts", (q: any) => q.eq("message_type", "broadcast"))
      .collect();

    // Get direct messages to this stack
    const directMessages = await ctx.db
      .query("messages")
      .withIndex("by_recipient", (q: any) => q.eq("to_stack_id", args.stackId))
      .collect();

    // Combine and filter for unread
    const allMessages = [...broadcasts, ...directMessages];
    return allMessages.filter(
      (msg: any) => !msg.read_by.includes(args.stackId)
    );
  },
});
