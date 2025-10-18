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
} from "@repo/ui/components/alert-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@repo/ui/components/context-menu";
import { useMutation, useQuery } from "convex/react";
import { Pause, Play, Square, Trash2 } from "lucide-react";
import { useState } from "react";
import { AGENT_COLORS } from "../../lib/theme";
import { PixelPanel } from "../shared/PixelPanel";

export function ObservabilityTab() {
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

  // Get traces for all stacks (we'll need to add this query)
  // const traces = useQuery(api.traces.getRecentTraces, { limit: 50 });

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

  return (
    <div className="p-6 space-y-6">
      <PixelPanel title="System Observability">
        <div className="space-y-4 text-sm">
          <div className="border-b-2 border-border pb-4">
            <h3 className="text-primary font-bold mb-2 uppercase">
              Execution Overview
            </h3>
            <div className="space-y-2">
              {stacks?.map((stack) => {
                const executionState = stack.execution_state || "idle";

                return (
                  <ContextMenu key={stack._id}>
                    <ContextMenuTrigger asChild>
                      <div className="p-3 bg-background border-2 border-border cursor-pointer hover:border-primary/50 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-bold text-foreground">
                            {stack.participant_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {stack.last_executed_at
                              ? `Last: ${new Date(stack.last_executed_at).toLocaleTimeString()}`
                              : "Never executed"}
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div className="text-center">
                            <div
                              style={{ color: AGENT_COLORS.planner }}
                              className="font-bold"
                            >
                              Planner
                            </div>
                            <div className="text-muted-foreground">Idle</div>
                          </div>
                          <div className="text-center">
                            <div
                              style={{ color: AGENT_COLORS.builder }}
                              className="font-bold"
                            >
                              Builder
                            </div>
                            <div className="text-muted-foreground">Idle</div>
                          </div>
                          <div className="text-center">
                            <div
                              style={{ color: AGENT_COLORS.communicator }}
                              className="font-bold"
                            >
                              Communicator
                            </div>
                            <div className="text-muted-foreground">Idle</div>
                          </div>
                          <div className="text-center">
                            <div
                              style={{ color: AGENT_COLORS.reviewer }}
                              className="font-bold"
                            >
                              Reviewer
                            </div>
                            <div className="text-muted-foreground">Idle</div>
                          </div>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48 cursor-move">
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
          </div>

          <div className="border-b-2 border-border pb-4">
            <h3 className="text-primary font-bold mb-2 uppercase">
              Recent Activity
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
              <div className="text-center py-8 text-muted-foreground text-xs">
                Activity traces will appear here
              </div>
            </div>
          </div>

          <div className="text-center text-muted-foreground text-xs">
            Detailed observability features coming soon
          </div>
        </div>
      </PixelPanel>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={deleteDialogOpen !== null}
        onOpenChange={(open) => !open && setDeleteDialogOpen(null)}
      >
        <AlertDialogContent className="sm:max-w-[425px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {
                  stacks?.find((s: any) => s._id === deleteDialogOpen)
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
    </div>
  );
}
