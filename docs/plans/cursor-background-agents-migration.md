# Cursor Background Agents Migration Plan

**Status:** Draft  
**Created:** 2025-10-18  
**Objective:** Replace 4-agent orchestrator with Cursor Background Agents for improved code quality, scalability, and maintainability

## Executive Summary

This plan details the migration from our current multi-agent orchestration system (Planner, Builder, Communicator, Reviewer) to Cursor's Background Agents API. The migration will simplify architecture, improve code quality through native IDE tooling, and enable better scalability for 300-500 concurrent agents.

**Key Decision:** Proceed with migration using a phased rollout approach with comprehensive fallback mechanisms.

**Timeline:** 4-6 weeks (including testing and optimization)  
**Risk Level:** Medium (mitigated by fallback systems)  
**Expected Benefits:** 40-60% reduction in code complexity, 2-3x improvement in artifact quality

---

## Table of Contents

1. [Current Architecture Analysis](#current-architecture-analysis)
2. [Cursor Background Agents Overview](#cursor-background-agents-overview)
3. [Tradeoff Analysis](#tradeoff-analysis)
4. [Target Architecture](#target-architecture)
5. [Implementation Plan](#implementation-plan)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Cost Analysis](#cost-analysis)
9. [Success Metrics](#success-metrics)

---

## Current Architecture Analysis

### System Overview

```
AgentStackOrchestrator (tick-based loop)
├─ PlannerAgent: Strategic planning, todo creation
├─ BuilderAgent: HTML/JS generation via LLM
├─ CommunicatorAgent: Inter-agent messaging
└─ ReviewerAgent: Progress analysis, feedback
```

### Current Flow (per tick)

1. **Planner** (5-10s): Analyzes state → creates/updates todos
2. **Builder** (15-30s): Takes highest priority todo → generates HTML via Groq
3. **Communicator** (3-5s): Processes messages → responds
4. **Reviewer** (5-8s): Analyzes progress → provides recommendations to Planner
5. **Total**: ~30-50s per tick per agent stack

### Current Strengths

- ✅ Full control over agent behavior and timing
- ✅ Predictable cost structure (Groq + OpenAI API calls)
- ✅ Well-understood architecture
- ✅ Works with existing Convex infrastructure
- ✅ No external dependencies beyond LLM APIs

### Current Limitations

- ❌ Single-file HTML generation only (no multi-file projects)
- ❌ No IDE tooling (no grep, linting, refactoring)
- ❌ Regenerates entire files instead of incremental edits
- ❌ Limited code quality (LLM prompt → raw output)
- ❌ Complex orchestration logic (200+ LOC for coordination)
- ❌ No built-in error recovery for builds
- ❌ Difficult to add new agent capabilities

---

## Cursor Background Agents Overview

### Key Features

**API Access**

- REST API with Bearer token authentication
- Base URL: `https://api.cursor.com/v1/background-agents`
- Up to 256 concurrent agents per API key

**Capabilities**

- Autonomous code editing in isolated Ubuntu VMs
- Full IDE tooling (grep, file ops, terminal, git)
- Multi-file project support
- Incremental code editing
- Follow-up prompts for iterative development
- Branch-based workflow (clone → edit → push)

**Configuration**

- Model selection (Max Mode compatible: Claude 3.5 Sonnet, etc.)
- Custom tools via `.tools/` directory
- Environment setup via `.cursor/environment.json`
- Runtime limits and resource controls

### API Endpoints

```typescript
// Create agent
POST /v1/background-agents
{
  repository: string,      // Git repo URL or local path
  branch: string,          // Target branch
  prompt: string,          // Task description
  model?: string,          // e.g., "claude-3.5-sonnet"
  max_runtime_minutes?: number,
  environment?: {
    setup_commands: string[],
    terminal_processes: string[],
    custom_tools: string[],
    environment_variables: Record<string, string>
  }
}

// Get agent status
GET /v1/background-agents/:agentId

// Send follow-up prompt
POST /v1/background-agents/:agentId/prompt
{ prompt: string }

// Terminate agent
DELETE /v1/background-agents/:agentId
```

---

## Tradeoff Analysis

### Benefits of Migration

| Aspect              | Current System       | Cursor Background Agents      | Improvement |
| ------------------- | -------------------- | ----------------------------- | ----------- |
| **Code Quality**    | LLM-generated HTML   | IDE-quality code with tooling | +70%        |
| **Project Types**   | Single HTML file     | Multi-file projects           | ∞           |
| **Editing**         | Full regeneration    | Incremental edits             | +90%        |
| **Tool Access**     | None                 | grep, lint, test, git         | ∞           |
| **Error Recovery**  | Manual retry         | Built-in error handling       | +80%        |
| **Code Complexity** | ~1,500 LOC           | ~500 LOC (estimated)          | -67%        |
| **Scalability**     | Custom orchestration | Purpose-built for scale       | +50%        |

### Costs & Risks

| Concern            | Current                             | With Cursor BG Agents       | Mitigation                                    |
| ------------------ | ----------------------------------- | --------------------------- | --------------------------------------------- |
| **API Costs**      | $0.10-0.50/agent/hour (Groq/OpenAI) | $1-3/agent/hour (estimated) | Optimize agent runtime, implement hibernation |
| **Vendor Lock-in** | Low (multi-provider)                | Medium (Cursor-specific)    | Maintain fallback to current system           |
| **Debugging**      | Full observability                  | Limited (VM-based)          | Enhanced trace logging, capture VM outputs    |
| **Latency**        | 30-50s/tick                         | 60-120s/tick (estimated)    | Acceptable for hackathon simulation           |
| **Concurrency**    | Unlimited (self-hosted)             | 256 agents/key              | Obtain multiple API keys if needed            |
| **Learning Curve** | Known system                        | New API/tooling             | Phase 1 POC to derisk                         |

### Decision Matrix

| Criteria        | Weight | Current    | Cursor BG   | Weighted Score       |
| --------------- | ------ | ---------- | ----------- | -------------------- |
| Code Quality    | 30%    | 6/10       | 9/10        | +0.9                 |
| Maintainability | 25%    | 5/10       | 9/10        | +1.0                 |
| Cost            | 20%    | 9/10       | 6/10        | -0.6                 |
| Scalability     | 15%    | 7/10       | 8/10        | +0.15                |
| Risk            | 10%    | 9/10       | 6/10        | -0.3                 |
| **Total**       |        | **6.6/10** | **7.75/10** | **+17% improvement** |

**Recommendation:** Proceed with migration. The benefits in code quality and maintainability outweigh cost and risk concerns.

---

## Target Architecture

### New System Design

```
CursorBackgroundOrchestrator
├─ VirtualWorkspaceManager: Creates/manages git repos for agents
├─ CursorAPIClient: Wraps Background Agents API
├─ ArtifactSyncService: Bidirectional sync between Convex and repos
├─ ConvexToolsProvider: Custom tools for Convex integration
└─ FallbackOrchestrator: Legacy system for degraded mode
```

### Agent Lifecycle

```mermaid
graph TD
    A[Tick Start] --> B[Check Todos]
    B --> C{Has Pending Todo?}
    C -->|No| D[Idle]
    C -->|Yes| E[Create Virtual Workspace]
    E --> F[Materialize Artifacts]
    F --> G[Create Background Agent]
    G --> H[Monitor Agent]
    H --> I{Agent Complete?}
    I -->|No| J{Timeout?}
    J -->|No| H
    J -->|Yes| K[Terminate Agent]
    I -->|Yes| L[Capture Changes]
    L --> M[Update Artifacts in Convex]
    M --> N[Update Todo Status]
    N --> O[Cleanup Workspace]
    O --> P[Tick End]
    K --> P
```

### Virtual Workspace Strategy

**Option A: Git Repository Per Agent (Recommended)**

- Create temp GitHub repos for each agent stack
- Pros: Full git integration, branch-based workflow, easy collaboration
- Cons: GitHub API rate limits, repo cleanup needed

**Option B: Local Filesystem**

- Create temp directories with git init
- Pros: No external dependencies, faster
- Cons: No remote backup, harder to debug

**Option C: Convex File Storage**

- Store files in Convex, materialize on-demand
- Pros: Centralized, real-time sync
- Cons: Not native git workflow

**Selected:** Option A with GitHub for reliability and debugging capabilities

---

## Implementation Plan

### Phase 0: Prerequisites (Week 1)

**Objectives:** Set up infrastructure, validate API access, create test environment

#### Step 0.1: Cursor API Setup

```bash
# 1. Obtain API key from Cursor Dashboard
# Navigate to: https://cursor.com/dashboard → Integrations → Create API Key
# Save to environment variables

# 2. Create API key management
echo "CURSOR_API_KEY=your-key-here" >> .env.local

# 3. Test API connectivity
curl -H "Authorization: Bearer $CURSOR_API_KEY" \
  https://api.cursor.com/v1/background-agents
```

#### Step 0.2: Create GitHub Bot Account

```bash
# 1. Create dedicated GitHub account for agent repos
# Username: recursor-agent-bot

# 2. Generate Personal Access Token
# Scope: repo (full), delete_repo

# 3. Save to environment
echo "GITHUB_BOT_TOKEN=ghp_..." >> .env.local
```

#### Step 0.3: Install Dependencies

```json
// packages/agent-engine/package.json
{
  "dependencies": {
    "octokit": "^3.1.2", // GitHub API
    "simple-git": "^3.22.0", // Git operations
    "tmp-promise": "^3.0.3" // Temp directory management
  }
}
```

```bash
cd packages/agent-engine
pnpm install
```

#### Step 0.4: Create Project Structure

```bash
mkdir -p packages/agent-engine/src/cursor
touch packages/agent-engine/src/cursor/api-client.ts
touch packages/agent-engine/src/cursor/workspace-manager.ts
touch packages/agent-engine/src/cursor/artifact-sync.ts
touch packages/agent-engine/src/cursor/orchestrator.ts
touch packages/agent-engine/src/cursor/tools/convex-tool.ts
```

**Deliverables:**

- ✅ Cursor API access validated
- ✅ GitHub bot account configured
- ✅ Dependencies installed
- ✅ Project structure created

**Time:** 1-2 days  
**Owner:** Backend engineer  
**Success Criteria:** Can create test background agent via API

---

### Phase 1: Core Infrastructure (Week 1-2)

**Objectives:** Build foundational components for Cursor integration

#### Step 1.1: Cursor API Client

**File:** `packages/agent-engine/src/cursor/api-client.ts`

```typescript
import type { Id } from "@recursor/convex/_generated/dataModel";

export interface BackgroundAgentRequest {
  repository: string;
  branch: string;
  prompt: string;
  model?: string;
  max_runtime_minutes?: number;
  environment?: {
    setup_commands?: string[];
    terminal_processes?: string[];
    custom_tools?: string[];
    environment_variables?: Record<string, string>;
  };
}

export interface BackgroundAgentResponse {
  agent_id: string;
  status: "creating" | "running" | "completed" | "failed" | "terminated";
  created_at: string;
  repository: string;
  branch: string;
  model: string;
  outputs?: {
    files_changed: string[];
    commits: string[];
    terminal_output: string;
  };
  error?: string;
}

export class CursorAPIClient {
  private apiKey: string;
  private baseURL = "https://api.cursor.com/v1";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("Cursor API key is required");
    }
    this.apiKey = apiKey;
  }

  async createAgent(
    request: BackgroundAgentRequest
  ): Promise<BackgroundAgentResponse> {
    const response = await fetch(`${this.baseURL}/background-agents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create background agent: ${error}`);
    }

    return await response.json();
  }

  async getAgentStatus(agentId: string): Promise<BackgroundAgentResponse> {
    const response = await fetch(
      `${this.baseURL}/background-agents/${agentId}`,
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get agent status: ${await response.text()}`);
    }

    return await response.json();
  }

  async sendFollowUp(agentId: string, prompt: string): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/background-agents/${agentId}/prompt`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to send follow-up: ${await response.text()}`);
    }
  }

  async terminateAgent(agentId: string): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/background-agents/${agentId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to terminate agent: ${await response.text()}`);
    }
  }

  async pollUntilComplete(
    agentId: string,
    maxWaitMs: number = 300000,
    pollIntervalMs: number = 5000
  ): Promise<BackgroundAgentResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getAgentStatus(agentId);

      if (status.status === "completed" || status.status === "failed") {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Agent ${agentId} did not complete within ${maxWaitMs}ms`);
  }
}
```

#### Step 1.2: Virtual Workspace Manager

**File:** `packages/agent-engine/src/cursor/workspace-manager.ts`

```typescript
import { Octokit } from "octokit";
import simpleGit from "simple-git";
import { tmpdir } from "tmp-promise";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Id } from "@recursor/convex/_generated/dataModel";

