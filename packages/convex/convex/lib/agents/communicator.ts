import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { ActionCtx } from "../../_generated/server";
import { llmProvider, Message } from "../llmProvider";

export async function executeCommunicator(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<string> {
  console.log(`[Communicator] Executing for stack ${stackId}`);

  // 1. Load context
  const [stack, messages, projectIdea, agentState, todos] = await Promise.all([
    ctx.runQuery(internal.agentExecution.getStackForExecution, { stackId }),
    ctx.runQuery(internal.messages.getUnreadForStack, { stackId }),
    ctx.runQuery(internal.agentExecution.getProjectIdea, { stackId }),
    ctx.runQuery(internal.agentExecution.getAgentState, {
      stackId,
      agentType: "communicator",
    }),
    ctx.runQuery(internal.agentExecution.getTodos, { stackId }),
  ]);

  if (!stack) {
    throw new Error(`Stack ${stackId} not found`);
  }

  // 2. Determine communication needs
  const hasUnreadMessages = messages && messages.length > 0;
  const lastBroadcastTime =
    (agentState as any)?.memory?.last_broadcast_time || 0;
  const timeSinceLastBroadcast = Date.now() - lastBroadcastTime;
  const needsStatusUpdate = timeSinceLastBroadcast > 120000; // 2 minutes

  if (!hasUnreadMessages && !needsStatusUpdate) {
    console.log(`[Communicator] No communication needed`);
    return "Communicator idle: No messages to process or status updates needed";
  }

  // 3. Build conversation
  const llmMessages: Message[] = [
    llmProvider.buildSystemPrompt("communicator", {
      projectTitle: projectIdea?.title,
      phase: stack.phase,
      todoCount: todos?.length || 0,
      teamName: stack.participant_name,
    }),
  ];

  // Add project context
  if (projectIdea) {
    llmMessages.push({
      role: "user",
      content: `Project: ${projectIdea.title}\n${projectIdea.description}`,
    });
  }

  // Process unread messages
  if (hasUnreadMessages) {
    // Separate user messages from agent messages
    const userMessages = messages.filter((m: any) => m.message_type === "visitor");
    const agentMessages = messages.filter((m: any) => m.message_type !== "visitor");

    let messagesSummary = "";

    // Format user messages (these should be responded to directly)
    if (userMessages.length > 0) {
      const userMsgText = userMessages
        .map((m: any) => `${m.from_user_name || "Visitor"}: ${m.content}`)
        .join("\n");
      messagesSummary += `User messages (respond to these directly, addressing the user):\n${userMsgText}\n\n`;
    }

    // Format agent messages (these are from other teams)
    if (agentMessages.length > 0) {
      const agentMsgText = agentMessages
        .map((m: any) => {
          const sender = m.from_agent_type || "someone";
          return `From ${sender}: ${m.content}`;
        })
        .join("\n");
      messagesSummary += `Messages from other participants:\n${agentMsgText}\n\n`;
    }

    llmMessages.push({
      role: "user",
      content: `${messagesSummary}Please respond appropriately to these messages.`,
    });

    // Mark messages as read
    for (const msg of messages) {
      await ctx.runMutation(internal.messages.internalMarkAsRead, {
        messageId: msg._id,
        stackId: stackId, // Add the current stack ID
      });
    }
  }

  // Request status update if needed
  if (needsStatusUpdate) {
    const completedTodos =
      todos?.filter((t) => t.status === "completed").length || 0;
    const pendingTodos =
      todos?.filter((t) => t.status === "pending").length || 0;

    llmMessages.push({
      role: "user",
      content: `Please provide a team status update. Progress: ${completedTodos} completed, ${pendingTodos} pending todos.`,
    });
  }

  // 4. Call LLM
  console.log(`[Communicator] Calling LLM`);
  const response = await llmProvider.chat(llmMessages, {
    temperature: 0.8,
    max_tokens: 1000,
  });

  // 5. Parse response and handle communication
  const parsed = llmProvider.parseAgentResponse(
    response.content,
    "communicator"
  );

  // Send broadcast message
  let messageSent = false;
  if (
    needsStatusUpdate ||
    parsed.actions.some((a: any) => a.type === "send_message")
  ) {
    await ctx.runMutation(internal.messages.internalSend, {
      sender_id: stackId,
      message_type: "broadcast",
      content: response.content,
    });
    messageSent = true;
    console.log(`[Communicator] Sent broadcast message`);

    // Update last broadcast time
    const updatedMemory = {
      ...(agentState?.memory || {}),
      last_broadcast_time: Date.now(),
    };
    await ctx.runMutation(internal.agents.updateAgentMemory, {
      stackId,
      agentType: "communicator",
      memory: updatedMemory,
    });
  }

  // 6. Update communicator memory
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: "communicator",
    thought: response.content,
  });

  // 7. Log trace
  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: "communicator",
    thought: response.content,
    action: "communicate",
    result: {
      messagesProcessed: messages?.length || 0,
      messageSent,
      statusUpdate: needsStatusUpdate,
    },
  });

  return response.content;
}
