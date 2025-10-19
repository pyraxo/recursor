import { v } from "convex/values";
import { action, query, internalQuery, internalMutation, internalAction } from "./_generated/server";
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

export const getJudgmentHistoryInternal = internalQuery({
  args: {
    stackId: v.id("agent_stacks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10; // Default to last 10 judgments
    const judgments = await ctx.db
      .query("judgments")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .take(limit);

    return judgments;
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

export const getAllJudgmentHistory = query({
  args: {},
  handler: async (ctx) => {
    // Get all judgments ordered by time (oldest first for chart display)
    const judgments = await ctx.db
      .query("judgments")
      .withIndex("by_time")
      .order("asc")
      .collect();

    const stacks = await ctx.db.query("agent_stacks").collect();
    const stackIdToName = new Map(stacks.map((s) => [s._id, s.participant_name]));

    // Transform to include team name
    return judgments.map((j) => ({
      stack_id: j.stack_id,
      team_name: stackIdToName.get(j.stack_id) || "Unknown",
      technical_merit: j.technical_merit,
      polish: j.polish,
      execution: j.execution,
      wow_factor: j.wow_factor,
      total_score: j.total_score,
      judged_at: j.judged_at,
      artifact_version: j.artifact_version_judged,
    }));
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

  const [stack, projectIdea, artifacts, todos, previousJudgments] = await Promise.all([
    ctx.runQuery(internal.agentExecution.getStackForExecution, { stackId }),
    ctx.runQuery(internal.agentExecution.getProjectIdea, { stackId }),
    ctx.runQuery(internal.artifacts.internalGetLatest, { stackId }),
    ctx.runQuery(internal.todos.internalList, { stackId }),
    ctx.runQuery(internal.judging.getJudgmentHistoryInternal, { stackId, limit: 5 }), // Get last 5 judgments for context
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

  const completedTodos = todos?.filter((t) => t.status === "completed") || [];
  const totalTodos = todos?.length || 0;

  // Build previous scores context
  let previousScoresContext = "";
  if (previousJudgments && previousJudgments.length > 0) {
    previousScoresContext = `\n\n**Previous Judgments for this Team** (for reference - track actual progress, not linear growth):
${previousJudgments.map((j, idx) => {
  const timeAgo = Math.round((Date.now() - j.judged_at) / 60000); // minutes ago
  return `${idx + 1}. ${timeAgo}min ago (v${j.artifact_version_judged}): Total=${j.total_score}/40 (Tech=${j.technical_merit}, Polish=${j.polish}, Exec=${j.execution}, Wow=${j.wow_factor})`;
}).join("\n")}

Compare this submission to their previous work. Scores should reflect ACTUAL PROGRESS - they may improve, stay flat, or even decrease if they introduced bugs or took a step back. Don't assume linear improvement.`;
  }

  const messages: Message[] = [
    {
      role: "system",
      content: `You are an OBJECTIVE and IMPARTIAL judge for the Cursor AI Hackathon. Your role is to critically evaluate each project using the FULL 1-10 scoring scale.

CRITICAL JUDGING PRINCIPLES:
- USE THE FULL 1-10 SCALE - Don't cluster everything around 5
- Be DISCRIMINATING: Poor work gets low scores (1-4), great work gets high scores (7-10)
- Evaluate what the code PRODUCES when rendered, not just the code itself
- Consider the VISUAL OUTPUT: What does this look like in a browser?
- Consider the UX: Is it intuitive, responsive, and well-designed?
- Use the README/Description as the PITCH - does the execution match the vision?
- Scores should reflect ACTUAL QUALITY differences between teams

SCORING SCALE (use the FULL range):
- **1-2**: Broken/minimal - doesn't work, barely started, no real functionality
- **3-4**: Below average - works partially but has major gaps, poor UX, looks unfinished
- **5-6**: Average/decent - works as expected, basic functionality, acceptable UX
- **7-8**: Above average/good - well executed, polished, goes beyond basics, good UX
- **9-10**: Excellent/outstanding - impressive quality, production-level polish, exceptional UX

DO NOT assume all projects are average. Evaluate objectively and use scores that reflect real quality differences.

Evaluate teams based on 4 criteria:

**Technical Merit (1-10)**: Quality of code, architecture, and implementation
- Is the code well-structured and functional?
- Does it actually work when rendered?
- Is the technical implementation sound?
- What does the code PRODUCE visually?

**Polish (1-10)**: Visual design, UX, and attention to detail
- What does this LOOK LIKE when rendered in a browser?
- Is the UI polished, professional, and visually appealing?
- Is the UX intuitive and well-designed?
- Are there nice touches and attention to details?
- Does it feel finished or half-baked?

**Execution (1-10)**: How well the team delivered on their vision
- Read the Description/README as their PITCH - did they deliver on it?
- Does the project work as intended?
- Is it complete or mostly complete?
- Does the visual output match what they promised?

**Wow Factor (1-10)**: How memorable and impressive the hack is
- Is it innovative and creative?
- Does it stand out visually or functionally?
- Would it impress judges and viewers?
- Is there a "wow" moment when you see it rendered?

You must respond with ONLY a valid JSON object in this exact format:
{
  "technical_merit": <score 1-10>,
  "technical_merit_notes": "<brief explanation>",
  "polish": <score 1-10>,
  "polish_notes": "<brief explanation based on VISUAL OUTPUT and UX>",
  "execution": <score 1-10>,
  "execution_notes": "<brief explanation comparing to their pitch>",
  "wow_factor": <score 1-10>,
  "wow_factor_notes": "<brief explanation>",
  "overall_assessment": "<2-3 sentence overall assessment of the rendered output and UX>"
}

Be honest, critical, and use the full scoring range. Great work deserves high scores. Poor work deserves low scores. Don't give everything a 5.`,
    },
    {
      role: "user",
      content: `Evaluate this team submission:

**Team**: ${stack.participant_name}
**Project**: ${projectIdea?.title || "Unknown"}
**Description/Pitch**: ${projectIdea?.description || "No description"}
**Phase**: ${stack.phase}
**Progress**: ${completedTodos.length}/${totalTodos} todos completed
${previousScoresContext}

**Artifact Code** (version ${artifacts.version}):
\`\`\`html
${artifacts.content?.substring(0, 8000) || "No content"}
\`\`\`

${artifacts.metadata?.description ? `**Artifact Description**: ${artifacts.metadata.description}` : ""}
${artifacts.metadata?.tech_stack ? `**Tech Stack**: ${artifacts.metadata.tech_stack.join(", ")}` : ""}

IMPORTANT:
- Read the HTML/CSS/JavaScript and VISUALIZE what it will look like when rendered in a browser
- Evaluate the VISUAL OUTPUT, not just the code quality
- Consider the UX when someone actually uses this application
- Compare the rendered result to their pitch/description
- Use the FULL 1-10 scale - be discriminating between poor, average, and excellent work

Provide your OBJECTIVE judgment as JSON only.`,
    },
  ];

  console.log(`[Judge] Calling LLM for judgment`);

  // Define the judgment schema for structured output
  const judgmentSchema = {
    type: "object",
    properties: {
      technical_merit: { type: "number", minimum: 1, maximum: 10 },
      technical_merit_notes: { type: "string" },
      polish: { type: "number", minimum: 1, maximum: 10 },
      polish_notes: { type: "string" },
      execution: { type: "number", minimum: 1, maximum: 10 },
      execution_notes: { type: "string" },
      wow_factor: { type: "number", minimum: 1, maximum: 10 },
      wow_factor_notes: { type: "string" },
      overall_assessment: { type: "string" },
    },
    required: [
      "technical_merit",
      "technical_merit_notes",
      "polish",
      "polish_notes",
      "execution",
      "execution_notes",
      "wow_factor",
      "wow_factor_notes",
      "overall_assessment",
    ],
    additionalProperties: false,
  };

  const response = await llmProvider.chat(messages, {
    temperature: 0.7,
    max_tokens: 1000,
    structured: true,
    schema: judgmentSchema,
  });

  let judgment;
  try {
    // With structured output, the response should already be valid JSON
    judgment = JSON.parse(response.content);
  } catch (error) {
    console.error(`[Judge] Failed to parse LLM response:`, error);
    console.error(`[Judge] Response content:`, response.content?.substring(0, 500));
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

async function executeAllJudgesLogic(ctx: ActionCtx): Promise<Array<{ stackId: Id<"agent_stacks">; name: string; total_score?: number; message?: string; error?: string }>> {
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
