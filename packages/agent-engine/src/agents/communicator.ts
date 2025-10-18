import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { LLMProviders } from "../config";
import { BaseAgent } from "./base-agent";

/**
 * CommunicatorAgent - Delegates to Convex backend for execution
 *
 * This class is a thin wrapper around the Convex executeCommunicator implementation.
 * All communicator logic is executed in the Convex backend to ensure consistency
 * across different execution contexts (CLI, cron jobs, dashboard).
 */
export class CommunicatorAgent extends BaseAgent {
  constructor(
    stackId: Id<"agent_stacks">,
    llm: LLMProviders,
    convexUrl: string
  ) {
    super(stackId, "communicator", llm, convexUrl);
  }

  /**
   * Execute communicator logic by calling Convex backend
   * This ensures the same logic is used everywhere
   */
  async think(): Promise<string> {
    try {
      // Call the Convex backend to execute the communicator
      const result = await this.client.action(api.agentExecution.runCommunicator, {
        stackId: this.stackId,
      });

      // Log the execution locally for debugging
      await this.logTrace(
        `Communicator executed: ${result.substring(0, 100)}...`,
        "communicator_delegated",
        { resultLength: result.length }
      );

      return result;
    } catch (error) {
      const errorMsg = `Communicator execution failed: ${error}`;
      await this.logTrace(errorMsg, "communicator_error", {
        error: String(error)
      });
      return errorMsg;
    }
  }
}
