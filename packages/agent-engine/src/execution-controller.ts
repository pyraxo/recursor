import { ConvexClient } from "convex/browser";
import { api } from "@recursor/convex/_generated/api";
import type { Id } from "@recursor/convex/_generated/dataModel";
import { OrchestratorFactory } from "./orchestrator-factory";
import { LLMProviders } from "./config";
import type { IOrchestrator } from "./types";

interface RunningStack {
  orchestrator: IOrchestrator;
  controller: AbortController;
  status: 'running' | 'paused' | 'stopping';
}

/**
 * ExecutionController manages multiple orchestrators (standard and cursor)
 * and coordinates their execution based on dashboard control signals
 */
export class ExecutionController {
  private orchestrators: Map<string, RunningStack> = new Map();
  private client: ConvexClient;
  private llmProvider: LLMProviders;
  private convexUrl: string;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(llmProvider: LLMProviders, convexUrl: string) {
    this.llmProvider = llmProvider;
    this.convexUrl = convexUrl;
    this.client = new ConvexClient(convexUrl);

    // Handle graceful shutdown
    process.on('SIGINT', () => this.gracefulShutdown());
    process.on('SIGTERM', () => this.gracefulShutdown());
  }

  /**
   * Start the execution controller
   * Begins monitoring for stacks that need to be started
   */
  async start() {
    console.log('Starting Execution Controller...');

    // Start monitoring for state changes
    this.startMonitoring();

    console.log('Execution Controller started successfully');
  }

  /**
   * Start monitoring Convex for execution state changes
   */
  private startMonitoring() {
    // Check every 2 seconds for state changes
    this.monitoringInterval = setInterval(async () => {
      if (this.isShuttingDown) return;

      try {
        await this.checkForStateChanges();
      } catch (error) {
        console.error('Error checking state changes:', error);
      }
    }, 2000);
  }

  /**
   * Check Convex for any stacks that need action
   */
  private async checkForStateChanges() {
    // Get all stacks from Convex
    const stacks = await this.client.query(api.agents.listStacks, {});

    for (const stack of stacks) {
      const stackId = stack._id as Id<"agent_stacks">;
      const executionState = stack.execution_state || 'idle';
      const running = this.orchestrators.has(stackId);

      // Start new stacks that should be running
      if (executionState === 'running' && !running) {
        console.log(`Starting execution for stack ${stackId} (${stack.participant_name})`);
        await this.startStack(stackId);
      }

      // Stop stacks that should be stopped
      if (executionState === 'stopped' && running) {
        console.log(`Stopping execution for stack ${stackId} (${stack.participant_name})`);
        await this.stopStack(stackId);
      }

      // Handle pause/resume through the orchestrator's internal state checking
      // The orchestrator will check its own state in the runContinuous loop
    }
  }

  /**
   * Start execution for a specific stack
   */
  private async startStack(stackId: Id<"agent_stacks">) {
    // Check if already running
    if (this.orchestrators.has(stackId)) {
      console.log(`Stack ${stackId} is already running`);
      return;
    }

    try {
      // Create orchestrator using factory (automatically selects standard vs cursor)
      const orchestrator = await OrchestratorFactory.create(
        stackId,
        this.llmProvider,
        this.convexUrl
      );

      // Initialize the orchestrator
      await orchestrator.initialize();

      // Create abort controller for this stack
      const controller = new AbortController();

      // Store in our map
      this.orchestrators.set(stackId, {
        orchestrator,
        controller,
        status: 'running'
      });

      // Start continuous execution in the background
      this.runStackContinuous(stackId, controller.signal);

      console.log(`Started orchestrator for stack ${stackId}`);
    } catch (error) {
      console.error(`Failed to start stack ${stackId}:`, error);

      // Update state to stopped on error
      await this.client.mutation(api.agents.stopExecution, { stackId });
    }
  }

  /**
   * Run a stack continuously until stopped
   */
  private async runStackContinuous(stackId: Id<"agent_stacks">, signal: AbortSignal) {
    const running = this.orchestrators.get(stackId);
    if (!running) return;

    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 5000; // 5 seconds

    while (retryCount < maxRetries && !signal.aborted) {
      try {
        // Run the orchestrator continuously
        // It will handle pause/resume internally by checking execution state
        await running.orchestrator.runContinuous(15000); // 15 second interval

        // If we get here, execution completed normally
        break;
      } catch (error) {
        retryCount++;
        console.error(`Error running stack ${stackId} (attempt ${retryCount}/${maxRetries}):`, error);

        if (retryCount < maxRetries && !signal.aborted) {
          console.log(`Retrying stack ${stackId} in ${retryDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          // Max retries reached or aborted, update state to stopped
          console.error(`Max retries reached for stack ${stackId}, stopping execution`);
          await this.client.mutation(api.agents.stopExecution, { stackId })
            .catch(err => console.error(`Failed to update stop state for ${stackId}:`, err));
        }
      }
    }

    // Clean up when done
    this.orchestrators.delete(stackId);
    console.log(`Stopped orchestrator for stack ${stackId}`);
  }

  /**
   * Stop execution for a specific stack
   */
  private async stopStack(stackId: Id<"agent_stacks">) {
    const running = this.orchestrators.get(stackId);
    if (!running) {
      console.log(`Stack ${stackId} is not running`);
      return;
    }

    // Mark as stopping
    running.status = 'stopping';

    // Abort the execution
    running.controller.abort();

    // Remove from map
    this.orchestrators.delete(stackId);

    console.log(`Stopped orchestrator for stack ${stackId}`);
  }

  /**
   * Get status of all running stacks
   */
  async getStatus() {
    const statuses = [];

    for (const [stackId, running] of this.orchestrators) {
      const status = await running.orchestrator.getStatus();
      statuses.push({
        stackId,
        status: running.status,
        orchestratorStatus: status
      });
    }

    return {
      runningStacks: this.orchestrators.size,
      stacks: statuses
    };
  }

  /**
   * Graceful shutdown of all orchestrators
   */
  private async gracefulShutdown() {
    if (this.isShuttingDown) return;

    this.isShuttingDown = true;
    console.log('\nGracefully shutting down Execution Controller...');

    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Stop all running orchestrators
    for (const [stackId] of this.orchestrators) {
      console.log(`Stopping stack ${stackId}...`);
      await this.stopStack(stackId as Id<"agent_stacks">);
    }

    console.log('Execution Controller shutdown complete');
    process.exit(0);
  }
}