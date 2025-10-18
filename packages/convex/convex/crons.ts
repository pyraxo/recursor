import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run agent executor every 5 seconds
crons.interval(
  "agent executor",
  { seconds: 5 },
  internal.agentExecution.scheduledExecutor
);

export default crons;