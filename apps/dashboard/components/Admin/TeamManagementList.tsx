"use client";

import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useMutation, useQuery } from "convex/react";
import { Activity, Calendar, Clock, Play, Square, Trash2 } from "lucide-react";
import { useState } from "react";

export function TeamManagementList({
  onNavigateToTeam,
}: {
  onNavigateToTeam?: (stackId: string) => void;
}) {
  const stacks = useQuery(api.agents.listStacks);
  const startExecution = useMutation(api.agents.startExecution);
  const stopExecution = useMutation(api.agents.stopExecution);
  const [processingStacks, setProcessingStacks] = useState<
    Set<Id<"agent_stacks">>
  >(new Set());

  const handleStart = async (id: Id<"agent_stacks">, name: string) => {
    setProcessingStacks((prev) => new Set([...prev, id]));
    try {
      await startExecution({ stackId: id });
    } catch (error) {
      console.error(`Failed to start ${name}:`, error);
    } finally {
      setProcessingStacks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleStop = async (id: Id<"agent_stacks">, name: string) => {
    const confirmed = confirm(
      `Stop execution for ${name}? This action cannot be undone.`
    );
    if (!confirmed) return;

    setProcessingStacks((prev) => new Set([...prev, id]));
    try {
      await stopExecution({ stackId: id });
    } catch (error) {
      console.error(`Failed to stop ${name}:`, error);
    } finally {
      setProcessingStacks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const getStatusStyles = (executionState: string) => {
    switch (executionState) {
      case "running":
        return {
          container: "bg-green-500/10 border-green-500/20",
          text: "text-green-500",
          pulse: "bg-green-500",
        };
      case "paused":
        return {
          container: "bg-yellow-500/10 border-yellow-500/20",
          text: "text-yellow-500",
          pulse: "bg-yellow-500",
        };
      case "stopped":
        return {
          container: "bg-red-500/10 border-red-500/20",
          text: "text-red-500",
          pulse: "bg-red-500",
        };
      default:
        return {
          container: "bg-gray-500/10 border-gray-500/20",
          text: "text-gray-500",
          pulse: "bg-gray-400",
        };
    }
  };

  const getPhaseStyles = (phase: string) => {
    switch (phase) {
      case "ideation":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "building":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "demo":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "completed":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  if (!stacks) {
    return (
      <Card className="border-border bg-card p-6">
        <h3 className="font-mono text-sm font-semibold text-foreground mb-6">
          Existing Teams
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border bg-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-mono text-sm font-semibold text-foreground">
            Existing Teams
          </h3>
          {stacks.length > 0 && (
            <Badge variant="secondary" className="font-mono text-xs">
              {stacks.length} {stacks.length === 1 ? "team" : "teams"}
            </Badge>
          )}
        </div>

        {stacks.length === 0 ? (
          <div className="py-8 text-center">
            <p className="font-mono text-xs text-muted-foreground mb-2">
              No teams created yet
            </p>
            <p className="font-mono text-xs text-muted-foreground">
              Create your first team to get started
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {stacks.map((stack: any) => {
                const executionState = stack.execution_state || "idle";
                const statusStyles = getStatusStyles(executionState);
                const phaseStyles = getPhaseStyles(stack.phase);

                return (
                  <div
                    key={stack._id}
                    className="group relative flex items-center justify-between p-4 rounded-lg border border-border bg-background hover:border-foreground/20 transition-all duration-200 cursor-pointer"
                    onClick={() => onNavigateToTeam?.(stack._id)}
                  >
                    <div className="flex-1 min-w-0">
                      {/* Team Name and Status */}
                      <div className="flex items-center gap-3 mb-3">
                        <span className="font-mono text-sm font-semibold text-foreground truncate">
                          {stack.participant_name}
                        </span>

                        {/* Execution Status Badge */}
                        <Badge
                          variant="outline"
                          className={`${statusStyles.container} ${statusStyles.text} border px-2 py-0.5`}
                        >
                          <span className="relative flex items-center gap-1.5">
                            {executionState === "running" && (
                              <span
                                className={`absolute inline-flex h-full w-full rounded-full ${statusStyles.pulse} opacity-25 animate-ping`}
                              ></span>
                            )}
                            <span
                              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${statusStyles.pulse}`}
                            ></span>
                            <span className="font-mono text-[10px] uppercase tracking-wider">
                              {executionState}
                            </span>
                          </span>
                        </Badge>

                        {/* Phase Badge */}
                        <Badge
                          variant="outline"
                          className={`${phaseStyles} border px-2 py-0.5`}
                        >
                          <span className="font-mono text-[10px] uppercase tracking-wider">
                            {stack.phase}
                          </span>
                        </Badge>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          <span className="font-mono">
                            {new Date(stack.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {stack.last_activity_at &&
                          executionState === "running" && (
                            <div className="flex items-center gap-1.5">
                              <Activity className="h-3 w-3 text-green-500" />
                              <span className="font-mono text-green-500">
                                Active{" "}
                                {new Date(
                                  stack.last_activity_at
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                          )}

                        {stack.last_activity_at &&
                          executionState !== "running" && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              <span className="font-mono">
                                Last active{" "}
                                {new Date(
                                  stack.last_activity_at
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                      </div>
                    </div>

                    <div
                      className={`flex items-center gap-2 transition-opacity duration-200 ${
                        processingStacks.has(stack._id)
                          ? "opacity-100"
                          : "opacity-50 group-hover:opacity-100"
                      }`}
                    >
                      {/* Start/Stop Button */}
                      {executionState === "running" ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStop(stack._id, stack.participant_name);
                          }}
                          disabled={processingStacks.has(stack._id)}
                          className="text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                          title="Stop execution"
                        >
                          <Square className="h-4 w-4" />
                          <span className="sr-only">
                            Stop {stack.participant_name}
                          </span>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStart(stack._id, stack.participant_name);
                          }}
                          disabled={processingStacks.has(stack._id)}
                          className="text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          title="Start execution"
                        >
                          <Play className="h-4 w-4" />
                          <span className="sr-only">
                            Start {stack.participant_name}
                          </span>
                        </Button>
                      )}

                      {/* Delete Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            disabled={executionState === "running"}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              executionState === "running"
                                ? "Stop execution before deleting"
                                : "Delete team"
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">
                              Delete {stack.participant_name}
                            </span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Team</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete{" "}
                              <span className="font-medium text-foreground">
                                {stack.participant_name}
                              </span>
                              . This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                alert(
                                  `Delete functionality not yet implemented.\n\nWould delete: ${stack.participant_name}`
                                );
                              }}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete Team
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>
    </>
  );
}
