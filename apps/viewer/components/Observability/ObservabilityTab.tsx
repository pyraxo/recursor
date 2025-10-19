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
import { Button } from "@repo/ui/components/button";
import { useMutation, useQuery } from "convex/react";
import { ArrowUp, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AgentDetail } from "./AgentDetail";
import { AgentList } from "./AgentList";
import { LiveFeed, LiveFeedRef } from "./LiveFeed";

export function ObservabilityTab({
  selectedTeamId,
}: {
  selectedTeamId?: Id<"agent_stacks"> | null;
}) {
  const [selected, setSelected] = useState<string | null>(
    selectedTeamId || null
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const liveFeedRef = useRef<LiveFeedRef>(null);
  const traces = useQuery(api.traces.getRecentAll, { limit: 100 });
  const deleteAllTraces = useMutation(api.traces.deleteAll);

  // Sync external selectedTeamId prop with internal selected state
  useEffect(() => {
    if (selectedTeamId) {
      setSelected(selectedTeamId);
    }
  }, [selectedTeamId]);

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await deleteAllTraces();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full w-full overflow-clip p-6">
      <div className="w-full space-y-6">
        <div className="grid grid-cols-[280px_1fr_1fr] gap-4 items-start">
          {/* Column 1: Team List */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4 h-9">
              <h2 className="font-mono text-sm font-semibold">Teams</h2>
            </div>
            <AgentList onSelect={setSelected} selectedId={selected} />
          </div>

          {/* Column 2: Live Feed */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4 h-9">
              <h2 className="font-mono text-sm font-semibold">Live Feed</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() => liveFeedRef.current?.scrollToTop()}
              >
                <ArrowUp className="w-4 h-4 mr-1" />
                Top
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isDeleting || !traces || traces.length === 0}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Nuke
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-[425px] !fixed !left-[50%] !top-[50%] !translate-x-[-50%] !translate-y-[-50%]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Events</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete{" "}
                      <span className="font-medium text-foreground">
                        {traces?.length || 0} event
                        {traces?.length !== 1 ? "s" : ""}
                      </span>{" "}
                      from the live feed. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAll}
                      className="bg-red-500 hover:bg-red-600"
                    >
                      {isDeleting ? "Deleting..." : "Delete All Events"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <LiveFeed ref={liveFeedRef} />
          </div>

          {/* Column 3: Team Detail */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-4 h-9">
              <h2 className="font-mono text-sm font-semibold">Detail</h2>
            </div>
            {selected ? (
              <AgentDetail stackId={selected as Id<"agent_stacks">} />
            ) : (
              <div className="font-mono text-xs text-muted-foreground">
                Select a team
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
