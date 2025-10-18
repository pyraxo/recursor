import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { LLMProviders } from "../config";
import { BaseAgent } from "./base-agent";

/**
 * BuilderAgent - Delegates to Convex backend for execution
 *
 * This class is a thin wrapper around the Convex executeBuilder implementation.
 * All builder logic is executed in the Convex backend to ensure consistency
 * across different execution contexts (CLI, cron jobs, dashboard).
 */
export class BuilderAgent extends BaseAgent {
  constructor(
    stackId: Id<"agent_stacks">,
    llm: LLMProviders,
    convexUrl: string
  ) {
    super(stackId, "builder", llm, convexUrl);
  }

  /**
   * Execute builder logic by calling Convex backend
   * This ensures the same logic is used everywhere
   */
  async think(): Promise<string> {
    try {
      // Call the Convex backend to execute the builder
      const result = await this.client.action(api.agentExecution.runBuilder, {
        stackId: this.stackId,
      });

      // Log the execution locally for debugging
      await this.logTrace(
        result.substring(0, 100) + "...",
        "builder_delegated",
        { resultLength: result.length }
      );

      return result;
    } catch (error) {
      const errorMsg = `Builder execution failed: ${error}`;
      await this.logTrace(errorMsg, "builder_error", {
        error: String(error)
      });
      return errorMsg;
    }
  }
}
