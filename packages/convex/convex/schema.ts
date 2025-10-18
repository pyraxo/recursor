import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agent Stacks (one per participant)
  agent_stacks: defineTable({
    participant_name: v.string(),
    phase: v.string(), // 'ideation', 'building', 'demo', etc.
    created_at: v.number(),
  }),

  // Agent State (one per sub-agent within a stack)
  agent_states: defineTable({
    stack_id: v.id("agent_stacks"),
    agent_type: v.string(), // 'planner', 'builder', 'communicator', 'reviewer'
    memory: v.object({
      // Long-term memory: learned facts, patterns, preferences
      facts: v.array(v.string()),
      learnings: v.array(v.string()),
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

  // Messages (for inter-agent communication)
  messages: defineTable({
    from_stack_id: v.id("agent_stacks"),
    to_stack_id: v.optional(v.id("agent_stacks")), // null = broadcast to all
    from_agent_type: v.string(),
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
});
