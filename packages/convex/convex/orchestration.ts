/**
 * Orchestration Public API
 *
 * This file provides the public interface for the graph-based orchestration system.
 * It is called by the cron job and manages the lifecycle of orchestration cycles.
 *
 * Key functions:
 * - scheduledOrchestrator: Called by cron to check all running stacks
 * - executeOrchestratorCycle: Runs a single orchestration cycle for a stack
 * - Mutations for tracking state and caching
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { executeOrchestrator } from "./lib/orchestration";
import { Id } from "./_generated/dataModel";

/**
 * Scheduled function called by cron
 *
 * This function:
 * 1. Finds all running stacks (all are fully autonomous)
 * 2. Checks if they need an orchestration cycle
 * 3. Schedules cycles for eligible stacks
 */
export const scheduledOrchestrator = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Find all running stacks
    const stacks = await ctx.db
      .query("agent_stacks")
      .filter((q) => q.eq(q.field("execution_state"), "running"))
      .collect();

    console.log(
      `[ScheduledOrchestrator] Found ${stacks.length} running stacks`
    );

    for (const stack of stacks) {
      console.log(
        `[ScheduledOrchestrator] Checking stack ${stack._id} (${stack.participant_name})`
      );

      // Check if orchestrator is already running or needs to run
      const lastExecution = await ctx.db
        .query("orchestrator_executions")
        .withIndex("by_stack", (q) => q.eq("stack_id", stack._id))
        .order("desc")
        .first();

      const shouldExecute = shouldScheduleOrchestration(lastExecution);

      if (shouldExecute) {
        console.log(
          `[ScheduledOrchestrator] Scheduling orchestration for stack ${stack._id}`
        );

        // Create execution record
        const executionId = await ctx.db.insert("orchestrator_executions", {
          stack_id: stack._id,
          status: "running",
          started_at: Date.now(),
        });

        // Schedule the orchestrator cycle
        await ctx.scheduler.runAfter(
          0,
          internal.orchestration.executeOrchestratorCycle,
          {
            stackId: stack._id,
            executionId,
          }
        );
      }
    }
  },
});

/**
 * Execute a single orchestration cycle
 *
 * This action:
 * 1. Runs the orchestrator
 * 2. Saves the execution results
 * 3. Decides whether to continue immediately or pause
 * 4. Self-schedules the next cycle if needed
 */
