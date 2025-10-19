import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { ConvexClient } from "convex/browser";
import { BaseAgent } from "./agents/base-agent";
import { BuilderAgent } from "./agents/builder";
import { CommunicatorAgent } from "./agents/communicator";
import { PlannerAgent } from "./agents/planner";
import { ReviewerAgent } from "./agents/reviewer";
import { createLLMProviders, LLMProviders } from "./config";

// Work detection types
export interface WorkStatus {
  hasWork: boolean;
  type: string;
  workDescription: string;
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface AgentTask {
  id: string;
  agentType: "planner" | "builder" | "communicator" | "reviewer";
  priority: number;
  workStatus: WorkStatus;
  createdAt: number;
  stackId: Id<"agent_stacks">;
}

// Priority Queue implementation
class PriorityQueue<T extends { priority: number }> {
  private items: T[] = [];

  enqueue(item: T): void {
    // Insert maintaining priority order (higher priority first)
    const index = this.items.findIndex((i) => i.priority < item.priority);
    if (index === -1) {
      this.items.push(item);
    } else {
      this.items.splice(index, 0, item);
    }
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }

  getItems(): T[] {
    return [...this.items];
  }
}

export class AutonomousOrchestrator {
  private convexClient: ConvexClient;
  private stackId: Id<"agent_stacks">;
  private agentName: string;
  private llm: LLMProviders;

  // Agent instances
  private agents: Map<string, BaseAgent>;
  private planner: PlannerAgent;
  private builder: BuilderAgent;
  private communicator: CommunicatorAgent;
  private reviewer: ReviewerAgent;

  // Execution management
  private executionQueue: PriorityQueue<AgentTask>;
  private activeExecutions: Map<string, Promise<void>>;
  private maxConcurrentAgents: number = 2; // Configurable concurrency

  // State management
  private isPaused: boolean = false;
  private shouldStop: boolean = false;
  private isRunning: boolean = false;

  // Work detection
  private workCheckInterval: number = 1000; // Check for work every 1 second
  private lastWorkCheck: Map<string, number>;
  private workCheckTimers: Map<string, NodeJS.Timeout>;

  // Subscriptions
  private stateUnsubscribe?: () => void;
  private workSignalUnsubscribe?: () => void;

  constructor(
    convexUrl: string,
    stackId: Id<"agent_stacks">,
    agentName: string,
    config?: { maxConcurrentAgents?: number; workCheckInterval?: number }
  ) {
    this.convexClient = new ConvexClient(convexUrl);
    this.stackId = stackId;
    this.agentName = agentName;
    this.llm = createLLMProviders();

    if (config?.maxConcurrentAgents) {
      this.maxConcurrentAgents = config.maxConcurrentAgents;
    }
    if (config?.workCheckInterval) {
      this.workCheckInterval = config.workCheckInterval;
    }

    // Initialize agents
    this.planner = new PlannerAgent(stackId, this.llm, convexUrl);
    this.builder = new BuilderAgent(stackId, this.llm, convexUrl);
    this.communicator = new CommunicatorAgent(stackId, this.llm, convexUrl);
    this.reviewer = new ReviewerAgent(stackId, this.llm, convexUrl);

    this.agents = new Map<string, BaseAgent>([
      ["planner", this.planner],
      ["builder", this.builder],
      ["communicator", this.communicator],
      ["reviewer", this.reviewer],
    ]);

    // Initialize execution management
    this.executionQueue = new PriorityQueue<AgentTask>();
    this.activeExecutions = new Map();
    this.lastWorkCheck = new Map();
    this.workCheckTimers = new Map();
  }

