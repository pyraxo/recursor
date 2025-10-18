"use client";

import { api } from "@recursor/convex/_generated/api";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/alert";
import { Separator } from "@repo/ui/separator";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, Play, Square, Loader2 } from "lucide-react";
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
    <Alert className="border-yellow-900/50 bg-yellow-950/20">
      <AlertCircle className="h-4 w-4 text-yellow-500" />
      <AlertTitle className="text-yellow-400">Global Controls</AlertTitle>
      <AlertDescription className="mt-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleStartAll}
              disabled={stoppedStacks.length === 0 || isProcessing}
              size="sm"
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              Start All
              <Badge variant="secondary" className="ml-2">
                {stoppedStacks.length}
              </Badge>
            </Button>

            <Button
              onClick={handleStopAll}
              disabled={runningStacks.length === 0 || isProcessing}
              size="sm"
              variant="destructive"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop All
              <Badge variant="secondary" className="ml-2">
                {runningStacks.length}
              </Badge>
            </Button>
          </div>

          {isProcessing && (
            <>
              <Separator orientation="vertical" className="hidden sm:block h-6" />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </div>
            </>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
