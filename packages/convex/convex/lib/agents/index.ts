/**
 * Agent Adapters for Convex Execution
 *
 * These functions execute agent logic within Convex actions,
 * replacing the Node.js-based agent classes for serverless execution.
 */

export { executePlanner } from './planner';
export { executeBuilder } from './builder';
export { executeCommunicator } from './communicator';
export { executeReviewer } from './reviewer';

import { ActionCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { executePlanner } from './planner';
import { executeBuilder } from './builder';
import { executeCommunicator } from './communicator';
import { executeReviewer } from './reviewer';

/**
 * Execute an agent based on type
 */
export async function executeAgentByType(
  ctx: ActionCtx,
  agentType: string,
  stackId: Id<"agent_stacks">
): Promise<string> {
  console.log(`Executing agent: ${agentType} for stack ${stackId}`);

  switch (agentType) {
    case 'planner':
      return await executePlanner(ctx, stackId);
    case 'builder':
      return await executeBuilder(ctx, stackId);
    case 'communicator':
      return await executeCommunicator(ctx, stackId);
    case 'reviewer':
      return await executeReviewer(ctx, stackId);
    default:
      throw new Error(`Unknown agent type: ${agentType}`);
  }
}