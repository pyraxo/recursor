"use client";

import { api } from "@recursor/convex/_generated/api";
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
import { useState, useRef } from "react";
import { AdminDashboard } from "../components/Admin/AdminDashboard";
import { AgentDetail } from "../components/Agents/AgentDetail";
import { AgentList } from "../components/Agents/AgentList";
import { LiveFeed, LiveFeedRef } from "../components/Feed/LiveFeed";

export default function Page() {
  const [view, setView] = useState<"admin" | "observability">("admin");
  const [selected, setSelected] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const liveFeedRef = useRef<LiveFeedRef>(null);
  const traces = useQuery(api.traces.getRecentAll, { limit: 100 });
  const deleteAllTraces = useMutation(api.traces.deleteAll);

  const navigateToTeam = (stackId: string) => {
    setSelected(stackId);
    setView("observability");
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await deleteAllTraces();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-screen bg-background dark overflow-hidden">
      {view === "admin" ? (
        <AdminDashboard onNavigateToTeam={navigateToTeam} />
      ) : (
        <div className="p-6 h-full overflow-auto">
          <div className="max-w-[1800px] mx-auto space-y-6">
            <div className="flex items-center gap-2 border-b border-border pb-4">
              <Button
                variant="ghost"
                onClick={() => setView("admin")}
                className="font-mono text-xs"
              >
                Admin
              </Button>
              <Button
                variant="default"
                onClick={() => setView("observability")}
                className="font-mono text-xs"
              >
                Observability
              </Button>
            </div>

            <div className="grid grid-cols-[280px_1fr_1fr] gap-4">
              <div>
                <h2 className="font-mono text-sm font-semibold mb-4">Teams</h2>
                <AgentList onSelect={setSelected} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="font-mono text-sm font-semibold">
                    Live Feed
                  </h2>
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
                            {traces?.length || 0} event{traces?.length !== 1 ? 's' : ''}
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
              <div>
                <h2 className="font-mono text-sm font-semibold mb-4">Detail</h2>
                {selected ? (
                  <AgentDetail stackId={selected as any} />
                ) : (
                  <div className="font-mono text-xs text-muted-foreground">
                    Select a team
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation for Admin view */}
      {view === "admin" && (
        <div className="fixed top-6 right-6 z-10">
          <Button
            variant="outline"
            onClick={() => setView("observability")}
            className="font-mono text-xs border-border bg-card hover:bg-accent"
          >
            View Observability →
          </Button>
        </div>
      )}
    </div>
  );
}
