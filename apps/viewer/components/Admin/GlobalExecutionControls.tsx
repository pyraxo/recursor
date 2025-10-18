"use client";

import { api } from "@recursor/convex/_generated/api";
import { Button } from "@repo/ui/components/button";
import { useMutation, useQuery } from "convex/react";
import { Pause, Play, Square } from "lucide-react";
import { useState } from "react";

export function GlobalExecutionControls() {
  const stacks = useQuery(api.agents.listStacks);
  const startExecution = useMutation(api.agents.startExecution);
  const pauseExecution = useMutation(api.agents.pauseExecution);
  const resumeExecution = useMutation(api.agents.resumeExecution);
  const stopExecution = useMutation(api.agents.stopExecution);
  const [isProcessing, setIsProcessing] = useState(false);

  const runningStacks =
    stacks?.filter((s) => s.execution_state === "running") || [];
  const pausedStacks =
    stacks?.filter((s) => s.execution_state === "paused") || [];
  const stoppedStacks =
    stacks?.filter(
      (s) =>
        !s.execution_state ||
        s.execution_state === "idle" ||
        s.execution_state === "stopped"
    ) || [];
  const resumableStacks = [...pausedStacks, ...stoppedStacks];

  const handlePauseAll = async () => {
    if (runningStacks.length === 0) return;

    const confirmed = confirm(
      `Pause execution for ${runningStacks.length} running team(s)?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await Promise.all(
        runningStacks.map((stack) =>
          pauseExecution({ stackId: stack._id }).catch((err) =>
            console.error(`Failed to pause ${stack.participant_name}:`, err)
          )
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopAll = async () => {
    if (runningStacks.length === 0) return;

    const confirmed = confirm(
      `Stop execution for ${runningStacks.length} running team(s)? This action cannot be undone.`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      await Promise.all(
        runningStacks.map((stack) =>
          stopExecution({ stackId: stack._id }).catch((err) =>
            console.error(`Failed to stop ${stack.participant_name}:`, err)
          )
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResumeAll = async () => {
    if (resumableStacks.length === 0) return;

    const pausedCount = pausedStacks.length;
    const stoppedCount = stoppedStacks.length;

    let message = `Resume execution for ${resumableStacks.length} team(s)?`;
    if (pausedCount > 0 && stoppedCount > 0) {
      message = `Resume ${pausedCount} paused and ${stoppedCount} stopped team(s)?`;
    } else if (pausedCount > 0) {
      message = `Resume ${pausedCount} paused team(s)?`;
    } else {
      message = `Resume ${stoppedCount} stopped team(s)?`;
    }

    const confirmed = confirm(message);
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      // Use startExecution for stopped stacks, resumeExecution for paused stacks
      await Promise.all([
        ...pausedStacks.map((stack) =>
          resumeExecution({ stackId: stack._id }).catch((err) =>
            console.error(`Failed to resume ${stack.participant_name}:`, err)
          )
        ),
        ...stoppedStacks.map((stack) =>
          startExecution({ stackId: stack._id }).catch((err) =>
            console.error(`Failed to start ${stack.participant_name}:`, err)
          )
        ),
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!stacks || stacks.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Global Controls
      </span>
      <div className="flex gap-2">
        <Button
          onClick={handleResumeAll}
          disabled={resumableStacks.length === 0 || isProcessing}
          size="sm"
          className="font-mono text-xs bg-green-600 hover:bg-green-700 text-white pl-2 pr-2"
          title={`Resume ${pausedStacks.length} paused and ${stoppedStacks.length} stopped team(s)`}
        >
          <Play className="mr-1.5 h-3.5 w-3.5" />
          Resume All
          {resumableStacks.length > 0 && (
            <span className="ml-1.5 text-[10px] opacity-80">
              ({resumableStacks.length})
            </span>
          )}
        </Button>
        <Button
          onClick={handlePauseAll}
          disabled={runningStacks.length === 0 || isProcessing}
          size="sm"
          variant="outline"
          className="font-mono text-xs border-yellow-500/50 text-yellow-600 hover:bg-yellow-500 hover:text-white bg-transparent pl-2 pr-2"
        >
          <Pause className="mr-1.5 h-3.5 w-3.5" />
          Pause All
          {runningStacks.length > 0 && (
            <span className="ml-1.5 text-[10px] opacity-80">
              ({runningStacks.length})
            </span>
          )}
        </Button>
        <Button
          onClick={handleStopAll}
          disabled={runningStacks.length === 0 || isProcessing}
          size="sm"
          variant="outline"
          className="font-mono text-xs border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white bg-transparent pl-2 pr-2"
        >
          <Square className="mr-1.5 h-3.5 w-3.5" />
          Stop All
          {runningStacks.length > 0 && (
            <span className="ml-1.5 text-[10px] opacity-80">
              ({runningStacks.length})
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
