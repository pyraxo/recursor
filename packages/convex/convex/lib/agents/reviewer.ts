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
    `[Reviewer] Reviewing artifact version ${artifacts.version} (${artifacts.content?.length || 0} chars)`
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
    content: `Audit this hackathon project (version ${artifacts.version}):

\`\`\`html
${artifacts.content}
\`\`\`

Focus on these hackathon-critical questions:
1. **Implementation Quality**: Is this good enough to demo and pass? Does the core functionality work?
2. **Time Management**: Can they achieve their goals before the hackathon ends? Are they on track?
3. **Builder Audit**: Is the builder making progress or stuck? Any blockers preventing functionality?
4. **Strategic Direction**: Any scope cuts or pivots needed to finish in time?

For each issue found, provide:
- Clear description of the problem (focus on blockers, time concerns, strategic issues)
- Severity: CRITICAL (blocks demo/functionality), MAJOR (risks timeline), or MINOR (nice-to-have)
- RECOMMENDATION: Specific actionable guidance for the planner

This is a HACKATHON - don't worry about code quality, security, or best practices. Focus on: Will this work? Can we finish? What's blocking us?`,
  });

  // 4. Call LLM with structured output
  console.log(`[Reviewer] Calling LLM for hackathon audit with ${messages.length} messages`);
  const response = await llmProvider.chat(messages, {
    temperature: 0.3, // Lower temperature for more focused assessment
    max_tokens: 8000, // Increased for comprehensive audit
    structured: true,
    schema: llmProvider.getSchema("reviewer"),
  });

  // 5. Parse JSON response (structured output guarantees valid JSON)
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
    console.error(`[Reviewer] Failed to parse structured JSON response:`, error);
    console.error(`[Reviewer] Response:`, response.content.substring(0, 1000));
    throw new Error(`Reviewer received invalid JSON from LLM provider: ${error}`);
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

  // 6. Store audit results and recommendations for planner
  const updatedMemory = {
    ...(agentState?.memory || {}),
    last_review_time: Date.now(),
    last_reviewed_version: artifacts.version,
    last_review_issues_count: issues.length,
    recommendations: recommendations.slice(0, 10), // Keep top 10 recommendations
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
          recommendations_type: "hackathon_audit",
        },
      });
    }

    console.log(
      `[Reviewer] Stored ${recommendations.length} hackathon audit recommendations for planner`
    );
  } else {
    console.log(`[Reviewer] No issues found - implementation looks good for hackathon!`);
  }

  // 7. Update reviewer memory with thinking only
  await ctx.runMutation(internal.agentExecution.updateAgentMemory, {
    stackId,
    agentType: "reviewer",
    thought: parsed.thinking || "Hackathon audit complete",
  });

  // 8. Log trace with thinking only
  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: "reviewer",
    thought: parsed.thinking.substring(0, 1000), // Limit thought length in trace
    action: "hackathon_audit",
    result: {
      artifactVersion: artifacts.version,
      issuesFound: issues.length,
      criticalIssues: issues.filter((i) => i.severity === "critical").length,
      majorIssues: issues.filter((i) => i.severity === "major").length,
      minorIssues: issues.filter((i) => i.severity === "minor").length,
      recommendationsCount: recommendations.length,
    },
  });

  return parsed.thinking || "Hackathon audit complete";
}
