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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@repo/ui/components/context-menu";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useMutation, useQuery } from "convex/react";
import {
  Activity,
  Calendar,
  Clock,
  Code2,
  Pause,
  Play,
  Square,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";

export function TeamManagementList({
  onNavigateToTeam,
}: {
  onNavigateToTeam?: (stackId: string) => void;
}) {
  const stacks = useQuery(api.agents.listStacks);
  const startExecution = useMutation(api.agents.startExecution);
  const pauseExecution = useMutation(api.agents.pauseExecution);
  const resumeExecution = useMutation(api.agents.resumeExecution);
  const stopExecution = useMutation(api.agents.stopExecution);
  const deleteStack = useMutation(api.agents.deleteStack);
  const [processingStacks, setProcessingStacks] = useState<
    Set<Id<"agent_stacks">>
  >(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

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

  const handlePause = async (id: Id<"agent_stacks">, name: string) => {
    setProcessingStacks((prev) => new Set([...prev, id]));
    try {
      await pauseExecution({ stackId: id });
    } catch (error) {
      console.error(`Failed to pause ${name}:`, error);
    } finally {
      setProcessingStacks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleResume = async (id: Id<"agent_stacks">, name: string) => {
    setProcessingStacks((prev) => new Set([...prev, id]));
    try {
      await resumeExecution({ stackId: id });
    } catch (error) {
      console.error(`Failed to resume ${name}:`, error);
    } finally {
      setProcessingStacks((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleStop = async (id: Id<"agent_stacks">, name: string) => {
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
          container: "bg-green-50 border-green-600/30",
          text: "text-green-700",
          pulse: "bg-green-600",
        };
      case "paused":
        return {
          container: "bg-amber-50 border-amber-600/30",
          text: "text-amber-700",
          pulse: "bg-amber-600",
        };
      case "stopped":
        return {
          container: "bg-red-50 border-red-600/30",
          text: "text-red-700",
          pulse: "bg-red-600",
        };
      default:
        return {
          container: "bg-gray-50 border-gray-400/30",
          text: "text-gray-600",
          pulse: "bg-gray-500",
        };
    }
  };

  const getPhaseStyles = (phase: string) => {
    switch (phase) {
      case "ideation":
        return "bg-blue-50 text-blue-700 border-blue-600/30";
      case "building":
        return "bg-purple-50 text-purple-700 border-purple-600/30";
      case "demo":
        return "bg-orange-50 text-orange-700 border-orange-600/30";
      case "completed":
        return "bg-green-50 text-green-700 border-green-600/30";
      default:
        return "bg-gray-50 text-gray-600 border-gray-400/30";
    }
  };

  const getTeamTypeStyles = (teamType: string) => {
    switch (teamType) {
      case "cursor":
        return {
          container: "bg-cyan-50 text-cyan-700 border-cyan-600/30",
          icon: Code2,
          label: "Cursor",
        };
      case "standard":
      default:
        return {
          container: "bg-indigo-50 text-indigo-700 border-indigo-600/30",
          icon: Users,
          label: "Multi-Agent",
        };
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
          <ScrollArea className="h-full pr-4">
            <div className="space-y-3">
              {stacks.map((stack: any) => {
                const executionState = stack.execution_state || "idle";
                const statusStyles = getStatusStyles(executionState);
                const phaseStyles = getPhaseStyles(stack.phase);
                const teamType = stack.team_type || "standard";
                const teamTypeStyles = getTeamTypeStyles(teamType);
                const TeamTypeIcon = teamTypeStyles.icon;

                return (
                  <ContextMenu key={stack._id}>
                    <ContextMenuTrigger asChild>
                      <div
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

                            {/* Team Type Badge */}
                            <Badge
                              variant="outline"
                              className={`${teamTypeStyles.container} border px-2 py-0.5`}
                            >
                              <span className="flex items-center gap-1">
                                <TeamTypeIcon className="h-2.5 w-2.5" />
                                <span className="font-mono text-[10px] uppercase tracking-wider">
                                  {teamTypeStyles.label}
                                </span>
                              </span>
                            </Badge>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span className="font-mono">
                                {new Date(
                                  stack.created_at
                                ).toLocaleDateString()}
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
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex"
                          >
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={executionState === "running"}
                                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title={
                                    executionState === "running"
                                      ? "Stop execution before deleting"
                                      : "Delete team"
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="sm:max-w-[425px] !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Team
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete{" "}
                                    <span className="font-medium text-foreground">
                                      {stack.participant_name}
                                    </span>
                                    . This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteStack({ stackId: stack._id });
                                    }}
                                    className="bg-red-500 hover:bg-red-600"
                                  >
                                    Delete Team
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      {executionState === "running" ? (
                        <ContextMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePause(stack._id, stack.participant_name);
                          }}
                          disabled={processingStacks.has(stack._id)}
                          className="font-mono text-xs"
                        >
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </ContextMenuItem>
                      ) : executionState === "paused" ? (
                        <ContextMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResume(stack._id, stack.participant_name);
                          }}
                          disabled={processingStacks.has(stack._id)}
                          className="font-mono text-xs"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Resume
                        </ContextMenuItem>
                      ) : (
                        <ContextMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStart(stack._id, stack.participant_name);
                          }}
                          disabled={processingStacks.has(stack._id)}
                          className="font-mono text-xs"
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Start
                        </ContextMenuItem>
                      )}
                      <ContextMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStop(stack._id, stack.participant_name);
                        }}
                        disabled={processingStacks.has(stack._id)}
                        className="font-mono text-xs"
                      >
                        <Square className="mr-2 h-4 w-4" />
                        Stop
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialogOpen(stack._id);
                        }}
                        disabled={executionState === "running"}
                        className="font-mono text-xs text-red-500 focus:text-red-500"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen !== null}
        onOpenChange={(open) => !open && setDeleteDialogOpen(null)}
      >
        <AlertDialogContent className="sm:max-w-[425px] !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {
                  stacks.find((s: any) => s._id === deleteDialogOpen)
                    ?.participant_name
                }
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialogOpen) {
                  deleteStack({
                    stackId: deleteDialogOpen as Id<"agent_stacks">,
                  });
                  setDeleteDialogOpen(null);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Team
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