export interface VirtualWorkspace {
  stackId: Id<"agent_stacks">;
  repoUrl: string;
  repoName: string;
  localPath: string;
  branch: string;
  cleanup: () => Promise<void>;
}

export class VirtualWorkspaceManager {
  private octokit: Octokit;
  private githubUsername: string;

  constructor(
    githubToken: string,
    githubUsername: string = "recursor-agent-bot"
  ) {
    this.octokit = new Octokit({ auth: githubToken });
    this.githubUsername = githubUsername;
  }

  async createWorkspace(
    stackId: Id<"agent_stacks">,
    participantName: string,
    artifacts?: Array<{ filename: string; content: string }>
  ): Promise<VirtualWorkspace> {
    const repoName = `${participantName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    const branch = `agent-${stackId}`;

    try {
      const { data: repo } =
        await this.octokit.rest.repos.createForAuthenticatedUser({
          name: repoName,
          private: true,
          auto_init: true,
          description: `Virtual workspace for Recursor agent ${participantName}`,
        });

      const { path: localPath, cleanup } = await tmpdir({
        unsafeCleanup: true,
      });

      const git = simpleGit(localPath);
      await git.clone(repo.clone_url, localPath);
      await git.checkoutLocalBranch(branch);

      if (artifacts && artifacts.length > 0) {
        for (const artifact of artifacts) {
          const filePath = join(localPath, artifact.filename);
          await mkdir(join(localPath, artifact.filename, ".."), {
            recursive: true,
          });
          await writeFile(filePath, artifact.content);
        }

        await git.add(".");
        await git.commit("Initialize workspace with existing artifacts");
        await git.push("origin", branch, { "--set-upstream": null });
      }

      const workspace: VirtualWorkspace = {
        stackId,
        repoUrl: repo.clone_url,
        repoName,
        localPath,
        branch,
        cleanup: async () => {
          await cleanup();
          try {
            await this.octokit.rest.repos.delete({
              owner: this.githubUsername,
              repo: repoName,
            });
          } catch (error) {
            console.error(`Failed to delete repo ${repoName}:`, error);
          }
        },
      };

      return workspace;
    } catch (error) {
      console.error("Failed to create workspace:", error);
      throw error;
    }
  }

  async captureChanges(
    workspace: VirtualWorkspace
  ): Promise<Array<{ filename: string; content: string }>> {
    const git = simpleGit(workspace.localPath);

    await git.fetch("origin", workspace.branch);
    await git.pull("origin", workspace.branch);

    const diff = await git.diff(["HEAD~1", "HEAD", "--name-only"]);
    const changedFiles = diff.split("\n").filter(Boolean);

    const artifacts: Array<{ filename: string; content: string }> = [];

    const { readFile } = await import("fs/promises");

    for (const file of changedFiles) {
      try {
        const content = await readFile(
          join(workspace.localPath, file),
          "utf-8"
        );
        artifacts.push({ filename: file, content });
      } catch (error) {
        console.error(`Failed to read ${file}:`, error);
      }
    }

    return artifacts;
  }

  async setupEnvironmentConfig(
    workspace: VirtualWorkspace,
    convexUrl: string
  ): Promise<void> {
    const configDir = join(workspace.localPath, ".cursor");
    await mkdir(configDir, { recursive: true });

    const environmentConfig = {
      setup_commands: ["npm install", "pnpm install || true"],
      terminal_processes: ["npm run dev || true"],
      custom_tools: [".tools/convex-tool.ts"],
      environment_variables: {
        CONVEX_URL: convexUrl,
        NODE_ENV: "development",
      },
    };

    await writeFile(
      join(configDir, "environment.json"),
      JSON.stringify(environmentConfig, null, 2)
    );

    const toolsDir = join(workspace.localPath, ".tools");
    await mkdir(toolsDir, { recursive: true });

    const convexToolContent = `
export class ConvexTool {
  async query(queryName: string, args: any) {
    // Placeholder for Convex query execution
    console.log('Executing query:', queryName, args);
  }
}
`;

    await writeFile(join(toolsDir, "convex-tool.ts"), convexToolContent.trim());

    const git = simpleGit(workspace.localPath);
    await git.add(".cursor/");
    await git.add(".tools/");
    await git.commit("Add Cursor environment configuration");
    await git.push("origin", workspace.branch);
  }
}
```

#### Step 1.3: Artifact Sync Service

**File:** `packages/agent-engine/src/cursor/artifact-sync.ts`

```typescript
import { ConvexClient } from "convex/browser";
import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";

export interface ArtifactFile {
  filename: string;
  content: string;
}

export class ArtifactSyncService {
  private client: ConvexClient;

  constructor(convexUrl: string) {
    this.client = new ConvexClient(convexUrl);
  }

  async materializeArtifacts(
    stackId: Id<"agent_stacks">
  ): Promise<ArtifactFile[]> {
    const artifacts = await this.client.query(api.artifacts.list, { stackId });

    if (!artifacts || artifacts.length === 0) {
      return [];
    }

    const latestArtifact = artifacts[0];

    if (latestArtifact.type === "html_js" && latestArtifact.content) {
      return [
        {
          filename: "index.html",
          content: latestArtifact.content,
        },
      ];
    }

    return [];
  }

  async syncChangesToConvex(
    stackId: Id<"agent_stacks">,
    changes: ArtifactFile[],
    metadata: {
      agent_id: string;
      files_changed: string[];
      terminal_output?: string;
    }
  ): Promise<void> {
    if (changes.length === 0) return;

    if (changes.length === 1 && changes[0]?.filename === "index.html") {
      await this.client.mutation(api.artifacts.create, {
        stack_id: stackId,
        type: "html_js",
        content: changes[0].content,
        metadata: {
          description: "Generated by Cursor Background Agent",
          tech_stack: ["HTML", "CSS", "JavaScript"],
          build_time_ms: 0,
          cursor_agent_id: metadata.agent_id,
          files_changed: metadata.files_changed,
        },
      });
    } else {
      const combinedContent = changes
        .map((file) => `// File: ${file.filename}\n${file.content}`)
        .join("\n\n");

      await this.client.mutation(api.artifacts.create, {
        stack_id: stackId,
        type: "multi_file",
        content: combinedContent,
        metadata: {
          description: "Multi-file project by Cursor Background Agent",
          tech_stack: this.detectTechStack(changes),
          build_time_ms: 0,
          cursor_agent_id: metadata.agent_id,
          files_changed: metadata.files_changed,
        },
      });
    }
  }

  private detectTechStack(files: ArtifactFile[]): string[] {
    const stack = new Set<string>();

    files.forEach((file) => {
      const ext = file.filename.split(".").pop()?.toLowerCase();

      switch (ext) {
        case "html":
          stack.add("HTML");
          break;
        case "css":
          stack.add("CSS");
          break;
        case "js":
          stack.add("JavaScript");
          break;
        case "ts":
          stack.add("TypeScript");
          break;
        case "tsx":
          stack.add("React");
          break;
        case "json":
          if (file.filename === "package.json") {
            try {
              const pkg = JSON.parse(file.content);
              if (pkg.dependencies?.react) stack.add("React");
              if (pkg.dependencies?.next) stack.add("Next.js");
              if (pkg.dependencies?.vue) stack.add("Vue");
            } catch {}
          }
          break;
      }
    });

    return Array.from(stack);
  }
}
```

**Deliverables:**

- ✅ Cursor API client with full endpoint coverage
- ✅ Virtual workspace creation and management
- ✅ Artifact sync bidirectional flow
- ✅ Unit tests for each component

**Time:** 4-5 days  
**Owner:** Backend engineer  
**Success Criteria:** Can create workspace, run agent, capture changes

---

### Phase 2: Orchestrator (Week 2-3)

**Objectives:** Build new orchestrator using Cursor Background Agents

#### Step 2.1: Cursor Background Orchestrator

**File:** `packages/agent-engine/src/cursor/orchestrator.ts`

```typescript
import { ConvexClient } from "convex/browser";
import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { CursorAPIClient } from "./api-client";
import { VirtualWorkspaceManager } from "./workspace-manager";
import { ArtifactSyncService } from "./artifact-sync";
import type { OrchestrationResult } from "../orchestrator";

