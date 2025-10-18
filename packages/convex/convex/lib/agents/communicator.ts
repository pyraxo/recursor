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

  // 2. Determine communication needs (PRIORITY ORDER)

  // HIGHEST PRIORITY: User messages (process ONE at a time, chatroom style)
  if (userMessages && userMessages.length > 0) {
    return await handleUserMessage(ctx, stackId, userMessages[0], stack, projectIdea, todos);
  }

  // PRIORITY 2: Unread messages from other agent teams
  const hasUnreadMessages = messages && messages.length > 0;

  // NOTE: Broadcasts are DISABLED to reduce message spam
  // PRIORITY 3: Broadcast requests from planner (DISABLED)
  // const broadcastTodos = todos?.filter((t) =>
  //   t.status === "pending" &&
  //   (t.content.toLowerCase().includes("broadcast") ||
  //    t.content.toLowerCase().includes("announce"))
  // ) || [];
  // const needsBroadcast = broadcastTodos.length > 0;

  if (!hasUnreadMessages) {
    console.log(`[Communicator] No communication needed`);
    return "Communicator idle: No messages to process";
  }

  // 3. Build conversation for agent messages or broadcasts
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

  // Process unread messages from other agent teams
  if (hasUnreadMessages) {
    // Enrich messages with sender team names
    const enrichedMessages = await Promise.all(
      messages.map(async (m: any) => {
        if (m.from_stack_id) {
          const senderStack = await ctx.runQuery(internal.agentExecution.getStackForExecution, {
            stackId: m.from_stack_id,
          });
          return {
            ...m,
            senderTeamName: senderStack?.participant_name || "Unknown Team",
          };
        }
        return { ...m, senderTeamName: "Unknown Team" };
      })
    );

    const agentMsgText = enrichedMessages
      .map((m: any) => {
        return `From ${m.senderTeamName}: ${m.content}`;
      })
      .join("\n");

    llmMessages.push({
      role: "user",
      content: `Messages from other participants:\n${agentMsgText}\n\nPlease respond appropriately.`,
    });

    // Mark messages as read
    for (const msg of messages) {
      await ctx.runMutation(internal.messages.internalMarkAsRead, {
        messageId: msg._id,
        stackId: stackId,
      });
    }
  }

  // NOTE: Broadcasts are DISABLED
  // Handle broadcast todos from planner (DISABLED)
  // if (needsBroadcast) {
  //   const broadcastSummary = broadcastTodos
  //     .map((t: any) => `- ${t.content}`)
  //     .join("\n");
  //
  //   llmMessages.push({
  //     role: "user",
  //     content: `The planner has requested the following broadcasts:\n${broadcastSummary}\n\nCreate an appropriate broadcast message for the hackathon.`,
  //   });
  // }

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

  // NOTE: Broadcasts are DISABLED - only respond to agent messages directly
  // Send broadcast message (only for agent messages, NOT status updates)
  let messageSent = false;
  if (
    hasUnreadMessages ||
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

  // NOTE: Broadcasts are DISABLED
  // Mark broadcast todos as completed (DISABLED)
  // if (needsBroadcast) {
  //   for (const todo of broadcastTodos) {
  //     await ctx.runMutation(internal.todos.internalUpdateStatus, {
  //       todoId: todo._id,
  //       status: "completed",
  //     });
  //     console.log(`[Communicator] Completed broadcast todo: ${todo.content}`);
  //   }
  // }

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
      agentMessagesProcessed: messages?.length || 0,
      messageSent,
    },
  });

  return response.content;
}

/**
 * Handle a single user message (chatroom style)
 * Process one message at a time to maintain conversational flow
 */
async function handleUserMessage(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">,
  userMessage: any,
  stack: any,
  projectIdea: any,
  todos: any[]
): Promise<string> {
  console.log(
    `[Communicator] Responding to user message from ${userMessage.sender_name}: "${userMessage.content.substring(0, 50)}..."`
  );

  // Build conversation for this specific user message
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
      content: `Our project: ${projectIdea.title}\n${projectIdea.description}`,
    });
  }

  // Add current progress context
  const completedTodos = todos?.filter((t) => t.status === "completed").length || 0;
  const pendingTodos = todos?.filter((t) => t.status === "pending").length || 0;

  if (todos && todos.length > 0) {
    llmMessages.push({
      role: "user",
      content: `Current progress: ${completedTodos} completed, ${pendingTodos} pending todos.`,
    });
  }

  // Add the user's message
  const timeAgo = Math.floor((Date.now() - userMessage.timestamp) / 60000);
  llmMessages.push({
    role: "user",
    content: `${userMessage.sender_name} asks (${timeAgo}m ago): "${userMessage.content}"\n\nRespond directly to ${userMessage.sender_name} in a friendly, conversational manner. Keep it concise (2-3 sentences max).`,
  });

  // Call LLM
  console.log(`[Communicator] Calling LLM for user message response`);
  const response = await llmProvider.chat(llmMessages, {
    temperature: 0.8,
    max_tokens: 500, // Shorter responses for chat
  });

  // Send direct response (NOT a broadcast - it's a reply to this specific message)
  const responseMessageId = await ctx.runMutation(internal.messages.internalSend, {
    sender_id: stackId,
    message_type: "direct", // Direct response, not broadcast
    content: response.content,
  });

  console.log(`[Communicator] Sent direct response to ${userMessage.sender_name}`);

  // Mark this user message as processed and link to the response
  await ctx.runMutation(internal.userMessages.internalMarkProcessed, {
    message_id: userMessage._id,
    response_id: responseMessageId,
  });

  // Update communicator memory
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: "communicator",
    thought: `Responded to ${userMessage.sender_name}: ${response.content}`,
  });

  // Log trace
  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: "communicator",
    thought: `User message from ${userMessage.sender_name}`,
    action: "respond_to_user",
    result: {
      userMessageId: userMessage._id,
      senderName: userMessage.sender_name,
      responseLength: response.content.length,
    },
  });

  return `Responded to ${userMessage.sender_name}: ${response.content}`;
}
