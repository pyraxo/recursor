import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { LLMProviders } from "../config";
import { BaseAgent } from "./base-agent";

/**
 * PlannerAgent - Delegates to Convex backend for execution
 *
 * This class is a thin wrapper around the Convex executePlanner implementation.
 * All planner logic is executed in the Convex backend to ensure consistency
 * across different execution contexts (CLI, cron jobs, dashboard).
 */
export class PlannerAgent extends BaseAgent {
  constructor(
    stackId: Id<"agent_stacks">,
    llm: LLMProviders,
    convexUrl: string
  ) {
    super(stackId, "planner", llm, convexUrl);
  }

  /**
   * Execute planner logic by calling Convex backend
   * This ensures the same logic is used everywhere
   */
  async think(): Promise<string> {
    try {
      // Call the Convex backend to execute the planner
      const result = await this.client.action(api.agentExecution.runPlanner, {
        stackId: this.stackId,
      });

      // Log the execution locally for debugging
      await this.logTrace(
        `Planner executed: ${result.substring(0, 100)}...`,
        "planner_delegated",
        { resultLength: result.length }
      );

      return result;
    } catch (error) {
      const errorMsg = `Planner execution failed: ${error}`;
      await this.logTrace(errorMsg, "planner_error", {
        error: String(error)
      });
      return errorMsg;
    }
  }
}