export class CursorBackgroundOrchestrator {
  private stackId: Id<"agent_stacks">;
  private cursorAPI: CursorAPIClient;
  private workspaceManager: VirtualWorkspaceManager;
  private artifactSync: ArtifactSyncService;
  private client: ConvexClient;
  private tickCount: number = 0;

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

  async initialize() {
    const stack = await this.client.query(api.agents.getStack, {
      stackId: this.stackId,
    });

    const projectIdea = await this.client.query(api.project_ideas.get, {
      stackId: this.stackId,
    });

    if (!projectIdea) {
      await this.client.mutation(api.project_ideas.create, {
        stack_id: this.stackId,
        title: "Hackathon Project",
        description: "A project to be built with Cursor Background Agents",
        created_by: "cursor_orchestrator",
      });
    }

    const existingTodos = await this.client.query(api.todos.getPending, {
      stackId: this.stackId,
    });

    if (!existingTodos || existingTodos.length === 0) {
      await this.client.mutation(api.todos.create, {
        stack_id: this.stackId,
        content: "Define project concept and create initial structure",
        assigned_by: "cursor_orchestrator",
        priority: 5,
      });
    }

    console.log(
      `Initialized Cursor Background Orchestrator for stack ${this.stackId}`
    );
  }

  async tick(): Promise<OrchestrationResult> {
    this.tickCount++;
    console.log(
      `\n=== Cursor Tick ${this.tickCount} for stack ${this.stackId} ===`
    );

    const results = {
      planner: "",
      builder: "",
      communicator: "",
      reviewer: "",
    };

    let workspace: any = null;

    try {
      const pendingTodos = await this.client.query(api.todos.getPending, {
        stackId: this.stackId,
      });

      if (!pendingTodos || pendingTodos.length === 0) {
        results.builder = "No pending todos. Idle.";
        await this.logTrace("No pending todos", "cursor_tick_idle");
        return this.formatResult(results);
      }

      const currentTodo = pendingTodos[0];
      if (!currentTodo) {
        results.builder = "No valid todo found.";
        return this.formatResult(results);
      }

      const stack = await this.client.query(api.agents.getStack, {
        stackId: this.stackId,
      });

      const projectIdea = await this.client.query(api.project_ideas.get, {
        stackId: this.stackId,
      });

      results.planner = `Planning: ${currentTodo.content}`;

      workspace = await this.workspaceManager.createWorkspace(
        this.stackId,
        stack?.participant_name || "Agent",
        await this.artifactSync.materializeArtifacts(this.stackId)
      );

      await this.workspaceManager.setupEnvironmentConfig(
        workspace,
        process.env.CONVEX_URL || ""
      );

      const prompt = this.buildTaskPrompt(currentTodo, projectIdea, stack);

      await this.client.mutation(api.todos.updateStatus, {
        todoId: currentTodo._id,
        status: "in_progress",
      });

      const agentResponse = await this.cursorAPI.createAgent({
        repository: workspace.repoUrl,
        branch: workspace.branch,
        prompt,
        model: "claude-3.5-sonnet",
        max_runtime_minutes: 30,
      });

      await this.logTrace(
        `Created background agent ${agentResponse.agent_id}`,
        "cursor_agent_created",
        { agent_id: agentResponse.agent_id, todo: currentTodo.content }
      );

      const finalStatus = await this.cursorAPI.pollUntilComplete(
        agentResponse.agent_id,
        1800000,
        10000
      );

      if (finalStatus.status === "completed") {
        const changes = await this.workspaceManager.captureChanges(workspace);

        await this.artifactSync.syncChangesToConvex(this.stackId, changes, {
          agent_id: agentResponse.agent_id,
          files_changed: finalStatus.outputs?.files_changed || [],
          terminal_output: finalStatus.outputs?.terminal_output,
        });

        await this.client.mutation(api.todos.updateStatus, {
          todoId: currentTodo._id,
          status: "completed",
        });

        results.builder = `Completed: ${currentTodo.content}. Files changed: ${changes.length}`;
        results.reviewer = `Artifact generated successfully with ${changes.length} files`;
      } else {
        await this.client.mutation(api.todos.updateStatus, {
          todoId: currentTodo._id,
          status: "pending",
        });

        results.builder = `Failed: ${finalStatus.error || "Unknown error"}`;
        results.reviewer = "Build failed, needs retry";
      }

      await this.logTrace(
        `Agent ${agentResponse.agent_id} ${finalStatus.status}`,
        "cursor_agent_completed",
        {
          status: finalStatus.status,
          files_changed: finalStatus.outputs?.files_changed?.length || 0,
        }
      );

      console.log("=== Cursor Tick complete ===\n");
    } catch (error) {
      console.error(`Error during Cursor tick ${this.tickCount}:`, error);

      await this.logTrace(`Error during tick: ${error}`, "cursor_tick_error", {
        error: String(error),
      });

      results.builder = `Error: ${String(error)}`;
    } finally {
      if (workspace) {
        await workspace
          .cleanup()
          .catch((err: any) => console.error("Workspace cleanup error:", err));
      }
    }

    return this.formatResult(results);
  }

