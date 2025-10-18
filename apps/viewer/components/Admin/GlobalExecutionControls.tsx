"use client";

import { api } from "@recursor/convex/_generated/api";
import { Button } from "@repo/ui/components/button";
import { useMutation, useQuery } from "convex/react";
import { Play, Square } from "lucide-react";
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
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
        Global Controls
      </span>
      <div className="flex gap-2">
        <Button
          onClick={handleStartAll}
          disabled={stoppedStacks.length === 0 || isProcessing}
          size="sm"
          className="font-mono text-xs bg-green-600 hover:bg-green-700 text-white pl-2 pr-2"
        >
          <Play className="mr-1.5 h-3.5 w-3.5" />
          Start All
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
        </Button>
      </div>
    </div>
  );
}
