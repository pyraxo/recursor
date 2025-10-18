"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { DeleteTeamDialog } from "./DeleteTeamDialog";
import { Trash2, Play, Pause, Square, Circle } from "lucide-react";

export function TeamManagementList() {
  const stacks = useQuery(api.agents.listStacks);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStack, setSelectedStack] = useState<{
    id: Id<"agent_stacks">;
    name: string;
  } | null>(null);

  if (!stacks) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Teams</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const handleDelete = (id: Id<"agent_stacks">, name: string) => {
    setSelectedStack({ id, name });
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Existing Teams</CardTitle>
        </CardHeader>
        <CardContent>
          {stacks.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No teams created yet
            </div>
          ) : (
            <div className="space-y-2">
              {stacks.map((stack: any) => {
                const executionState = stack.execution_state || 'idle';
                const getStatusIcon = () => {
                  switch (executionState) {
                    case 'running':
                      return <Play className="h-3 w-3 text-green-400" />;
                    case 'paused':
                      return <Pause className="h-3 w-3 text-yellow-400" />;
                    case 'stopped':
                      return <Square className="h-3 w-3 text-red-400" />;
                    default:
                      return <Circle className="h-3 w-3 text-gray-400" />;
                  }
                };

                const getStatusBadge = () => {
                  const baseClasses = "px-2 py-0.5 rounded text-xs font-medium uppercase";
                  switch (executionState) {
                    case 'running':
                      return `${baseClasses} bg-green-900/50 text-green-400 border border-green-800`;
                    case 'paused':
                      return `${baseClasses} bg-yellow-900/50 text-yellow-400 border border-yellow-800`;
                    case 'stopped':
                      return `${baseClasses} bg-red-900/50 text-red-400 border border-red-800`;
                    default:
                      return `${baseClasses} bg-gray-800 text-gray-400 border border-gray-700`;
                  }
                };

                return (
                  <div
                    key={stack._id}
                    className="flex items-center justify-between p-3 border hover:bg-accent/50 transition-colors rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium truncate">
                          {stack.participant_name}
                        </div>
                        <span className={getStatusBadge()}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon()}
                            {executionState}
                          </span>
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-x-3">
                        <span>Phase: {stack.phase}</span>
                        <span>
                          Created: {new Date(stack.created_at).toLocaleString()}
                        </span>
                        {stack.last_activity_at && executionState === 'running' && (
                          <span className="text-green-400">
                            Active: {new Date(stack.last_activity_at).toLocaleTimeString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleDelete(stack._id, stack.participant_name)
                      }
                      className="ml-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStack && (
        <DeleteTeamDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          stackId={selectedStack.id}
          participantName={selectedStack.name}
        />
      )}
    </>
  );
}

