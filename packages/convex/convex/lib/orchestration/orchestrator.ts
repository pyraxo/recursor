/**
 * Orchestrator Core
 *
 * This is the main orchestration engine that coordinates agent execution
 * based on intelligent work detection and graph-based planning.
 *
 * The orchestrator:
 * 1. Detects what work needs to be done
 * 2. Builds an execution graph
 * 3. Executes agents in parallel waves
 * 4. Analyzes results and decides next action
 * 5. Self-schedules the next cycle or pauses
 *
 * Design principles:
 * - Intelligent (only runs agents with work)
 * - Efficient (parallelizes where possible)
 * - Adaptive (adjusts pause duration based on activity)
 * - Resilient (handles errors gracefully)
 */

import { ActionCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import type { OrchestratorDecision } from "./types";
import { detectWorkForAgents } from "./workDetection";
import {
  buildExecutionGraph,
  executeGraph,
  analyzeGraphExecution,
} from "./graphExecution";

/**
 * Default pause duration when no work is detected (5 seconds)
 */
const DEFAULT_PAUSE_DURATION = 5000;

/**
 * Minimum pause duration (1 second)
 */
const MIN_PAUSE_DURATION = 1000;

/**
 * Maximum pause duration when idle (30 seconds)
 */
const MAX_PAUSE_DURATION = 30000;

/**
 * Main orchestrator function
 *
 * This is the entry point for each orchestration cycle.
 * It performs all the intelligence: work detection, graph building,
 * execution, and decision-making.
 */
export async function executeOrchestrator(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<OrchestratorDecision> {
  const cycleStartTime = Date.now();

  console.log(`[Orchestrator] Starting cycle for stack ${stackId}`);

  try {
    // Step 1: Detect what work needs to be done
    console.log(`[Orchestrator] Detecting work...`);
    const workStatus = await detectWorkForAgents(ctx, stackId);

    // Log work detection results
    const workSummary = Object.entries(workStatus)
      .filter(([key]) => key !== "stackId" && key !== "computedAt")
      .map(([agent, status]: [string, any]) => ({
        agent,
        hasWork: status.hasWork,
        priority: status.priority,
        reason: status.reason,
      }));

    console.log(
      `[Orchestrator] Work detection results:`,
      JSON.stringify(workSummary, null, 2)
    );

    // Step 2: Build execution graph
    const graph = buildExecutionGraph(workStatus);

    // Step 3: Check if there's any work to do
    if (graph.nodes.length === 0) {
      console.log(`[Orchestrator] No work detected, pausing...`);
      return {
        action: "pause",
        duration: calculatePauseDuration(workStatus),
        reason: "No work available for any agent",
        nextPollTime: Date.now() + DEFAULT_PAUSE_DURATION,
      };
    }

    // Step 4: Execute the graph
    console.log(
      `[Orchestrator] Executing graph with ${graph.nodes.length} agents...`
    );
    const executedGraph = await executeGraph(ctx, graph, stackId);

    // Step 5: Analyze results
    const analysis = analyzeGraphExecution(executedGraph);

    console.log(
      `[Orchestrator] Execution complete:`,
      JSON.stringify(analysis, null, 2)
    );

    // Step 6: Decide next action
    const decision = decideNextAction(executedGraph, analysis, workStatus);

    const cycleDuration = Date.now() - cycleStartTime;
    console.log(
      `[Orchestrator] Cycle completed in ${cycleDuration}ms. Decision: ${decision.action} (${decision.reason})`
    );

    return decision;
  } catch (error) {
    console.error(`[Orchestrator] Cycle failed:`, error);

    // On error, pause and retry later
    return {
      action: "pause",
      duration: DEFAULT_PAUSE_DURATION,
      reason: `Error during orchestration: ${error instanceof Error ? error.message : String(error)}`,
      nextPollTime: Date.now() + DEFAULT_PAUSE_DURATION,
    };
  }
}

/**
 * Decide what the orchestrator should do next
 *
 * Decision logic:
 * - Continue immediately if agents created new work
 * - Pause briefly if work was done but no new work created
 * - Pause longer if no work was available
 */
function decideNextAction(
  graph: any,
  analysis: any,
  workStatus: any
): OrchestratorDecision {
  // Check if any agents failed
  if (analysis.failureCount > 0) {
    return {
      action: "pause",
      duration: DEFAULT_PAUSE_DURATION,
      reason: `${analysis.failureCount} agents failed, pausing before retry`,
      nextPollTime: Date.now() + DEFAULT_PAUSE_DURATION,
    };
  }

  // Check if work was productive (agents ran successfully)
  if (analysis.successCount > 0) {
    // Work was done - check if we should continue immediately or pause briefly
    // Continue immediately if planner ran (likely created new todos)
    const plannerRan = analysis.agentsRun.includes("planner");

    if (plannerRan) {
      return {
        action: "continue",
        reason: "Planner created new work, continuing immediately",
      };
    }

    // Otherwise, pause briefly to allow system to stabilize
    return {
      action: "pause",
      duration: MIN_PAUSE_DURATION,
      reason: "Work completed, brief pause before next check",
      nextPollTime: Date.now() + MIN_PAUSE_DURATION,
    };
  }

  // No work was done (shouldn't happen if graph had nodes, but handle it)
  return {
    action: "pause",
    duration: DEFAULT_PAUSE_DURATION,
    reason: "Unexpected: graph had nodes but no work completed",
    nextPollTime: Date.now() + DEFAULT_PAUSE_DURATION,
  };
}

/**
 * Calculate pause duration based on work status
 *
 * Adaptive pause logic:
 * - Short pause if some work detected (agents might create more)
 * - Medium pause if no immediate work but periodic checks due soon
 * - Long pause if truly idle
 */
function calculatePauseDuration(workStatus: any): number {
  // Check if any agent has moderate priority work (might become urgent)
  const maxPriority = Math.max(
    workStatus.planner.priority,
    workStatus.builder.priority,
    workStatus.communicator.priority,
    workStatus.reviewer.priority
  );

  if (maxPriority >= 5) {
    // Some moderate work exists, check again soon
    return MIN_PAUSE_DURATION;
  }

  if (maxPriority >= 3) {
    // Low priority work, standard pause
    return DEFAULT_PAUSE_DURATION;
  }

  // Truly idle, longer pause
  return Math.min(DEFAULT_PAUSE_DURATION * 2, MAX_PAUSE_DURATION);
}

/**
 * Check if stack should continue orchestration
 *
 * Returns false if stack is paused, stopped, or doesn't exist
 */
export async function shouldContinueOrchestration(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<boolean> {
  try {
    const stack = await ctx.runQuery(
      require("../../_generated/api").internal.agentExecution
        .getStackForExecution,
      { stackId }
    );

    if (!stack) {
      console.log(`[Orchestrator] Stack ${stackId} not found`);
      return false;
    }

    if (stack.execution_state !== "running") {
      console.log(
        `[Orchestrator] Stack ${stackId} is ${stack.execution_state}, stopping orchestration`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      `[Orchestrator] Error checking stack status:`,
      error
    );
    return false;
  }
}