  /**
   * Start the autonomous orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log(`[${this.agentName}] Orchestrator already running`);
      return;
    }

    console.log(`[${this.agentName}] Starting Autonomous Orchestrator`);
    this.isRunning = true;
    this.shouldStop = false;

    // Subscribe to execution state changes
    await this.subscribeToExecutionState();

    // Subscribe to work signals
    await this.subscribeToWorkSignals();

    // Start work detection loop
    this.startWorkDetection();

    // Start execution processor
    this.startExecutionProcessor();

    // Update stack state to running
    await this.convexClient.mutation(api.agents.startExecution, {
      stackId: this.stackId,
    });

    console.log(
      `[${this.agentName}] Autonomous Orchestrator started successfully`
    );
  }

  /**
   * Stop the orchestrator gracefully
   */
  async stop(): Promise<void> {
    console.log(`[${this.agentName}] Stopping Autonomous Orchestrator`);
    this.shouldStop = true;
    this.isRunning = false;

    // Clear work check timers
    for (const timer of this.workCheckTimers.values()) {
      clearTimeout(timer);
    }
    this.workCheckTimers.clear();

    // Wait for active executions to complete
    if (this.activeExecutions.size > 0) {
      console.log(
        `[${this.agentName}] Waiting for ${this.activeExecutions.size} active executions to complete`
      );
      await Promise.all(this.activeExecutions.values());
    }

    // Clear queue
    this.executionQueue.clear();

    // Unsubscribe from Convex
    if (this.stateUnsubscribe) {
      this.stateUnsubscribe();
    }
    if (this.workSignalUnsubscribe) {
      this.workSignalUnsubscribe();
    }

    // Update stack state
    await this.convexClient.mutation(api.agents.stopExecution, {
      stackId: this.stackId,
    });

    console.log(`[${this.agentName}] Autonomous Orchestrator stopped`);
  }

  /**
   * Pause execution (completes current tasks)
   */
  async pause(): Promise<void> {
    console.log(`[${this.agentName}] Pausing execution`);
    this.isPaused = true;

    await this.convexClient.mutation(api.agents.pauseExecution, {
      stackId: this.stackId,
    });
  }

  /**
   * Resume execution
   */
  async resume(): Promise<void> {
    console.log(`[${this.agentName}] Resuming execution`);
    this.isPaused = false;

    await this.convexClient.mutation(api.agents.resumeExecution, {
      stackId: this.stackId,
    });

    // Trigger immediate work check
    this.triggerWorkCheck();
  }

  /**
   * Subscribe to execution state changes from dashboard
   */
  private async subscribeToExecutionState(): Promise<void> {
    // Watch for execution state changes
    this.stateUnsubscribe = this.convexClient.onUpdate(
      api.agents.getExecutionStatus,
      { stackId: this.stackId },
      (status) => {
        if (!status) return;

        const newState = status.execution_state || "idle";
        console.log(
          `[${this.agentName}] Execution state changed to: ${newState}`
        );

        switch (newState) {
          case "paused":
            this.isPaused = true;
            break;
          case "running":
            this.isPaused = false;
            this.triggerWorkCheck(); // Check for work immediately
            break;
          case "stopped":
            this.shouldStop = true;
            break;
        }
      }
    );
  }

  /**
   * Subscribe to work signals (future enhancement)
   */
  private async subscribeToWorkSignals(): Promise<void> {
    // This will be implemented when we add the work signals table
    // For now, we rely on periodic work detection
  }

  /**
   * Start continuous work detection
   */
  private startWorkDetection(): void {
    // Set up periodic work detection for each agent type
    const checkWork = async () => {
      if (this.shouldStop) return;
      if (!this.isPaused) {
        await this.detectAndQueueWork();
      }

      // Schedule next check
      if (!this.shouldStop) {
        setTimeout(checkWork, this.workCheckInterval);
      }
    };

    // Start the work detection loop
    setTimeout(checkWork, this.workCheckInterval);
  }

  /**
   * Detect available work and queue tasks
   */
  private async detectAndQueueWork(): Promise<void> {
    if (this.activeExecutions.size >= this.maxConcurrentAgents) {
      // Don't check for new work if we're at capacity
      return;
    }

    // Check each agent for available work
    const workChecks = await Promise.all([
      this.checkAgentWork("planner"),
      this.checkAgentWork("builder"),
      this.checkAgentWork("communicator"),
      this.checkAgentWork("reviewer"),
    ]);

    // Queue work items that have work
    for (const work of workChecks) {
      if (work && work.workStatus.hasWork) {
        // Check if this agent type already has a task in queue or executing
        const isAlreadyQueued = this.executionQueue
          .getItems()
          .some((t) => t.agentType === work.agentType);
        const isExecuting = Array.from(this.activeExecutions.keys()).some(
          (id) => id.startsWith(work.agentType)
        );

        if (!isAlreadyQueued && !isExecuting) {
          this.executionQueue.enqueue(work);
          console.log(
            `[${this.agentName}] Queued work for ${work.agentType}: ${work.workStatus.workDescription}`
          );
        }
      }
    }
  }

