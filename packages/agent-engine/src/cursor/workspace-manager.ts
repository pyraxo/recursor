/**
 * Virtual Workspace Manager for Cursor Background Agents
 *
 * This module manages GitHub repositories as virtual workspaces for Cursor agents.
 * Each agent stack gets its own temporary GitHub repository where the agent can work.
 *
 * Workflow:
 * 1. Create private GitHub repo for the agent
 * 2. Clone repo locally
 * 3. Initialize with existing artifacts (if any)
 * 4. Configure Cursor environment (.cursor/environment.json)
 * 5. Agent works in the repo
 * 6. Capture changes via git diff
 * 7. Clean up repo when done
 *
 * @module cursor/workspace-manager
 */

import { Octokit } from "octokit";
import simpleGit, { SimpleGit } from "simple-git";
import { dir as createTmpDir } from "tmp-promise";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import type { Id } from "@recursor/convex/_generated/dataModel";

/**
 * Artifact file structure
 */
export interface ArtifactFile {
  /** Relative path of the file in the workspace */
  filename: string;
  /** File contents */
  content: string;
}

/**
 * Virtual workspace information
 */
export interface VirtualWorkspace {
  /** Agent stack this workspace belongs to */
  stackId: Id<"agent_stacks">;
  /** Full GitHub repo URL (for cloning) */
  repoUrl: string;
  /** Repository name (without owner) */
  repoName: string;
  /** Local filesystem path to cloned repo */
  localPath: string;
  /** Git branch for agent work */
  branch: string;
  /** Cleanup function to delete repo and local files */
  cleanup: () => Promise<void>;
}

/**
 * Manages virtual workspaces (GitHub repos) for Cursor Background Agents
 *
 * Usage:
 * ```typescript
 * const manager = new VirtualWorkspaceManager(githubToken);
 *
 * // Create workspace
 * const workspace = await manager.createWorkspace(
 *   stackId,
 *   "TeamName",
 *   existingArtifacts
 * );
 *
 * // Set up Cursor environment
 * await manager.setupEnvironmentConfig(workspace, convexUrl);
 *
 * // After agent completes work
 * const changes = await manager.captureChanges(workspace);
 *
 * // Clean up
 * await workspace.cleanup();
 * ```
 */
export class VirtualWorkspaceManager {
  private readonly octokit: Octokit;
  private readonly githubUsername: string;

  /**
   * Create a new workspace manager
   *
   * @param githubToken - GitHub Personal Access Token with repo permissions
   * @param githubUsername - GitHub username (defaults to "recursor-cursor-bot")
   */
  constructor(
    githubToken: string,
    githubUsername: string = "recursor-cursor-bot"
  ) {
    if (!githubToken || githubToken.trim() === "") {
      throw new Error("GitHub token is required");
    }

    this.octokit = new Octokit({ auth: githubToken });
    this.githubUsername = githubUsername;
  }

  /**
   * Create a new virtual workspace (GitHub repo + local clone)
   *
   * This will:
   * 1. Create a private GitHub repository
   * 2. Clone it locally to a temporary directory
   * 3. Create a new branch for the agent
   * 4. Initialize with existing artifacts if provided
   * 5. Push initial commit
   *
   * @param stackId - Agent stack identifier
   * @param participantName - Team/participant name (used for repo naming)
   * @param artifacts - Existing artifacts to initialize workspace with
   * @returns Promise resolving to workspace information
   */
  async createWorkspace(
    stackId: Id<"agent_stacks">,
    participantName: string,
    artifacts?: ArtifactFile[]
  ): Promise<VirtualWorkspace> {
    // Generate unique repo name
    const timestamp = Date.now();
    const sanitizedName = participantName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const repoName = `recursor-${sanitizedName}-${timestamp}`;
    const branch = `agent-workspace`;

    try {
      // 1. Create GitHub repository
      console.log(`[Workspace] Creating GitHub repo: ${repoName}`);
      const { data: repo } =
        await this.octokit.rest.repos.createForAuthenticatedUser({
          name: repoName,
          private: true,
          auto_init: true,
          description: `Virtual workspace for Recursor agent ${participantName}`,
        });

      // 2. Create temporary local directory
      const { path: localPath, cleanup: cleanupDir } = await createTmpDir({
        unsafeCleanup: true,
      });

      // 3. Clone repository
      console.log(`[Workspace] Cloning to ${localPath}`);
      const git: SimpleGit = simpleGit();
      await git.clone(repo.clone_url, localPath);

      // 4. Configure git in the cloned directory
      const repoGit: SimpleGit = simpleGit(localPath);
      await repoGit.addConfig("user.name", "Recursor Agent");
      await repoGit.addConfig("user.email", "agent@recursor.ai");

      // 5. Create and checkout agent branch
      await repoGit.checkoutLocalBranch(branch);

      // 6. Initialize with artifacts if provided
      if (artifacts && artifacts.length > 0) {
        console.log(
          `[Workspace] Initializing with ${artifacts.length} artifact(s)`
        );

        for (const artifact of artifacts) {
          const filePath = join(localPath, artifact.filename);
          const fileDir = join(localPath, artifact.filename, "..");

          // Ensure directory exists
          await mkdir(fileDir, { recursive: true });

          // Write file
          await writeFile(filePath, artifact.content, "utf-8");
        }

        // Commit artifacts
        await repoGit.add(".");
        await repoGit.commit("Initialize workspace with existing artifacts");
        await repoGit.push("origin", branch, { "--set-upstream": null });
      }

      // 7. Create cleanup function
      const cleanup = async () => {
        try {
          // Clean up local directory
          await cleanupDir();

          // Delete GitHub repository
          console.log(`[Workspace] Deleting GitHub repo: ${repoName}`);
          await this.octokit.rest.repos.delete({
            owner: this.githubUsername,
            repo: repoName,
          });
        } catch (error) {
          console.error(
            `[Workspace] Error during cleanup for ${repoName}:`,
            error
          );
          // Don't throw - best effort cleanup
        }
      };

      const workspace: VirtualWorkspace = {
        stackId,
        repoUrl: repo.clone_url,
        repoName,
        localPath,
        branch,
        cleanup,
      };

      console.log(`[Workspace] Created workspace for ${participantName}`);
      return workspace;
    } catch (error) {
      console.error("[Workspace] Failed to create workspace:", error);
      throw error;
    }
  }

