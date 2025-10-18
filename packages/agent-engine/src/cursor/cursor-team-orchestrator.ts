/**
 * Cursor Team Orchestrator
 *
 * This orchestrator manages a single Cursor Background Agent that handles all aspects
 * of project development (planning, building, communication, review) instead of using
 * the traditional 4-agent system.
 *
 * Architecture:
 * - Single Cursor Background Agent in isolated VM
 * - GitHub repository as workspace
 * - Full IDE tooling (grep, lint, test, git)
 * - Multi-file project support
 * - Incremental code editing
 *
 * Workflow per tick:
 * 1. Check for pending todos
 * 2. Create/reuse GitHub workspace
 * 3. Build unified prompt (consolidates all 4 agent roles)
 * 4. Create Cursor agent or send follow-up
 * 5. Poll for completion
 * 6. Sync artifacts back to Convex
 * 7. Update todos and traces
 *
 * @module cursor/cursor-team-orchestrator
 */

import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { ConvexClient } from "convex/browser";
import type { IOrchestrator } from "../types";
import { CursorAPIClient } from "./api-client";
import { ArtifactSyncService } from "./artifact-sync";
import { VirtualWorkspace, VirtualWorkspaceManager } from "./workspace-manager";

/**
 * Result of a Cursor orchestration tick
 */
export interface CursorOrchestrationResult {
  /** Agent stack identifier */
  stackId: Id<"agent_stacks">;
  /** Tick number */
  tick: number;
  /** Cursor agent ID (if created) */
  agentId?: string;
  /** Status of the tick */
  status: string;
  /** Number of files changed */
  filesChanged: number;
  /** Timestamp of completion */
  timestamp: number;
}

/**
 * Orchestrator for Cursor-based agent teams
 *
 * Unlike the standard 4-agent orchestrator, this uses a single Cursor Background
 * Agent that autonomously handles all development tasks with full IDE tooling.
 *
 * Usage:
 * ```typescript
 * const orchestrator = new CursorTeamOrchestrator(
 *   stackId,
 *   cursorApiKey,
 *   githubToken,
 *   convexUrl
 * );
 *
 * await orchestrator.initialize();
 * await orchestrator.tick();
 * ```
 */
export class CursorTeamOrchestrator implements IOrchestrator {
  private readonly stackId: Id<"agent_stacks">;
  private readonly cursorAPI: CursorAPIClient;
  private readonly workspaceManager: VirtualWorkspaceManager;
  private readonly artifactSync: ArtifactSyncService;
  private readonly client: ConvexClient;

  private tickCount: number = 0;
  private currentWorkspace: VirtualWorkspace | null = null;
  private shouldStop: boolean = false;

  /**
   * Create a new Cursor team orchestrator
   *
   * @param stackId - Agent stack identifier
   * @param cursorApiKey - Cursor API key
   * @param githubToken - GitHub Personal Access Token
   * @param convexUrl - Convex deployment URL
   */
  constructor(
    stackId: Id<"agent_stacks">,
    cursorApiKey: string,
    githubToken: string,
    convexUrl: string
  ) {
    this.stackId = stackId;
    this.cursorAPI = new CursorAPIClient(cursorApiKey);
    this.workspaceManager = new VirtualWorkspaceManager(githubToken);
    this.artifactSync = new ArtifactSyncService(convexUrl);
    this.client = new ConvexClient(convexUrl);
  }

  /**
   * Initialize the orchestrator
   *
   * Sets up initial project idea and todos if they don't exist.
   */
  async initialize(): Promise<void> {
    console.log(`[CursorOrchestrator] Initializing for stack ${this.stackId}`);

    // Check for existing project idea
    const projectIdea = await this.client.query(api.project_ideas.get, {
      stackId: this.stackId,
    });

    if (!projectIdea) {
      // Create initial project idea
      await this.client.mutation(api.project_ideas.create, {
        stack_id: this.stackId,
        title: "Hackathon Project",
        description:
          "A creative project built with Cursor Background Agent featuring full IDE tooling and multi-file support",
        created_by: "cursor_orchestrator",
      });

      console.log(`[CursorOrchestrator] Created initial project idea`);
    }

    // Check for existing todos
    const todos = await this.client.query(api.todos.getPending, {
      stackId: this.stackId,
    });

    if (!todos || todos.length === 0) {
      // Create initial todo
      await this.client.mutation(api.todos.create, {
        stack_id: this.stackId,
        content: "Define project concept and create initial file structure",
        assigned_by: "cursor_orchestrator",
        priority: 5,
      });

      console.log(`[CursorOrchestrator] Created initial todo`);
    }

    console.log(`[CursorOrchestrator] Initialization complete`);
  }

