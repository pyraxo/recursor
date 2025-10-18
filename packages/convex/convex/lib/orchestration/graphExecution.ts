/**
 * Graph Execution System
 *
 * This module builds execution graphs from work status and executes agents
 * in parallel waves while respecting dependencies.
 *
 * Key features:
 * - Dependency resolution
 * - Wave-based parallel execution
 * - Error handling and resilience
 * - Execution tracking
 */

import { ActionCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import type {
  ExecutionGraph,
  GraphNode,
  WorkStatus,
  AgentType,
} from "./types";
import {
  executePlanner,
  executeBuilder,
  executeCommunicator,
  executeReviewer,
} from "../agents";

/**
 * Build an execution graph from work status
 *
 * This function:
 * 1. Creates nodes for agents with work
 * 2. Sorts by priority
 * 3. Sets up dependencies
 */
export function buildExecutionGraph(workStatus: WorkStatus): ExecutionGraph {
  const nodes: GraphNode[] = [];
  const now = Date.now();

  // Create nodes for agents that have work
  const agentEntries: Array<[AgentType, typeof workStatus.planner]> = [
    ["planner", workStatus.planner],
    ["builder", workStatus.builder],
    ["communicator", workStatus.communicator],
    ["reviewer", workStatus.reviewer],
  ];

  for (const [agentType, status] of agentEntries) {
    if (status.hasWork) {
      nodes.push({
        id: `${agentType}-${now}`,
        agentType,
        status: "pending",
        priority: status.priority,
        dependencies: status.dependencies,
      });
    }
  }

  // Sort by priority (highest first)
  nodes.sort((a, b) => b.priority - a.priority);

  return {
    nodes,
    metadata: {
      stackId: workStatus.stackId,
      createdAt: now,
    },
  };
}

/**
 * Execute an execution graph
 *
 * This function:
 * 1. Computes execution waves based on dependencies
 * 2. Executes each wave in parallel using Promise.allSettled
 * 3. Updates node status and results
 * 4. Returns the completed graph
 */
export async function executeGraph(
  ctx: ActionCtx,
  graph: ExecutionGraph,
  stackId: Id<"agent_stacks">
): Promise<ExecutionGraph> {
  const startTime = Date.now();

  // Compute execution waves
  const waves = computeExecutionWaves(graph.nodes);

  console.log(
    `[GraphExecution] Executing ${graph.nodes.length} agents in ${waves.length} waves for stack ${stackId}`
  );

  // Execute each wave with delays between them to avoid rate limiting
  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i];
    if (!wave) continue; // Skip if wave is undefined

    // Add 5-second delay before each wave (except the first)
    if (i > 0) {
      const delayMs = 5000;
      console.log(
        `[GraphExecution] Waiting ${delayMs}ms before wave ${i + 1} to avoid rate limits...`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    console.log(
      `[GraphExecution] Wave ${i + 1}/${waves.length}: ${wave.map((n) => n.agentType).join(", ")}`
    );

    // Mark nodes as running
    for (const node of wave) {
      node.status = "running";
      node.startTime = Date.now();
    }

    // Execute all nodes in this wave in parallel
    const promises = wave.map((node) => executeAgentNode(ctx, node, stackId));
    const results = await Promise.allSettled(promises);

    // Update nodes with results
    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const node = wave[j];

      if (!result || !node) continue; // Skip if undefined

      node.endTime = Date.now();

      if (result.status === "fulfilled") {
        node.status = "completed";
        node.result = result.value;
        console.log(
          `[GraphExecution] ${node.agentType} completed in ${node.endTime - node.startTime!}ms`
        );
      } else if (result.status === "rejected") {
        node.status = "failed";
        node.error = String(result.reason);
        console.error(
          `[GraphExecution] ${node.agentType} failed:`,
          result.reason
        );
      }
    }
  }

  // Update graph metadata
  graph.metadata.completedAt = Date.now();

  console.log(
    `[GraphExecution] Graph execution completed in ${Date.now() - startTime}ms`
  );

  return graph;
}

/**
 * Compute execution waves from graph nodes
 *
 * A wave contains all nodes whose dependencies are satisfied.
 * This enables maximum parallelization while respecting dependencies.
 */
function computeExecutionWaves(nodes: GraphNode[]): GraphNode[][] {
  const waves: GraphNode[][] = [];
  const completed = new Set<string>();
  const remaining = [...nodes];

  while (remaining.length > 0) {
    // Find nodes whose dependencies are all completed
    const currentWave = remaining.filter((node) =>
      node.dependencies.every(
        (dep) => completed.has(dep) || !nodes.find((n) => n.id === dep)
      )
    );

    if (currentWave.length === 0) {
      // Circular dependency or unsatisfiable dependencies
      console.error(
        "[GraphExecution] Cannot resolve dependencies for remaining nodes:",
        remaining.map((n) => n.id)
      );
      // Force remaining nodes into final wave to avoid infinite loop
      waves.push(remaining);
      break;
    }

    waves.push(currentWave);

    // Mark these nodes as completed for dependency resolution
    for (const node of currentWave) {
      completed.add(node.id);
      const index = remaining.indexOf(node);
      if (index > -1) {
        remaining.splice(index, 1);
      }
    }
  }

  return waves;
}

/**
 * Execute a single agent node
 *
 * This delegates to the appropriate agent execution function
 * and returns the agent's output.
 */
async function executeAgentNode(
  ctx: ActionCtx,
  node: GraphNode,
  stackId: Id<"agent_stacks">
): Promise<string> {
  const startTime = Date.now();

  try {
    let result: string;

    switch (node.agentType) {
      case "planner":
        result = await executePlanner(ctx, stackId);
        break;

      case "builder":
        result = await executeBuilder(ctx, stackId);
        break;

      case "communicator":
        result = await executeCommunicator(ctx, stackId);
        break;

      case "reviewer":
        result = await executeReviewer(ctx, stackId);
        break;

      default:
        throw new Error(`Unknown agent type: ${node.agentType}`);
    }

    const duration = Date.now() - startTime;
    console.log(
      `[GraphExecution] ${node.agentType} execution completed in ${duration}ms`
    );

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(
      `[GraphExecution] ${node.agentType} execution failed after ${duration}ms:`,
      error
    );
    throw error;
  }
}

/**
 * Analyze graph execution results
 *
 * Returns summary statistics about the execution
 */
export function analyzeGraphExecution(graph: ExecutionGraph): {
  agentsRun: AgentType[];
  waves: number;
  parallelExecutions: number;
  totalDurationMs: number;
  successCount: number;
  failureCount: number;
} {
  const waves = computeExecutionWaves(graph.nodes);
  const agentsRun = graph.nodes.map((n) => n.agentType);
  const successCount = graph.nodes.filter((n) => n.status === "completed")
    .length;
  const failureCount = graph.nodes.filter((n) => n.status === "failed").length;

  // Calculate total duration
  const totalDurationMs = graph.metadata.completedAt
    ? graph.metadata.completedAt - graph.metadata.createdAt
    : 0;

  // Calculate max parallel executions (largest wave size)
  const parallelExecutions = Math.max(...waves.map((w) => w.length), 0);

  return {
    agentsRun,
    waves: waves.length,
    parallelExecutions,
    totalDurationMs,
    successCount,
    failureCount,
  };
}
