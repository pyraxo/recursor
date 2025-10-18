/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically loaded by Next.js on server startup.
 * It's used to initialize the ExecutionController for cursor teams.
 *
 * The controller will:
 * - Monitor Convex for running cursor teams
 * - Create and manage Cursor Background Agents
 * - Sync artifacts back to Convex
 *
 * Standard teams continue to work via Convex cron (no action needed).
 */

export async function register() {
  // Only run on server-side (not in edge runtime or client)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startExecutionController } = await import('./lib/execution-controller-service');
    await startExecutionController();
  }
}
