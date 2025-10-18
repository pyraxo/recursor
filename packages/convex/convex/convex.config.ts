/**
 * Convex Configuration
 *
 * This file configures Convex components for the project.
 */

import { defineApp } from "convex/server";
import workpool from "@convex-dev/workpool/convex.config";

const app = defineApp();

// Register Workpool component for parallel agent execution
app.use(workpool, { name: "agentWorkpool" });

export default app;