export const executeOrchestratorCycle = internalAction({
  args: {
    stackId: v.id("agent_stacks"),
    executionId: v.id("orchestrator_executions"),
  },
  handler: async (ctx, args) => {
    const { stackId, executionId } = args;
    const cycleStartTime = Date.now();

    try {
      console.log(
        `[OrchestratorCycle] Starting cycle for stack ${stackId}, execution ${executionId}`
      );

      // Run the orchestrator
      const decision = await executeOrchestrator(ctx, stackId);

      // Save execution results
      await ctx.runMutation(internal.orchestration.markOrchestratorComplete, {
        executionId,
        stackId,
        decision: decision.action,
        pauseDuration: decision.duration,
        reason: decision.reason,
        totalDuration: Date.now() - cycleStartTime,
      });

      // Handle decision
      if (decision.action === "continue") {
        // Immediately schedule next cycle
        console.log(
          `[OrchestratorCycle] Continuing immediately: ${decision.reason}`
        );

        const nextExecutionId = await ctx.runMutation(
          internal.orchestration.createOrchestrationExecution,
          { stackId }
        );

        await ctx.scheduler.runAfter(
          0,
          internal.orchestration.executeOrchestratorCycle,
          {
            stackId,
            executionId: nextExecutionId,
          }
        );
      } else if (decision.action === "pause") {
        // Pause and wait for next cron check
        console.log(
          `[OrchestratorCycle] Pausing for ${decision.duration}ms: ${decision.reason}`
        );

        // The cron will pick it up again
      } else if (decision.action === "stop") {
        // Stop orchestration (stack probably stopped or paused)
        console.log(
          `[OrchestratorCycle] Stopping orchestration: ${decision.reason}`
        );
      }
    } catch (error) {
      console.error(
        `[OrchestratorCycle] Cycle failed for stack ${stackId}:`,
        error
      );

      // Mark as failed
      await ctx.runMutation(internal.orchestration.markOrchestratorFailed, {
        executionId,
        stackId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
});

/**
 * Mark orchestrator execution as complete
 */
export const markOrchestratorComplete = internalMutation({
  args: {
    executionId: v.id("orchestrator_executions"),
    stackId: v.id("agent_stacks"),
    decision: v.string(),
    pauseDuration: v.optional(v.number()),
    reason: v.string(),
    totalDuration: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: "completed",
      completed_at: Date.now(),
      decision: args.decision,
      pause_duration: args.pauseDuration,
    });

    // Update stack's last execution time and cycle count
    const stack = await ctx.db.get(args.stackId);
    if (stack) {
      await ctx.db.patch(args.stackId, {
        last_executed_at: Date.now(),
        total_cycles: (stack.total_cycles || 0) + 1,
      });
    }

    // Log trace
    await ctx.db.insert("agent_traces", {
      stack_id: args.stackId,
      agent_type: "orchestrator",
      thought: `Orchestration cycle completed: ${args.reason}`,
      action: "cycle_complete",
      result: {
        decision: args.decision,
        pauseDuration: args.pauseDuration,
        totalDuration: args.totalDuration,
      },
      timestamp: Date.now(),
    });
  },
});

/**
 * Mark orchestrator execution as failed
 */
export const markOrchestratorFailed = internalMutation({
  args: {
    executionId: v.id("orchestrator_executions"),
    stackId: v.id("agent_stacks"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.executionId, {
      status: "failed",
      completed_at: Date.now(),
      error: args.error,
    });

    // Log error trace
    await ctx.db.insert("agent_traces", {
      stack_id: args.stackId,
      agent_type: "orchestrator",
      thought: "Orchestration cycle failed",
      action: "cycle_failed",
      result: { error: args.error },
      timestamp: Date.now(),
    });
  },
});

/**
 * Create a new orchestration execution record
 */
export const createOrchestrationExecution = internalMutation({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("orchestrator_executions", {
      stack_id: args.stackId,
      status: "running",
      started_at: Date.now(),
    });
  },
});

/**
 * Get cached work status for a stack
 */
export const getCachedWorkStatus = internalQuery({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("work_detection_cache")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .first();
  },
});

/**
 * Cache work status for performance
 */
export const cacheWorkStatus = internalMutation({
  args: {
    stackId: v.id("agent_stacks"),
    planner_has_work: v.boolean(),
    planner_priority: v.number(),
    planner_reason: v.string(),
    builder_has_work: v.boolean(),
    builder_priority: v.number(),
    builder_reason: v.string(),
    communicator_has_work: v.boolean(),
    communicator_priority: v.number(),
    communicator_reason: v.string(),
    reviewer_has_work: v.boolean(),
    reviewer_priority: v.number(),
    reviewer_reason: v.string(),
    computed_at: v.number(),
    valid_until: v.number(),
  },
  handler: async (ctx, args) => {
    // Delete old cache entries
    const oldCache = await ctx.db
      .query("work_detection_cache")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .collect();

    for (const entry of oldCache) {
      await ctx.db.delete(entry._id);
    }

    // Insert new cache (rename stackId to stack_id for schema)
    const { stackId, ...cacheData } = args;
    await ctx.db.insert("work_detection_cache", {
      stack_id: stackId,
      ...cacheData,
    });
  },
});

/**
 * Helper: Determine if we should schedule orchestration for a stack
 */
function shouldScheduleOrchestration(lastExecution: any): boolean {
  if (!lastExecution) {
    // No previous execution, schedule one
    return true;
  }

  // Schedule if last execution completed or paused
  if (lastExecution.status === "completed" || lastExecution.status === "paused") {
    return true;
  }

  // Schedule if last execution failed
  if (lastExecution.status === "failed") {
    return true;
  }

  // If running, check if it's been too long (60 second timeout)
  if (lastExecution.status === "running") {
    const elapsed = Date.now() - lastExecution.started_at;
    if (elapsed > 60000) {
      console.warn(
        `[ScheduledOrchestrator] Orchestration appears stuck, rescheduling`
      );
      return true;
    }
  }

  return false;
}