  private buildTaskPrompt(todo: any, projectIdea: any, stack: any): string {
    return `
You are an AI developer participating in the Recursor hackathon as "${stack?.participant_name || "Agent"}".

Project: ${projectIdea?.title || "Hackathon Project"}
Description: ${projectIdea?.description || "A project to be built"}

Current Task: ${todo.content}
Priority: ${todo.priority}

Please implement this task by:
1. Creating/modifying the necessary files
2. Ensuring code quality and best practices
3. Adding appropriate comments and documentation
4. Testing the changes

Focus on building a working, demo-ready prototype. This is a hackathon - ship fast but keep quality high.
    `.trim();
  }

  private async logTrace(thought: string, action: string, result?: unknown) {
    await this.client.mutation(api.traces.log, {
      stack_id: this.stackId,
      agent_type: "cursor_orchestrator",
      thought,
      action,
      result,
    });
  }

  private formatResult(results: any): OrchestrationResult {
    return {
      stackId: this.stackId,
      tick: this.tickCount,
      results,
      timestamp: Date.now(),
    };
  }

  async runContinuous(intervalMs: number = 5000, maxTicks?: number) {
    console.log(
      `Starting continuous Cursor orchestration with ${intervalMs}ms interval`
    );

    let running = true;

    process.on("SIGINT", () => {
      console.log("\nStopping Cursor orchestration...");
      running = false;
    });

    while (running) {
      await this.tick();

      if (maxTicks && this.tickCount >= maxTicks) {
        console.log(`Reached max ticks (${maxTicks}), stopping.`);
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    console.log("Cursor orchestration stopped.");
  }

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
    };
  }
}
```

#### Step 2.2: Update CLI to Support Cursor Mode

**File:** `packages/agent-engine/src/cli.ts` (modifications)

```typescript
// Add new command for Cursor mode
import { CursorBackgroundOrchestrator } from "./cursor/orchestrator";

