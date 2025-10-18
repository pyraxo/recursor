"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { Separator } from "@repo/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { DeleteTeamDialog } from "./DeleteTeamDialog";
import { Trash2, Play, Pause, Square, Circle, Clock, Calendar } from "lucide-react";

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

  const getStatusBadgeClass = (executionState: string) => {
    switch (executionState) {
      case 'running':
        return "bg-green-900/50 text-green-400 border-green-800 hover:bg-green-900/70";
      case 'paused':
        return "bg-yellow-900/50 text-yellow-400 border-yellow-800 hover:bg-yellow-900/70";
      case 'stopped':
        return "bg-red-900/50 text-red-400 border-red-800 hover:bg-red-900/70";
      default:
        return "bg-gray-800 text-gray-400 border-gray-700";
    }
  };

  const getStatusIcon = (executionState: string) => {
    switch (executionState) {
      case 'running':
        return <Play className="h-3 w-3" />;
      case 'paused':
        return <Pause className="h-3 w-3" />;
      case 'stopped':
        return <Square className="h-3 w-3" />;
      default:
        return <Circle className="h-3 w-3" />;
    }
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

                return (
                  <div
                    key={stack._id}
                    className="flex items-center justify-between p-3 border hover:bg-accent/50 transition-colors rounded-lg"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="font-medium truncate">
                          {stack.participant_name}
                        </div>
                        <Badge
                          variant="outline"
                          className={`uppercase tracking-wider ${getStatusBadgeClass(executionState)}`}
                        >
                          <span className="flex items-center gap-1">
                            {getStatusIcon(executionState)}
                            {executionState}
                          </span>
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {stack.phase}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(stack.created_at).toLocaleDateString()}</span>
                        </div>

                        {stack.last_activity_at && executionState === 'running' && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <div className="flex items-center gap-1 text-green-400">
                              <Clock className="h-3 w-3" />
                              <span>
                                Active: {new Date(stack.last_activity_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </>
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
