/**
 * Orchestrator Factory Pattern
 *
 * Dynamically creates the appropriate orchestrator based on team type:
 * - Standard teams: AgentStackOrchestrator (4-agent system)
 * - Cursor teams: CursorTeamOrchestrator (single background agent)
 *
 * Usage:
 * ```typescript
 * const orchestrator = await OrchestratorFactory.create(stackId, llm, convexUrl);
 * await orchestrator.initialize();
 * await orchestrator.runContinuous();
 * ```
 *
 * @module orchestrator-factory
 */

import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { ConvexClient } from "convex/browser";
import { AgentStackOrchestrator } from "./orchestrator";
import { CursorTeamOrchestrator } from "./cursor/cursor-team-orchestrator";
import { LLMProviders } from "./config";
import type { IOrchestrator } from "./types";

/**
 * Factory for creating orchestrators based on team type
 */
export class OrchestratorFactory {
  /**
   * Create an orchestrator for the specified agent stack
   *
   * @param stackId - Agent stack ID
   * @param llm - LLM provider configuration
   * @param convexUrl - Convex deployment URL
   * @returns The appropriate orchestrator instance
   * @throws {Error} If stack is not found or team type is invalid
   */
  static async create(
    stackId: Id<"agent_stacks">,
    llm: LLMProviders,
    convexUrl: string
  ): Promise<IOrchestrator> {
    // Query the stack to determine team type
    const client = new ConvexClient(convexUrl);
    const stack = await client.query(api.agents.getStack, { stackId });

    if (!stack) {
      throw new Error(`Agent stack ${stackId} not found`);
    }

    const teamType = stack.team_type || "standard";

    switch (teamType) {
      case "standard":
        console.log(
          `[OrchestratorFactory] Creating standard 4-agent orchestrator for ${stack.participant_name}`
        );
        return new AgentStackOrchestrator(stackId, llm, convexUrl);

      case "cursor": {
        console.log(
          `[OrchestratorFactory] Creating Cursor Background Agent orchestrator for ${stack.participant_name}`
        );

        // Validate cursor configuration
        const cursorApiKey = process.env.CURSOR_API_KEY;
        if (!cursorApiKey) {
          throw new Error(
            "CURSOR_API_KEY environment variable is required for cursor teams"
          );
        }

        const githubToken = process.env.GITHUB_TOKEN;
        if (!githubToken) {
          throw new Error(
            "GITHUB_TOKEN environment variable is required for cursor teams"
          );
        }

        return new CursorTeamOrchestrator(
          stackId,
          cursorApiKey,
          githubToken,
          convexUrl
        );
      }

      default:
        throw new Error(`Unknown team type: ${teamType}`);
    }
  }

  /**
   * Determine if a stack requires cursor-specific environment variables
   *
   * @param stackId - Agent stack ID
   * @param convexUrl - Convex deployment URL
   * @returns True if the stack is a cursor team
   */
  static async isCursorTeam(
    stackId: Id<"agent_stacks">,
    convexUrl: string
  ): Promise<boolean> {
    const client = new ConvexClient(convexUrl);
    const stack = await client.query(api.agents.getStack, { stackId });
    return stack?.team_type === "cursor";
  }

  /**
   * Get team type for a stack
   *
   * @param stackId - Agent stack ID
   * @param convexUrl - Convex deployment URL
   * @returns The team type or null if not found
   */
  static async getTeamType(
    stackId: Id<"agent_stacks">,
    convexUrl: string
  ): Promise<"standard" | "cursor" | null> {
    const client = new ConvexClient(convexUrl);
    const stack = await client.query(api.agents.getStack, { stackId });
    return stack?.team_type || "standard";
  }
}
