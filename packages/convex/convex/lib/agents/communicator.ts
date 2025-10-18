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
  const [stack, messages, projectIdea, agentState, todos, userMessages] = await Promise.all([
    ctx.runQuery(internal.agentExecution.getStackForExecution, { stackId }),
    ctx.runQuery(internal.messages.getUnreadForStack, { stackId }),
    ctx.runQuery(internal.agentExecution.getProjectIdea, { stackId }),
    ctx.runQuery(internal.agentExecution.getAgentState, {
      stackId,
      agentType: "communicator",
    }),
    ctx.runQuery(internal.agentExecution.getTodos, { stackId }),
    ctx.runQuery(internal.userMessages.internalGetUnprocessed, {
      team_id: stackId,
    }),
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

  // Check if there are todos for responding to users (contains "respond to user" or similar)
  const userResponseTodos = todos?.filter((t) =>
    t.status === "pending" &&
    (t.content.toLowerCase().includes("respond to user") ||
     t.content.toLowerCase().includes("answer user") ||
     t.content.toLowerCase().includes("reply to user"))
  ) || [];
  const needsUserResponse = userResponseTodos.length > 0;

  if (!hasUnreadMessages && !needsStatusUpdate && !needsUserResponse) {
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
    const messagesSummary = messages
      .map((m) => `From ${m.sender_id}: ${m.content}`)
      .join("\n");

    llmMessages.push({
      role: "user",
      content: `Unread messages:\n${messagesSummary}\n\nPlease respond appropriately.`,
    });

    // Mark messages as read
    for (const msg of messages) {
      await ctx.runMutation(internal.messages.internalMarkAsRead, {
        messageId: msg._id,
        stackId: stackId, // Add the current stack ID
      });
    }
  }

  // Handle user response todos
  if (needsUserResponse && userMessages && userMessages.length > 0) {
    const userMessagesSummary = userMessages
      .map((msg: any) => {
        const timeAgo = Math.floor((Date.now() - msg.timestamp) / 60000);
        return `- From ${msg.sender_name} (${timeAgo}m ago): ${msg.content}`;
      })
      .join("\n");

    llmMessages.push({
      role: "user",
      content: `User messages to respond to:\n${userMessagesSummary}\n\nBased on the planner's todos (${userResponseTodos.map(t => t.content).join(", ")}), craft an appropriate response to the users.`,
    });
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
  let responseMessageId = null;
  if (
    needsStatusUpdate ||
    needsUserResponse ||
    parsed.actions.some((a: any) => a.type === "send_message")
  ) {
    // Store the message ID so we can link it to user messages
    const messageId = await ctx.runMutation(internal.messages.internalSend, {
      sender_id: stackId,
      message_type: "broadcast",
      content: response.content,
    });
    responseMessageId = messageId;
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

  // Mark user messages as processed if we responded to them
  if (needsUserResponse && userMessages && userMessages.length > 0 && responseMessageId) {
    for (const userMsg of userMessages) {
      await ctx.runMutation(internal.userMessages.internalMarkProcessed, {
        message_id: userMsg._id,
        response_id: responseMessageId,
      });
      console.log(`[Communicator] Marked user message ${userMsg._id} as processed`);
    }
  }

  // Mark user response todos as completed
  if (needsUserResponse) {
    for (const todo of userResponseTodos) {
      await ctx.runMutation(internal.todos.internalUpdateStatus, {
        todoId: todo._id,
        status: "completed",
      });
      console.log(`[Communicator] Completed todo: ${todo.content}`);
    }
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
