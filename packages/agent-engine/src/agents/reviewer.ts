import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { LLMProviders } from "../config";
import { BaseAgent } from "./base-agent";

/**
 * ReviewerAgent - Delegates to Convex backend for execution
 *
 * This class is a thin wrapper around the Convex executeReviewer implementation.
 * All reviewer logic is executed in the Convex backend to ensure consistency
 * across different execution contexts (CLI, cron jobs, dashboard).
 */
export class ReviewerAgent extends BaseAgent {
  constructor(
    stackId: Id<"agent_stacks">,
    llm: LLMProviders,
    convexUrl: string
  ) {
    super(stackId, "reviewer", llm, convexUrl);
  }

  /**
   * Execute reviewer logic by calling Convex backend
   * This ensures the same logic is used everywhere
   */
  async think(): Promise<string> {
    try {
      // Call the Convex backend to execute the reviewer
      const result = await this.client.action(api.agentExecution.runReviewer, {
        stackId: this.stackId,
      });

      // Log the execution locally for debugging
      await this.logTrace(
        result.substring(0, 100) + "...",
        "reviewer_delegated",
        { resultLength: result.length }
      );

      return result;
    } catch (error) {
      const errorMsg = `Reviewer execution failed: ${error}`;
      await this.logTrace(errorMsg, "reviewer_error", {
        error: String(error)
      });
      return errorMsg;
    }
  }
}
