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

import type { Id } from "@recursor/convex/_generated/dataModel";
import { mkdir, readFile, writeFile, readdir, stat, access } from "fs/promises";
import { Octokit } from "octokit";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import simpleGit, { SimpleGit } from "simple-git";
import { dir as createTmpDir } from "tmp-promise";

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
  private readonly githubOwner: string;

  /**
   * Create a new workspace manager
   *
   * @param githubToken - GitHub Personal Access Token with repo permissions
   * @param githubOwner - GitHub organization or username (defaults to "recursor-sandbox")
   */
  constructor(githubToken: string, githubOwner: string = "recursor-sandbox") {
    if (!githubToken || githubToken.trim() === "") {
      throw new Error("GitHub token is required");
    }

    this.octokit = new Octokit({ auth: githubToken });
    this.githubOwner = githubOwner;
  }

  /**
   * Clone an existing workspace repository
   *
   * This will:
   * 1. Clone the existing GitHub repository locally
   * 2. Checkout or create the agent branch
   * 3. Pull latest changes
   *
   * @param stackId - Agent stack identifier
   * @param repoUrl - Full GitHub repository URL to clone
   * @param repoName - Repository name (without owner)
   * @param branch - Branch to work on
   * @returns Promise resolving to workspace information
   */
  async cloneExistingWorkspace(
    stackId: Id<"agent_stacks">,
    repoUrl: string,
    repoName: string,
    branch: string = "agent-workspace"
  ): Promise<VirtualWorkspace> {
    try {
      // 1. Create temporary local directory
      const { path: localPath, cleanup: cleanupDir } = await createTmpDir({
        unsafeCleanup: true,
      });

      // 2. Clone repository
      console.log(`[Workspace] Cloning existing repo to ${localPath}`);
      const git: SimpleGit = simpleGit();
      await git.clone(repoUrl, localPath);

      // 3. Configure git in the cloned directory
      const repoGit: SimpleGit = simpleGit(localPath);
      await repoGit.addConfig("user.name", "Recursor Agent");
      await repoGit.addConfig("user.email", "agent@recursor.ai");

      // 4. Checkout existing branch or create new one
      const branches = await repoGit.branch();
      if (
        branches.all.includes(branch) ||
        branches.all.includes(`remotes/origin/${branch}`)
      ) {
        console.log(`[Workspace] Checking out existing branch: ${branch}`);
        await repoGit.checkout(branch);
        await repoGit.pull("origin", branch);
      } else {
        console.log(`[Workspace] Creating new branch: ${branch}`);
        await repoGit.checkoutLocalBranch(branch);
        await repoGit.push("origin", branch, { "--set-upstream": null });
      }

      // 4.5. Set up agent workflow guides if they don't exist
      const docsPath = join(localPath, 'docs', 'cursor-agent');
      try {
        await access(docsPath);
        console.log('[Workspace] Workflow guides already exist');
      } catch {
        console.log('[Workspace] Workflow guides not found, setting them up...');
        await this.setupAgentWorkflows(localPath, branch);
      }

      // 5. Create cleanup function (only deletes local directory, NOT GitHub repo)
      const cleanup = async () => {
        try {
          // Clean up local directory only
          await cleanupDir();
          console.log(`[Workspace] Cleaned up local workspace for ${repoName}`);
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
        repoUrl: repoUrl.replace(/\.git$/, ""),
        repoName,
        localPath,
        branch,
        cleanup,
      };

      console.log(`[Workspace] Cloned existing workspace: ${repoName}`);
      return workspace;
    } catch (error) {
      console.error("[Workspace] Failed to clone existing workspace:", error);
      throw error;
    }
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
    // Generate repo name WITHOUT timestamp (persistent repo per team)
    const sanitizedName = participantName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    const repoName = `recursor-${sanitizedName}`;
    const branch = `agent-workspace`;

    try {
      // 1. Check if repository already exists, create if not
      console.log(
        `[Workspace] Checking for existing repo: ${this.githubOwner}/${repoName}`
      );

      let repo;
      try {
        // Try to get existing repository
        const { data: existingRepo } = await this.octokit.rest.repos.get({
          owner: this.githubOwner,
          repo: repoName,
        });

        console.log(
          `[Workspace] Repository already exists, using it: ${this.githubOwner}/${repoName}`
        );
        console.log(
          `[Workspace] Repository is ${existingRepo.private ? "PRIVATE" : "PUBLIC"}`
        );
        console.log(`[Workspace] Clone URL: ${existingRepo.clone_url}`);
        repo = existingRepo;
      } catch (error: unknown) {
        // Repository doesn't exist (404), create it
        const isNotFound = (error as { status?: number }).status === 404;
        if (isNotFound) {
          console.log(
            `[Workspace] Creating new GitHub repo: ${this.githubOwner}/${repoName}`
          );
          const { data: newRepo } = await this.octokit.rest.repos.createInOrg({
            org: this.githubOwner,
            name: repoName,
            private: false, // Public repo for Cursor API access
            auto_init: true,
            description: `Virtual workspace for Recursor agent ${participantName}`,
          });
          console.log(`[Workspace] Created PUBLIC repository`);
          console.log(`[Workspace] Clone URL: ${newRepo.clone_url}`);
          repo = newRepo;
        } else {
          // Some other error occurred
          throw error;
        }
      }

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

      // 5. Create or checkout agent branch
      // Check if branch exists on remote to avoid push conflicts
      const branches = await repoGit.branch(["-r"]);
      const remoteBranchExists = branches.all.includes(`origin/${branch}`);

      if (remoteBranchExists) {
        console.log(`[Workspace] Checking out existing branch: ${branch}`);
        await repoGit.checkout(branch);
        await repoGit.pull("origin", branch);
      } else {
        console.log(`[Workspace] Creating new branch: ${branch}`);
        await repoGit.checkoutLocalBranch(branch);
      }

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

      // 6. Set up agent workflow guides and documentation
      await this.setupAgentWorkflows(localPath, branch);

      // 7. Create cleanup function (only deletes local directory, preserves GitHub repo)
      const cleanup = async () => {
        try {
          // Clean up local directory only
          await cleanupDir();
          console.log(`[Workspace] Cleaned up local workspace for ${repoName}`);

          // NOTE: We do NOT delete the GitHub repository anymore.
          // The repo is persistent per team and will be reused across restarts.
          // To manually clean up repos, use the batchDeleteRepos() method.
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
        repoUrl: repo.clone_url.replace(/\.git$/, ""),
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
  async captureChanges(workspace: VirtualWorkspace): Promise<ArtifactFile[]> {
    const git: SimpleGit = simpleGit(workspace.localPath);

    try {
      // Fetch latest changes from remote
      console.log(`[Workspace] Fetching changes for ${workspace.repoName}`);
      await git.fetch("origin", workspace.branch);
      await git.pull("origin", workspace.branch);

      // Get list of changed files (comparing to previous commit)
      const diff = await git.diff(["HEAD~1", "HEAD", "--name-only"]);
      const changedFiles = diff.split("\n").filter(Boolean);

      console.log(`[Workspace] Found ${changedFiles.length} changed file(s)`);

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
      // Pull latest changes from remote before making any modifications
      // This prevents "reference already exists" errors when the branch exists remotely
      console.log(`[Workspace] Pulling latest changes before environment setup`);
      try {
        await git.pull("origin", workspace.branch);
      } catch (pullError) {
        // If pull fails (e.g., no remote branch yet), that's fine - we'll create it
        console.log(
          `[Workspace] Pull failed (branch may not exist on remote yet):`,
          pullError instanceof Error ? pullError.message : String(pullError)
        );
      }

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

      // Check if there are any changes to commit
      const status = await git.status();

      if (status.files.length > 0) {
        // Only commit and push if there are changes
        console.log(`[Workspace] Committing environment configuration changes`);
        await git.add(".cursor/");
        await git.add(".tools/");
        await git.commit("Configure Cursor environment and tools");

        // Push with --force-with-lease to handle remote branch conflicts safely
        // This will only force push if no one else has pushed changes
        await git.push("origin", workspace.branch, ["--force-with-lease"]);

        console.log(
          `[Workspace] Configured Cursor environment for ${workspace.repoName}`
        );
      } else {
        console.log(
          `[Workspace] Environment configuration already up-to-date for ${workspace.repoName}`
        );
      }
    } catch (error) {
      console.error("[Workspace] Failed to set up environment config:", error);
      throw error;
    }
  }

  /**
   * Get recent commits from a repository branch
   *
   * Useful for monitoring agent activity in real-time.
   *
   * @param repoName - Repository name (without owner)
   * @param branch - Branch to check
   * @param limit - Maximum number of commits to return (default: 10)
   * @returns Promise resolving to array of commit information
   */
  async getRecentCommits(
    repoName: string,
    branch: string,
    limit: number = 10
  ): Promise<
    Array<{
      sha: string;
      message: string;
      author: string;
      date: string;
      url: string;
    }>
  > {
    try {
      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner: this.githubOwner,
        repo: repoName,
        sha: branch,
        per_page: limit,
      });

      return commits.map((commit) => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message,
        author: commit.commit.author?.name || "Unknown",
        date: commit.commit.author?.date || "",
        url: commit.html_url,
      }));
    } catch (error) {
      console.error(
        `[Workspace] Failed to get commits for ${repoName}:`,
        error
      );
      return [];
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
          owner: this.githubOwner,
          repo: repoName,
        });
        results.push({ repo: repoName, success: true });
        console.log(
          `[Workspace] Deleted repo: ${this.githubOwner}/${repoName}`
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        results.push({ repo: repoName, success: false, error: errorMsg });
        console.error(`[Workspace] Failed to delete ${repoName}:`, error);
      }
    }

    return results;
  }

  /**
   * Set up agent workflow documentation in the repository
   *
   * This creates the "external brain" for the agent with all decision-making guides.
   * The guides are copied from the workflow-guides directory and committed to the workspace.
   *
   * Directory structure created:
   * ```
   * docs/cursor-agent/
   *   workflows/       - Role-specific guides
   *   frameworks/      - Decision frameworks
   *   examples/        - Example showcases
   *   templates/       - Execution template
   *   README.md        - Overview
   * logs/              - Execution logs (with .gitkeep)
   * ```
   *
   * @param localPath - Local path to workspace directory
   * @param branch - Git branch name to commit to
   * @returns Promise that resolves when setup is complete
   */
  async setupAgentWorkflows(localPath: string, branch: string): Promise<void> {
    console.log('[WorkspaceManager] Creating agent workflow documentation...');

    try {
      const repoGit: SimpleGit = simpleGit(localPath);

      // Get the path to the workflow-guides directory
      // We need to go from workspace-manager.ts location to workflow-guides/
      const workflowGuidesPath = join(
        dirname(fileURLToPath(import.meta.url)),
        'workflow-guides'
      );

      console.log(`[WorkspaceManager] Reading guides from: ${workflowGuidesPath}`);

      // Create target directories in workspace
      const docsPath = join(localPath, 'docs', 'cursor-agent');
      await mkdir(join(docsPath, 'workflows'), { recursive: true });
      await mkdir(join(docsPath, 'frameworks'), { recursive: true });
      await mkdir(join(docsPath, 'examples'), { recursive: true });
      await mkdir(join(docsPath, 'templates'), { recursive: true });
      await mkdir(join(localPath, 'logs'), { recursive: true });

      // Copy all workflow guides
      await this.copyDirectoryContents(
        join(workflowGuidesPath, 'workflows'),
        join(docsPath, 'workflows')
      );
      console.log('[WorkspaceManager] ✓ Copied workflow guides');

      // Copy all frameworks
      await this.copyDirectoryContents(
        join(workflowGuidesPath, 'frameworks'),
        join(docsPath, 'frameworks')
      );
      console.log('[WorkspaceManager] ✓ Copied decision frameworks');

      // Copy all examples
      await this.copyDirectoryContents(
        join(workflowGuidesPath, 'examples'),
        join(docsPath, 'examples')
      );
      console.log('[WorkspaceManager] ✓ Copied example showcases');

      // Copy execution template
      await this.copyDirectoryContents(
        join(workflowGuidesPath, 'templates'),
        join(docsPath, 'templates')
      );
      console.log('[WorkspaceManager] ✓ Copied execution template');

      // Create README.md for docs/cursor-agent
      await this.createAgentDocsReadme(docsPath);
      console.log('[WorkspaceManager] ✓ Created documentation README');

      // Create .gitkeep in logs directory
      await writeFile(join(localPath, 'logs', '.gitkeep'), '', 'utf-8');
      console.log('[WorkspaceManager] ✓ Initialized logs directory');

      // Commit the documentation
      await repoGit.add('docs/cursor-agent/');
      await repoGit.add('logs/.gitkeep');
      await repoGit.commit('chore: add agent workflow guides and decision frameworks\n\nAdd comprehensive documentation for autonomous agent decision-making:\n- Workflow guides for each role (planning, building, review, communication)\n- Decision frameworks (phase management, priority scoring, commit strategy, scope management)\n- Example showcases demonstrating excellence\n- Execution template for structured thinking\n\nThese guides provide the agent with systematic decision-making frameworks.');
      await repoGit.push('origin', branch);

      console.log('[WorkspaceManager] ✓ Agent documentation committed and pushed');
    } catch (error) {
      console.error('[WorkspaceManager] Failed to set up agent workflows:', error);
      throw error;
    }
  }

  /**
   * Copy all files from a source directory to a destination directory
   *
   * @param sourcePath - Source directory path
   * @param destPath - Destination directory path
   */
  private async copyDirectoryContents(
    sourcePath: string,
    destPath: string
  ): Promise<void> {
    try {
      const files = await readdir(sourcePath);

      for (const file of files) {
        const sourceFile = join(sourcePath, file);
        const destFile = join(destPath, file);

        // Check if it's a directory or file
        const stats = await stat(sourceFile);

        if (stats.isDirectory()) {
          // Recursively copy subdirectories
          await mkdir(destFile, { recursive: true });
          await this.copyDirectoryContents(sourceFile, destFile);
        } else if (stats.isFile()) {
          // Copy file
          const content = await readFile(sourceFile, 'utf-8');
          await writeFile(destFile, content, 'utf-8');
        }
      }
    } catch (error) {
      console.error(`[WorkspaceManager] Error copying from ${sourcePath} to ${destPath}:`, error);
      throw error;
    }
  }

  /**
   * Create README.md explaining the agent documentation system
   *
   * @param docsPath - Path to docs/cursor-agent directory
   */
  private async createAgentDocsReadme(docsPath: string): Promise<void> {
    const readme = `# Cursor Agent Documentation

This directory contains your workflow guides, decision frameworks, and execution templates.

## How This Works

You are an autonomous agent simulating a 4-person team (Planner, Builder, Communicator, Reviewer).
This documentation gives you the expertise of each role.

## Directory Structure

- **workflows/** - Detailed guides for each role (read these when executing that role)
- **frameworks/** - Decision-making frameworks (reference for specific decisions)
- **examples/** - Showcases of excellent decisions (learn from these)
- **templates/** - Execution log template (copy and fill out each tick)

## Execution Process

For each tick:

1. Copy \`templates/tick-execution-template.md\` to \`../../logs/tick-NNN.md\`
2. Read \`workflows/planning.md\` and execute planning role
3. Read \`workflows/building.md\` and execute building role
4. Read \`workflows/review.md\` and execute review role
5. Read \`workflows/communication.md\` and execute communication role
6. Fill out the execution log as you go
7. Commit everything (code changes + execution log)

## Key Principle

**The guides contain hard-won expertise from many iterations.**
Trust them. Follow the decision frameworks. Reference the examples.

Your job is to execute the workflows, not reinvent them.

## Reference Materials

### Quick Links

- [Planning Guide](workflows/planning.md) - Todo management, phase transitions, priority scoring
- [Building Guide](workflows/building.md) - Code implementation, git workflow, quality standards
- [Review Guide](workflows/review.md) - Demo readiness, time management, scope cutting
- [Communication Guide](workflows/communication.md) - User responses, team messages, broadcasts

### Decision Frameworks

- [Phase Management](frameworks/phase-management.md) - When to transition between phases
- [Priority Scoring](frameworks/priority-scoring.md) - How to score priorities 1-10
- [Commit Strategy](frameworks/commit-strategy.md) - When and how to commit
- [Scope Management](frameworks/scope-management.md) - How to cut scope under time pressure

### Example Showcases

- [Excellent Planning](examples/excellent-planning.md) - Strategic planning and scope cutting
- [Excellent Building](examples/excellent-building.md) - Multi-file implementation best practices
- [Scope Cut Success](examples/scope-cut-success.md) - Successful scope management
- [Phase Transitions](examples/phase-transition.md) - Well-timed phase transitions
- [Excellent Communication](examples/excellent-communication.md) - Natural user/team communication

## Remember

- **Follow the workflows** - They contain proven expertise
- **Document your decisions** - Fill out execution logs completely
- **Commit frequently** - Uncommitted work disappears
- **Move fast** - This is a hackathon, not production
- **Be specific** - Vague decisions lead to vague results
`;

    await writeFile(join(docsPath, 'README.md'), readme, 'utf-8');
  }
}
