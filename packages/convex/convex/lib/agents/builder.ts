import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { ActionCtx } from "../../_generated/server";
import { llmProvider, Message } from "../llmProvider";

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
    ctx.runQuery(internal.agentExecution.getAgentState, {
      stackId,
      agentType: "builder",
    }),
    ctx.runQuery(internal.artifacts.internalGetLatest, { stackId }),
  ]);

  if (!stack) {
    throw new Error(`Stack ${stackId} not found`);
  }

  // 2. Check if builder has work
  const pendingTodos =
    todos?.filter(
      (t: any) => t.status === "pending" && (t.priority || 0) > 0
    ) || [];

  if (pendingTodos.length === 0) {
    console.log(`[Builder] No pending todos`);
    return "Builder idle: No pending todos to work on";
  }

  // Get highest priority todo
  const todo = pendingTodos.sort(
    (a: any, b: any) => (b.priority || 0) - (a.priority || 0)
  )[0];

  if (!todo) {
    console.log(`[Builder] No todo found after sorting`);
    return "Builder idle: No todo found";
  }

  // 3. Mark todo as in progress
  await ctx.runMutation(internal.todos.internalUpdateStatus, {
    todoId: todo._id,
    status: "in_progress",
  });

  // 4. Build conversation with structured output
  const messages: Message[] = [
    llmProvider.buildSystemPrompt("builder", {
      projectTitle: projectIdea?.title,
      phase: stack.phase,
      todoCount: todos?.length || 0,
      teamName: stack.participant_name,
    }, true), // Request structured output
  ];

  // Add project context
  if (projectIdea) {
    messages.push({
      role: "user",
      content: `Project: ${projectIdea.title}\n${projectIdea.description}`,
    });
  }

  // Add current artifact if exists - show FULL artifact for proper iteration
  if (artifacts) {
    const artifactPreview = artifacts.content.length > 50000
      ? `${artifacts.content.substring(0, 50000)}\n... [truncated, total ${artifacts.content.length} chars]`
      : artifacts.content;

    messages.push({
      role: "user",
      content: `Current artifact (version ${artifacts.version}):\n\`\`\`html\n${artifactPreview}\n\`\`\``,
    });
  }

  // Add build request
  messages.push({
    role: "user",
    content: `Task: ${todo.content}\n\nPlease ${
      artifacts ? "update the existing artifact" : "create a new HTML artifact"
    } to complete this task. Create a single-file HTML application with inline CSS and JavaScript.`,
  });

  // 5. Call LLM with builder-optimized settings (smarter models, more tokens)
  console.log(`[Builder] Calling LLM for todo: ${todo.content} with ${messages.length} messages`);
  const response = await llmProvider.chatForBuilder(messages, {
    temperature: 0.7,
    // max_tokens is set to 16000 by chatForBuilder
    structured: true,
    schema: llmProvider.getSchema("builder"),
  });

  // 6. Parse JSON response (structured output guarantees valid JSON)
  console.log(`[Builder] LLM Response (first 500 chars):\n${response.content.substring(0, 500)}`);

  let parsed: {
    thinking: string;
    results: {
      artifact: string;
    }
  };
  try {
    const parsedJson = JSON.parse(response.content);
    parsed = {
      thinking: parsedJson.thinking || "",
      results: parsedJson.results || { artifact: "" }
    };
    console.log(`[Builder] Parsed JSON - thinking: ${parsed.thinking.substring(0, 100)}...`);
    console.log(`[Builder] Artifact size: ${parsed.results.artifact.length} chars`);
  } catch (error) {
    console.error(`[Builder] Failed to parse structured JSON response:`, error);
    console.error(`[Builder] Response:`, response.content.substring(0, 1000));
    throw new Error(`Builder received invalid JSON from LLM provider: ${error}`);
  }

  // 7. Create artifact from results
  let artifactCreated = false;
  if (parsed.results.artifact && parsed.results.artifact.trim().length > 0) {
    await ctx.runMutation(internal.artifacts.internalCreate, {
      stack_id: stackId,
      content: parsed.results.artifact,
      type: "html",
      version: (artifacts?.version || 0) + 1,
      created_by: "builder",
    });
    artifactCreated = true;
    console.log(
      `[Builder] Created artifact version ${(artifacts?.version || 0) + 1} (${parsed.results.artifact.length} chars)`
    );
  } else {
    console.warn(`[Builder] No artifact content in results`);
  }

  // 8. Mark todo as completed
  await ctx.runMutation(internal.todos.internalUpdateStatus, {
    todoId: todo._id,
    status: "completed",
  });

  // 9. Update builder memory with thinking only
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: "builder",
    thought: parsed.thinking || "Build complete",
  });

  // 10. Log trace with thinking only
  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: "builder",
    thought: parsed.thinking.substring(0, 1000), // Limit thought length in trace
    action: "build",
    result: {
      todoCompleted: todo.content,
      artifactCreated,
      version: artifactCreated ? (artifacts?.version || 0) + 1 : null,
    },
  });

  return parsed.thinking || "Build complete";
}
