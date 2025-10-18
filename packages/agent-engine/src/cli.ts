#!/usr/bin/env node
import { ConvexClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { createLLMProviders, LLMProviders } from "./config";
import { AgentStackOrchestrator } from "./orchestrator";

async function main() {
  const convexUrl =
    process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;

  if (!convexUrl) {
    console.error("Error: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL must be set");
    process.exit(1);
  }

  console.log("Recursor Agent Engine CLI");
  console.log("=========================\n");

  const client = new ConvexClient(convexUrl);
  const llm = createLLMProviders();

  const command = process.argv[2];

  switch (command) {
    case "create":
      await createStack(client);
      break;

    case "run":
      await runStack(client, llm);
      break;

    case "list":
      await listStacks(client);
      break;

    case "status":
      await showStatus(client, llm);
      break;

    default:
      showHelp();
      break;
  }

  process.exit(0);
}

async function createStack(client: ConvexClient) {
  const participantName = process.argv[3] || `Participant-${Date.now()}`;

  const stackId = await client.mutation(api.agents.createStack, {
    participant_name: participantName,
  });

  console.log(`Created agent stack: ${stackId}`);
  console.log(`Participant: ${participantName}`);
  console.log(`\nRun with: pnpm cli run ${stackId}`);
}

async function listStacks(client: ConvexClient) {
  const stacks = await client.query(api.agents.listStacks, {});

  console.log(`Found ${stacks.length} agent stack(s):\n`);

  for (const stack of stacks) {
    console.log(`ID: ${stack._id}`);
    console.log(`Participant: ${stack.participant_name}`);
    console.log(`Phase: ${stack.phase}`);
    console.log(`Created: ${new Date(stack.created_at).toLocaleString()}`);
    console.log("---");
  }
}

async function runStack(
  client: ConvexClient,
  llm: LLMProviders
) {
  const stackId = process.argv[3] as Id<"agent_stacks">;

  if (!stackId) {
    console.error("Error: Stack ID required");
    console.error("Usage: pnpm cli run <stack_id>");
    process.exit(1);
  }

  // Verify stack exists
  const stack = await client.query(api.agents.getStack, { stackId });
  if (!stack) {
    console.error(`Error: Stack ${stackId} not found`);
    process.exit(1);
  }

  console.log(`Running agent stack: ${stackId}`);
  console.log(`Participant: ${stack.participant_name}`);
  console.log(`Phase: ${stack.phase}\n`);

  const orchestrator = new AgentStackOrchestrator(
    stackId,
    llm,
    process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || ""
  );

  // Initialize
  await orchestrator.initialize();

  // Parse options
  const maxTicks = parseInt(process.argv[4] || "10");
  const intervalMs = parseInt(process.argv[5] || "5000");

  console.log(`Running for ${maxTicks} ticks with ${intervalMs}ms interval\n`);

  // Run continuous orchestration
  await orchestrator.runContinuous(intervalMs, maxTicks);

  // Show final status
  const status = await orchestrator.getStatus();
  console.log("\n=== Final Status ===");
  console.log(`Phase: ${status.stack?.phase || "Unknown"}`);
  console.log(`Project: ${status.projectIdea?.title}`);
  console.log(
    `Todos: ${status.todos.completed}/${status.todos.total} completed`
  );
  console.log(`Artifacts: ${status.artifacts.total} versions`);
  console.log(`Ticks: ${status.tickCount}`);
}

async function showStatus(
  client: ConvexClient,
  llm: LLMProviders
) {
  const stackId = process.argv[3] as Id<"agent_stacks">;

  if (!stackId) {
    console.error("Error: Stack ID required");
    console.error("Usage: pnpm cli status <stack_id>");
    process.exit(1);
  }

  const orchestrator = new AgentStackOrchestrator(
    stackId,
    llm,
    process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL || ""
  );

  const status = await orchestrator.getStatus();

  console.log("=== Agent Stack Status ===\n");
  console.log(`Participant: ${status.stack?.participant_name || "Unknown"}`);
  console.log(`Phase: ${status.stack?.phase || "Unknown"}`);
  console.log(`\nProject: ${status.projectIdea?.title || "Not set"}`);
  console.log(`Description: ${status.projectIdea?.description || "Not set"}`);
  console.log(`\nTodos:`);
  console.log(`  Total: ${status.todos.total}`);
  console.log(`  Completed: ${status.todos.completed}`);
  console.log(`  Pending: ${status.todos.pending}`);
  console.log(`\nArtifacts:`);
  console.log(`  Total Versions: ${status.artifacts.total}`);
  console.log(`  Latest Version: ${status.artifacts.latest_version}`);
  console.log(`\nTicks Executed: ${status.tickCount}`);
}

function showHelp() {
  console.log("Usage: pnpm cli <command> [options]\n");
  console.log("Commands:");
  console.log("  create [name]           Create a new agent stack");
  console.log("  list                    List all agent stacks");
  console.log("  run <id> [ticks] [ms]   Run an agent stack");
  console.log("  status <id>             Show agent stack status");
  console.log("\nExamples:");
  console.log("  pnpm cli create MyAgent");
  console.log("  pnpm cli list");
  console.log("  pnpm cli run <stack_id> 20 3000");
  console.log("  pnpm cli status <stack_id>");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
