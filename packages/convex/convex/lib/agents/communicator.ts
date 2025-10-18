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

  if (!hasUnreadMessages) {
    console.log(`[Communicator] No communication needed`);
    return "Communicator idle: No messages to process";
  }

  // 3. Build conversation for agent messages or broadcasts with structured output
  const llmMessages: Message[] = [
    llmProvider.buildSystemPrompt("communicator", {
      projectTitle: projectIdea?.title,
      phase: stack.phase,
      todoCount: todos?.length || 0,
      teamName: stack.participant_name,
    }, true), // Request structured output
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

  // 4. Call LLM with JSON mode
  console.log(`[Communicator] Calling LLM with ${llmMessages.length} messages`);
  const response = await llmProvider.chat(llmMessages, {
    temperature: 0.8,
    max_tokens: 1000,
    json_mode: true, // Request JSON output
  });

  // 5. Parse JSON response
  console.log(`[Communicator] LLM Response (first 500 chars):\n${response.content.substring(0, 500)}`);

  let parsed: { thinking: string; results: { message: string; recipient: string; type: string } };
  try {
    const parsedJson = JSON.parse(response.content);
    parsed = {
      thinking: parsedJson.thinking || "",
      results: parsedJson.results || { message: "", recipient: "broadcast", type: "broadcast" }
    };
    console.log(`[Communicator] Parsed JSON - thinking: ${parsed.thinking.substring(0, 100)}...`);
  } catch (error) {
    console.error(`[Communicator] Failed to parse JSON response:`, error);
    console.error(`[Communicator] Response:`, response.content);
    // Fallback to sending the raw response as a broadcast
    parsed = {
      thinking: "Failed to parse response",
      results: { message: response.content, recipient: "broadcast", type: "broadcast" }
    };
  }

  // 6. Send message based on results
  let messageSent = false;
  if (parsed.results.message) {
    await ctx.runMutation(internal.messages.internalSend, {
      sender_id: stackId,
      message_type: parsed.results.type === "direct" ? "direct" : "broadcast",
      content: parsed.results.message,
    });
    messageSent = true;
    console.log(`[Communicator] Sent ${parsed.results.type} message to ${parsed.results.recipient}`);

    // Update last broadcast time if it was a broadcast
    if (parsed.results.type === "broadcast") {
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
  }

  // 7. Update communicator memory with thinking only
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: "communicator",
    thought: parsed.thinking || "Communication complete",
  });

  // 8. Log trace with thinking only
  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: "communicator",
    thought: parsed.thinking.substring(0, 1000), // Limit thought length in trace
    action: "communicate",
    result: {
      agentMessagesProcessed: messages?.length || 0,
      messageSent,
      messageType: parsed.results.type,
      recipient: parsed.results.recipient,
    },
  });

  return parsed.thinking || "Communication complete";
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

  // Build conversation for this specific user message with structured output
  const llmMessages: Message[] = [
    llmProvider.buildSystemPrompt("communicator", {
      projectTitle: projectIdea?.title,
      phase: stack.phase,
      todoCount: todos?.length || 0,
      teamName: stack.participant_name,
    }, true), // Request structured output
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

  // Call LLM with JSON mode
  console.log(`[Communicator] Calling LLM for user message response`);
  const response = await llmProvider.chat(llmMessages, {
    temperature: 0.8,
    max_tokens: 500, // Shorter responses for chat
    json_mode: true, // Request JSON output
  });

  // Parse JSON response
  console.log(`[Communicator] LLM Response (first 200 chars):\n${response.content.substring(0, 200)}`);

  let parsed: { thinking: string; results: { message: string; recipient: string; type: string } };
  try {
    const parsedJson = JSON.parse(response.content);
    parsed = {
      thinking: parsedJson.thinking || "",
      results: parsedJson.results || { message: "", recipient: userMessage.sender_name, type: "direct" }
    };
    console.log(`[Communicator] Parsed JSON - sending to ${parsed.results.recipient}`);
  } catch (error) {
    console.error(`[Communicator] Failed to parse JSON response:`, error);
    // Fallback to using raw response as direct message
    parsed = {
      thinking: "Responding to user message",
      results: { message: response.content, recipient: userMessage.sender_name, type: "direct" }
    };
  }

  // Send direct response (NOT a broadcast - it's a reply to this specific message)
  const responseMessageId = await ctx.runMutation(internal.messages.internalSend, {
    sender_id: stackId,
    message_type: "direct", // Direct response, not broadcast
    content: parsed.results.message,
  });

  console.log(`[Communicator] Sent direct response to ${userMessage.sender_name}`);

  // Mark this user message as processed and link to the response
  await ctx.runMutation(internal.userMessages.internalMarkProcessed, {
    message_id: userMessage._id,
    response_id: responseMessageId,
  });

  // Update communicator memory with thinking only
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: "communicator",
    thought: parsed.thinking || `Responded to ${userMessage.sender_name}`,
  });

  // Log trace with thinking only
  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: "communicator",
    thought: parsed.thinking.substring(0, 1000), // Limit thought length in trace
    action: "respond_to_user",
    result: {
      userMessageId: userMessage._id,
      senderName: userMessage.sender_name,
      responseLength: parsed.results.message.length,
    },
  });

  return `Responded to ${userMessage.sender_name}: ${parsed.thinking}`;
}