  /**
   * Execute a single orchestration tick
   *
   * This is the main execution loop for Cursor teams.
   *
   * @returns Promise resolving to orchestration result
   */
  async tick(): Promise<CursorOrchestrationResult> {
    this.tickCount++;
    console.log(
      `\n=== Cursor Tick ${this.tickCount} for stack ${this.stackId} ===`
    );

    const result: CursorOrchestrationResult = {
      stackId: this.stackId,
      tick: this.tickCount,
      status: "idle",
      filesChanged: 0,
      timestamp: Date.now(),
    };

    try {
      // 1. Check for pending todos
      const pendingTodos = await this.client.query(api.todos.getPending, {
        stackId: this.stackId,
      });

      if (!pendingTodos || pendingTodos.length === 0) {
        result.status = "idle";
        await this.logTrace("No pending todos", "cursor_idle");
        console.log(`[CursorOrchestrator] No work available`);
        return result;
      }

      console.log(
        `[CursorOrchestrator] Found ${pendingTodos.length} pending todo(s)`
      );

      // 2. Get or create workspace
      if (!this.currentWorkspace) {
        console.log(`[CursorOrchestrator] Creating new workspace`);

        const stack = await this.client.query(api.agents.getStack, {
          stackId: this.stackId,
        });

        if (!stack) {
          throw new Error(`Stack ${this.stackId} not found`);
        }

        // Create workspace with existing artifacts
        this.currentWorkspace = await this.workspaceManager.createWorkspace(
          this.stackId,
          stack.participant_name,
          await this.artifactSync.materializeArtifacts(this.stackId)
        );

        // Set up Cursor environment
        await this.workspaceManager.setupEnvironmentConfig(
          this.currentWorkspace,
          process.env.CONVEX_URL || ""
        );

        // Save workspace info to Convex
        await this.updateCursorConfig({
          repository_url: this.currentWorkspace.repoUrl,
          repository_name: this.currentWorkspace.repoName,
          workspace_branch: this.currentWorkspace.branch,
        });

        console.log(
          `[CursorOrchestrator] Workspace ready: ${this.currentWorkspace.repoName}`
        );
      }

      // 3. Build unified prompt (consolidates all 4 agent roles)
      const prompt = await this.buildUnifiedPrompt(pendingTodos);

      // 4. Check if agent exists, or create new one
      const cursorConfig = await this.getCursorConfig();
      let agentId = cursorConfig?.agent_id;

      if (!agentId) {
        // Create new Cursor Background Agent
        console.log(`[CursorOrchestrator] Creating Cursor Background Agent`);

        const agentResponse = await this.cursorAPI.createAgent({
          repository: this.currentWorkspace.repoUrl,
          branch: this.currentWorkspace.branch,
          prompt,
          model: "claude-3.5-sonnet",
          max_runtime_minutes: 30,
        });

        agentId = agentResponse.agent_id;
        result.agentId = agentId;

        // Save agent ID
        await this.updateCursorConfig({
          agent_id: agentId,
          last_prompt_at: Date.now(),
          total_prompts_sent: 1,
        });

        await this.logTrace(
          `Created Cursor agent ${agentId}`,
          "cursor_agent_created",
          { agentId, todosCount: pendingTodos.length }
        );
      } else {
        // Send follow-up to existing agent
        console.log(
          `[CursorOrchestrator] Sending follow-up to agent ${agentId}`
        );

        await this.cursorAPI.sendFollowUp(agentId, prompt);
        result.agentId = agentId;

        await this.updateCursorConfig({
          last_prompt_at: Date.now(),
          total_prompts_sent: (cursorConfig?.total_prompts_sent || 0) + 1,
        });

        await this.logTrace(
          `Sent follow-up to agent ${agentId}`,
          "cursor_agent_follow_up",
          { agentId }
        );
      }

      // 5. Poll for completion
      console.log(
        `[CursorOrchestrator] Polling agent ${agentId} for completion`
      );

      const finalStatus = await this.cursorAPI.pollWithProgress(
        agentId,
        (status) => {
          console.log(`[CursorOrchestrator] Agent status: ${status.status}`);
        },
        1800000, // 30 minutes
        10000 // poll every 10s
      );

      result.status = finalStatus.status;

      // 6. If completed, sync artifacts
      if (finalStatus.status === "completed") {
        console.log(`[CursorOrchestrator] Agent completed successfully`);

        const changes = await this.workspaceManager.captureChanges(
          this.currentWorkspace
        );

        result.filesChanged = changes.length;

        if (changes.length > 0) {
          await this.artifactSync.syncChangesToConvex(this.stackId, changes, {
            agent_id: agentId,
            files_changed: finalStatus.outputs?.files_changed || [],
            terminal_output: finalStatus.outputs?.terminal_output,
          });

          console.log(
            `[CursorOrchestrator] Synced ${changes.length} file(s) to Convex`
          );
        }

        // Mark todos as completed
        // In a more sophisticated implementation, the agent would indicate which todos it completed
        // For now, we mark all pending todos as completed
        for (const todo of pendingTodos) {
          await this.client.mutation(api.todos.updateStatus, {
            todoId: todo._id,
            status: "completed",
          });
        }

        await this.logTrace(
          `Agent completed: ${changes.length} files changed`,
          "cursor_agent_completed",
          { filesChanged: changes.length }
        );
      } else {
        console.log(
          `[CursorOrchestrator] Agent ${finalStatus.status}: ${finalStatus.error || "No error message"}`
        );

        await this.logTrace(
          `Agent ${finalStatus.status}: ${finalStatus.error || "Unknown"}`,
          "cursor_agent_failed",
          { error: finalStatus.error }
        );
      }

      console.log(`=== Cursor Tick ${this.tickCount} complete ===\n`);
    } catch (error) {
      console.error(`[CursorOrchestrator] Error during tick:`, error);
      result.status = "error";

      await this.logTrace(`Tick error: ${error}`, "cursor_tick_error", {
        error: String(error),
      });
    }

    return result;
  }