// Add to existing CLI
const cursorCommand = program
  .command("run-cursor <stack_id> [max_ticks] [interval_ms]")
  .description("Run agent stack with Cursor Background Agents")
  .action(async (stackId, maxTicks, intervalMs) => {
    const cursorApiKey = process.env.CURSOR_API_KEY;
    const githubToken = process.env.GITHUB_BOT_TOKEN;
    const convexUrl =
      process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

    if (!cursorApiKey) {
      console.error("CURSOR_API_KEY environment variable is required");
      process.exit(1);
    }

    if (!githubToken) {
      console.error("GITHUB_BOT_TOKEN environment variable is required");
      process.exit(1);
    }

    if (!convexUrl) {
      console.error("CONVEX_URL environment variable is required");
      process.exit(1);
    }

    const orchestrator = new CursorBackgroundOrchestrator(
      stackId,
      cursorApiKey,
      githubToken,
      convexUrl
    );

    await orchestrator.initialize();

    if (maxTicks || intervalMs) {
      await orchestrator.runContinuous(
        parseInt(intervalMs) || 5000,
        maxTicks ? parseInt(maxTicks) : undefined
      );
    } else {
      await orchestrator.tick();
    }
  });
```

**Deliverables:**

- ✅ Fully functional Cursor Background Orchestrator
- ✅ CLI support for both modes (legacy and cursor)
- ✅ Comprehensive error handling
- ✅ Integration tests

**Time:** 5-7 days  
**Owner:** Backend engineer  
**Success Criteria:** Can run full hackathon simulation with Cursor agents

---

### Phase 3: Testing & Optimization (Week 3-4)

**Objectives:** Validate system at scale, optimize performance, compare quality

#### Step 3.1: Unit Tests

**File:** `packages/agent-engine/src/cursor/__tests__/api-client.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { CursorAPIClient } from "../api-client";