  /**
   * Check if a specific agent has work
   */
  private async checkAgentWork(agentType: string): Promise<AgentTask | null> {
    try {
      const agent = this.agents.get(agentType);
      if (!agent) return null;

      // Check if enough time has passed since last check (avoid spam)
      const lastCheck = this.lastWorkCheck.get(agentType) || 0;
      const timeSinceLastCheck = Date.now() - lastCheck;

      // Minimum interval between work checks per agent (500ms)
      if (timeSinceLastCheck < 500) {
        return null;
      }

      // Update last check time
      this.lastWorkCheck.set(agentType, Date.now());

      // Check if agent has work
      const workStatus = await this.getWorkStatus(agentType);

      if (workStatus.hasWork) {
        return {
          id: `${agentType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          agentType: agentType as "planner" | "builder" | "communicator" | "reviewer",
          priority: workStatus.priority,
          workStatus,
          createdAt: Date.now(),
          stackId: this.stackId,
        };
      }

      return null;
    } catch (error) {
      console.error(
        `[${this.agentName}] Error checking work for ${agentType}:`,
        error
      );
      return null;
    }
  }

  /**
   * Get work status for an agent type
   */
  private async getWorkStatus(agentType: string): Promise<WorkStatus> {
    // Query Convex for work availability
    switch (agentType) {
      case "planner":
        return this.checkPlannerWork();
      case "builder":
        return this.checkBuilderWork();
      case "communicator":
        return this.checkCommunicatorWork();
      case "reviewer":
        return this.checkReviewerWork();
      default:
        return {
          hasWork: false,
          type: "unknown",
          workDescription: "",
          priority: 0,
        };
    }
  }

  /**
   * Check if Planner has work
   */
  private async checkPlannerWork(): Promise<WorkStatus> {
    try {
      // Get todos
      const todos = await this.convexClient.query(api.todos.getByStackId, {
        stackId: this.stackId,
      });

      // Check if we need initial planning
      const needsInitialPlanning = !todos || todos.length === 0;

      // Check if all todos are completed
      const allTodosCompleted =
        todos &&
        todos.length > 0 &&
        todos.every((t) => t.status === "completed");

      // Check for reviewer recommendations by querying full agent state
      const reviewerFullState = await this.convexClient.query(
        api.agents.getAgentState,
        {
          stackId: this.stackId,
          agentType: "reviewer",
        }
      );
      const hasRecommendations =
        (reviewerFullState?.memory?.recommendations?.length ?? 0) > 0;

      // Check time since last planning by querying full planner state
      const plannerFullState = await this.convexClient.query(
        api.agents.getAgentState,
        {
          stackId: this.stackId,
          agentType: "planner",
        }
      );
      const lastPlanned =
        (plannerFullState?.memory as { last_planning_time?: number })?.last_planning_time || 0;
      const timeSinceLastPlan = Date.now() - lastPlanned;
      const needsPeriodicPlanning = timeSinceLastPlan > 60000; // 1 minute

      const hasWork =
        needsInitialPlanning ||
        allTodosCompleted ||
        hasRecommendations ||
        needsPeriodicPlanning;

      let workDescription = "";
      let priority = 5;

      if (needsInitialPlanning) {
        workDescription = "Creating initial project plan";
        priority = 10;
      } else if (hasRecommendations) {
        workDescription = "Processing reviewer recommendations";
        priority = 8;
      } else if (allTodosCompleted) {
        workDescription = "Planning next phase after completing all todos";
        priority = 7;
      } else if (needsPeriodicPlanning) {
        workDescription = "Periodic planning review";
        priority = 3;
      }

      return {
        hasWork,
        type: "planning",
        workDescription,
        priority,
        metadata: { todos: todos?.length || 0, hasRecommendations },
      };
    } catch (error) {
      console.error(`[${this.agentName}] Error checking planner work:`, error);
      return {
        hasWork: false,
        type: "planning",
        workDescription: "",
        priority: 0,
      };
    }
  }

  /**
   * Check if Builder has work
   */
  private async checkBuilderWork(): Promise<WorkStatus> {
    try {
      const todos = await this.convexClient.query(api.todos.getByStackId, {
        stackId: this.stackId,
      });

      // Filter for pending todos with priority > 0
      const pendingTodos =
        todos?.filter((t) => t.status === "pending" && (t.priority || 0) > 0) ||
        [];

      const hasWork = pendingTodos.length > 0;
      const highestPriority = Math.max(
        ...pendingTodos.map((t) => t.priority || 0),
        0
      );

      return {
        hasWork,
        type: "building",
        workDescription:
          hasWork && pendingTodos[0]
            ? `Building: ${pendingTodos[0].content}`
            : "",
        priority: hasWork ? Math.min(highestPriority + 2, 10) : 0,
        metadata: { pendingCount: pendingTodos.length },
      };
    } catch (error) {
      console.error(`[${this.agentName}] Error checking builder work:`, error);
      return {
        hasWork: false,
        type: "building",
        workDescription: "",
        priority: 0,
      };
    }
  }

  /**
   * Check if Communicator has work
   */
  private async checkCommunicatorWork(): Promise<WorkStatus> {
    try {
      const messages = await this.convexClient.query(
        api.messages.getUnreadMessages,
        {
          stackId: this.stackId,
        }
      );

      const hasUnreadMessages = messages && messages.length > 0;

      // Check if it's time for periodic status update
      const commFullState = await this.convexClient.query(
        api.agents.getAgentState,
        {
          stackId: this.stackId,
          agentType: "communicator",
        }
      );
      const lastBroadcast =
        (commFullState?.memory as { last_broadcast_time?: number })?.last_broadcast_time || 0;
      const timeSinceLastBroadcast = Date.now() - lastBroadcast;
      const needsStatusUpdate = timeSinceLastBroadcast > 120000; // 2 minutes

      const hasWork = hasUnreadMessages || needsStatusUpdate;
      let workDescription = "";
      let priority = 4;

      if (hasUnreadMessages) {
        workDescription = `Processing ${messages.length} unread messages`;
        priority = 6;
      } else if (needsStatusUpdate) {
        workDescription = "Sending periodic status update";
        priority = 2;
      }

      return {
        hasWork,
        type: "communication",
        workDescription,
        priority,
        metadata: { unreadCount: messages?.length || 0 },
      };
    } catch (error) {
      console.error(
        `[${this.agentName}] Error checking communicator work:`,
        error
      );
      return {
        hasWork: false,
        type: "communication",
        workDescription: "",
        priority: 0,
      };
    }
  }

  /**
   * Check if Reviewer has work
   */
  private async checkReviewerWork(): Promise<WorkStatus> {
    try {
      const [todos, artifacts, reviewerFullState] = await Promise.all([
        this.convexClient.query(api.todos.getByStackId, {
          stackId: this.stackId,
        }),
        this.convexClient.query(api.artifacts.list, {
          stackId: this.stackId,
        }),
        this.convexClient.query(api.agents.getAgentState, {
          stackId: this.stackId,
          agentType: "reviewer",
        }),
      ]);

      // Check completed todos since last review
      const lastReviewTime =
        (reviewerFullState?.memory as { last_review_time?: number })?.last_review_time || 0;
      const completedSinceReview =
        todos?.filter(
          (t) =>
            t.status === "completed" && (t.completed_at || 0) > lastReviewTime
        ) || [];

      // Check new artifacts
      const newArtifacts =
        artifacts?.filter((a) => a.created_at > lastReviewTime) || [];

      // Check time since last review
      const timeSinceLastReview = Date.now() - lastReviewTime;
      const needsPeriodicReview = timeSinceLastReview > 180000; // 3 minutes

      const hasWork =
        completedSinceReview.length >= 3 ||
        newArtifacts.length > 0 ||
        needsPeriodicReview;

      let workDescription = "";
      let priority = 3;

      if (newArtifacts.length > 0) {
        workDescription = `Reviewing ${newArtifacts.length} new artifacts`;
        priority = 7;
      } else if (completedSinceReview.length >= 3) {
        workDescription = `Reviewing ${completedSinceReview.length} completed todos`;
        priority = 5;
      } else if (needsPeriodicReview) {
        workDescription = "Periodic strategic review";
        priority = 2;
      }

      return {
        hasWork,
        type: "review",
        workDescription,
        priority,
        metadata: {
          completedTodos: completedSinceReview.length,
          newArtifacts: newArtifacts.length,
        },
      };
    } catch (error) {
      console.error(`[${this.agentName}] Error checking reviewer work:`, error);
      return {
        hasWork: false,
        type: "review",
        workDescription: "",
        priority: 0,
      };
    }
  }

  /**
   * Start the execution processor
   */
  private startExecutionProcessor(): void {
    const processQueue = async () => {
      if (this.shouldStop) return;

      // Process queue if not paused and under concurrency limit
      if (
        !this.isPaused &&
        !this.executionQueue.isEmpty() &&
        this.activeExecutions.size < this.maxConcurrentAgents
      ) {
        const task = this.executionQueue.dequeue();
        if (task) {
          // Execute without blocking the processor
          const executionId = task.id;
          const execution = this.executeAgent(task);

          this.activeExecutions.set(executionId, execution);

          // Clean up on completion
          execution
            .finally(() => {
              this.activeExecutions.delete(executionId);
              console.log(
                `[${this.agentName}] Completed execution: ${task.agentType}`
              );
            })
            .catch((error) => {
              console.error(
                `[${this.agentName}] Execution error for ${task.agentType}:`,
                error
              );
            });
        }
      }

      // Schedule next processing cycle
      if (!this.shouldStop) {
        setTimeout(processQueue, 100); // Check queue every 100ms
      }
    };

    // Start processing
    setTimeout(processQueue, 100);
  }

  /**
   * Execute an agent task
   */
  private async executeAgent(task: AgentTask): Promise<void> {
    const startTime = Date.now();
    console.log(
      `[${this.agentName}] Executing ${task.agentType}: ${task.workStatus.workDescription}`
    );

    try {
      // Update agent state to executing
      await this.convexClient.mutation(
        api.agentExecution.updateExecutionState,
        {
          stackId: this.stackId,
          agentType: task.agentType,
          state: "executing",
          currentWork: task.workStatus.workDescription,
        }
      );

      // Get the agent
      const agent = this.agents.get(task.agentType);
      if (!agent) {
        throw new Error(`Agent not found: ${task.agentType}`);
      }

      // Execute the agent's think method
      await agent.think();

      // Inter-agent communication is now handled in the Convex backend
      // No special handling needed here

      const duration = Date.now() - startTime;
      console.log(
        `[${this.agentName}] ${task.agentType} completed in ${duration}ms`
      );

      // Update agent state to idle
      await this.convexClient.mutation(
        api.agentExecution.updateExecutionState,
        {
          stackId: this.stackId,
          agentType: task.agentType,
          state: "idle",
          currentWork: null,
        }
      );
    } catch (error) {
      console.error(
        `[${this.agentName}] Error executing ${task.agentType}:`,
        error
      );

      // Update agent state to error
      await this.convexClient.mutation(
        api.agentExecution.updateExecutionState,
        {
          stackId: this.stackId,
          agentType: task.agentType,
          state: "error",
          currentWork: null,
        }
      );

      // Re-queue the task with lower priority if retryable
      if (this.shouldRetry(error)) {
        task.priority = Math.max(1, task.priority - 2);
        this.executionQueue.enqueue(task);
        console.log(
          `[${this.agentName}] Re-queued ${task.agentType} with priority ${task.priority}`
        );
      }
    }
  }

  /**
   * Determine if an error is retryable
   */
  private shouldRetry(error: unknown): boolean {
    // Retry on temporary errors
    const message = (error as Error)?.message || "";
    return (
      message.includes("rate limit") ||
      message.includes("timeout") ||
      message.includes("temporary")
    );
  }

  /**
   * Trigger immediate work check
   */
  private triggerWorkCheck(): void {
    // Clear last check times to force immediate check
    this.lastWorkCheck.clear();

    // Trigger work detection
    this.detectAndQueueWork().catch((error) => {
      console.error(
        `[${this.agentName}] Error in triggered work check:`,
        error
      );
    });
  }

  /**
   * Get orchestrator status
   */
  getStatus(): {
    isRunning: boolean;
    isPaused: boolean;
    queueSize: number;
    activeExecutions: number;
    agents: { type: string; status: string }[];
  } {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      queueSize: this.executionQueue.size(),
      activeExecutions: this.activeExecutions.size,
      agents: Array.from(this.agents.entries()).map(([type]) => ({
        type,
        status: Array.from(this.activeExecutions.keys()).some((id) =>
          id.startsWith(type)
        )
          ? "executing"
          : "idle",
      })),
    };
  }
}
