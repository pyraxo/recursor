#!/usr/bin/env tsx
/**
 * Execution Controller Runner
 *
 * This script starts the ExecutionController which manages cursor team orchestration.
 *
 * Usage:
 *   pnpm tsx src/run-execution-controller.ts
 *
 * The ExecutionController will:
 * - Monitor Convex for running cursor teams
 * - Create and manage Cursor Background Agents
 * - Sync artifacts back to Convex
 *
 * Note: Standard teams are handled by Convex cron and don't need this controller.
 */

import { ExecutionController } from "./execution-controller";
import { LLMProviders } from "./config";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

async function main() {
  console.log("Starting Execution Controller...\n");

  // Validate required environment variables
  const convexUrl = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("❌ CONVEX_URL or NEXT_PUBLIC_CONVEX_URL must be set in .env.local");
    process.exit(1);
  }

  // Check for required Cursor API keys (only needed if cursor teams exist)
  const hasCursorKey = !!process.env.CURSOR_API_KEY;
  const hasGitHubToken = !!process.env.GITHUB_TOKEN;

  console.log("Environment check:");
  console.log(`  ✓ Convex URL: ${convexUrl}`);
  console.log(`  ${hasCursorKey ? "✓" : "⚠"} Cursor API Key: ${hasCursorKey ? "Set" : "Not set"}`);
  console.log(`  ${hasGitHubToken ? "✓" : "⚠"} GitHub Token: ${hasGitHubToken ? "Set" : "Not set"}`);

  if (!hasCursorKey || !hasGitHubToken) {
    console.log("\n⚠️  Warning: Cursor teams require CURSOR_API_KEY and GITHUB_TOKEN");
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
  const controller = new ExecutionController(llmProvider, convexUrl);

  console.log("\n🚀 Execution Controller started");
  console.log("   Monitoring for cursor teams every 2 seconds...");
  console.log("   Press Ctrl+C to stop\n");

  await controller.start();

  // Keep process running
  await new Promise(() => {});
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
