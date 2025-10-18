import { ConvexClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export interface Message {
  _id: Id<"messages">;
  from_stack_id: Id<"agent_stacks">;
  to_stack_id?: Id<"agent_stacks">;
  from_agent_type: string;
  content: string;
  message_type: string;
  read_by: Id<"agent_stacks">[];
  created_at: number;
}

export class ConvexMessagingProvider {
  private client: ConvexClient;

  constructor(convexUrl: string) {
    this.client = new ConvexClient(convexUrl);
  }

  // Send a broadcast message to all agents
  async sendBroadcast(
    fromStackId: Id<"agent_stacks">,
    fromAgentType: string,
    content: string
  ): Promise<void> {
    await this.client.mutation(api.messages.send, {
      from_stack_id: fromStackId,
      from_agent_type: fromAgentType,
      content,
      message_type: "broadcast",
    });
  }

  // Send a direct message to a specific agent stack
  async sendDirect(
    fromStackId: Id<"agent_stacks">,
    toStackId: Id<"agent_stacks">,
    fromAgentType: string,
    content: string
  ): Promise<void> {
    await this.client.mutation(api.messages.send, {
      from_stack_id: fromStackId,
      to_stack_id: toStackId,
      from_agent_type: fromAgentType,
      content,
      message_type: "direct",
    });
  }

  // Get unread broadcast messages
  async getBroadcasts(stackId: Id<"agent_stacks">): Promise<Message[]> {
    return (await this.client.query(api.messages.getBroadcasts, {
      stackId,
    })) as Message[];
  }

  // Get unread direct messages
  async getDirectMessages(stackId: Id<"agent_stacks">): Promise<Message[]> {
    return (await this.client.query(api.messages.getDirectMessages, {
      stackId,
    })) as Message[];
  }

  // Get all unread messages (broadcasts + direct)
  async getUnreadMessages(stackId: Id<"agent_stacks">): Promise<Message[]> {
    const broadcasts = await this.getBroadcasts(stackId);
    const directs = await this.getDirectMessages(stackId);
    return [...broadcasts, ...directs].sort(
      (a, b) => a.created_at - b.created_at
    );
  }

  // Mark a message as read
  async markAsRead(
    messageId: Id<"messages">,
    stackId: Id<"agent_stacks">
  ): Promise<void> {
    await this.client.mutation(api.messages.markAsRead, {
      messageId,
      stackId,
    });
  }

  // Mark multiple messages as read
  async markMultipleAsRead(
    messageIds: Id<"messages">[],
    stackId: Id<"agent_stacks">
  ): Promise<void> {
    for (const messageId of messageIds) {
      await this.markAsRead(messageId, stackId);
    }
  }

  // Get message timeline for observability
  async getTimeline(stackId: Id<"agent_stacks">): Promise<Message[]> {
    return (await this.client.query(api.messages.getTimeline, {
      stackId,
    })) as Message[];
  }
}
