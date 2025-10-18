import { Id } from "../../_generated/dataModel";
import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { llmProvider, Message } from "../llm-provider";

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
    ctx.runQuery(internal.agentExecution.getAgentState, { stackId, agentType: 'communicator' }),
    ctx.runQuery(internal.agentExecution.getTodos, { stackId }),
  ]);

  if (!stack) {
    throw new Error(`Stack ${stackId} not found`);
  }

  // 2. Determine communication needs
  const hasUnreadMessages = messages && messages.length > 0;
  const lastBroadcastTime = agentState?.memory?.last_broadcast_time || 0;
  const timeSinceLastBroadcast = Date.now() - lastBroadcastTime;
  const needsStatusUpdate = timeSinceLastBroadcast > 120000; // 2 minutes

  if (!hasUnreadMessages && !needsStatusUpdate) {
    console.log(`[Communicator] No communication needed`);
    return 'Communicator idle: No messages to process or status updates needed';
  }

  // 3. Build conversation
  const llmMessages: Message[] = [
    llmProvider.buildSystemPrompt('communicator', {
      projectTitle: projectIdea?.title,
      phase: stack.phase,
      todoCount: todos?.length || 0,
      teamName: stack.participant_name,
    }),
  ];

  // Add project context
  if (projectIdea) {
    llmMessages.push({
      role: 'user',
      content: `Project: ${projectIdea.title}\n${projectIdea.description}`,
    });
  }

  // Process unread messages
  if (hasUnreadMessages) {
    const messagesSummary = messages
      .map(m => `From ${m.sender_id}: ${m.content}`)
      .join('\n');

    llmMessages.push({
      role: 'user',
      content: `Unread messages:\n${messagesSummary}\n\nPlease respond appropriately.`,
    });

    // Mark messages as read
    for (const msg of messages) {
      await ctx.runMutation(internal.messages.markAsRead, {
        messageId: msg._id,
      });
    }
  }

  // Request status update if needed
  if (needsStatusUpdate) {
    const completedTodos = todos?.filter(t => t.status === 'completed').length || 0;
    const pendingTodos = todos?.filter(t => t.status === 'pending').length || 0;

    llmMessages.push({
      role: 'user',
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
  const parsed = llmProvider.parseAgentResponse(response.content, 'communicator');

  // Send broadcast message
  let messageSent = false;
  if (needsStatusUpdate || parsed.actions.some(a => a.type === 'send_message')) {
    await ctx.runMutation(internal.messages.internalSend, {
      sender_id: stackId,
      message_type: 'broadcast',
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
      agentType: 'communicator',
      memory: updatedMemory,
    });
  }

  // 6. Update communicator memory
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: 'communicator',
    thought: response.content,
  });

  // 7. Log trace
  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: 'communicator',
    thought: response.content,
    action: 'communicate',
    result: {
      messagesProcessed: messages?.length || 0,
      messageSent,
      statusUpdate: needsStatusUpdate,
    },
  });

  return response.content;
}