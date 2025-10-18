"use client";

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
} from "@repo/ui/alert-dialog";
import { Checkbox } from "@repo/ui/checkbox";
import { Label } from "@repo/ui/label";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface DeleteTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stackId: Id<"agent_stacks"> | "";
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

  const handleDelete = async () => {
    if (!stackId || stackId === "") return;

    setIsDeleting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      alert(
        `Delete functionality not yet implemented.\n\nWould delete: ${participantName}\nCascade: ${cascadeDelete}`
      );

      onOpenChange(false);
      setCascadeDelete(false);
    } catch (error) {
      console.error("Failed to delete team:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-semibold">
            Delete Team
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground">
            {participantName ? (
              <>
                This will permanently delete{" "}
                <span className="font-medium text-foreground">
                  {participantName}
                </span>
                . This action cannot be undone.
              </>
            ) : (
              "No team selected"
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="cascade-delete"
              checked={cascadeDelete}
              onCheckedChange={(checked) =>
                setCascadeDelete(checked as boolean)
              }
              className="mt-0.5"
            />
            <div className="grid gap-1.5">
              <Label
                htmlFor="cascade-delete"
                className="text-sm font-normal leading-none cursor-pointer"
              >
                Delete all related data
              </Label>
              <p className="text-xs text-muted-foreground">
                This will also remove all todos, artifacts, messages, and traces
                associated with this team.
              </p>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isDeleting}
            className="font-mono text-xs"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || !stackId}
            className="font-mono text-xs bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete Team"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