  /**
   * Build unified prompt that consolidates all 4 agent roles
   *
   * This prompt includes:
   * - Planning context (project state, todos)
   * - Building instructions (implementation details)
   * - Communication guidelines (documentation)
   * - Review criteria (quality standards)
   *
   * @param pendingTodos - List of pending todos to work on
   * @returns Unified prompt string
   */
  private async buildUnifiedPrompt(pendingTodos: any[]): Promise<string> {
    const stack = await this.client.query(api.agents.getStack, {
      stackId: this.stackId,
    });

    const projectIdea = await this.client.query(api.project_ideas.get, {
      stackId: this.stackId,
    });

    const artifacts = await this.client.query(api.artifacts.list, {
      stackId: this.stackId,
    });

    const allMessages = await this.client.query(api.messages.getTimeline, {
      stackId: this.stackId,
    });
    const messages = allMessages?.slice(-5) || [];

    // Consolidate all 4 agent roles into one comprehensive prompt
    return `
You are an AI developer participating in the Recursor hackathon as "${stack?.participant_name || "CursorTeam"}".

## Project Context

**Title**: ${projectIdea?.title || "Hackathon Project"}
**Description**: ${projectIdea?.description || "Build a creative project"}
**Phase**: ${stack?.phase || "ideation"}
**Current Artifacts**: ${artifacts?.length || 0} versions

## Your Responsibilities (Consolidated Multi-Agent Approach)

As a Cursor Background Agent, you handle ALL aspects of development:

### 1. Planning (Planner Role)
- Analyze the current project state and requirements
- Break down complex work into logical, achievable steps
- Prioritize tasks effectively based on dependencies
- Update the project plan as you learn new information
- Think strategically about the overall project direction

### 2. Building (Builder Role)
- Write high-quality, production-ready code
- Create multi-file projects when appropriate (don't limit yourself to single files!)
- Use modern best practices and tooling
- Ensure code is well-structured and maintainable
- Test your implementations thoroughly
- Use incremental editing - don't regenerate entire files unnecessarily

### 3. Communication (Communicator Role)
- Write clear, helpful documentation
- Add meaningful code comments
- Create informative commit messages
- Document architectural decisions
- Explain complex logic

### 4. Review (Reviewer Role)
- Self-review your code for quality and correctness
- Check that requirements are fully met
- Identify and fix potential issues
- Refactor code for clarity and efficiency
- Ensure consistency across the codebase

## Current Todos (Priority Order)

${pendingTodos
  .sort((a, b) => (b.priority || 0) - (a.priority || 0))
  .map((t, i) => `${i + 1}. [Priority ${t.priority || 0}] ${t.content}`)
  .join("\n")}

${
  messages && messages.length > 0
    ? `\n## Recent Messages\n\n${messages.map((m: any) => `- ${m.from_agent_type || m.from_user_name || "Unknown"}: ${m.content}`).join("\n")}`
    : ""
}

## Instructions

Work on the **highest priority** todos first. For each todo:

1. **Plan**: Break it down into subtasks if complex
2. **Implement**: Write clean, tested code
3. **Document**: Add comments and update docs
4. **Review**: Check quality and correctness
5. **Commit**: Make meaningful commits

Create a working, demo-ready prototype. This is a hackathon - move fast but maintain high quality.

### Technology Choices

- You have full freedom to choose appropriate technologies
- Modern frameworks are encouraged (React, Next.js, Vue, Svelte, etc.)
- Use package managers (npm, pnpm, yarn) as needed
- Leverage libraries and tools to move faster
- Multi-file projects are preferred over single-file solutions

### Quality Standards

- Code should be readable and well-organized
- Include basic tests where appropriate
- Error handling should be robust
- UI should be functional and reasonably polished
- Documentation should explain key decisions

**Focus on shipping something impressive and functional!**
    `.trim();
  }

  /**
   * Get cursor configuration from Convex
   */
  private async getCursorConfig() {
    const stack = await this.client.query(api.agents.getStack, {
      stackId: this.stackId,
    });
    return stack?.cursor_config;
  }

  /**
   * Update cursor configuration in Convex
   */
  private async updateCursorConfig(config: Partial<any>) {
    // This will be implemented in the Convex mutations section
    // For now, we'll use a placeholder
    console.log(`[CursorOrchestrator] Updating cursor config:`, config);
  }

  /**
   * Log a trace for observability
   */
  private async logTrace(
    thought: string,
    action: string,
    result?: unknown
  ): Promise<void> {
    await this.client.mutation(api.traces.log, {
      stack_id: this.stackId,
      agent_type: "cursor_orchestrator",
      thought,
      action,
      result,
    });
  }

  /**
   * Get orchestrator status
   */
  async getStatus() {
    const stack = await this.client.query(api.agents.getStack, {
      stackId: this.stackId,
    });

    const projectIdea = await this.client.query(api.project_ideas.get, {
      stackId: this.stackId,
    });

    const todos = await this.client.query(api.todos.list, {
      stackId: this.stackId,
    });

    const artifacts = await this.client.query(api.artifacts.list, {
      stackId: this.stackId,
    });

    return {
      stack,
      projectIdea,
      todos: {
        total: todos?.length || 0,
        completed: todos?.filter((t) => t.status === "completed").length || 0,
        pending: todos?.filter((t) => t.status === "pending").length || 0,
      },
      artifacts: {
        total: artifacts?.length || 0,
        latest_version: artifacts?.[0]?.version || 0,
      },
      tickCount: this.tickCount,
      orchestratorType: "cursor_background",
      workspace: this.currentWorkspace
        ? {
            repoName: this.currentWorkspace.repoName,
            repoUrl: this.currentWorkspace.repoUrl,
            branch: this.currentWorkspace.branch,
          }
        : null,
    };
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    console.log(`[CursorOrchestrator] Cleaning up resources`);

    if (this.currentWorkspace) {
      await this.currentWorkspace.cleanup();
      this.currentWorkspace = null;
    }

    this.artifactSync.close();
    this.client.close();
  }

  /**
   * Run continuous orchestration loop
   *
   * @param intervalMs - Time between ticks in milliseconds
   * @param maxTicks - Maximum number of ticks (optional)
   */
  async runContinuous(intervalMs: number = 120000, maxTicks?: number) {
    console.log(
      `[CursorOrchestrator] Starting continuous orchestration (interval: ${intervalMs}ms)`
    );

    let running = true;

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n[CursorOrchestrator] Stopping...");
      running = false;
      this.shouldStop = true;
    });

    while (running && !this.shouldStop) {
      await this.tick();

      if (maxTicks && this.tickCount >= maxTicks) {
        console.log(
          `[CursorOrchestrator] Reached max ticks (${maxTicks}), stopping`
        );
        break;
      }

      // Wait for next tick
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    await this.cleanup();
    console.log("[CursorOrchestrator] Stopped");
  }
}
