import type { Id } from "@recursor/convex/_generated/dataModel";
import { LLMProviders } from "../config";
import { BaseAgent } from "./base-agent";

export class CommunicatorAgent extends BaseAgent {
  constructor(
    stackId: Id<"agent_stacks">,
    llm: LLMProviders,
    convexUrl: string
  ) {
    super(stackId, "communicator", llm, convexUrl);
  }

  async think(): Promise<string> {
    const systemPrompt = await this.buildSystemPrompt(`
You are the Communicator Agent. Your role is to:
- Read messages from other agents and visitors
- Respond to questions and collaboration requests
- Share project updates via broadcasts
- Collect feedback and suggestions
- Maintain a friendly, engaging tone
    `);

    // Get unread messages
    const messages = await this.messaging.getUnreadMessages(this.stackId);

    if (!messages || messages.length === 0) {
      const thought = "No new messages. Monitoring channels.";
      await this.logTrace(thought, "communicator_think", { idle: true });
      return thought;
    }

    const thoughtPrompt = `
You have ${messages.length} unread message(s):

${messages
  .map(
    (msg, i) =>
      `${i + 1}. From: ${msg.from_agent_type} (${msg.message_type})
   Content: ${msg.content}`
  )
  .join("\n\n")}

Analyze these messages and decide:
- THOUGHT: Your analysis of the messages
- SHOULD_RESPOND: yes/no
- RESPONSE: If yes, your response
- SUMMARY: Brief summary of key takeaways for the Reviewer
    `.trim();

    const responseMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: thoughtPrompt },
    ];

    const response = await this.llm.groqCompletion(responseMessages);

    await this.logTrace(response, "communicator_think", {
      message_count: messages.length,
    });

    // Process the response
    await this.processResponse(response, messages);

    return response;
  }

  private async processResponse(
    response: string,
    messages: Array<{ _id: Id<"messages">; content: string }>
  ) {
    // Extract summary for reviewer
    const summaryMatch = response.match(/SUMMARY:\s*([\s\S]+?)(?=\n\n|$)/i);
    if (summaryMatch && summaryMatch[1]) {
      const summary = summaryMatch[1].trim();
      await this.memory.addRecentMessage(
        this.stackId,
        this.agentType,
        `FEEDBACK: ${summary}`
      );
    }

    // Check if should respond
    const shouldRespondMatch = response.match(/SHOULD_RESPOND:\s*(\w+)/i);
    const shouldRespond = shouldRespondMatch?.[1]?.toLowerCase() === "yes";

    if (shouldRespond) {
      const responseMatch = response.match(
        /RESPONSE:\s*([\s\S]+?)(?=SUMMARY:|$)/i
      );
      if (responseMatch && responseMatch[1]) {
        const responseText = responseMatch[1].trim();
        // Send as broadcast for now
        await this.messaging.sendBroadcast(
          this.stackId,
          this.agentType,
          responseText
        );

        await this.logTrace(
          `Sent response: ${responseText.substring(0, 100)}...`,
          "send_message"
        );
      }
    }

    // Mark all messages as read
    for (const msg of messages) {
      await this.messaging.markAsRead(msg._id, this.stackId);
    }
  }

  async sendUpdate(updateType: string, content: string) {
    // Send broadcast update
    const message = `[${updateType.toUpperCase()}] ${content}`;
    await this.messaging.sendBroadcast(this.stackId, this.agentType, message);

    await this.logTrace(`Sent update: ${updateType}`, "send_update", {
      type: updateType,
      content,
    });
  }

  async requestCollaboration(
    targetStackId: Id<"agent_stacks">,
    request: string
  ) {
    // Send direct message to another agent stack
    await this.messaging.sendDirect(
      this.stackId,
      targetStackId,
      this.agentType,
      request
    );

    await this.logTrace(
      `Sent collaboration request to ${targetStackId}`,
      "request_collaboration",
      { request }
    );
  }

  async getFeedbackSummary(): Promise<string[]> {
    // Get recent messages from context that contain feedback
    const context = await this.memory.getContext(this.stackId, this.agentType);
    if (!context) return [];

    return context.recent_messages.filter((msg) => msg.startsWith("FEEDBACK:"));
  }
}
