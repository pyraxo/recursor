import { Id } from "../../_generated/dataModel";
import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { llmProvider, Message } from "../llm-provider";

export async function executeReviewer(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<string> {
  console.log(`[Reviewer] Executing for stack ${stackId}`);

  // 1. Load context
  const [stack, todos, projectIdea, agentState, artifacts, recentTraces] = await Promise.all([
    ctx.runQuery(internal.agentExecution.getStackForExecution, { stackId }),
    ctx.runQuery(internal.agentExecution.getTodos, { stackId }),
    ctx.runQuery(internal.agentExecution.getProjectIdea, { stackId }),
    ctx.runQuery(internal.agentExecution.getAgentState, { stackId, agentType: 'reviewer' }),
    ctx.runQuery(internal.artifacts.getLatest, { stackId }),
    ctx.runQuery(internal.traces.getRecentForStack, { stackId, limit: 20 }),
  ]);

  if (!stack) {
    throw new Error(`Stack ${stackId} not found`);
  }

  // 2. Determine if review is needed
  const lastReviewTime = agentState?.memory?.last_review_time || 0;
  const timeSinceLastReview = Date.now() - lastReviewTime;

  // Count completed todos since last review
  const completedTodos = todos?.filter(t =>
    t.status === 'completed' &&
    (t.completed_at || 0) > lastReviewTime
  ) || [];

  // Check for new artifacts
  const hasNewArtifact = artifacts && artifacts.created_at > lastReviewTime;

  // Determine if review is needed
  const needsReview = completedTodos.length >= 2 ||
                     hasNewArtifact ||
                     timeSinceLastReview > 180000; // 3 minutes

  if (!needsReview) {
    console.log(`[Reviewer] No review needed yet`);
    return 'Reviewer idle: Waiting for more progress before review';
  }

  // 3. Build conversation
  const messages: Message[] = [
    llmProvider.buildSystemPrompt('reviewer', {
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

  // Add progress summary
  const completedCount = todos?.filter(t => t.status === 'completed').length || 0;
  const pendingCount = todos?.filter(t => t.status === 'pending').length || 0;
  const totalCount = todos?.length || 0;

  messages.push({
    role: 'user',
    content: `Progress Summary:
- Total todos: ${totalCount}
- Completed: ${completedCount}
- Pending: ${pendingCount}
- Recent completions: ${completedTodos.map(t => t.content).join(', ')}`,
  });

  // Add artifact info if available
  if (artifacts) {
    messages.push({
      role: 'user',
      content: `Latest artifact: Version ${artifacts.version}, created ${
        hasNewArtifact ? 'recently' : 'earlier'
      }`,
    });
  }

  // Add recent activity summary
  if (recentTraces && recentTraces.length > 0) {
    const activitySummary = recentTraces
      .slice(0, 5)
      .map(t => `${t.agent_type}: ${t.action}`)
      .join('\n');
    messages.push({
      role: 'user',
      content: `Recent activity:\n${activitySummary}`,
    });
  }

  // Request review
  messages.push({
    role: 'user',
    content: `Please review the team's progress and provide:
1. Assessment of current progress
2. What's working well
3. Areas for improvement
4. Specific recommendations for the planner (prefix with "RECOMMENDATION:")`,
  });

  // 4. Call LLM
  console.log(`[Reviewer] Calling LLM for review`);
  const response = await llmProvider.chat(messages, {
    temperature: 0.7,
    max_tokens: 1500,
  });

  // 5. Parse response and extract recommendations
  const parsed = llmProvider.parseAgentResponse(response.content, 'reviewer');

  // Extract recommendations for planner
  const recommendations: string[] = [];
  const lines = response.content.split('\n');
  for (const line of lines) {
    if (line.toUpperCase().includes('RECOMMENDATION:')) {
      const recommendation = line.replace(/RECOMMENDATION:/i, '').trim();
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }
  }

  // Also include parsed recommendations
  if (parsed.recommendations) {
    recommendations.push(...parsed.recommendations);
  }

  // 6. Store recommendations for planner
  if (recommendations.length > 0) {
    const updatedMemory = {
      ...(agentState?.memory || {}),
      last_review_time: Date.now(),
      recommendations: recommendations.slice(0, 5), // Keep top 5
    };

    // Store in reviewer's memory
    await ctx.runMutation(internal.agents.updateAgentMemory, {
      stackId,
      agentType: 'reviewer',
      memory: updatedMemory,
    });

    // Also update planner's state to signal recommendations
    const plannerState = await ctx.runQuery(internal.agentExecution.getAgentState, {
      stackId,
      agentType: 'planner',
    });

    if (plannerState) {
      await ctx.runMutation(internal.agents.updateAgentMemory, {
        stackId,
        agentType: 'planner',
        memory: {
          ...(plannerState.memory || {}),
          reviewer_recommendations: recommendations,
          recommendations_timestamp: Date.now(),
        },
      });
    }

    console.log(`[Reviewer] Stored ${recommendations.length} recommendations`);
  } else {
    // Just update review time
    const updatedMemory = {
      ...(agentState?.memory || {}),
      last_review_time: Date.now(),
    };
    await ctx.runMutation(internal.agents.updateAgentMemory, {
      stackId,
      agentType: 'reviewer',
      memory: updatedMemory,
    });
  }

  // 7. Update reviewer memory with thought
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: 'reviewer',
    thought: response.content,
  });

  // 8. Log trace
  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: 'reviewer',
    thought: response.content,
    action: 'review',
    result: {
      completedReviewed: completedTodos.length,
      recommendationsCount: recommendations.length,
      hasNewArtifact,
    },
  });

  return response.content;
}