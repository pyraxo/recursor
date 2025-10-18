import { Id } from "../../_generated/dataModel";
import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { llmProvider, Message } from "../llm-provider";

export async function executeBuilder(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<string> {
  console.log(`[Builder] Executing for stack ${stackId}`);

  // 1. Load context
  const [stack, todos, projectIdea, agentState, artifacts] = await Promise.all([
    ctx.runQuery(internal.agentExecution.getStackForExecution, { stackId }),
    ctx.runQuery(internal.agentExecution.getTodos, { stackId }),
    ctx.runQuery(internal.agentExecution.getProjectIdea, { stackId }),
    ctx.runQuery(internal.agentExecution.getAgentState, { stackId, agentType: 'builder' }),
    ctx.runQuery(internal.artifacts.getLatest, { stackId }),
  ]);

  if (!stack) {
    throw new Error(`Stack ${stackId} not found`);
  }

  // 2. Check if builder has work
  const pendingTodos = todos?.filter(t =>
    t.status === 'pending' && (t.priority || 0) > 0
  ) || [];

  if (pendingTodos.length === 0) {
    console.log(`[Builder] No pending todos`);
    return 'Builder idle: No pending todos to work on';
  }

  // Get highest priority todo
  const todo = pendingTodos.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];

  // 3. Mark todo as in progress
  await ctx.runMutation(internal.todos.internalUpdateStatus, {
    todoId: todo._id,
    status: 'in_progress',
  });

  // 4. Build conversation
  const messages: Message[] = [
    llmProvider.buildSystemPrompt('builder', {
      projectTitle: projectIdea?.title,
      phase: stack.phase,
      todoCount: todos?.length || 0,
      teamName: stack.participant_name,
    }),
  ];

  // Add project context
  if (projectIdea) {
    messages.push({
      role: 'user',
      content: `Project: ${projectIdea.title}\n${projectIdea.description}`,
    });
  }

  // Add current artifact if exists
  if (artifacts) {
    messages.push({
      role: 'user',
      content: `Current artifact (version ${artifacts.version}):\n\`\`\`html\n${artifacts.content.substring(0, 500)}...\n\`\`\``,
    });
  }

  // Add build request
  messages.push({
    role: 'user',
    content: `Task: ${todo.content}\n\nPlease ${
      artifacts ? 'update the existing artifact' : 'create a new HTML artifact'
    } to complete this task. Create a single-file HTML application with inline CSS and JavaScript.`,
  });

  // 5. Call LLM
  console.log(`[Builder] Calling LLM for todo: ${todo.content}`);
  const response = await llmProvider.chat(messages, {
    temperature: 0.7,
    max_tokens: 3000, // More tokens for code generation
  });

  // 6. Parse response and extract artifact
  const parsed = llmProvider.parseAgentResponse(response.content, 'builder');

  // Check if artifact was created
  let artifactCreated = false;
  for (const action of parsed.actions) {
    if (action.type === 'create_artifact' && action.content) {
      // Create artifact
      await ctx.runMutation(internal.artifacts.internalCreate, {
        stack_id: stackId,
        content: action.content,
        type: 'html',
        version: (artifacts?.version || 0) + 1,
        created_by: 'builder',
      });
      artifactCreated = true;
      console.log(`[Builder] Created artifact version ${(artifacts?.version || 0) + 1}`);
    }
  }

  // If no artifact in actions, check for HTML in response
  if (!artifactCreated && response.content.includes('<!DOCTYPE') || response.content.includes('<html')) {
    const htmlMatch = response.content.match(/```html\n?([\s\S]*?)\n?```/) ||
                      response.content.match(/(<!DOCTYPE[\s\S]*<\/html>)/);
    if (htmlMatch) {
      await ctx.runMutation(internal.artifacts.internalCreate, {
        stack_id: stackId,
        content: htmlMatch[1],
        type: 'html',
        version: (artifacts?.version || 0) + 1,
        created_by: 'builder',
      });
      artifactCreated = true;
      console.log(`[Builder] Created artifact from HTML content`);
    }
  }

  // 7. Mark todo as completed
  await ctx.runMutation(internal.todos.internalUpdateStatus, {
    todoId: todo._id,
    status: 'completed',
  });

  // 8. Update builder memory
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: 'builder',
    thought: response.content.substring(0, 1000), // Truncate for memory
  });

  // 9. Log trace
  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: 'builder',
    thought: response.content.substring(0, 500), // Truncate for trace
    action: 'build',
    result: {
      todoCompleted: todo.content,
      artifactCreated,
      version: artifactCreated ? (artifacts?.version || 0) + 1 : null,
    },
  });

  return response.content;
}