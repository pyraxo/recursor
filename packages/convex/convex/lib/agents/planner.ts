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
  const [stack, todos, projectIdea, agentState, userMessages] =
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

  // 3. Build conversation
  const messages: Message[] = [
    llmProvider.buildSystemPrompt("planner", {
      projectTitle: projectIdea?.title,
      phase: stack.phase,
      todoCount: todos?.length || 0,
      teamName: stack.participant_name,
    }),
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
      .map((t) => `- [${t.status}] ${t.content}`)
      .join("\n");
    messages.push({
      role: "user",
      content: `Current todos:\n${todoSummary}`,
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

  // Add user messages if any
  if (userMessages && userMessages.length > 0) {
    const userMessagesSummary = userMessages
      .map((msg: any) => {
        const timeAgo = Math.floor((Date.now() - msg.timestamp) / 60000);
        return `- From ${msg.sender_name} (${timeAgo}m ago): ${msg.content}`;
      })
      .join("\n");
    messages.push({
      role: "user",
      content: `User messages for the team:\n${userMessagesSummary}\n\nAnalyze these messages and decide if you need to:\n1. Create a todo for the Communicator to respond\n2. Incorporate feedback or suggestions into the project plan\n3. Adjust priorities based on user input`,
    });
  }

  // Add planning request
  messages.push({
    role: "user",
    content:
      hasWork.prompt ||
      "What should the team work on next? Create specific todos.",
  });

  // 4. Call LLM
  console.log(`[Planner] Calling LLM with ${messages.length} messages`);
  const response = await llmProvider.chat(messages, {
    temperature: 0.8,
    max_tokens: 1500,
  });

  // 5. Parse response and execute actions
  const parsed = llmProvider.parseAgentResponse(response.content, "planner");
  console.log(`[Planner] Parsed ${parsed.actions.length} actions`);

  // Execute todo creation actions
  for (const action of parsed.actions) {
    if (action.type === "create_todo") {
      await ctx.runMutation(internal.todos.internalCreate, {
        stack_id: stackId,
        content: action.content,
        status: "pending",
        assigned_by: "planner",
        priority: action.priority || 5,
      });
      console.log(`[Planner] Created todo: ${action.content}`);
    }
  }

  // Update planner memory
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: "planner",
    thought: response.content,
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
    thought: response.content,
    action: "planning",
    result: {
      todosCreated: parsed.actions.filter((a: any) => a.type === "create_todo")
        .length,
      hasWork: hasWork.hasWork,
      reason: hasWork.reason,
    },
  });

  return response.content;
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
