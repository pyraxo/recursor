"use client";

import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/dialog";
import { Label } from "@repo/ui/label";
import { useMutation } from "convex/react";
import { useState } from "react";

interface DeleteTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stackId: Id<"agent_stacks">;
  participantName: string;
}

export function DeleteTeamDialog({
  open,
  onOpenChange,
  stackId,
  participantName,
}: DeleteTeamDialogProps) {
  const [cascadeDelete, setCascadeDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // TODO: Implement deleteStack mutation in api.agents
  // const deleteStack = useMutation(api.agents.deleteStack);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // TODO: Implement backend deleteStack mutation
      console.log("Delete stack:", stackId, "cascade:", cascadeDelete);
      alert("Delete functionality not yet implemented in backend");
      onOpenChange(false);
      setCascadeDelete(false);
    } catch (error) {
      console.error("Failed to delete team:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Team</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {participantName}
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start space-x-2 py-4">
          <Checkbox
            id="cascade"
            checked={cascadeDelete}
            onCheckedChange={(checked) => setCascadeDelete(checked as boolean)}
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="cascade"
              className="text-sm font-normal cursor-pointer"
            >
              Also delete all related data
            </Label>
            <p className="text-xs text-muted-foreground">
              Removes todos, artifacts, messages, and traces
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
