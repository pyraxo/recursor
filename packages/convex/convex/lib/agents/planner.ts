import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { ActionCtx } from "../../_generated/server";
import { llmProvider, Message } from "../llmProvider";

export async function executePlanner(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<string> {
  console.log(`[Planner] Executing for stack ${stackId}`);

  // 1. Load context
  const [stack, initialTodos, projectIdea, agentState, userMessages] =
    await Promise.all([
      ctx.runQuery(internal.agentExecution.getStackForExecution, { stackId }),
      ctx.runQuery(internal.agentExecution.getTodos, { stackId }),
      ctx.runQuery(internal.agentExecution.getProjectIdea, { stackId }),
      ctx.runQuery(internal.agentExecution.getAgentState, {
        stackId,
        agentType: "planner",
      }),
      ctx.runQuery(internal.userMessages.internalGetUnprocessed, {
        team_id: stackId,
      }),
    ]);

  // Use let so we can reassign after clear
  let todos = initialTodos;

  if (!stack) {
    throw new Error(`Stack ${stackId} not found`);
  }

  // 2. Check if planner has work
  const hasWork = checkPlannerHasWork(
    todos,
    projectIdea,
    agentState,
    userMessages
  );
  if (!hasWork.hasWork) {
    console.log(`[Planner] No work available: ${hasWork.reason}`);
    return `Planner idle: ${hasWork.reason}`;
  }

  // 3. Build conversation with structured output
  const messages: Message[] = [
    llmProvider.buildSystemPrompt("planner", {
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
      content: `Current project: ${projectIdea.title}\n${projectIdea.description}`,
    });
  }

  // Add current todos
  if (todos && todos.length > 0) {
    const todoSummary = todos
      .map((t: any) => `- [${t.status}] ${t.content}`)
      .join("\n");

    // Check if there are too many todos (threshold: 20)
    const tooManyTodos = todos.length > 20;
    const pendingTodos = todos.filter((t: any) => t.status === "pending");
    const tooManyPending = pendingTodos.length > 15;

    let todoMessage = `Current todos (${todos.length} total, ${pendingTodos.length} pending):\n${todoSummary}`;

    if (tooManyTodos || tooManyPending) {
      todoMessage += `\n\nWARNING: The todo list is getting bloated (${todos.length} total todos, ${pendingTodos.length} pending). Consider using clear_all_todos to restart with a clean slate, then create a focused set of high-priority todos.`;
    }

    messages.push({
      role: "user",
      content: todoMessage,
    });
  }

  // Add reviewer recommendations if any (stored in planner's own memory)
  const reviewerRecommendations = agentState?.memory?.reviewer_recommendations;
  if (reviewerRecommendations && reviewerRecommendations.length > 0) {
    const recommendations = reviewerRecommendations.join("\n");
    const timestamp = agentState?.memory?.recommendations_timestamp;
    const ageInMinutes = timestamp
      ? Math.floor((Date.now() - timestamp) / 60000)
      : null;
    messages.push({
      role: "user",
      content: `Reviewer recommendations${ageInMinutes !== null ? ` (${ageInMinutes} minutes ago)` : ''}:\n${recommendations}`,
    });
  }

  // Add user messages if any (for strategic planning, not responding)
  if (userMessages && userMessages.length > 0) {
    const userMessagesSummary = userMessages
      .map((msg: any) => {
        const timeAgo = Math.floor((Date.now() - msg.timestamp) / 60000);
        return `- From ${msg.sender_name} (${timeAgo}m ago): ${msg.content}`;
      })
      .join("\n");
    messages.push({
      role: "user",
      content: `User messages for the team:\n${userMessagesSummary}\n\nNOTE: The Communicator will respond to these messages directly - you don't need to create "respond to user" todos.\n\nYour job is to analyze if these messages require strategic changes:\n1. Do they request new features or changes to the project?\n2. Should priorities be adjusted based on user feedback?\n3. Is there a major announcement that should be broadcast to all participants?\n\nOnly create todos for strategic work, not for simple responses.`,
    });
  }

  // Add planning request
  messages.push({
    role: "user",
    content:
      hasWork.prompt ||
      "What should the team work on next? Create specific todos.",
  });

  // 4. Call LLM with structured output
  console.log(`[Planner] Calling LLM with ${messages.length} messages`);
  const response = await llmProvider.chat(messages, {
    temperature: 0.8,
    max_tokens: 8000, // Increased from 1500 for more detailed planning
    structured: true,
    schema: llmProvider.getSchema("planner"),
  });

  // 5. Parse JSON response (structured output guarantees valid JSON)
  console.log(`[Planner] LLM Response (first 500 chars):\n${response.content.substring(0, 500)}`);

  let parsed: { thinking: string; actions: any[] };
  try {
    const parsedJson = JSON.parse(response.content);
    parsed = {
      thinking: parsedJson.thinking || "",
      actions: Array.isArray(parsedJson.actions) ? parsedJson.actions : []
    };
    console.log(`[Planner] Parsed JSON with ${parsed.actions.length} actions`);
    console.log(`[Planner] Thinking: ${parsed.thinking.substring(0, 200)}...`);
  } catch (error) {
    console.error(`[Planner] Failed to parse structured JSON response:`, error);
    console.error(`[Planner] Response:`, response.content.substring(0, 1000));
    throw new Error(`Planner received invalid JSON from LLM provider: ${error}`);
  }

  if (!parsed.actions || parsed.actions.length === 0) {
    console.warn(
      `[Planner] No actions in JSON response. This may indicate the LLM decided no changes are needed.`
    );
  }

  // Execute actions (handle special actions first: clear todos, update project, and update phase)
  let todosCreated = 0;
  let todosUpdated = 0;
  let todosDeleted = 0;
  let todosCleared = 0;
  let projectUpdated = false;
  let phaseUpdated = false;

  // Check if there's a clear_all_todos action - handle it first
  const clearAction = parsed.actions.find((a: any) => a.type === "clear_all_todos");
  if (clearAction) {
    const clearedCount = await ctx.runMutation(internal.todos.internalClearAll, {
      stack_id: stackId,
    });
    todosCleared = clearedCount;
    console.log(`[Planner] Cleared ${clearedCount} todos. Reason: ${clearAction.reason || "not specified"}`);
    // Clear the local todos array since we just deleted everything
    todos = [];
  }

  // Check if there's an update_project action
  const updateProjectAction = parsed.actions.find((a: any) => a.type === "update_project");
  if (updateProjectAction) {
    await ctx.runMutation(internal.project_ideas.internalUpdate, {
      stack_id: stackId,
      title: updateProjectAction.title,
      description: updateProjectAction.description,
    });
    projectUpdated = true;
    console.log(`[Planner] Updated project${updateProjectAction.title ? ` title: "${updateProjectAction.title}"` : ""}${updateProjectAction.description ? ` with enhanced description (${updateProjectAction.description.length} chars)` : ""}`);
  }

  // Check if there's an update_phase action
  const updatePhaseAction = parsed.actions.find((a: any) => a.type === "update_phase");
  if (updatePhaseAction && updatePhaseAction.phase) {
    const oldPhase = stack.phase;
    await ctx.runMutation(internal.agents.internalUpdatePhase, {
      stackId: stackId,
      phase: updatePhaseAction.phase,
    });
    phaseUpdated = true;
    console.log(`[Planner] Updated phase: "${oldPhase}" -> "${updatePhaseAction.phase}"`);
  }

  // Now execute other actions
  for (const action of parsed.actions) {
    if (action.type === "create_todo") {
      await ctx.runMutation(internal.todos.internalCreate, {
        stack_id: stackId,
        content: action.content,
        status: "pending",
        assigned_by: "planner",
        priority: action.priority || 5,
      });
      todosCreated++;
      console.log(`[Planner] Created todo #${todosCreated}: ${action.content}`);
    } else if (action.type === "update_todo") {
      // Find the todo by matching content
      const matchingTodo = todos?.find(
        (t: any) => t.content === action.oldContent
      );

      if (matchingTodo) {
        await ctx.runMutation(internal.todos.internalUpdate, {
          todoId: matchingTodo._id,
          content: action.newContent,
          priority: action.priority,
        });
        todosUpdated++;
        console.log(
          `[Planner] Updated todo: "${action.oldContent}" -> "${action.newContent || "same"}"`
        );
        // Update local array to reflect the change
        if (action.newContent) {
          matchingTodo.content = action.newContent;
        }
        if (action.priority !== undefined) {
          matchingTodo.priority = action.priority;
        }
      } else {
        console.warn(
          `[Planner] Could not find todo to update: "${action.oldContent}"`
        );
      }
    } else if (action.type === "delete_todo") {
      // Find the todo by matching content
      const matchingTodo = todos?.find((t: any) => t.content === action.content);

      if (matchingTodo) {
        await ctx.runMutation(internal.todos.internalDelete, {
          todoId: matchingTodo._id,
        });
        todosDeleted++;
        console.log(`[Planner] Deleted todo: "${action.content}"`);
        // Remove from local array to prevent duplicate deletion attempts
        todos = todos.filter((t: any) => t._id !== matchingTodo._id);
      } else {
        console.warn(
          `[Planner] Could not find todo to delete: "${action.content}"`
        );
      }
    }
    // clear_all_todos is already handled above
  }

  console.log(
    `[Planner] Summary: ${phaseUpdated ? "Updated phase, " : ""}${projectUpdated ? "Updated project, " : ""}${todosCleared > 0 ? `Cleared ${todosCleared}, ` : ""}Created ${todosCreated}, Updated ${todosUpdated}, Deleted ${todosDeleted} todos from ${parsed.actions.length} total actions`
  );

  // Update planner memory with the thinking (not the full JSON)
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: "planner",
    thought: parsed.thinking || "Planning complete",
  });

  // Clear reviewer recommendations from planner's memory after processing
  const hasRecommendations = agentState?.memory?.reviewer_recommendations &&
    agentState.memory.reviewer_recommendations.length > 0;
  if (hasRecommendations) {
    await ctx.runMutation(internal.agents.clearPlannerRecommendations, {
      stackId,
    });
  }

  // Log trace
  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: "planner",
    thought: parsed.thinking.substring(0, 1000), // Limit thought length in trace
    action: "planning",
    result: {
      todosCreated,
      todosUpdated,
      todosDeleted,
      todosCleared,
      projectUpdated,
      phaseUpdated,
      totalActions: parsed.actions.length,
      hasWork: hasWork.hasWork,
      reason: hasWork.reason,
    },
  });

  return parsed.thinking || "Planning complete";
}

