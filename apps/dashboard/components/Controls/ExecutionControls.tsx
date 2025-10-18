"use client";

import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Pause, Play, Square } from "lucide-react";

export function ExecutionControls({
  stackId,
}: {
  stackId: Id<"agent_stacks">;
}) {
  const stack = useQuery(api.agents.getStack, { stackId });
  const executionStatus = useQuery(api.agents.getExecutionStatus, { stackId });

  const start = useMutation(api.agents.startExecution);
  const pause = useMutation(api.agents.pauseExecution);
  const resume = useMutation(api.agents.resumeExecution);
  const stop = useMutation(api.agents.stopExecution);

  const handlePlayPause = async () => {
    if (executionStatus?.execution_state === "running") {
      await pause({ stackId });
    } else if (executionStatus?.execution_state === "paused") {
      await resume({ stackId });
    } else {
      await start({ stackId });
    }
  };

  const handleStop = async () => {
    if (confirm("Stop execution? This will permanently halt all agents.")) {
      await stop({ stackId });
    }
  };

  const isRunning = executionStatus?.execution_state === "running";
  const isPaused = executionStatus?.execution_state === "paused";
  const isStopped = executionStatus?.execution_state === "stopped";
  const isActive = isRunning || isPaused;

  // Calculate if agents are actively processing (based on last_activity_at)
  const isProcessing =
    isRunning &&
    executionStatus?.last_activity_at &&
    Date.now() - executionStatus.last_activity_at < 5000;

  // Format time elapsed
  const formatTimeElapsed = () => {
    if (!executionStatus?.started_at) return "";

    const elapsed = Date.now() - executionStatus.started_at;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
      {/* Control Buttons */}
      <div className="flex gap-2">
        {!isStopped && (
          <button
            onClick={handlePlayPause}
            className={`p-3 rounded-lg transition-all duration-200 flex items-center gap-2 font-medium ${
              isRunning
                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
            title={
              isRunning
                ? "Pause execution"
                : isPaused
                  ? "Resume execution"
                  : "Start execution"
            }
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5" />
                <span className="hidden sm:inline">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                <span className="hidden sm:inline">
                  {isPaused ? "Resume" : "Start"}
                </span>
              </>
            )}
          </button>
        )}

        {isActive && (
          <button
            onClick={handleStop}
            className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-medium"
            title="Stop execution"
          >
            <Square className="w-5 h-5" />
            <span className="hidden sm:inline">Stop</span>
          </button>
        )}
      </div>

      {/* Status Display */}
      <div className="flex items-center gap-4 text-sm">
        {/* State Badge */}
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1.5 rounded-lg font-semibold uppercase text-xs tracking-wider ${
              isRunning
                ? "bg-green-900/50 text-green-400 border border-green-800"
                : isPaused
                  ? "bg-yellow-900/50 text-yellow-400 border border-yellow-800"
                  : isStopped
                    ? "bg-red-900/50 text-red-400 border border-red-800"
                    : "bg-gray-800 text-gray-400 border border-gray-700"
            }`}
          >
            {executionStatus?.execution_state || "idle"}
          </span>

          {/* Activity Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping" />
              </div>
              <span className="text-gray-400 text-xs">Processing...</span>
            </div>
          )}
        </div>

        {/* Time Elapsed */}
        {executionStatus?.started_at && !isStopped && (
          <div className="text-gray-500 text-xs">
            <span className="hidden sm:inline">Running for: </span>
            <span className="font-mono">{formatTimeElapsed()}</span>
          </div>
        )}

        {/* Pause Message */}
        {isPaused && (
          <span className="text-gray-500 text-xs italic hidden lg:inline">
            Agents will resume from current state
          </span>
        )}
      </div>
    </div>
  );
}
