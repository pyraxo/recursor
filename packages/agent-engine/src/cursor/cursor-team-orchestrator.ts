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
   * Also handles cleanup when restarting after a stop.
   */
  async initialize(): Promise<void> {
    console.log(`[CursorOrchestrator] Initializing for stack ${this.stackId}`);

    const stack = await this.client.query(api.agents.getStack, {
      stackId: this.stackId,
    });

    if (!stack) {
      throw new Error(`Stack ${this.stackId} not found`);
    }

    // If this is a restart after stop, clear the old Cursor agent ID
    // (the agent session is over, but we keep the repository)
    if (
      stack.cursor_config?.agent_id &&
      stack.execution_state === "running" &&
      stack.stopped_at
    ) {
      console.log(
        `[CursorOrchestrator] Clearing old Cursor agent ID after restart`
      );
      await this.updateCursorConfig({
        agent_id: undefined,
        // Keep repository info, just clear agent_id
      });
    }

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
    const tickId = `${this.stackId}-${this.tickCount}-${Date.now()}`;
    console.log(
      `\n=== Cursor Tick ${this.tickCount} for stack ${this.stackId} [${tickId}] ===`
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
        const stack = await this.client.query(api.agents.getStack, {
          stackId: this.stackId,
        });

        if (!stack) {
          throw new Error(`Stack ${this.stackId} not found`);
        }

        const existingCursorConfig = stack.cursor_config;

        // Check if team already has a persistent repository
        if (
          existingCursorConfig?.repository_url &&
          existingCursorConfig?.repository_name
        ) {
          // Try to reuse existing repository
          console.log(
            `[CursorOrchestrator] Attempting to clone existing repository: ${existingCursorConfig.repository_name}`
          );

          try {
            this.currentWorkspace =
              await this.workspaceManager.cloneExistingWorkspace(
                this.stackId,
                existingCursorConfig.repository_url,
                existingCursorConfig.repository_name,
                existingCursorConfig.workspace_branch || "agent-workspace"
              );

            console.log(
              `[CursorOrchestrator] Workspace ready (existing): ${this.currentWorkspace.repoName}`
            );
          } catch {
            // Repository doesn't exist anymore, create a new one
            console.log(
              `[CursorOrchestrator] Clone failed (repo may not exist), creating new PUBLIC repository`
            );

            this.currentWorkspace = await this.workspaceManager.createWorkspace(
              this.stackId,
              stack.participant_name,
              await this.artifactSync.materializeArtifacts(this.stackId)
            );

            // Set up Cursor environment
            try {
              await this.workspaceManager.setupEnvironmentConfig(
                this.currentWorkspace,
                process.env.CONVEX_URL || ""
              );
            } catch (setupError) {
              console.error(
                `[CursorOrchestrator] Failed to set up workspace environment:`,
                setupError
              );
              // Clean up the workspace since setup failed
              await this.currentWorkspace.cleanup();
              this.currentWorkspace = null;
              throw setupError; // Re-throw to stop execution
            }

            // Save new workspace info to Convex
            await this.updateCursorConfig({
              repository_url: this.currentWorkspace.repoUrl,
              repository_name: this.currentWorkspace.repoName,
              workspace_branch: this.currentWorkspace.branch,
            });

            console.log(
              `[CursorOrchestrator] Workspace ready (new): ${this.currentWorkspace.repoName}`
            );
          }
        } else {
          // Create new repository for this team
          console.log(
            `[CursorOrchestrator] Creating new persistent repository for ${stack.participant_name}`
          );

          this.currentWorkspace = await this.workspaceManager.createWorkspace(
            this.stackId,
            stack.participant_name,
            await this.artifactSync.materializeArtifacts(this.stackId)
          );

          // Set up Cursor environment
          try {
            await this.workspaceManager.setupEnvironmentConfig(
              this.currentWorkspace,
              process.env.CONVEX_URL || ""
            );
          } catch (setupError) {
            console.error(
              `[CursorOrchestrator] Failed to set up workspace environment:`,
              setupError
            );
            // Clean up the workspace since setup failed
            await this.currentWorkspace.cleanup();
            this.currentWorkspace = null;
            throw setupError; // Re-throw to stop execution
          }

          // Save workspace info to Convex for future reuse
          await this.updateCursorConfig({
            repository_url: this.currentWorkspace.repoUrl,
            repository_name: this.currentWorkspace.repoName,
            workspace_branch: this.currentWorkspace.branch,
          });

          console.log(
            `[CursorOrchestrator] Workspace ready (new): ${this.currentWorkspace.repoName}`
          );
        }
      }

      // 3. Get cursor config for feature flags and agent ID
      const cursorConfig = await this.getCursorConfig();

      // 4. Build unified prompt (check feature flag for workflow guides)
      const useWorkflowGuides = cursorConfig?.use_workflow_guides ?? true; // Default to true (new behavior)
      const prompt = useWorkflowGuides
        ? await this.buildWorkflowGuidedPrompt(pendingTodos)
        : await this.buildBaselinePrompt(pendingTodos);

      console.log(
        `[CursorOrchestrator] Using ${useWorkflowGuides ? "workflow-guided" : "baseline"} prompt`
      );

      // 5. Check if agent exists, or create new one
      let agentId = cursorConfig?.agent_id;

      if (!agentId) {
        // Create new Cursor Background Agent
        console.log(`[CursorOrchestrator] Creating Cursor Background Agent`);
        console.log(
          `[CursorOrchestrator] Repository URL: ${this.currentWorkspace.repoUrl}`
        );
        console.log(
          `[CursorOrchestrator] Branch: ${this.currentWorkspace.branch}`
        );
        console.log(
          `[CursorOrchestrator] Repo Name: ${this.currentWorkspace.repoName}`
        );

        try {
          const agentResponse = await this.cursorAPI.createAgent({
            prompt: {
              text: prompt,
            },
            source: {
              repository: this.currentWorkspace.repoUrl,
              ref: this.currentWorkspace.branch,
            },
            // Note: Omitting model to let Cursor auto-select the best model
            // Available models: claude-4-sonnet-thinking, o3, claude-4-opus-thinking, etc.
          });

          console.log(
            `[CursorOrchestrator] Agent creation response:`,
            JSON.stringify(agentResponse, null, 2)
          );
          console.log(
            `[CursorOrchestrator] Response ID field:`,
            agentResponse.id
          );
          console.log(
            `[CursorOrchestrator] Response keys:`,
            Object.keys(agentResponse)
          );

          agentId = agentResponse.id;

          if (!agentId) {
            throw new Error(
              `Agent creation succeeded but returned undefined ID. Response: ${JSON.stringify(agentResponse)}`
            );
          }

          result.agentId = agentId;
          console.log(
            `[CursorOrchestrator] Successfully created agent with ID: ${agentId}`
          );
        } catch (error: unknown) {
          // Provide more helpful error message for GitHub authorization issues
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (errorMessage?.includes("do not have access to repository")) {
            const enhancedError = new Error(
              `❌ Cursor GitHub App Authorization Required\n\n` +
                `Repository: ${this.currentWorkspace.repoUrl}\n` +
                `Branch: ${this.currentWorkspace.branch}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `The repository was created successfully by your GitHub PAT,\n` +
                `but the Cursor API cannot access it.\n\n` +
                `DIAGNOSIS: The Cursor GitHub App is not authorized for the\n` +
                `'recursor-sandbox' organization.\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `HOW TO FIX:\n\n` +
                `METHOD 1 - Use the direct authorization link:\n` +
                `   Open this URL in your browser:\n` +
                `   https://cursor.com/api/auth/connect-github?owner=recursor-sandbox&source=BACKGROUND_AGENT_API\n\n` +
                `METHOD 2 - Through Cursor Settings:\n` +
                `   1. Open Cursor IDE\n` +
                `   2. Go to Settings (Cmd/Ctrl + Shift + J)\n` +
                `   3. Navigate to "Background Agents" or "GitHub" section\n` +
                `   4. Click "Connect to GitHub"\n` +
                `   5. When GitHub prompts you:\n` +
                `      - Select 'recursor-sandbox' organization\n` +
                `      - Grant access to ALL repositories (or repositories matching 'recursor-*')\n` +
                `      - Ensure "Read and write" permissions are selected\n\n` +
                `METHOD 3 - Via GitHub directly:\n` +
                `   1. Go to: https://github.com/settings/installations\n` +
                `   2. Find "Cursor" in the installed apps\n` +
                `   3. Click "Configure"\n` +
                `   4. Ensure 'recursor-sandbox' is selected\n` +
                `   5. Grant access to all repos or select 'recursor-*' pattern\n\n` +
                `VERIFICATION:\n` +
                `   After authorizing, restart your dev server:\n` +
                `   > pnpm dev\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `Technical details:\n` +
                `${errorMessage}\n`
            );
            throw enhancedError;
          }
          throw error;
        }

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
        // Check if existing agent is still active before sending follow-up
        console.log(
          `[CursorOrchestrator] Found existing agent ${agentId}, checking status...`
        );

        try {
          const agentStatus = await this.cursorAPI.getAgentStatus(agentId);
          console.log(
            `[CursorOrchestrator] Existing agent status: ${agentStatus.status}`
          );

          // If agent is in a terminal state, create a new one instead
          if (
            agentStatus.status === "completed" ||
            agentStatus.status === "failed" ||
            agentStatus.status === "terminated"
          ) {
            console.log(
              `[CursorOrchestrator] Agent is in terminal state (${agentStatus.status}), creating new agent`
            );

            // Clear the old agent ID
            await this.updateCursorConfig({
              agent_id: undefined,
            });

            // Create new agent immediately
            const agentResponse = await this.cursorAPI.createAgent({
              prompt: {
                text: prompt,
              },
              source: {
                repository: this.currentWorkspace.repoUrl,
                ref: this.currentWorkspace.branch,
              },
              // Note: Omitting model to let Cursor auto-select the best model
            });

            agentId = agentResponse.id;

            if (!agentId) {
              throw new Error(
                `Agent creation succeeded but returned undefined ID. Response: ${JSON.stringify(agentResponse)}`
              );
            }

            result.agentId = agentId;
            console.log(
              `[CursorOrchestrator] Successfully created new agent with ID: ${agentId}`
            );

            // Save new agent ID
            await this.updateCursorConfig({
              agent_id: agentId,
              last_prompt_at: Date.now(),
              total_prompts_sent: 1,
            });

            await this.logTrace(
              `Created new Cursor agent ${agentId} (previous agent was ${agentStatus.status})`,
              "cursor_agent_created",
              { agentId, previousStatus: agentStatus.status }
            );
          } else if (
            agentStatus.status === "creating" ||
            agentStatus.status === "running"
          ) {
            // Agent is still active, send follow-up
            console.log(
              `[CursorOrchestrator] Sending follow-up to active agent ${agentId}`
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
              { agentId, status: agentStatus.status }
            );
          }
        } catch (error) {
          // If we can't get agent status (404, etc), create a new agent
          console.error(
            `[CursorOrchestrator] Failed to get agent status, creating new agent:`,
            error instanceof Error ? error.message : String(error)
          );

          // Clear the old agent ID
          await this.updateCursorConfig({
            agent_id: undefined,
          });

          // Create new agent
          const agentResponse = await this.cursorAPI.createAgent({
            prompt: {
              text: prompt,
            },
            source: {
              repository: this.currentWorkspace.repoUrl,
              ref: this.currentWorkspace.branch,
            },
            // Note: Omitting model to let Cursor auto-select the best model
          });

          agentId = agentResponse.id;

          if (!agentId) {
            throw new Error(
              `Agent creation succeeded but returned undefined ID. Response: ${JSON.stringify(agentResponse)}`
            );
          }

          result.agentId = agentId;
          console.log(
            `[CursorOrchestrator] Successfully created new agent with ID: ${agentId}`
          );

          // Save new agent ID
          await this.updateCursorConfig({
            agent_id: agentId,
            last_prompt_at: Date.now(),
            total_prompts_sent: 1,
          });

          await this.logTrace(
            `Created new Cursor agent ${agentId} (previous agent was inaccessible)`,
            "cursor_agent_created",
            { agentId }
          );
        }
      }

      // 5. Poll for completion with detailed progress logging
      if (!agentId) {
        throw new Error(
          "Agent ID is undefined after creation/follow-up logic. This should never happen."
        );
      }

      console.log(
        `[CursorOrchestrator] Polling agent ${agentId} for completion`
      );
      console.log(
        `[CursorOrchestrator] 💡 Watch the GitHub repo for commits: https://github.com/recursor-sandbox/${this.currentWorkspace.repoName}/commits/${this.currentWorkspace.branch}`
      );

      let lastCheckTime = Date.now();
      let pollCount = 0;
      let lastCommitSha: string | undefined;

      const finalStatus = await this.cursorAPI.pollWithProgress(
        agentId,
        async (status) => {
          pollCount++;
          const elapsed = Math.floor((Date.now() - lastCheckTime) / 1000);
          console.log(
            `[CursorOrchestrator] ⏱️  Status: ${status.status.toUpperCase()} (${elapsed}s since last check, poll #${pollCount})`
          );

          // Log any outputs if available
          if (status.outputs) {
            if (status.outputs.files_changed?.length) {
              console.log(
                `[CursorOrchestrator] 📝 Files changed: ${status.outputs.files_changed.length}`
              );
              console.log(
                `[CursorOrchestrator]    ${status.outputs.files_changed.slice(0, 5).join(", ")}${status.outputs.files_changed.length > 5 ? "..." : ""}`
              );
            }
            if (status.outputs.commits?.length) {
              console.log(
                `[CursorOrchestrator] 📦 Commits: ${status.outputs.commits.length}`
              );
              console.log(
                `[CursorOrchestrator]    Latest: ${status.outputs.commits[status.outputs.commits.length - 1]}`
              );
            }
            if (status.outputs.terminal_output) {
              const lines = status.outputs.terminal_output
                .split("\n")
                .filter((l) => l.trim());
              if (lines.length > 0) {
                console.log(
                  `[CursorOrchestrator] 🖥️  Terminal output (last 3 lines):`
                );
                lines.slice(-3).forEach((line) => {
                  console.log(`[CursorOrchestrator]    ${line}`);
                });
              }
            }
          }

          // Check GitHub for new commits every 3rd poll (every 30s)
          if (pollCount % 3 === 0) {
            try {
              const commits = await this.workspaceManager.getRecentCommits(
                this.currentWorkspace!.repoName,
                this.currentWorkspace!.branch,
                5
              );

              if (commits.length > 0 && commits[0]) {
                const latestCommit = commits[0];
                if (lastCommitSha && latestCommit.sha !== lastCommitSha) {
                  console.log(`[CursorOrchestrator] 🆕 New commit detected!`);
                  console.log(
                    `[CursorOrchestrator]    ${latestCommit.sha}: ${latestCommit.message}`
                  );
                  console.log(
                    `[CursorOrchestrator]    View: ${latestCommit.url}`
                  );
                } else if (!lastCommitSha) {
                  console.log(
                    `[CursorOrchestrator] 📍 Latest commit: ${latestCommit.sha}: ${latestCommit.message.split("\n")[0]}`
                  );
                }
                lastCommitSha = latestCommit.sha;
              }
            } catch (error) {
              // Don't fail the polling if GitHub check fails
              console.error(
                `[CursorOrchestrator] Failed to check GitHub commits:`,
                error instanceof Error ? error.message : String(error)
              );
            }
          }

          lastCheckTime = Date.now();
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
   * Build workflow-guided prompt (treatment group)
   *
   * This version includes references to workflow guides, decision frameworks,
   * execution logs, and structured decision-making instructions. This is the
   * enhanced version that implements the repository-based workflow system.
   *
   * @param pendingTodos - List of pending todos to work on
   * @returns Workflow-guided prompt string
   */
  private async buildWorkflowGuidedPrompt(
    pendingTodos: any[]
  ): Promise<string> {
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

    // Get tick information for time awareness
    const currentTick = (stack?.cursor_config?.total_prompts_sent || 0) + 1; // Next tick
    const estimatedTotalTicks = 12; // Typical hackathon duration
    const timeElapsedPercent = Math.round(
      (currentTick / estimatedTotalTicks) * 100
    );
    const ticksRemaining = Math.max(0, estimatedTotalTicks - currentTick);

    // Read previous tick logs for continuity (if they exist in the workspace)
    // This provides meta-learning and continuity across ticks
    let previousTicksLog = "";
    if (this.currentWorkspace && currentTick > 1) {
      // Build a summary of recent ticks by checking for log files
      const recentTicks: string[] = [];
      const logsToRead = Math.min(3, currentTick - 1); // Read up to 3 previous ticks

      for (let i = 1; i <= logsToRead; i++) {
        const tickNumber = currentTick - i;
        recentTicks.push(`tick-${String(tickNumber).padStart(3, "0")}.md`);
      }

      if (recentTicks.length > 0) {
        previousTicksLog = `
## Previous Execution Logs

📖 **Review your recent work**: Read the following tick logs to understand what you've accomplished and learned:

${recentTicks.map((log) => `- \`logs/${log}\` - Your most recent ${recentTicks.indexOf(log) === 0 ? "execution" : "previous execution"}`).join("\n")}

**Why this matters**: These logs contain your decisions, learnings, and strategic insights. Read them to:
- Avoid repeating mistakes
- Build on successful approaches
- Maintain consistency with previous decisions
- Learn from blockers you've overcome

If these logs don't exist yet, you'll create them starting this tick (see Execution Log section below).
`;
      }
    }

    // Consolidate all 4 agent roles into one comprehensive prompt
    return `
You are an AI developer participating in the Recursor hackathon as "${stack?.participant_name || "CursorTeam"}".

## Project Context

**Title**: ${projectIdea?.title || "Hackathon Project"}
**Description**: ${projectIdea?.description || "Build a creative project"}
**Phase**: ${stack?.phase || "ideation"}
**Current Artifacts**: ${artifacts?.length || 0} versions

## Time Tracking

**Current Tick**: ${currentTick} of ~${estimatedTotalTicks}
**Time Elapsed**: ~${timeElapsedPercent}%
**Ticks Remaining**: ~${ticksRemaining}

⏰ **Time Management**: Use \`docs/cursor-agent/frameworks/scope-management.md\` to assess if you're on track. If you're behind schedule (e.g., >70% time elapsed but <70% complete), apply aggressive scope cutting.
${previousTicksLog}
## Decision-Making Framework

You have access to comprehensive workflow guides in \`docs/cursor-agent/\` that provide structured decision-making frameworks. **READ THESE GUIDES** before making important decisions:

### Workflow Guides (Role-Specific)
- \`docs/cursor-agent/workflows/planning.md\` - For planning decisions (todos, priorities, phases)
- \`docs/cursor-agent/workflows/building.md\` - For implementation approach
- \`docs/cursor-agent/workflows/review.md\` - For progress assessment and time management
- \`docs/cursor-agent/workflows/communication.md\` - For user/team communication

### Decision Frameworks
- \`docs/cursor-agent/frameworks/phase-management.md\` - When to transition phases (ideation→building→demo→complete)
- \`docs/cursor-agent/frameworks/priority-scoring.md\` - How to score priorities (1-10 system)
- \`docs/cursor-agent/frameworks/commit-strategy.md\` - When and how to commit
- \`docs/cursor-agent/frameworks/scope-management.md\` - When to cut scope under time pressure

### Examples
- \`docs/cursor-agent/examples/\` - 5 showcase examples of excellent decision-making

### Execution Template
- \`docs/cursor-agent/templates/tick-execution-template.md\` - Template for structured tick execution

**IMPORTANT**: Use these guides to make systematic, well-reasoned decisions. They contain the accumulated expertise of successful hackathon teams.

## Your Workflow (4-Phase Approach)

Execute these phases **in order**, referencing the guides for each:

### Phase 1: Planning
Read \`workflows/planning.md\` and execute planning decisions:
- Evaluate current project state
- Apply phase transition framework (\`frameworks/phase-management.md\`)
- Score todo priorities (\`frameworks/priority-scoring.md\`)
- Create/update/delete todos as needed
- Update project description if phase changes

### Phase 2: Building
Read \`workflows/building.md\` and implement the highest priority todo:
- Build clean, multi-file projects (modern frameworks encouraged)
- Follow commit strategy (\`frameworks/commit-strategy.md\`)
- Commit frequently with semantic messages
- Push to git after each todo completion

### Phase 3: Review
Read \`workflows/review.md\` and assess progress:
- Check time vs. completion (apply \`frameworks/scope-management.md\` if needed)
- Identify blockers
- Assess demo-readiness
- Recommend scope cuts if behind schedule

### Phase 4: Communication
Read \`workflows/communication.md\` and respond to messages (if any):
- Reply to user questions naturally and conversationally
- Send team messages if collaboration needed
- Only broadcast major milestones (don't spam)

## Current Todos (Priority Order)

${pendingTodos
  .sort((a, b) => (b.priority || 0) - (a.priority || 0))
  .map((t, i) => `${i + 1}. [Priority ${t.priority || 0}] ${t.content}`)
  .join("\n")}

${
  messages && messages.length > 0
    ? `\n## Recent Messages\n\n${messages.map((m) => `- ${m.from_agent_type || m.from_user_name || "Unknown"}: ${m.content}`).join("\n")}`
    : ""
}

## Execution Instructions

1. **Always start with Planning** - Read \`workflows/planning.md\` and make strategic decisions first
2. **Reference relevant frameworks** - Don't guess, use the decision frameworks provided
3. **Work on highest priority todo** - Check the priority score and work top-down
4. **Commit frequently** - Follow \`frameworks/commit-strategy.md\` (every 15-30 min of work)
5. **Self-review regularly** - Apply \`workflows/review.md\` to assess progress
6. **Cut scope aggressively if needed** - Use \`frameworks/scope-management.md\` when behind

**Goal**: Create a working, demo-ready prototype. This is a hackathon - move fast but use the guides to make smart decisions.

## Git Workflow (CRITICAL - READ CAREFULLY)

⚠️ **IMPORTANT**: Your work MUST be committed to git. Uncommitted changes will NOT be detected by the orchestration system and will be LOST forever!

After completing EACH todo or making significant progress:

1. **Stage all changes**:
   \`\`\`bash
   git add .
   \`\`\`

2. **Commit with semantic message**:
   \`\`\`bash
   git commit -m "type: brief description of changes"
   \`\`\`

   **Commit message types**:
   - \`feat:\` - New feature or functionality
   - \`fix:\` - Bug fix or correction
   - \`docs:\` - Documentation updates
   - \`refactor:\` - Code restructuring without feature changes
   - \`test:\` - Adding or updating tests
   - \`style:\` - UI/styling changes

   **Examples**:
   - \`git commit -m "feat: add user authentication component"\`
   - \`git commit -m "fix: resolve button click handler bug"\`
   - \`git commit -m "docs: add API usage examples to README"\`

3. **Push to remote**:
   \`\`\`bash
   git push origin ${this.currentWorkspace?.branch || "agent-workspace"}
   \`\`\`

**When to commit**:
- ✅ After completing a todo
- ✅ After creating new files or components
- ✅ After fixing bugs or passing tests
- ✅ After significant refactoring
- ✅ At natural stopping points in your work
- ❌ Do NOT commit broken/incomplete code that won't run

**Why this matters**:
- Your commits are synced back to our database as "artifacts"
- These artifacts are used for grading and review by other agents
- Uncommitted work is invisible to the system and will disappear
- Think of git commits as your autosave mechanism


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

## Execution Log (CRITICAL FOR CONTINUITY)

📝 **Document this tick**: After completing this execution, create a log file to track your decisions and learnings.

### Instructions

1. **Copy the execution template**:
   \`\`\`bash
   cp docs/cursor-agent/templates/tick-execution-template.md logs/tick-${String(currentTick).padStart(3, "0")}.md
   \`\`\`

2. **Fill out the template** as you work through each phase:
   - **Planning phase**: Document your strategic decisions (todos created/updated/deleted, priority changes, phase transitions)
   - **Building phase**: Log what you built, files changed, challenges encountered
   - **Review phase**: Assess progress, identify blockers, check time management
   - **Communication phase**: Record messages responded to
   - **Meta-review**: Capture lessons learned and notes for future ticks

3. **Commit your log**:
   \`\`\`bash
   git add logs/tick-${String(currentTick).padStart(3, "0")}.md
   git commit -m "docs: add tick ${currentTick} execution log"
   git push origin ${this.currentWorkspace?.branch || "agent-workspace"}
   \`\`\`

### Why This Matters

- **Memory across ticks**: These logs are your external memory system
- **Learn from patterns**: Review past logs to identify what works and what doesn't
- **Maintain consistency**: Stay aligned with previous strategic decisions
- **Debug issues**: Understand how you got to the current state

**Pro tip**: Fill out the template incrementally as you work, not all at once at the end. This makes it easier and ensures nothing is forgotten.

---

**Focus on shipping something impressive and functional!**
    `.trim();
  }

  /**
   * Build baseline prompt (control group)
   *
   * This is the original prompt without workflow guide references. Used for
   * A/B testing to compare against the workflow-guided approach.
   *
   * @param pendingTodos - List of pending todos to work on
   * @returns Baseline prompt string
   */
  private async buildBaselinePrompt(pendingTodos: any[]): Promise<string> {
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

    // Basic prompt without workflow guides (original version)
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
5. **Commit**: Push your changes to GitHub (see Git Workflow below)

Create a working, demo-ready prototype. This is a hackathon - move fast but maintain high quality.

## Git Workflow (CRITICAL - READ CAREFULLY)

⚠️ **IMPORTANT**: Your work MUST be committed to git. Uncommitted changes will NOT be detected by the orchestration system and will be LOST forever!

After completing EACH todo or making significant progress:

1. **Stage all changes**:
   \`\`\`bash
   git add .
   \`\`\`

2. **Commit with semantic message**:
   \`\`\`bash
   git commit -m "type: brief description of changes"
   \`\`\`

   **Commit message types**:
   - \`feat:\` - New feature or functionality
   - \`fix:\` - Bug fix or correction
   - \`docs:\` - Documentation updates
   - \`refactor:\` - Code restructuring without feature changes
   - \`test:\` - Adding or updating tests
   - \`style:\` - UI/styling changes

   **Examples**:
   - \`git commit -m "feat: add user authentication component"\`
   - \`git commit -m "fix: resolve button click handler bug"\`
   - \`git commit -m "docs: add API usage examples to README"\`

3. **Push to remote**:
   \`\`\`bash
   git push origin ${this.currentWorkspace?.branch || "agent-workspace"}
   \`\`\`

**When to commit**:
- ✅ After completing a todo
- ✅ After creating new files or components
- ✅ After fixing bugs or passing tests
- ✅ After significant refactoring
- ✅ At natural stopping points in your work
- ❌ Do NOT commit broken/incomplete code that won't run

**Why this matters**:
- Your commits are synced back to our database as "artifacts"
- These artifacts are used for grading and review by other agents
- Uncommitted work is invisible to the system and will disappear
- Think of git commits as your autosave mechanism

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
  private async updateCursorConfig(
    config: Partial<{
      agent_id?: string;
      repository_url?: string;
      repository_name?: string;
      workspace_branch?: string;
      last_prompt_at?: number;
      total_prompts_sent?: number;
      use_workflow_guides?: boolean;
    }>
  ) {
    const currentConfig = await this.getCursorConfig();

    // Merge with existing config
    const updatedConfig = {
      agent_id: config.agent_id ?? currentConfig?.agent_id,
      repository_url: config.repository_url ?? currentConfig?.repository_url,
      repository_name: config.repository_name ?? currentConfig?.repository_name,
      workspace_branch:
        config.workspace_branch ?? currentConfig?.workspace_branch,
      last_prompt_at: config.last_prompt_at ?? currentConfig?.last_prompt_at,
      total_prompts_sent:
        config.total_prompts_sent ?? currentConfig?.total_prompts_sent ?? 0,
      use_workflow_guides:
        config.use_workflow_guides ??
        currentConfig?.use_workflow_guides ??
        true, // Default to true
    };

    console.log(`[CursorOrchestrator] Updating cursor config:`, updatedConfig);

    await this.client.mutation(api.agents.updateCursorConfig, {
      stackId: this.stackId,
      cursorConfig: updatedConfig,
    });
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
      // Check execution state from Convex before each tick
      const stack = await this.client.query(api.agents.getStack, {
        stackId: this.stackId,
      });

      const executionState = stack?.execution_state || "idle";

      // Only run tick if execution state is 'running'
      if (executionState === "running") {
        await this.tick();
      } else if (executionState === "stopped") {
        console.log(`[CursorOrchestrator] Stack is stopped, exiting loop`);
        break;
      } else if (executionState === "paused") {
        console.log(`[CursorOrchestrator] Stack is paused, skipping tick`);
        // Skip tick but continue waiting
      }

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
