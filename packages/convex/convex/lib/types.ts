/**
 * Centralized Type Definitions for Convex Database Entities
 *
 * This file provides type-safe interfaces for all database entities,
 * replacing the use of `any` throughout the codebase.
 */

import { Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";

// ============================================================================
// Database Entity Types (matching schema.ts)
// ============================================================================

export type TeamType = "standard" | "cursor";
export type ExecutionState = "idle" | "running" | "paused" | "stopped";
export type AgentType = "planner" | "builder" | "communicator" | "reviewer";
export type TodoStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type ProjectStatus = "ideation" | "approved" | "in_progress" | "completed";
export type MessageType = "broadcast" | "direct" | "visitor";
export type ArtifactType = "html_js" | "video" | "external_link";

/**
 * Cursor team configuration
 */
export interface CursorConfig {
  agent_id?: string;
  repository_url?: string;
  repository_name?: string;
  workspace_branch?: string;
  last_prompt_at?: number;
  total_prompts_sent?: number;
}

/**
 * Agent Stack (one per participant)
 */
export interface AgentStack {
  _id: Id<"agent_stacks">;
  _creationTime: number;
  participant_name: string;
  phase: string;
  created_at: number;
  team_type?: TeamType;
  cursor_config?: CursorConfig;
  execution_state?: ExecutionState;
  current_agent_index?: number;
  last_executed_at?: number;
  last_activity_at?: number;
  started_at?: number;
  paused_at?: number;
  stopped_at?: number;
  process_id?: string;
  total_cycles?: number;
}

/**
 * Agent memory structure
 */
export interface AgentMemory {
  facts: string[];
  learnings: string[];
  recommendations?: string[];
  recommendations_timestamp?: number;
  reviewer_recommendations?: string[];
  execution_state?: "idle" | "executing" | "error";
  current_work?: string | null;
  last_execution_update?: number;
  last_review_time?: number;
  last_reviewed_version?: number;
  last_review_issues_count?: number;
  last_planning_time?: number;
  last_broadcast_time?: number;
  recommendations_type?: string;
}

/**
 * Agent current context (short-term memory)
 */
export interface AgentContext {
  active_task?: string;
  recent_messages: string[];
  focus?: string;
}

/**
 * Agent State (one per sub-agent within a stack)
 */
export interface AgentState {
  _id: Id<"agent_states">;
  _creationTime: number;
  stack_id: Id<"agent_stacks">;
  agent_type: AgentType;
  memory: AgentMemory;
  current_context: AgentContext;
  updated_at: number;
}

/**
 * Project Idea
 */
export interface ProjectIdea {
  _id: Id<"project_ideas">;
  _creationTime: number;
  stack_id: Id<"agent_stacks">;
  title: string;
  description: string;
  status: ProjectStatus;
  created_by: string;
  created_at: number;
}

/**
 * Todo Item
 */
export interface Todo {
  _id: Id<"todos">;
  _creationTime: number;
  stack_id: Id<"agent_stacks">;
  content: string;
  status: TodoStatus;
  assigned_by: string;
  priority: number;
  created_at: number;
  completed_at?: number;
}

/**
 * Message (inter-agent communication and user chat)
 */
export interface Message {
  _id: Id<"messages">;
  _creationTime: number;
  from_stack_id?: Id<"agent_stacks">;
  to_stack_id?: Id<"agent_stacks">;
  from_agent_type?: string;
  from_user_name?: string;
  content: string;
  message_type: MessageType;
  read_by: Id<"agent_stacks">[];
  created_at: number;
}

/**
 * User Message (user-to-team communication)
 */
export interface UserMessage {
  _id: Id<"user_messages">;
  _creationTime: number;
  team_id: Id<"agent_stacks">;
  sender_name: string;
  content: string;
  timestamp: number;
  processed: boolean;
  response_id?: Id<"messages">;
}

/**
 * Artifact metadata
 */
export interface ArtifactMetadata {
  description?: string;
  tech_stack?: string[];
  build_time_ms?: number;
  // Cursor-specific metadata
  cursor_agent_id?: string;
  files_changed?: number;
  // Allow other metadata fields
  [key: string]: unknown;
}

/**
 * Build Artifact
 */
export interface Artifact {
  _id: Id<"artifacts">;
  _creationTime: number;
  stack_id: Id<"agent_stacks">;
  type: ArtifactType;
  version: number;
  content?: string;
  url?: string;
  created_by?: string;
  metadata: ArtifactMetadata;
  created_at: number;
}

/**
 * Agent Trace (observability)
 */
export interface AgentTrace {
  _id: Id<"agent_traces">;
  _creationTime: number;
  stack_id: Id<"agent_stacks">;
  agent_type: AgentType;
  thought: string;
  action: string;
  result?: unknown;
  timestamp: number;
}

/**
 * Judgment feedback
 */
export interface JudgmentFeedback {
  technical_merit_notes: string;
  polish_notes: string;
  execution_notes: string;
  wow_factor_notes: string;
  overall_assessment: string;
}

/**
 * Judgment (hackathon scoring)
 */
export interface Judgment {
  _id: Id<"judgments">;
  _creationTime: number;
  stack_id: Id<"agent_stacks">;
  technical_merit: number;
  polish: number;
  execution: number;
  wow_factor: number;
  total_score: number;
  feedback: JudgmentFeedback;
  artifact_version_judged: number;
  judged_at: number;
}

// ============================================================================
// Convex Context Types
// ============================================================================

/**
 * Query context with typed database
 */
export type TypedQueryCtx = QueryCtx;

/**
 * Mutation context with typed database
 */
export type TypedMutationCtx = MutationCtx;

/**
 * Action context with typed database
 */
export type TypedActionCtx = ActionCtx;

// ============================================================================
// Query Builder Types
// ============================================================================

/**
 * Type-safe query builder for indexes
 */
export interface IndexQueryBuilder<TableName extends string> {
  eq<FieldName extends string>(
    fieldName: FieldName,
    value: unknown
  ): IndexQueryBuilder<TableName>;
}

// ============================================================================
// Update/Patch Types
// ============================================================================

/**
 * Partial updates for database entities
 */
export type TodoUpdate = Partial<Omit<Todo, "_id" | "_creationTime" | "stack_id" | "created_at">>;
export type ArtifactUpdate = Partial<Omit<Artifact, "_id" | "_creationTime" | "stack_id" | "created_at">>;
export type ProjectIdeaUpdate = Partial<Omit<ProjectIdea, "_id" | "_creationTime" | "stack_id" | "created_at">>;
export type AgentStateUpdate = Partial<Omit<AgentState, "_id" | "_creationTime" | "stack_id">>;
export type MessageUpdate = Partial<Omit<Message, "_id" | "_creationTime" | "created_at">>;
export type AgentStackUpdate = Partial<Omit<AgentStack, "_id" | "_creationTime" | "created_at">>;

// ============================================================================
// Enriched Message Type (with sender info)
// ============================================================================

/**
 * Message with enriched sender information
 */
export interface EnrichedMessage extends Message {
  sender_name?: string;
  from_team_name?: string;
  to_team_name?: string | null;
}

// ============================================================================
// Sorting and Comparison
// ============================================================================

/**
 * Comparator for sorting entities
 */
export type Comparator<T> = (a: T, b: T) => number;

// ============================================================================
// Result Types for Judgments
// ============================================================================

/**
 * Result from executing judges
 */
export interface JudgmentResult {
  stackId: Id<"agent_stacks">;
  name: string;
  total_score?: number;
  message?: string;
  error?: string;
}
