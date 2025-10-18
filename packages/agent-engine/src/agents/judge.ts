import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { LLMProviders } from "../config";
import { BaseAgent } from "./base-agent";

export class JudgeAgent extends BaseAgent {
  constructor(
    stackId: Id<"agent_stacks">,
    llm: LLMProviders,
    convexUrl: string
  ) {
    super(stackId, "judge", llm, convexUrl);
  }

  async think(): Promise<string> {
    try {
      const result = await this.client.action(api.judging.executeJudge, {
        stackId: this.stackId,
      });

      await this.logTrace(
        `Scored ${result.total_score}/40`,
        "judge_delegated",
        { total_score: result.total_score }
      );

      return `Judged team with total score: ${result.total_score}/40`;
    } catch (error) {
      const errorMsg = `Judge execution failed: ${error}`;
      await this.logTrace(errorMsg, "judge_error", {
        error: String(error)
      });
      return errorMsg;
    }
  }
}

