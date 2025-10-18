/**
 * Graph-Based Orchestration System
 *
 * This module provides intelligent, graph-based orchestration for agent execution.
 * It replaces the simple round-robin cron system with a smart, need-based approach.
 *
 * Usage:
 *   import { executeOrchestrator } from "./lib/orchestration";
 *
 * Key modules:
 * - types: Shared type definitions
 * - workDetection: Intelligent work detection for each agent
 * - graphExecution: Parallel execution with dependency resolution
 * - orchestrator: Main orchestration logic and decision-making
 */

export * from "./types";
export * from "./workDetection";
export * from "./graphExecution";
export * from "./orchestrator";