function checkPlannerHasWork(
  todos: any[],
  projectIdea: any,
  agentState: any,
  userMessages?: any[]
): { hasWork: boolean; reason: string; prompt?: string } {
  // Check if we need initial planning
  if (!projectIdea) {
    return {
      hasWork: true,
      reason: "No project idea defined",
      prompt: "Define a project idea for the hackathon. Be creative!",
    };
  }

  if (!todos || todos.length === 0) {
    return {
      hasWork: true,
      reason: "No todos exist",
      prompt: "Create an initial set of todos to start building the project.",
    };
  }

  // Check if all todos are completed
  const activeTodos = todos.filter(
    (t) => t.status !== "completed" && t.status !== "cancelled"
  );
  if (activeTodos.length === 0) {
    return {
      hasWork: true,
      reason: "All todos completed",
      prompt:
        "All current todos are completed. Plan the next phase of development.",
    };
  }

  // Check for unprocessed user messages
  if (userMessages && userMessages.length > 0) {
    return {
      hasWork: true,
      reason: "User messages need attention",
      prompt:
        "Users have sent messages to the team. Analyze them and take appropriate action (respond, adjust plan, etc.).",
    };
  }

  // Check for reviewer recommendations in planner's memory
  if (agentState?.memory?.reviewer_recommendations?.length > 0) {
    return {
      hasWork: true,
      reason: "Reviewer has recommendations",
      prompt:
        "The reviewer has provided recommendations. Review them and update the plan accordingly.",
    };
  }

  // Check time since last planning
  const lastPlanningTime = agentState?.memory?.last_planning_time || 0;
  const timeSinceLastPlan = Date.now() - lastPlanningTime;
  if (timeSinceLastPlan > 120000) {
    // 2 minutes
    return {
      hasWork: true,
      reason: "Periodic planning review",
      prompt: "Review current progress and adjust the plan if needed.",
    };
  }

  return {
    hasWork: false,
    reason: "No planning needed",
  };
}