  /**
   * Capture changes made by the agent
   *
   * This retrieves all files changed since the last commit and returns them
   * as artifact files suitable for syncing to Convex.
   *
   * @param workspace - Workspace to capture changes from
   * @returns Promise resolving to array of changed files
   */
  async captureChanges(
    workspace: VirtualWorkspace
  ): Promise<ArtifactFile[]> {
    const git: SimpleGit = simpleGit(workspace.localPath);

    try {
      // Fetch latest changes from remote
      console.log(`[Workspace] Fetching changes for ${workspace.repoName}`);
      await git.fetch("origin", workspace.branch);
      await git.pull("origin", workspace.branch);

      // Get list of changed files (comparing to previous commit)
      const diff = await git.diff(["HEAD~1", "HEAD", "--name-only"]);
      const changedFiles = diff.split("\n").filter(Boolean);

      console.log(
        `[Workspace] Found ${changedFiles.length} changed file(s)`
      );

      // Read contents of each changed file
      const artifacts: ArtifactFile[] = [];

      for (const filename of changedFiles) {
        try {
          const filePath = join(workspace.localPath, filename);
          const content = await readFile(filePath, "utf-8");
          artifacts.push({ filename, content });
        } catch (error) {
          console.error(
            `[Workspace] Failed to read ${filename}, skipping:`,
            error
          );
          // Skip files that can't be read (might be binary, deleted, etc.)
        }
      }

      return artifacts;
    } catch (error) {
      console.error("[Workspace] Failed to capture changes:", error);
      throw error;
    }
  }

  /**
   * Set up Cursor environment configuration
   *
   * Creates .cursor/environment.json with setup commands and environment variables
   * that Cursor Background Agents will use.
   *
   * @param workspace - Workspace to configure
   * @param convexUrl - Convex deployment URL for backend integration
   */
  async setupEnvironmentConfig(
    workspace: VirtualWorkspace,
    convexUrl: string
  ): Promise<void> {
    const git: SimpleGit = simpleGit(workspace.localPath);

    try {
      // Create .cursor directory
      const cursorDir = join(workspace.localPath, ".cursor");
      await mkdir(cursorDir, { recursive: true });

      // Environment configuration
      const environmentConfig = {
        snapshot: "POPULATED_FROM_SETTINGS",
        install: "npm install || pnpm install || yarn install || true",
        terminals: [
          {
            name: "Dev Server",
            command: "npm run dev || pnpm dev || yarn dev || true",
          },
        ],
        environment_variables: {
          CONVEX_URL: convexUrl,
          NODE_ENV: "development",
        },
      };

      // Write environment.json
      await writeFile(
        join(cursorDir, "environment.json"),
        JSON.stringify(environmentConfig, null, 2),
        "utf-8"
      );

      // Create .tools directory for custom tools
      const toolsDir = join(workspace.localPath, ".tools");
      await mkdir(toolsDir, { recursive: true });

      // Create a placeholder Convex tool (agents can use this to interact with backend)
      const convexToolContent = `/**
 * Convex Integration Tool for Cursor Agents
 *
 * This tool allows the agent to interact with the Convex backend.
 * In a full implementation, this would provide methods to:
 * - Query Convex database
 * - Update todos
 * - Create artifacts
 * - Send messages
 */

export class ConvexTool {
  private readonly convexUrl: string;

  constructor() {
    this.convexUrl = process.env.CONVEX_URL || "";
  }

  /**
   * Execute a Convex query
   */
  async query(queryName: string, args: any) {
    console.log("Convex query:", queryName, args);
    // Implementation would use Convex client
    return null;
  }

  /**
   * Execute a Convex mutation
   */
  async mutate(mutationName: string, args: any) {
    console.log("Convex mutation:", mutationName, args);
    // Implementation would use Convex client
    return null;
  }
}
`;

      await writeFile(
        join(toolsDir, "convex-tool.ts"),
        convexToolContent,
        "utf-8"
      );

      // Commit configuration
      await git.add(".cursor/");
      await git.add(".tools/");
      await git.commit("Configure Cursor environment and tools");
      await git.push("origin", workspace.branch);

      console.log(
        `[Workspace] Configured Cursor environment for ${workspace.repoName}`
      );
    } catch (error) {
      console.error(
        "[Workspace] Failed to set up environment config:",
        error
      );
      throw error;
    }
  }

  /**
   * Batch delete multiple repositories
   *
   * Useful for cleanup operations when you have many orphaned repos.
   *
   * @param repoNames - Array of repository names to delete
   * @returns Promise resolving to array of results (success/failure per repo)
   */
  async batchDeleteRepos(
    repoNames: string[]
  ): Promise<Array<{ repo: string; success: boolean; error?: string }>> {
    const results = [];

    for (const repoName of repoNames) {
      try {
        await this.octokit.rest.repos.delete({
          owner: this.githubUsername,
          repo: repoName,
        });
        results.push({ repo: repoName, success: true });
        console.log(`[Workspace] Deleted repo: ${repoName}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ repo: repoName, success: false, error: errorMsg });
        console.error(`[Workspace] Failed to delete ${repoName}:`, error);
      }
    }

    return results;
  }
}
