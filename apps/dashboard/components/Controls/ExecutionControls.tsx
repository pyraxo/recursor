"use client";

import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Pause, Play, Square, Activity } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Separator } from "@repo/ui/separator";
import { Card, CardContent } from "@repo/ui/card";
import { useState } from "react";

export function ExecutionControls({
  stackId,
}: {
  stackId: Id<"agent_stacks">;
}) {
  const stack = useQuery(api.agents.getStack, { stackId });
  const executionStatus = useQuery(api.agents.getExecutionStatus, { stackId });
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const start = useMutation(api.agents.startExecution);
  const pause = useMutation(api.agents.pauseExecution);
  const resume = useMutation(api.agents.resumeExecution);
  const stop = useMutation(api.agents.stopExecution);

  const handlePlayPause = async () => {
    setIsProcessingAction(true);
    try {
      if (executionStatus?.execution_state === "running") {
        await pause({ stackId });
      } else if (executionStatus?.execution_state === "paused") {
        await resume({ stackId });
      } else {
        await start({ stackId });
      }
    } catch (error) {
      console.error("Failed to change execution state:", error);
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleStop = async () => {
    if (confirm("Stop execution? This will permanently halt all agents.")) {
      setIsProcessingAction(true);
      try {
        await stop({ stackId });
      } catch (error) {
        console.error("Failed to stop execution:", error);
      } finally {
        setIsProcessingAction(false);
      }
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

  const getBadgeClassName = () => {
    if (isRunning) return "bg-green-900/50 text-green-400 border-green-800 hover:bg-green-900/70";
    if (isPaused) return "bg-yellow-900/50 text-yellow-400 border-yellow-800 hover:bg-yellow-900/70";
    if (isStopped) return "bg-red-900/50 text-red-400 border-red-800 hover:bg-red-900/70";
    return "bg-gray-800 text-gray-400 border-gray-700";
  };

  return (
    <Card className="bg-card/50">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Control Buttons */}
          <div className="flex gap-2">
            {!isActive && (
              <Button
                onClick={handlePlayPause}
                size="default"
                disabled={isProcessingAction}
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                title="Start execution"
              >
                <Play className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Start</span>
              </Button>
            )}

            {isActive && (
              <Button
                onClick={handlePlayPause}
                size="default"
                disabled={isProcessingAction}
                className={
                  isRunning
                    ? "bg-yellow-600 hover:bg-yellow-700 text-white disabled:opacity-50"
                    : "bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                }
                title={
                  isRunning
                    ? "Pause execution"
                    : "Resume execution"
                }
              >
                {isRunning ? (
                  <>
                    <Pause className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Resume</span>
                  </>
                )}
              </Button>
            )}

            {isActive && (
              <Button
                onClick={handleStop}
                variant="destructive"
                size="default"
                disabled={isProcessingAction}
                title="Stop execution"
              >
                <Square className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Stop</span>
              </Button>
            )}
          </div>

          <Separator orientation="vertical" className="hidden sm:block h-8" />

          {/* Status Display */}
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {/* State Badge */}
            <Badge
              variant="outline"
              className={`uppercase tracking-wider ${getBadgeClassName()}`}
            >
              {executionStatus?.execution_state || "idle"}
            </Badge>

            {/* Activity Indicator */}
            {isProcessing && (
              <>
                <Separator orientation="vertical" className="hidden md:block h-4" />
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-400 animate-pulse" />
                  <span className="text-muted-foreground text-xs">
                    Processing...
                  </span>
                </div>
              </>
            )}

            {/* Time Elapsed */}
            {executionStatus?.started_at && !isStopped && (
              <>
                <Separator orientation="vertical" className="hidden md:block h-4" />
                <div className="text-muted-foreground text-xs">
                  <span className="hidden sm:inline">Running: </span>
                  <span className="font-mono font-medium">
                    {formatTimeElapsed()}
                  </span>
                </div>
              </>
            )}

            {/* Pause Message */}
            {isPaused && (
              <>
                <Separator orientation="vertical" className="hidden lg:block h-4" />
                <span className="text-muted-foreground text-xs italic hidden lg:inline">
                  Will resume from current state
                </span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
