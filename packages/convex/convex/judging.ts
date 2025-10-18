import { v } from "convex/values";
import { action, mutation, query, internalQuery, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ActionCtx } from "./_generated/server";
import { llmProvider, Message } from "./lib/llmProvider";

export const getLatestJudgment = query({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const judgment = await ctx.db
      .query("judgments")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .first();

    return judgment;
  },
});

export const getLatestJudgmentInternal = internalQuery({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx, args) => {
    const judgment = await ctx.db
      .query("judgments")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .first();

    return judgment;
  },
});

export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const judgments = await ctx.db
      .query("judgments")
      .withIndex("by_time")
      .order("desc")
      .collect();

    const stackIdToJudgment = new Map();
    for (const judgment of judgments) {
      if (!stackIdToJudgment.has(judgment.stack_id)) {
        stackIdToJudgment.set(judgment.stack_id, judgment);
      }
    }

    const stacks = await ctx.db.query("agent_stacks").collect();
    const leaderboard = [];

    for (const stack of stacks) {
      const judgment = stackIdToJudgment.get(stack._id);
      if (judgment) {
        leaderboard.push({
          stack_id: stack._id,
          name: stack.participant_name,
          technical_merit: judgment.technical_merit,
          polish: judgment.polish,
          execution: judgment.execution,
          wow_factor: judgment.wow_factor,
          total_score: judgment.total_score,
          judged_at: judgment.judged_at,
        });
      }
    }

    leaderboard.sort((a, b) => b.total_score - a.total_score);

    return leaderboard;
  },
});

export const createJudgmentInternal = internalMutation({
  args: {
    stack_id: v.id("agent_stacks"),
    technical_merit: v.number(),
    polish: v.number(),
    execution: v.number(),
    wow_factor: v.number(),
    total_score: v.number(),
    feedback: v.object({
      technical_merit_notes: v.string(),
      polish_notes: v.string(),
      execution_notes: v.string(),
      wow_factor_notes: v.string(),
      overall_assessment: v.string(),
    }),
    artifact_version_judged: v.number(),
    judged_at: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("judgments", args);
  },
});