// ========= PUBLIC QUERIES FOR DASHBOARD =========

import { query } from "./_generated/server";

/**
 * Get recent orchestrator executions for a stack (for dashboard)
 */
export const getRecentExecutions = query({
  args: {
    stackId: v.id("agent_stacks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    return await ctx.db
      .query("orchestrator_executions")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get execution graphs for a stack (for dashboard visualization)
 */
export const getExecutionGraphs = query({
  args: {
    stackId: v.id("agent_stacks"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    return await ctx.db
      .query("execution_graphs")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .take(limit);
  },
});

/**
 * Get work detection cache for a stack (for dashboard status display)
 */
export const getWorkDetectionStatus = query({
  args: { stackId: v.id("agent_stacks") },
  handler: async (ctx, args) => {
    const cache = await ctx.db
      .query("work_detection_cache")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .order("desc")
      .first();

    if (!cache) {
      return null;
    }

    return {
      planner: {
        hasWork: cache.planner_has_work,
        priority: cache.planner_priority,
        reason: cache.planner_reason,
      },
      builder: {
        hasWork: cache.builder_has_work,
        priority: cache.builder_priority,
        reason: cache.builder_reason,
      },
      communicator: {
        hasWork: cache.communicator_has_work,
        priority: cache.communicator_priority,
        reason: cache.communicator_reason,
      },
      reviewer: {
        hasWork: cache.reviewer_has_work,
        priority: cache.reviewer_priority,
        reason: cache.reviewer_reason,
      },
      computedAt: cache.computed_at,
      validUntil: cache.valid_until,
    };
  },
});

/**
 * Get orchestration statistics for a stack (for dashboard metrics)
 */
export const getOrchestrationStats = query({
  args: {
    stackId: v.id("agent_stacks"),
    timeRangeMs: v.optional(v.number()), // Default: last 24 hours
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRangeMs || 24 * 60 * 60 * 1000; // 24 hours
    const since = Date.now() - timeRange;

    const executions = await ctx.db
      .query("orchestrator_executions")
      .withIndex("by_stack", (q) => q.eq("stack_id", args.stackId))
      .filter((q) => q.gte(q.field("started_at"), since))
      .collect();

    const completed = executions.filter((e) => e.status === "completed");
    const failed = executions.filter((e) => e.status === "failed");
    const running = executions.filter((e) => e.status === "running");

    // Calculate average cycle duration
    const completedWithDuration = completed.filter(
      (e) => e.completed_at && e.started_at
    );
    const avgDuration =
      completedWithDuration.length > 0
        ? completedWithDuration.reduce(
            (sum, e) => sum + (e.completed_at! - e.started_at),
            0
          ) / completedWithDuration.length
        : 0;

    // Count decisions
    const continueCount = completed.filter((e) => e.decision === "continue").length;
    const pauseCount = completed.filter((e) => e.decision === "pause").length;

    // Get parallel execution stats from graph summaries
    const graphSummaries = completed
      .filter((e) => e.graph_summary)
      .map((e) => e.graph_summary!);

    const avgParallelExecs =
      graphSummaries.length > 0
        ? graphSummaries.reduce(
            (sum, g) => sum + (g.parallel_executions || 0),
            0
          ) / graphSummaries.length
        : 0;

    return {
      totalCycles: executions.length,
      completedCycles: completed.length,
      failedCycles: failed.length,
      runningCycles: running.length,
      avgCycleDurationMs: Math.round(avgDuration),
      continueDecisions: continueCount,
      pauseDecisions: pauseCount,
      avgParallelExecutions: Math.round(avgParallelExecs * 10) / 10,
      timeRangeMs: timeRange,
    };
  },
});