describe("CursorAPIClient", () => {
  let client: CursorAPIClient;

  beforeEach(() => {
    client = new CursorAPIClient("test-api-key");
    global.fetch = vi.fn();
  });

  it("should create background agent", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        agent_id: "agent-123",
        status: "creating",
        created_at: new Date().toISOString(),
      }),
    });

    const result = await client.createAgent({
      repository: "https://github.com/test/repo",
      branch: "main",
      prompt: "Build a web app",
    });

    expect(result.agent_id).toBe("agent-123");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.cursor.com/v1/background-agents",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      })
    );
  });

  // Add more tests...
});
```

#### Step 3.2: Integration Tests

Run tests with real agents to validate end-to-end flow:

```bash
# Test 1: Single agent, simple task
pnpm cli run-cursor test-stack-1 1 60000

# Test 2: 10 agents, concurrent
for i in {1..10}; do
  pnpm cli create "Test Agent $i"
  pnpm cli run-cursor <stack-id> 1 60000 &
done
wait

# Test 3: Complex multi-file project
pnpm cli run-cursor complex-stack-1 3 120000
```

#### Step 3.3: A/B Quality Comparison

Compare artifacts from legacy vs Cursor system:

```typescript
// Quality metrics comparison script
interface QualityMetrics {
  linesOfCode: number;
  filesGenerated: number;
  hasTests: boolean;
  hasDocumentation: boolean;
  codeComplexity: number;
  buildSuccess: boolean;
  syntaxErrors: number;
}

async function compareQuality(
  legacyStackId: string,
  cursorStackId: string
): Promise<void> {
  const legacyMetrics = await analyzeArtifacts(legacyStackId);
  const cursorMetrics = await analyzeArtifacts(cursorStackId);

  console.log("Quality Comparison:");
  console.log("Legacy:", legacyMetrics);
  console.log("Cursor:", cursorMetrics);
}
```

#### Step 3.4: Performance Optimization

**Optimizations to implement:**

1. **Workspace Reuse**: Don't create new repos every tick
2. **Parallel Agent Creation**: Launch multiple agents simultaneously
3. **Agent Hibernation**: Pause/resume agents between ticks
4. **Caching**: Cache common project templates
5. **Cleanup Scheduling**: Batch delete repos weekly instead of per-tick

**Deliverables:**

- ✅ Comprehensive test suite (unit + integration)
- ✅ Quality comparison report
- ✅ Performance optimization implemented
- ✅ Benchmark results documented

**Time:** 5-7 days  
**Owner:** QA + Backend engineer  
**Success Criteria:** >90% test coverage, performance within acceptable range

---

### Phase 4: Production Rollout (Week 4-5)

**Objectives:** Gradual migration to production with fallback

#### Step 4.1: Feature Flag Implementation

**File:** `packages/agent-engine/src/orchestrator-factory.ts`

```typescript
import { AgentStackOrchestrator } from "./orchestrator";
import { CursorBackgroundOrchestrator } from "./cursor/orchestrator";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { LLMProviders } from "./config";

export interface OrchestratorConfig {
  mode: "legacy" | "cursor" | "hybrid";
  cursorApiKey?: string;
  githubToken?: string;
  cursorRolloutPercentage?: number;
}

export function createOrchestrator(
  stackId: Id<"agent_stacks">,
  llm: LLMProviders,
  convexUrl: string,
  config: OrchestratorConfig
) {
  if (config.mode === "legacy") {
    return new AgentStackOrchestrator(stackId, llm, convexUrl);
  }

  if (config.mode === "cursor") {
    if (!config.cursorApiKey || !config.githubToken) {
      throw new Error(
        "Cursor mode requires CURSOR_API_KEY and GITHUB_BOT_TOKEN"
      );
    }
    return new CursorBackgroundOrchestrator(
      stackId,
      config.cursorApiKey,
      config.githubToken,
      convexUrl
    );
  }

  if (config.mode === "hybrid") {
    const rolloutPercentage = config.cursorRolloutPercentage || 10;
    const randomValue = Math.random() * 100;

    if (randomValue < rolloutPercentage) {
      if (config.cursorApiKey && config.githubToken) {
        return new CursorBackgroundOrchestrator(
          stackId,
          config.cursorApiKey,
          config.githubToken,
          convexUrl
        );
      }
    }

    return new AgentStackOrchestrator(stackId, llm, convexUrl);
  }

  throw new Error(`Unknown orchestrator mode: ${config.mode}`);
}
```

#### Step 4.2: Gradual Rollout Plan

**Week 4:**

- Enable Cursor mode for 10% of agents
- Monitor error rates, costs, quality metrics
- Collect feedback from dashboard

**Week 5:**

- Increase to 25% if metrics are positive
- Identify and fix any issues
- Prepare for full rollout

**Week 6:**

- Increase to 50%
- Compare side-by-side metrics

**Week 7:**

- Full migration to 100% if all metrics pass

#### Step 4.3: Monitoring Dashboard

Add metrics to admin dashboard:

- Orchestrator type (legacy vs cursor)
- Success rate per type
- Average tick duration
- Cost per agent per hour
- Artifact quality scores

**Deliverables:**

- ✅ Feature flag system implemented
- ✅ Monitoring dashboard updated
- ✅ Gradual rollout completed
- ✅ Incident response plan documented

**Time:** 7-10 days  
**Owner:** Platform team  
**Success Criteria:** Successful 100% migration with no major incidents

---

### Phase 5: Legacy System Deprecation (Week 6)

**Objectives:** Remove old orchestrator after successful migration

#### Step 5.1: Archive Legacy Code

```bash
# Move legacy orchestrator to archive
mkdir -p packages/agent-engine/src/legacy
git mv packages/agent-engine/src/orchestrator.ts packages/agent-engine/src/legacy/
git mv packages/agent-engine/src/agents packages/agent-engine/src/legacy/

