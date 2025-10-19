import { api } from "@recursor/convex/_generated/api";
import type { Doc, Id } from "@recursor/convex/_generated/dataModel";
import { ConvexClient } from "convex/browser";
import { BuilderAgent } from "./agents/builder";
import { CommunicatorAgent } from "./agents/communicator";
import { PlannerAgent } from "./agents/planner";
import { ReviewerAgent } from "./agents/reviewer";
import { LLMProviders } from "./config";
import type { IOrchestrator } from "./types";

export interface OrchestrationResult {
  stackId: Id<"agent_stacks">;
  tick: number;
  results: {
    planner: string;
    builder: string;
    communicator: string;
    reviewer: string;
  };
  timestamp: number;
}

export class AgentStackOrchestrator implements IOrchestrator {
  private stackId: Id<"agent_stacks">;
  private planner: PlannerAgent;
  private builder: BuilderAgent;
  private communicator: CommunicatorAgent;
  private reviewer: ReviewerAgent;
  private client: ConvexClient;
  private tickCount: number = 0;
  private shouldStop: boolean = false;
  private isPaused: boolean = false;
  private currentAction: Promise<void> | null = null;

  constructor(
    stackId: Id<"agent_stacks">,
    llm: LLMProviders,
    convexUrl: string
  ) {
    this.stackId = stackId;
    this.client = new ConvexClient(convexUrl);

    // Initialize all agents
    this.planner = new PlannerAgent(stackId, llm, convexUrl);
    this.builder = new BuilderAgent(stackId, llm, convexUrl);
    this.communicator = new CommunicatorAgent(stackId, llm, convexUrl);
    this.reviewer = new ReviewerAgent(stackId, llm, convexUrl);
  }

  private async getExecutionState(): Promise<string> {
    const status = await this.client.query(api.agents.getExecutionStatus, {
      stackId: this.stackId,
    });
    return status?.execution_state || "idle";
  }

  private async updateActivityTimestamp(): Promise<void> {
    await this.client.mutation(api.agents.updateActivityTimestamp, {
      stackId: this.stackId,
    });
  }

  async initialize() {
    // Initialization is now handled by the Convex backend
    // The planner will create initial project ideas and todos on first execution
    console.log(`Agent stack ${this.stackId} ready - initialization handled by Convex backend`);
  }

  async tick(): Promise<OrchestrationResult> {
    this.tickCount++;
    console.log(`\n=== Tick ${this.tickCount} for stack ${this.stackId} ===`);

    const results = {
      planner: "",
      builder: "",
      communicator: "",
      reviewer: "",
    };

    try {
      // Update activity timestamp at the start of each tick
      await this.updateActivityTimestamp();

      // Execute agent cycle with pause checks
      this.currentAction = this.runAgentCycle(results);
      await this.currentAction;
      this.currentAction = null;

      console.log("=== Tick complete ===\n");
    } catch (error) {
      console.error(`Error during tick ${this.tickCount}:`, error);

      await this.client.mutation(api.traces.log, {
        stack_id: this.stackId,
        agent_type: "orchestrator",
        thought: `Error during tick ${this.tickCount}`,
        action: "tick_error",
        result: { error: String(error) },
      });
    }

    return {
      stackId: this.stackId,
      tick: this.tickCount,
      results,
      timestamp: Date.now(),
    };
  }

  private async runAgentCycle(results: Record<string, string>): Promise<void> {
    // 1. Planner thinks and plans
    console.log("1. Planner thinking...");
    results.planner = await this.planner.think();

    // Check if we should pause after this agent
    if (this.shouldStop) return;

    // 2. Builder executes todos
    console.log("2. Builder executing...");
    results.builder = await this.builder.think();

    if (this.shouldStop) return;

    // 3. Communicator processes messages
    console.log("3. Communicator processing messages...");
    results.communicator = await this.communicator.think();

    if (this.shouldStop) return;

    // 4. Reviewer analyzes and advises
    console.log("4. Reviewer analyzing...");
    results.reviewer = await this.reviewer.think();

    // Inter-agent communication (reviewer -> planner) is now handled in the Convex backend
    // No coordination needed here
  }

  async runContinuous(intervalMs: number = 15000, maxTicks?: number) {
    console.log(
      `Starting continuous orchestration with ${intervalMs}ms interval`
    );

    let running = true;

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("\nStopping orchestration...");
      running = false;
      this.shouldStop = true;
    });

    while (running) {
      // Check execution state from Convex
      const state = await this.getExecutionState();

      if (state === "stopped") {
        console.log("Execution stopped by dashboard.");
        break;
      }

      if (state === "paused") {
        if (!this.isPaused) {
          console.log("Execution paused by dashboard.");
          this.isPaused = true;
          // Complete current action if any
          if (this.currentAction) {
            await this.currentAction;
          }
        }
        // Wait while paused, checking every second
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      // If we were paused and now running again
      if (this.isPaused && state === "running") {
        console.log("Execution resumed from dashboard.");
        this.isPaused = false;
      }

      // Execute tick only if running
      if (state === "running") {
        await this.tick();

        if (maxTicks && this.tickCount >= maxTicks) {
          console.log(`Reached max ticks (${maxTicks}), stopping.`);
          // Update state to stopped
          await this.client.mutation(api.agents.stopExecution, {
            stackId: this.stackId,
          });
          break;
        }
      }

      // Wait for next tick
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    console.log("Orchestration stopped.");
  }

  async gracefulPause(): Promise<void> {
    console.log("Initiating graceful pause...");
    this.shouldStop = true;
    // Wait for current action to complete
    if (this.currentAction) {
      await this.currentAction;
    }
    console.log("Gracefully paused.");
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
        completed:
          todos?.filter((t: Doc<"todos">) => t.status === "completed").length ||
          0,
        pending:
          todos?.filter((t: Doc<"todos">) => t.status === "pending").length ||
          0,
      },
      artifacts: {
        total: artifacts?.length || 0,
        latest_version: artifacts?.[0]?.version || 0,
      },
      tickCount: this.tickCount,
    };
  }
}
