import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BuilderAgent } from "./agents/builder";
import { CommunicatorAgent } from "./agents/communicator";
import { PlannerAgent } from "./agents/planner";
import { ReviewerAgent } from "./agents/reviewer";
import { LLMProviders } from "./config";

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

export class AgentStackOrchestrator {
  private stackId: Id<"agent_stacks">;
  private planner: PlannerAgent;
  private builder: BuilderAgent;
  private communicator: CommunicatorAgent;
  private reviewer: ReviewerAgent;
  private client: ConvexClient;
  private tickCount: number = 0;

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

  async initialize() {
    // Initialize the planner with initial todos
    await this.planner.initialize();
    console.log(`Initialized agent stack ${this.stackId}`);
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
      // 1. Planner thinks and plans
      console.log("1. Planner thinking...");
      results.planner = await this.planner.think();

      // 2. Builder executes todos
      console.log("2. Builder executing...");
      results.builder = await this.builder.think();

      // 3. Communicator processes messages
      console.log("3. Communicator processing messages...");
      results.communicator = await this.communicator.think();

      // 4. Reviewer analyzes and advises
      console.log("4. Reviewer analyzing...");
      results.reviewer = await this.reviewer.think();

      // 5. Pass reviewer's recommendations to planner
      const recommendations =
        await this.reviewer.getRecommendationsForPlanner();
      if (recommendations.length > 0) {
        await this.planner.receiveAdvice(recommendations.join("\n"));
      }

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

  async runContinuous(intervalMs: number = 5000, maxTicks?: number) {
    console.log(
      `Starting continuous orchestration with ${intervalMs}ms interval`
    );

    let running = true;

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("\nStopping orchestration...");
      running = false;
    });

    while (running) {
      await this.tick();

      if (maxTicks && this.tickCount >= maxTicks) {
        console.log(`Reached max ticks (${maxTicks}), stopping.`);
        break;
      }

      // Wait for next tick
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    console.log("Orchestration stopped.");
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
    };
  }
}