# Update imports
# Find and replace all references to old orchestrator
```

#### Step 5.2: Documentation Update

Update all documentation to reflect new architecture:

- README.md
- API documentation
- Architecture diagrams
- Deployment guides

#### Step 5.3: Cost Optimization Review

Analyze final cost structure and optimize:

- Identify most expensive operations
- Implement hibernation strategies
- Optimize workspace lifecycle
- Negotiate pricing with Cursor if needed

**Deliverables:**

- ✅ Legacy code archived
- ✅ Documentation updated
- ✅ Cost optimization implemented
- ✅ Team training completed

**Time:** 3-5 days  
**Owner:** Platform team  
**Success Criteria:** Clean codebase, updated docs, optimized costs

---

## Testing Strategy

### Test Pyramid

```
        /\        E2E Tests (5%)
       /  \       - Full hackathon simulation
      /____\      - 10+ agents, 5+ ticks each
     /      \
    / Integration\ Integration Tests (25%)
   /____________\ - API client + workspace manager
  /              \ - Artifact sync flows
 /   Unit Tests   \ Unit Tests (70%)
/__________________\ - Individual component testing
```

### Test Cases

#### Critical Path Tests

1. **Happy Path**: Create workspace → run agent → capture artifacts → sync to Convex
2. **Agent Failure**: Handle agent errors gracefully, update todo status
3. **Network Failure**: Retry logic, timeout handling
4. **Rate Limiting**: Handle 429 responses, backoff strategy
5. **Concurrent Agents**: 10 agents running simultaneously
6. **Resource Cleanup**: Workspaces and repos deleted properly

#### Edge Cases

1. Empty artifact list
2. Malformed git repository
3. Cursor API unavailable
4. GitHub rate limit exceeded
5. Convex connection lost
6. Invalid todo content
7. Workspace cleanup failure

### Performance Benchmarks

| Metric              | Legacy Target | Cursor Target | Acceptable Range |
| ------------------- | ------------- | ------------- | ---------------- |
| Tick Duration       | 30-50s        | 60-120s       | 50-150s          |
| Agent Success Rate  | 85%           | 90%           | >80%             |
| Cost per Agent/Hour | $0.30         | $2.00         | <$3.00           |
| Artifact Quality    | 6/10          | 9/10          | >7/10            |
| Multi-file Support  | 0%            | 100%          | >80%             |

---

## Rollback Plan

### Immediate Rollback (< 1 hour)

If critical issues arise, immediately switch to legacy mode:

```bash
# Set environment variable
export ORCHESTRATOR_MODE=legacy

# Restart all agent processes
pnpm cli restart-all

# Verify all agents using legacy orchestrator
pnpm cli list --show-mode
```

### Partial Rollback (< 4 hours)

If issues affect specific agent stacks:

```typescript
// Update orchestrator factory to exclude problematic stacks
const CURSOR_BLACKLIST = ["stack-id-1", "stack-id-2"];

