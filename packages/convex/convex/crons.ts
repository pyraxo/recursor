import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Autonomous Graph-Based Orchestrator
 *
 * This cron job runs every 15 seconds and manages ALL agent stacks
 * using intelligent graph-based orchestration.
 *
 * Features:
 * - Need-based execution (only runs agents with actual work)
 * - Parallel execution (multiple agents can run simultaneously)
 * - Adaptive timing (adjusts pause duration based on activity)
 * - Intelligent work detection (priority-based scheduling)
 *
 * All stacks are fully autonomous - no manual intervention required.
 */
crons.interval(
  "autonomous orchestrator",
  { seconds: 15 },
  internal.orchestration.scheduledOrchestrator
);

crons.interval(
  "judge all teams",
  { minutes: 10 },
  internal.judging.executeAllJudgesScheduled
);

export default crons;
