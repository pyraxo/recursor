import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agent Stacks (one per participant)
  agent_stacks: defineTable({
    participant_name: v.string(),
    phase: v.string(), // 'ideation', 'building', 'demo', etc.
    created_at: v.number(),

    // Execution control fields
    execution_state: v.optional(
      v.union(
        v.literal("idle"),
        v.literal("running"),
        v.literal("paused"),
        v.literal("stopped")
      )
    ),
    current_agent_index: v.optional(v.number()), // DEPRECATED: Legacy field from round-robin executor (no longer used)
    last_executed_at: v.optional(v.number()), // Last successful execution
    last_activity_at: v.optional(v.number()),
    started_at: v.optional(v.number()),
    paused_at: v.optional(v.number()),
    stopped_at: v.optional(v.number()),
    process_id: v.optional(v.string()), // Track which service instance is running this

    // Autonomous orchestration metrics
    total_cycles: v.optional(v.number()), // Count of orchestration cycles completed
  }),

  // Agent State (one per sub-agent within a stack)
  agent_states: defineTable({
    stack_id: v.id("agent_stacks"),
    agent_type: v.string(), // 'planner', 'builder', 'communicator', 'reviewer'
    memory: v.object({
      // Long-term memory: learned facts, patterns, preferences
      facts: v.array(v.string()),
      learnings: v.array(v.string()),
      recommendations: v.optional(v.array(v.string())),
      recommendations_timestamp: v.optional(v.number()),
      reviewer_recommendations: v.optional(v.array(v.string())),

      // Execution tracking for autonomous orchestrator
      execution_state: v.optional(
        v.union(v.literal("idle"), v.literal("executing"), v.literal("error"))
      ),
      current_work: v.optional(v.union(v.string(), v.null())),
      last_execution_update: v.optional(v.number()),
      last_review_time: v.optional(v.number()),
      last_reviewed_version: v.optional(v.number()), // Track which artifact version was last reviewed
      last_review_issues_count: v.optional(v.number()), // Number of issues found in last review
      last_planning_time: v.optional(v.number()),
      last_broadcast_time: v.optional(v.number()),
      recommendations_type: v.optional(v.string()), // Type of recommendations (e.g., 'code_review', 'strategic')
    }),
    current_context: v.object({
      // Short-term working memory: current task, recent interactions
      active_task: v.optional(v.string()),
      recent_messages: v.array(v.string()),
      focus: v.optional(v.string()),
    }),
    updated_at: v.number(),
  }).index("by_stack", ["stack_id"]),

  // Project Ideas (mapped to each participant)
  project_ideas: defineTable({
    stack_id: v.id("agent_stacks"),
    title: v.string(),
    description: v.string(),
    status: v.string(), // 'ideation', 'approved', 'in_progress', 'completed'
    created_by: v.string(), // which agent created it
    created_at: v.number(),
  }).index("by_stack", ["stack_id"]),

  // Todos (mapped to each participant)
  todos: defineTable({
    stack_id: v.id("agent_stacks"),
    content: v.string(),
    status: v.string(), // 'pending', 'in_progress', 'completed', 'cancelled'
    assigned_by: v.string(), // which agent created it
    priority: v.number(), // 1-5, for ordering
    created_at: v.number(),
    completed_at: v.optional(v.number()),
  })
    .index("by_stack", ["stack_id"])
    .index("by_status", ["stack_id", "status"]),

  // Messages (for inter-agent communication and user chat)
  messages: defineTable({
    from_stack_id: v.optional(v.id("agent_stacks")), // Optional: null when message is from a user
    to_stack_id: v.optional(v.id("agent_stacks")), // null = broadcast to all
    from_agent_type: v.optional(v.string()), // Agent type or null for user messages
    from_user_name: v.optional(v.string()), // User name for visitor messages
    content: v.string(),
    message_type: v.string(), // 'broadcast', 'direct', 'visitor'
    read_by: v.array(v.id("agent_stacks")), // array of stack_ids that have read
    created_at: v.number(),
  })
    .index("by_recipient", ["to_stack_id"])
    .index("by_sender", ["from_stack_id"])
    .index("broadcasts", ["message_type"]),

  // Build Artifacts
  artifacts: defineTable({
    stack_id: v.id("agent_stacks"),
    type: v.string(), // 'html_js', 'video', 'external_link'
    version: v.number(), // incremental version number
    content: v.optional(v.string()), // for HTML/JS: the actual code
    url: v.optional(v.string()), // for external links or hosted artifacts
    created_by: v.optional(v.string()), // which agent created this artifact
    metadata: v.object({
      description: v.optional(v.string()),
      tech_stack: v.optional(v.array(v.string())),
      build_time_ms: v.optional(v.number()),
    }),
    created_at: v.number(),
  }).index("by_stack", ["stack_id"]),

  // Observability Traces
  agent_traces: defineTable({
    stack_id: v.id("agent_stacks"),
    agent_type: v.string(),
    thought: v.string(), // agent's reasoning/thinking
    action: v.string(), // tool/function called
    result: v.optional(v.any()), // result of the action
    timestamp: v.number(),
  })
    .index("by_stack", ["stack_id"])
    .index("by_time", ["timestamp"]),

  // Agent Execution Tracking
  agent_executions: defineTable({
    stack_id: v.id("agent_stacks"),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    started_at: v.number(),
    completed_at: v.optional(v.number()),
    error: v.optional(v.string()),
  }).index("by_stack", ["stack_id"]),

  // Graph Orchestration Executions
  orchestrator_executions: defineTable({
    stack_id: v.id("agent_stacks"),
    status: v.union(
      v.literal("running"),
      v.literal("completed"),
      v.literal("paused"),
      v.literal("failed")
    ),
    started_at: v.number(),
    completed_at: v.optional(v.number()),
    decision: v.optional(v.string()), // 'continue' or 'pause'
    pause_duration: v.optional(v.number()), // Duration to pause if decision is 'pause'
    error: v.optional(v.string()),
    graph_summary: v.optional(
      v.object({
        agents_run: v.array(v.string()),
        waves: v.number(),
        parallel_executions: v.number(),
        total_duration_ms: v.optional(v.number()),
      })
    ),
  }).index("by_stack", ["stack_id"]),

  // Execution Graphs (for debugging and visualization)
  execution_graphs: defineTable({
    stack_id: v.id("agent_stacks"),
    orchestrator_execution_id: v.id("orchestrator_executions"),
    graph: v.any(), // Full graph structure (nodes, edges, execution results)
    created_at: v.number(),
    completed_at: v.optional(v.number()),
  }).index("by_stack", ["stack_id"]),

  // Work Detection Cache (optimization)
  work_detection_cache: defineTable({
    stack_id: v.id("agent_stacks"),
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
    valid_until: v.number(), // Cache expiration timestamp
  }).index("by_stack", ["stack_id"]),
});
