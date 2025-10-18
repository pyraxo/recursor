"use client";

import { Button } from "@repo/ui/components/button";
import { useState, useRef } from "react";
import { AdminDashboard } from "../components/Admin/AdminDashboard";
import { AgentDetail } from "../components/Agents/AgentDetail";
import { AgentList } from "../components/Agents/AgentList";
import { LiveFeed, LiveFeedRef } from "../components/Feed/LiveFeed";
import { ArrowUp } from "lucide-react";

export default function Page() {
  const [view, setView] = useState<"admin" | "observability">("admin");
  const [selected, setSelected] = useState<string | null>(null);
  const liveFeedRef = useRef<LiveFeedRef>(null);

  const navigateToTeam = (stackId: string) => {
    setSelected(stackId);
    setView("observability");
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
