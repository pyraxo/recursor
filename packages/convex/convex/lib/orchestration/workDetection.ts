/**
 * Work Detection System
 *
 * This module implements intelligent work detection for each agent type.
 * It analyzes the current state and determines which agents have work to do,
 * their priority levels, and any dependencies between them.
 *
 * Key principles:
 * - Need-based execution (not time-based)
 * - Priority-aware scheduling
 * - Dependency tracking
 * - Efficient caching
 */

import { ActionCtx } from "../../_generated/server";
import { Id } from "../../_generated/dataModel";
import { internal } from "../../_generated/api";
import type {
  AgentWorkStatus,
  WorkStatus,
  WorkDetectionContext,
  AgentType,
} from "./types";

/**
 * Cache duration for work detection results (5 seconds)
 */
const CACHE_DURATION_MS = 5000;

/**
 * Time thresholds for periodic checks (3 minutes)
 */
const PERIODIC_CHECK_INTERVAL = 180000;

/**
 * Main entry point: Detect work for all agents in a stack
 */
export async function detectWorkForAgents(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<WorkStatus> {
  // Check cache first
  const cached = await checkCache(ctx, stackId);
  if (cached) {
    console.log(`[WorkDetection] Using cached result for stack ${stackId}`);
    return cached;
  }

  // Fetch all required data in parallel
  const context = await fetchWorkDetectionContext(ctx, stackId);

  // Detect work for each agent type
  const workStatus: WorkStatus = {
    stackId,
    planner: detectPlannerWork(context),
    builder: detectBuilderWork(context),
    communicator: detectCommunicatorWork(context),
    reviewer: detectReviewerWork(context),
    computedAt: Date.now(),
  };

  // Cache the result
  await cacheWorkStatus(ctx, workStatus);

  return workStatus;
}

/**
 * Fetch all data needed for work detection in parallel
 */
async function fetchWorkDetectionContext(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<WorkDetectionContext> {
  const [stack, todos, messages, artifacts, projectIdea, agentStates, userMessages] =
    await Promise.all([
      ctx.runQuery(internal.agentExecution.getStackForExecution, { stackId }),
      ctx.runQuery(internal.agentExecution.getTodos, { stackId }),
      ctx.runQuery(internal.messages.getUnreadForStack, { stackId }),
      ctx.runQuery(internal.artifacts.internalGetLatest, { stackId }),
      ctx.runQuery(internal.agentExecution.getProjectIdea, { stackId }),
      ctx.runQuery(internal.agentExecution.getAgentExecutionStates, {
        stackId,
      }),
      ctx.runQuery(internal.userMessages.internalGetUnprocessed, {
        team_id: stackId,
      }),
    ]);

  return {
    stack,
    todos: todos || [],
    messages: messages || [],
    artifacts,
    projectIdea,
    agentStates: agentStates || [],
    userMessages: userMessages || [],
  };
}

/**
 * Planner Work Detection
 *
 * The planner needs to run when:
 * 1. No project idea exists (highest priority)
 * 2. No pending todos (need new tasks)
 * 3. Reviewer has recommendations
 * 4. User messages need strategic planning (e.g., feature requests, project changes)
 * 5. Periodic planning time (every 5 minutes)
 */
export function detectPlannerWork(
  context: WorkDetectionContext
): AgentWorkStatus {
  const { todos, projectIdea, agentStates, userMessages } = context;

  // Priority 1: No project idea
  if (!projectIdea) {
    return {
      hasWork: true,
      priority: 10,
      reason: "No project idea - need initial planning",
      dependencies: [],
    };
  }

  // Priority 2: No pending todos
  const pendingTodos = todos.filter((t) => t.status === "pending");
  if (pendingTodos.length === 0) {
    return {
      hasWork: true,
      priority: 9,
      reason: "No pending todos - need new tasks",
      dependencies: [],
    };
  }

  // Priority 3: Reviewer recommendations available
  const plannerState = agentStates.find(
    (s) => s.agent_type === "planner"
  );
  const reviewerRecommendations =
    plannerState?.memory?.reviewer_recommendations || [];
  if (reviewerRecommendations.length > 0) {
    return {
      hasWork: true,
      priority: 8,
      reason: `${reviewerRecommendations.length} reviewer recommendations to incorporate`,
      dependencies: [],
    };
  }

  // Priority 4: User messages that might need strategic planning
  // (e.g., feature requests, major changes - not just simple questions)
  // Check if messages contain strategic keywords
  const strategicUserMessages = userMessages.filter((msg) => {
    const content = msg.content.toLowerCase();
    return (
      content.includes("feature") ||
      content.includes("add") ||
      content.includes("change project") ||
      content.includes("different") ||
      content.includes("instead") ||
      content.includes("modify") ||
      content.length > 100 // Longer messages might be strategic
    );
  });
  if (strategicUserMessages.length > 0) {
    return {
      hasWork: true,
      priority: 7,
      reason: `${strategicUserMessages.length} user message(s) need strategic planning`,
      dependencies: [],
    };
  }

  // Priority 5: Periodic planning check (reduced frequency since communicator handles user messages)
  const lastPlanningTime =
    plannerState?.memory?.last_planning_time || context.stack?.created_at || 0;
  const timeSinceLastPlanning = Date.now() - lastPlanningTime;
  const PLANNER_PERIODIC_INTERVAL = 300000; // 5 minutes (longer than before)
  if (timeSinceLastPlanning > PLANNER_PERIODIC_INTERVAL) {
    return {
      hasWork: true,
      priority: 4,
      reason: `Periodic planning check (${Math.floor(timeSinceLastPlanning / 60000)} min since last planning)`,
      dependencies: [],
    };
  }

  // No work needed
  return {
    hasWork: false,
    priority: 0,
    reason: "No planning needed - todos exist and recent planning",
    dependencies: [],
  };
}

/**
 * Builder Work Detection
 *
 * The builder needs to run when:
 * 1. Pending todos exist
 * 2. Planner has just created new todos (dependency)
 */
export function detectBuilderWork(
  context: WorkDetectionContext
): AgentWorkStatus {
  const { todos } = context;

  // Find high-priority pending todos
  const pendingTodos = todos.filter(
    (t) => t.status === "pending" && (t.priority || 0) > 0
  );

  if (pendingTodos.length === 0) {
    return {
      hasWork: false,
      priority: 0,
      reason: "No pending todos to execute",
      dependencies: [],
    };
  }

  // Calculate priority based on number and urgency of todos
  const highPriorityCount = pendingTodos.filter((t) => t.priority >= 3).length;
  const priority = highPriorityCount > 0 ? 8 : 6;

  return {
    hasWork: true,
    priority,
    reason: `${pendingTodos.length} pending todos (${highPriorityCount} high priority)`,
    dependencies: [], // Can run in parallel with planner
  };
}

/**
 * Communicator Work Detection
 *
 * The communicator needs to run when:
 * 1. Unprocessed user messages exist (HIGHEST PRIORITY - respond one at a time)
 * 2. Unread agent messages exist
 */
export function detectCommunicatorWork(
  context: WorkDetectionContext
): AgentWorkStatus {
  const { messages, agentStates, userMessages, todos } = context;

  // Priority 1: Unprocessed user messages (respond one at a time, like a chatroom)
  if (userMessages.length > 0) {
    return {
      hasWork: true,
      priority: 10, // Highest priority - users are waiting
      reason: `${userMessages.length} user message(s) to respond to (processing one at a time)`,
      dependencies: [],
    };
  }

  // Priority 2: Unread agent messages from other teams
  const unreadMessages = messages.filter((m) => !m.read_by || m.read_by.length === 0);
  if (unreadMessages.length > 0) {
    return {
      hasWork: true,
      priority: 7,
      reason: `${unreadMessages.length} unread messages from other teams`,
      dependencies: [],
    };
  }

  // No work needed
  return {
    hasWork: false,
    priority: 0,
    reason: "No messages to process",
    dependencies: [],
  };
}

/**
 * Reviewer Work Detection
 *
 * The reviewer needs to run when:
 * 1. Multiple todos completed since last review
 * 2. New artifact created
 * 3. Periodic review check (every 3 minutes)
 */
export function detectReviewerWork(
  context: WorkDetectionContext
): AgentWorkStatus {
  const { todos, artifacts, agentStates } = context;

  const reviewerState = agentStates.find(
    (s) => s.agent_type === "reviewer"
  );
  const lastReviewTime = reviewerState?.memory?.last_review_time || 0;

  // Priority 1: Multiple completed todos since last review
  const completedSinceReview = todos.filter(
    (t) =>
      t.status === "completed" && (t.completed_at || 0) > lastReviewTime
  );

  if (completedSinceReview.length >= 2) {
    return {
      hasWork: true,
      priority: 6,
      reason: `${completedSinceReview.length} todos completed since last review`,
      dependencies: [], // Should run after builder completes
    };
  }

  // Priority 2: New artifact created
  if (artifacts && artifacts.created_at > lastReviewTime) {
    return {
      hasWork: true,
      priority: 6,
      reason: "New artifact created - needs review",
      dependencies: [], // Should run after builder
    };
  }

  // Priority 3: Periodic review
  const timeSinceReview = Date.now() - lastReviewTime;
  if (timeSinceReview > PERIODIC_CHECK_INTERVAL) {
    return {
      hasWork: true,
      priority: 4,
      reason: `Periodic review check (${Math.floor(timeSinceReview / 60000)} min since last review)`,
      dependencies: [],
    };
  }

  // No work needed
  return {
    hasWork: false,
    priority: 0,
    reason: "No significant progress to review yet",
    dependencies: [],
  };
}

/**
 * Check if we have a valid cached work status
 */
async function checkCache(
  ctx: ActionCtx,
  stackId: Id<"agent_stacks">
): Promise<WorkStatus | null> {
  const cached = await ctx.runQuery(
    internal.orchestration.getCachedWorkStatus,
    { stackId }
  );

  if (!cached) return null;

  // Check if cache is still valid
  const now = Date.now();
  if (now > cached.valid_until) {
    return null;
  }

  // Reconstruct WorkStatus from cache
  return {
    stackId,
    planner: {
      hasWork: cached.planner_has_work,
      priority: cached.planner_priority,
      reason: cached.planner_reason,
      dependencies: [],
    },
    builder: {
      hasWork: cached.builder_has_work,
      priority: cached.builder_priority,
      reason: cached.builder_reason,
      dependencies: [],
    },
    communicator: {
      hasWork: cached.communicator_has_work,
      priority: cached.communicator_priority,
      reason: cached.communicator_reason,
      dependencies: [],
    },
    reviewer: {
      hasWork: cached.reviewer_has_work,
      priority: cached.reviewer_priority,
      reason: cached.reviewer_reason,
      dependencies: [],
    },
    computedAt: cached.computed_at,
  };
}

/**
 * Cache work status for performance
 */
async function cacheWorkStatus(
  ctx: ActionCtx,
  workStatus: WorkStatus
): Promise<void> {
  await ctx.runMutation(internal.orchestration.cacheWorkStatus, {
    stackId: workStatus.stackId,
    planner_has_work: workStatus.planner.hasWork,
    planner_priority: workStatus.planner.priority,
    planner_reason: workStatus.planner.reason,
    builder_has_work: workStatus.builder.hasWork,
    builder_priority: workStatus.builder.priority,
    builder_reason: workStatus.builder.reason,
    communicator_has_work: workStatus.communicator.hasWork,
    communicator_priority: workStatus.communicator.priority,
    communicator_reason: workStatus.communicator.reason,
    reviewer_has_work: workStatus.reviewer.hasWork,
    reviewer_priority: workStatus.reviewer.priority,
    reviewer_reason: workStatus.reviewer.reason,
    computed_at: workStatus.computedAt,
    valid_until: workStatus.computedAt + CACHE_DURATION_MS,
  });
}
