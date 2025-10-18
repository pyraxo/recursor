"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { DeleteTeamDialog } from "./DeleteTeamDialog";
import { Trash2 } from "lucide-react";

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
              {stacks.map((stack: any) => (
                <div
                  key={stack._id}
                  className="flex items-center justify-between p-3 border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {stack.participant_name}
                    </div>
                    <div className="text-xs text-muted-foreground space-x-3">
                      <span>Phase: {stack.phase}</span>
                      <span>
                        Created: {new Date(stack.created_at).toLocaleString()}
                      </span>
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
              ))}
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

