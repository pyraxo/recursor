/**
 * Type definitions for Graph-Based Orchestration
 *
 * This file contains all shared types used across the orchestration system.
 */

import { Id } from "../../_generated/dataModel";

/**
 * Agent types in the system
 */
export type AgentType = "planner" | "builder" | "communicator" | "reviewer";

/**
 * Work status for a single agent
 */
export interface AgentWorkStatus {
  hasWork: boolean;
  priority: number; // 0-10, higher = more urgent
  reason: string;
  dependencies: string[]; // Agent IDs that must complete first
}

/**
 * Work status for all agents in a stack
 */
export interface WorkStatus {
  stackId: Id<"agent_stacks">;
  planner: AgentWorkStatus;
  builder: AgentWorkStatus;
  communicator: AgentWorkStatus;
  reviewer: AgentWorkStatus;
  computedAt: number;
}

/**
 * Node in the execution graph
 */
export interface GraphNode {
  id: string; // Unique identifier for this node
  agentType: AgentType;
  status: "pending" | "running" | "completed" | "failed";
  priority: number;
  dependencies: string[]; // IDs of nodes that must complete first
  result?: string; // Agent's output
  error?: string; // Error message if failed
  startTime?: number;
  endTime?: number;
}

/**
 * Execution graph structure
 */
export interface ExecutionGraph {
  nodes: GraphNode[];
  metadata: {
    stackId: Id<"agent_stacks">;
    createdAt: number;
    completedAt?: number;
  };
}

/**
 * Orchestrator decision after executing a cycle
 */
export interface OrchestratorDecision {
  action: "continue" | "pause" | "stop";
  duration?: number; // Pause duration in ms (for 'pause' action)
  reason: string;
  nextPollTime?: number; // When to check again (for 'pause')
}

/**
 * Context data passed to work detection
 */
export interface WorkDetectionContext {
  todos: any[];
  messages: any[];
  artifacts: any | null;
  agentStates: any[];
  projectIdea: any | null;
  stack: any;
  userMessages: any[];
}

/**
 * Orchestrator execution summary
 */
export interface OrchestrationSummary {
  agentsRun: AgentType[];
  waves: number;
  parallelExecutions: number;
  totalDurationMs: number;
  decision: OrchestratorDecision;
}