async function executeJudgeLogic(ctx: ActionCtx, stackId: Id<"agent_stacks">): Promise<{ total_score: number; message: string }> {
  console.log(`[Judge] Executing for stack ${stackId}`);

  const [stack, projectIdea, artifacts, todos] = await Promise.all([
    ctx.runQuery(internal.agentExecution.getStackForExecution, { stackId }),
    ctx.runQuery(internal.agentExecution.getProjectIdea, { stackId }),
    ctx.runQuery(internal.artifacts.internalGetLatest, { stackId }),
    ctx.runQuery(internal.todos.internalList, { stackId }),
  ]);

  if (!stack) {
    throw new Error(`Stack ${stackId} not found`);
  }

  if (!artifacts) {
    console.log(`[Judge] No artifact to judge for ${stack.participant_name}`);
    return {
      total_score: 0,
      message: "No artifact to judge yet",
    };
  }

  const lastJudgment = await ctx.runQuery(internal.judging.getLatestJudgmentInternal, {
    stackId,
  });

  if (lastJudgment && lastJudgment.artifact_version_judged === artifacts.version) {
    console.log(`[Judge] Artifact v${artifacts.version} already judged`);
    return {
      total_score: lastJudgment.total_score,
      message: "Already judged this version",
    };
  }

  console.log(`[Judge] Judging ${stack.participant_name} - artifact v${artifacts.version}`);

  const completedTodos = todos?.filter((t: any) => t.status === "completed") || [];
  const totalTodos = todos?.length || 0;

  const messages: Message[] = [
    {
      role: "system",
      content: `You are a judge for the Cursor AI Hackathon. You will evaluate team submissions based on 4 criteria:

**Technical Merit (1-10)**: Quality of code, architecture, and implementation
- Is the code well-structured and maintainable?
- Are best practices followed?
- Is the technical implementation sound?

**Polish (1-10)**: Attention to detail, UX, and overall execution quality
- Is the UI/UX polished and professional?
- Are there attention to details?
- Is the overall presentation high-quality?

**Execution (1-10)**: How well the team delivered on their vision
- Does the project work as intended?
- Is the project complete or mostly complete?
- Did they execute their vision well?

**Wow Factor (1-10)**: How memorable and impressive the hack is
- Is it innovative and creative?
- Does it stand out?
- Would it impress judges and viewers?

You must respond with ONLY a valid JSON object in this exact format:
{
  "technical_merit": <score 1-10>,
  "technical_merit_notes": "<brief explanation>",
  "polish": <score 1-10>,
  "polish_notes": "<brief explanation>",
  "execution": <score 1-10>,
  "execution_notes": "<brief explanation>",
  "wow_factor": <score 1-10>,
  "wow_factor_notes": "<brief explanation>",
  "overall_assessment": "<2-3 sentence overall assessment>"
}

Be fair but constructive. Consider this is a hackathon with limited time. Focus on what they achieved.`,
    },
    {
      role: "user",
      content: `Evaluate this team submission:

**Team**: ${stack.participant_name}
**Project**: ${projectIdea?.title || "Unknown"}
**Description**: ${projectIdea?.description || "No description"}
**Phase**: ${stack.phase}
**Progress**: ${completedTodos.length}/${totalTodos} todos completed

**Artifact Code** (version ${artifacts.version}):
\`\`\`html
${artifacts.content?.substring(0, 8000) || "No content"}
\`\`\`

${artifacts.metadata?.description ? `**Artifact Description**: ${artifacts.metadata.description}` : ""}
${artifacts.metadata?.tech_stack ? `**Tech Stack**: ${artifacts.metadata.tech_stack.join(", ")}` : ""}

Provide your judgment as JSON only.`,
    },
  ];

  console.log(`[Judge] Calling LLM for judgment`);
  const response = await llmProvider.chat(messages, {
    temperature: 0.7,
    max_tokens: 1000,
  });

  let judgment;
  try {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    judgment = JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error(`[Judge] Failed to parse LLM response:`, error);
    judgment = {
      technical_merit: 5,
      technical_merit_notes: "Failed to parse judgment",
      polish: 5,
      polish_notes: "Failed to parse judgment",
      execution: 5,
      execution_notes: "Failed to parse judgment",
      wow_factor: 5,
      wow_factor_notes: "Failed to parse judgment",
      overall_assessment: "Judgment parsing failed",
    };
  }

  const total_score =
    (judgment.technical_merit || 0) +
    (judgment.polish || 0) +
    (judgment.execution || 0) +
    (judgment.wow_factor || 0);

  await ctx.runMutation(internal.judging.createJudgmentInternal, {
    stack_id: stackId,
    technical_merit: judgment.technical_merit || 0,
    polish: judgment.polish || 0,
    execution: judgment.execution || 0,
    wow_factor: judgment.wow_factor || 0,
    total_score,
    feedback: {
      technical_merit_notes: judgment.technical_merit_notes || "",
      polish_notes: judgment.polish_notes || "",
      execution_notes: judgment.execution_notes || "",
      wow_factor_notes: judgment.wow_factor_notes || "",
      overall_assessment: judgment.overall_assessment || "",
    },
    artifact_version_judged: artifacts.version,
    judged_at: Date.now(),
  });

  await ctx.runMutation(internal.traces.internalLog, {
    stack_id: stackId,
    agent_type: "judge",
    thought: `Judged ${stack.participant_name}`,
    action: "judge_team",
    result: {
      total_score,
      technical_merit: judgment.technical_merit,
      polish: judgment.polish,
      execution: judgment.execution,
      wow_factor: judgment.wow_factor,
    },
  });

  console.log(`[Judge] ${stack.participant_name} scored ${total_score}/40`);

  return {
    total_score,
    message: `Judged successfully`,
  };
}

export const executeJudge = action({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx: ActionCtx, args) => {
    return await executeJudgeLogic(ctx, args.stackId);
  },
});

export const executeJudgeInternal = internalAction({
  args: {
    stackId: v.id("agent_stacks"),
  },
  handler: async (ctx: ActionCtx, args) => {
    return await executeJudgeLogic(ctx, args.stackId);
  },
});

async function executeAllJudgesLogic(ctx: ActionCtx): Promise<Array<{ stackId: any; name: string; total_score?: number; message?: string; error?: string }>> {
  console.log(`[Judge] Executing batch judgment for all teams`);

  const stacks = await ctx.runQuery(internal.agents.internalListStacks, {});

  const results = [];
  for (const stack of stacks) {
    try {
      const result = await executeJudgeLogic(ctx, stack._id);
      results.push({
        stackId: stack._id,
        name: stack.participant_name,
        ...result,
      });
    } catch (error) {
      console.error(`[Judge] Failed to judge ${stack.participant_name}:`, error);
      results.push({
        stackId: stack._id,
        name: stack.participant_name,
        error: String(error),
      });
    }
  }

  console.log(`[Judge] Batch judgment complete: ${results.length} teams judged`);
  return results;
}

export const executeAllJudges = action({
  args: {},
  handler: async (ctx: ActionCtx) => {
    return await executeAllJudgesLogic(ctx);
  },
});

export const executeAllJudgesScheduled = internalAction({
  args: {},
  handler: async (ctx: ActionCtx) => {
    return await executeAllJudgesLogic(ctx);
  },
});
