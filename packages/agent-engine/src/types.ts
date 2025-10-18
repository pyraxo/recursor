/**
 * Shared types for the agent engine
 *
 * This file contains interfaces and types that are shared across multiple
 * modules to avoid circular dependencies.
 *
 * @module types
 */

/**
 * Common interface for all orchestrator types
 *
 * Ensures consistent API regardless of implementation:
 * - Standard teams: AgentStackOrchestrator (4-agent system)
 * - Cursor teams: CursorTeamOrchestrator (single background agent)
 */
export interface IOrchestrator {
  /**
   * Initialize the orchestrator
   * Sets up connections, validates configuration, prepares for execution
   */
  initialize(): Promise<void>;

  /**
   * Execute a single tick/cycle of the orchestration
   * Returns result object with status and metrics
   */
  tick(): Promise<unknown>;

  /**
   * Run continuous orchestration with optional tick limit
   *
   * @param intervalMs - Milliseconds between ticks
   * @param maxTicks - Maximum number of ticks to run (optional)
   */
  runContinuous(intervalMs?: number, maxTicks?: number): Promise<void>;

  /**
   * Get current orchestrator status
   * Returns status object with metrics and state
   */
  getStatus(): Promise<unknown>;

  /**
   * Gracefully pause execution (optional)
   * Allows orchestrator to finish current work before pausing
   */
  gracefulPause?(): Promise<void>;

  /**
   * Cleanup resources (optional)
   * Called when orchestrator is being destroyed
   */
  cleanup?(): Promise<void>;
}
