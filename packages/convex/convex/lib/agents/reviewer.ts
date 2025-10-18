import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";
import { ActionCtx } from "../../_generated/server";
import { llmProvider, Message } from "../llmProvider";

export async function executeReviewer(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<string> {
  console.log(`[Reviewer] Executing for stack ${stackId}`);

  // 1. Load context
  const [stack, projectIdea, agentState, artifacts] = await Promise.all([
    ctx.runQuery(internal.agentExecution.getStackForExecution, { stackId }),
    ctx.runQuery(internal.agentExecution.getProjectIdea, { stackId }),
    ctx.runQuery(internal.agentExecution.getAgentState, {
      stackId,
      agentType: "reviewer",
    }),
    ctx.runQuery(internal.artifacts.internalGetLatest, { stackId }),
  ]);

  if (!stack) {
    throw new Error(`Stack ${stackId} not found`);
  }

  // 2. Determine if code review is needed
  const lastReviewTime = agentState?.memory?.last_review_time || 0;
  const lastReviewedVersion = agentState?.memory?.last_reviewed_version || 0;

  // Check if there's a new artifact to review
  const hasNewArtifact =
    artifacts &&
    artifacts.created_at > lastReviewTime &&
    artifacts.version > lastReviewedVersion;

  // Only review if there's a new artifact
  if (!hasNewArtifact || !artifacts) {
    console.log(`[Reviewer] No new artifact to review`);
    return "Reviewer idle: Waiting for new artifact from builder";
  }

  console.log(
    `[Reviewer] Reviewing artifact version ${artifacts.version} (${artifacts.content.length} chars)`
  );

  // 3. Build conversation for code review with structured output
  const messages: Message[] = [
    llmProvider.buildSystemPrompt("reviewer", {
      projectTitle: projectIdea?.title,
      phase: stack.phase,
      todoCount: 0, // Not relevant for code review
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

  // Add the artifact code for review
  messages.push({
    role: "user",
    content: `Please review this code artifact (version ${artifacts.version}):

\`\`\`html
${artifacts.content}
\`\`\`

Review this code for:
1. Bugs and logic errors
2. Security vulnerabilities
3. Code quality and best practices
4. Accessibility issues
5. Performance problems
6. Maintainability concerns

For each issue found, provide:
- Clear description of the problem
- Severity: CRITICAL, MAJOR, or MINOR
- RECOMMENDATION: Specific actionable fix for the planner

Be thorough and constructive.`,
  });

  // 4. Call LLM with JSON mode
  console.log(`[Reviewer] Calling LLM for code review with ${messages.length} messages`);
  const response = await llmProvider.chat(messages, {
    temperature: 0.3, // Lower temperature for more focused code review
    max_tokens: 2000, // More tokens for detailed code review
    json_mode: true, // Request JSON output
  });

  // 5. Parse JSON response
  console.log(`[Reviewer] LLM Response (first 500 chars):\n${response.content.substring(0, 500)}`);

  let parsed: {
    thinking: string;
    results: {
      recommendations: string[];
      issues: { severity: string; description: string }[]
    }
  };
  try {
    const parsedJson = JSON.parse(response.content);
    parsed = {
      thinking: parsedJson.thinking || "",
      results: parsedJson.results || { recommendations: [], issues: [] }
    };
    console.log(`[Reviewer] Parsed JSON with ${parsed.results.issues.length} issues and ${parsed.results.recommendations.length} recommendations`);
    console.log(`[Reviewer] Thinking: ${parsed.thinking.substring(0, 200)}...`);
  } catch (error) {
    console.error(`[Reviewer] Failed to parse JSON response:`, error);
    console.error(`[Reviewer] Response:`, response.content);
    // Fallback to empty results
    parsed = { thinking: response.content.substring(0, 1000), results: { recommendations: [], issues: [] } };
  }

  const recommendations = parsed.results.recommendations || [];
  const issues = parsed.results.issues || [];

  console.log(
    `[Reviewer] Found ${issues.length} issues (${
      issues.filter((i) => i.severity === "critical").length
    } critical, ${
      issues.filter((i) => i.severity === "major").length
    } major, ${issues.filter((i) => i.severity === "minor").length} minor)`
  );

  // 6. Store code review results and recommendations for planner
  const updatedMemory = {
    ...(agentState?.memory || {}),
    last_review_time: Date.now(),
    last_reviewed_version: artifacts.version,
    last_review_issues_count: issues.length,
    recommendations: recommendations.slice(0, 10), // Keep top 10 for code issues
  };

  // Store in reviewer's memory
  await ctx.runMutation(internal.agents.updateAgentMemory, {
    stackId,
    agentType: "reviewer",
    memory: updatedMemory,
  });

  // If there are recommendations, update planner's state
  if (recommendations.length > 0) {
    const plannerState = await ctx.runQuery(
      internal.agentExecution.getAgentState,
      {
        stackId,
        agentType: "planner",
      }
    );

    if (plannerState) {
      await ctx.runMutation(internal.agents.updateAgentMemory, {
        stackId,
        agentType: "planner",
        memory: {
          ...(plannerState.memory || {}),
          reviewer_recommendations: recommendations,
          recommendations_timestamp: Date.now(),
          recommendations_type: "code_review",
        },
      });
    }

    console.log(
      `[Reviewer] Stored ${recommendations.length} code review recommendations for planner`
    );
  } else {
    console.log(`[Reviewer] No issues found - code looks good!`);
  }

  // 7. Update reviewer memory with thinking only
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: "reviewer",
    thought: parsed.thinking || "Code review complete",
  });

  // 8. Log trace with thinking only
  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: "reviewer",
    thought: parsed.thinking.substring(0, 1000), // Limit thought length in trace
    action: "code_review",
    result: {
      artifactVersion: artifacts.version,
      issuesFound: issues.length,
      criticalIssues: issues.filter((i) => i.severity === "critical").length,
      majorIssues: issues.filter((i) => i.severity === "major").length,
      minorIssues: issues.filter((i) => i.severity === "minor").length,
      recommendationsCount: recommendations.length,
    },
  });

  return parsed.thinking || "Code review complete";
}
