"use client";

import { api } from "@recursor/convex/_generated/api";
import { Button } from "@repo/ui/button";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Play, Square } from "lucide-react";
import { useState } from "react";

export function GlobalExecutionControls() {
  const stacks = useQuery(api.agents.listStacks);
  const startExecution = useMutation(api.agents.startExecution);
  const stopExecution = useMutation(api.agents.stopExecution);
  const [isProcessing, setIsProcessing] = useState(false);

  const runningStacks =
    stacks?.filter((s) => s.execution_state === "running") || [];
  const stoppedStacks =
    stacks?.filter(
      (s) =>
        !s.execution_state ||
        s.execution_state === "idle" ||
        s.execution_state === "stopped"
    ) || [];

  const handleStartAll = async () => {
    if (stoppedStacks.length === 0) return;

    const confirmed = confirm(
      `Start execution for ${stoppedStacks.length} team(s)?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    try {
      // Start all stopped stacks
      await Promise.all(
        stoppedStacks.map((stack) =>
          startExecution({ stackId: stack._id }).catch((err) =>
            console.error(`Failed to start ${stack.participant_name}:`, err)
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
      // Stop all running stacks
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

  if (!stacks || stacks.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-gray-900 rounded-lg border border-gray-800">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-yellow-500" />
        <span className="text-sm font-medium">Global Controls</span>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleStartAll}
          disabled={stoppedStacks.length === 0 || isProcessing}
          variant="default"
          className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          <Play className="w-4 h-4 mr-2" />
          Start All ({stoppedStacks.length})
        </Button>

        <Button
          onClick={handleStopAll}
          disabled={runningStacks.length === 0 || isProcessing}
          variant="destructive"
        >
          <Square className="w-4 h-4 mr-2" />
          Stop All ({runningStacks.length})
        </Button>
      </div>

      {isProcessing && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          Processing...
        </div>
      )}
    </div>
  );
}