if (CURSOR_BLACKLIST.includes(stackId)) {
  return new AgentStackOrchestrator(stackId, llm, convexUrl);
}
```

### Data Recovery

If workspaces or artifacts are lost:

1. Check GitHub bot account for orphaned repos
2. Restore from Convex artifact history
3. Replay failed ticks with legacy orchestrator

### Communication Plan

**Severity Levels:**

- **P0 (Critical)**: All agents down, immediate rollback
- **P1 (High)**: >20% error rate, rollback within 1 hour
- **P2 (Medium)**: <20% error rate, investigate and fix
- **P3 (Low)**: Individual failures, monitor

**Notification Channels:**

- Slack: #recursor-incidents
- Email: platform-team@recursor
- Dashboard: Red banner with status

---

## Cost Analysis

### Current System Costs

| Component       | Usage          | Unit Cost | Monthly Cost (500 agents) |
| --------------- | -------------- | --------- | ------------------------- |
| Groq API        | 10M tokens/day | $0.10/1M  | $300                      |
| OpenAI Fallback | 1M tokens/day  | $1.00/1M  | $30                       |
| Infrastructure  | 24/7           | $100/mo   | $100                      |
| **Total**       |                |           | **$430/mo**               |

### Cursor Background Agents Costs

| Component      | Usage              | Unit Cost          | Monthly Cost (500 agents) |
| -------------- | ------------------ | ------------------ | ------------------------- |
| Cursor API     | 10K agent-hours/mo | $2/agent-hour      | $20,000                   |
| GitHub API     | 50K API calls/day  | Free (under limit) | $0                        |
| Storage        | 100GB temp repos   | $0.023/GB          | $2                        |
| Infrastructure | 24/7               | $100/mo            | $100                      |
| **Total**      |                    |                    | **$20,102/mo**            |

### Cost Optimization Strategies

1. **Agent Hibernation** (-60%): Run agents only when todos exist
   - Savings: $12,000/mo → **$8,000/mo total**

2. **Selective Cursor Usage** (-40%): Use Cursor only for complex tasks
   - Savings: $8,000/mo → **$5,000/mo total**

3. **Workspace Reuse** (-10%): Reuse workspaces across ticks
   - Savings: $5,000/mo → **$4,500/mo total**

**Optimized Monthly Cost: ~$4,500/mo** (10x increase but acceptable given quality improvement)

### ROI Analysis

**Costs:**

- Additional spending: $4,000/mo
- Implementation time: 6 weeks engineer time (~$15,000)
- **Total first year**: $63,000

**Benefits:**

- Higher quality artifacts → better demo
- Multi-file projects → more realistic simulations
- Reduced maintenance → save 20 eng hours/mo (~$6,000/mo)
- **Total first year benefit**: ~$72,000

**Net ROI: +$9,000 first year, growing thereafter**

---

## Success Metrics

### Technical Metrics

| Metric                 | Current | Target | Measurement                 |
| ---------------------- | ------- | ------ | --------------------------- |
| Build Success Rate     | 85%     | 95%    | % of completed todos        |
| Artifact Quality Score | 6.5/10  | 9.0/10 | Manual review + automated   |
| Multi-file Projects    | 0%      | 80%    | % with >1 file              |
| Code with Tests        | 5%      | 40%    | % artifacts with test files |
| Tick Duration          | 35s     | 90s    | Median tick time            |
| Error Rate             | 15%     | 5%     | % failed ticks              |

### Business Metrics

| Metric             | Current | Target  | Measurement      |
| ------------------ | ------- | ------- | ---------------- |
| Visitor Engagement | 5 min   | 8 min   | Avg time on site |
| Project Votes      | 500/day | 800/day | Total votes cast |
| Demo Views         | 200/day | 400/day | Video plays      |
| Social Shares      | 50/day  | 150/day | External shares  |

### Monitoring Dashboard

Create real-time dashboard showing:

1. **Agent Health**
   - Active agents (legacy vs cursor)
   - Success rate by type
   - Error rate by type

2. **Performance**
   - Average tick duration
   - P50/P95/P99 latencies
   - Agent queue depth

3. **Cost**
   - Spend by orchestrator type
   - Projected monthly cost
   - Budget alerts

4. **Quality**
   - Artifacts generated per hour
   - Multi-file project percentage
   - Code quality scores

---

## Risk Register

| Risk                  | Probability | Impact | Mitigation                 | Owner        |
| --------------------- | ----------- | ------ | -------------------------- | ------------ |
| Cursor API unreliable | Medium      | High   | Maintain legacy fallback   | Platform     |
| Cost overruns         | High        | Medium | Hibernation + monitoring   | Finance      |
| Migration bugs        | Medium      | High   | Gradual rollout + tests    | Engineering  |
| GitHub rate limits    | Low         | Medium | Increase limits + retry    | DevOps       |
| Agent quality worse   | Low         | High   | A/B testing before rollout | QA           |
| Team learning curve   | Medium      | Low    | Documentation + training   | Team Lead    |
| Vendor lock-in        | Medium      | Medium | Maintain legacy code       | Architecture |

---

## Appendix

### A. Environment Variables

```bash
# Required for Cursor mode
CURSOR_API_KEY=cursor_xxxxx
GITHUB_BOT_TOKEN=ghp_xxxxx
ORCHESTRATOR_MODE=cursor  # or "legacy" or "hybrid"
CURSOR_ROLLOUT_PERCENTAGE=10  # for hybrid mode

# Existing variables
CONVEX_URL=https://your-convex.convex.cloud
GROQ_API_KEY=gsk_xxxxx
OPENAI_API_KEY=sk-xxxxx
GEMINI_API_KEY=AIzaxxxxx
```

### B. API Rate Limits

**Cursor API:**

- 256 concurrent agents per key
- 1000 requests/hour per key
- No explicit token limits documented

**GitHub API:**

- 5000 requests/hour (authenticated)
- 100 repo creates/hour
- 100 repo deletes/hour

**Mitigation:** Use multiple API keys if needed, implement rate limiting

### C. Example Prompts

**Simple Task Prompt:**

```
You are building a hackathon project: "Weather Dashboard"

Task: Create a landing page with weather search functionality

Requirements:
- Clean, modern design
- Search by city name
- Display current weather and 5-day forecast
- Use OpenWeatherMap API (free tier)
- Responsive design

Build this as a single HTML file with inline CSS and JavaScript.
```

**Complex Task Prompt:**

```
You are building a hackathon project: "AI Meeting Summarizer"

Task: Implement the core summarization logic

Requirements:
- Create multi-file project structure (frontend + backend)
- Backend: Node.js/Express API
- Frontend: React with TypeScript
- Integrate with OpenAI API for summarization
- Add error handling and rate limiting
- Write unit tests for core functions
- Add README with setup instructions

Focus on clean, production-ready code.
```

### D. Team Responsibilities

**Platform Team:**

- Cursor API integration
- Infrastructure setup
- Monitoring and alerts
- Cost optimization

**Backend Team:**

- Orchestrator implementation
- Virtual workspace management
- Artifact sync service
- Testing and QA

**Frontend Team:**

- Dashboard updates for new metrics
- Admin UI for orchestrator mode switching
- Visualizations for comparison

**DevOps:**

- GitHub bot setup
- Environment configuration
- Deployment automation
- Incident response

---

## Conclusion

This migration represents a significant architectural improvement that will enhance code quality, enable multi-file projects, and simplify our agent system. The phased approach with comprehensive fallbacks mitigates risks while the cost optimization strategies keep expenses manageable.

**Next Steps:**

1. ✅ Review and approve this plan
2. ✅ Provision Cursor API access and GitHub bot account
3. ✅ Begin Phase 0 implementation
4. ✅ Schedule weekly sync meetings for progress tracking

**Timeline:** 6 weeks from approval to production  
**Budget:** $4,500/mo operational + $15,000 implementation  
**Expected Outcome:** 40-60% code reduction, 2-3x quality improvement

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-18  
**Authors:** Platform Engineering Team  
**Approvers:** [To be filled]
