/**
 * Execution Controller Service
 *
 * This service manages the ExecutionController lifecycle for cursor teams.
 * It's automatically started when the dashboard app starts (via instrumentation.ts).
 */

import { ExecutionController, LLMProviders } from "@recursor/agent-engine";

let controller: ExecutionController | null = null;
let isStarting = false;

export async function startExecutionController() {
  // Prevent multiple instances
  if (controller || isStarting) {
    console.log("[ExecutionController] Already running or starting");
    return;
  }

  isStarting = true;

  try {
    console.log("\n=== Starting Execution Controller ===\n");

    // Validate required environment variables
    const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) {
      console.warn("⚠️  CONVEX_URL not set - ExecutionController disabled");
      console.warn("   Cursor teams will not work without this.");
      isStarting = false;
      return;
    }

    // Check for Cursor credentials (optional - only needed if cursor teams exist)
    const hasCursorKey = !!process.env.CURSOR_API_KEY;
    const hasGitHubToken = !!process.env.GITHUB_TOKEN;

    console.log("Environment check:");
    console.log(`  ✓ Convex URL: ${convexUrl.substring(0, 40)}...`);
    console.log(`  ${hasCursorKey ? "✓" : "⚠"} Cursor API Key: ${hasCursorKey ? "Set" : "Not set"}`);
    console.log(`  ${hasGitHubToken ? "✓" : "⚠"} GitHub Token: ${hasGitHubToken ? "Set" : "Not set"}`);

    if (!hasCursorKey || !hasGitHubToken) {
      console.log("\n⚠️  Note: Cursor teams require CURSOR_API_KEY and GITHUB_TOKEN");
      console.log("   Cursor teams will fail without these credentials.");
      console.log("   Standard teams will continue to work via Convex cron.\n");
    }

    // Configure LLM provider
    const llmProvider = new LLMProviders({
      convexUrl,
      groqApiKey: process.env.GROQ_API_KEY || "",
      openaiApiKey: process.env.OPENAI_API_KEY || "",
      geminiApiKey: process.env.GEMINI_API_KEY || "",
    });

    // Create and start controller
    controller = new ExecutionController(llmProvider, convexUrl);
    await controller.start();

    console.log("✓ Execution Controller started successfully");
    console.log("  Monitoring for cursor teams every 2 seconds...\n");

    // Handle graceful shutdown
    const cleanup = async () => {
      if (controller) {
        console.log("\n[ExecutionController] Shutting down...");
        // The controller has its own cleanup handlers
        controller = null;
      }
    };

    process.on("SIGTERM", cleanup);
    process.on("SIGINT", cleanup);
    process.on("beforeExit", cleanup);

  } catch (error) {
    console.error("[ExecutionController] Failed to start:", error);
    controller = null;
  } finally {
    isStarting = false;
  }
}

export function getExecutionController(): ExecutionController | null {
  return controller;
}
