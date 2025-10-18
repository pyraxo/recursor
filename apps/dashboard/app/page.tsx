"use client";

import { useState } from "react";
import { AgentDetail } from "../components/Agents/AgentDetail";
import { AgentList } from "../components/Agents/AgentList";
import { LiveFeed } from "../components/Feed/LiveFeed";
import { AdminDashboard } from "../components/Admin/AdminDashboard";
import { Button } from "@repo/ui/button";

export default function Page() {
  const [view, setView] = useState<"admin" | "observability">("admin");
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center gap-2 border-b pb-4">
          <Button
            variant={view === "admin" ? "default" : "ghost"}
            onClick={() => setView("admin")}
          >
            Admin
          </Button>
          <Button
            variant={view === "observability" ? "default" : "ghost"}
            onClick={() => setView("observability")}
          >
            Observability
          </Button>
        </div>

        {view === "admin" ? (
          <AdminDashboard />
        ) : (
          <div className="grid grid-cols-[280px_1fr_1fr] gap-4">
            <div>
              <h2 className="text-xl font-bold mb-4">Teams</h2>
              <AgentList onSelect={setSelected} />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-4">Live Feed</h2>
              <LiveFeed />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-4">Detail</h2>
              {selected ? (
                <AgentDetail stackId={selected as any} />
              ) : (
                <div className="text-muted-foreground">Select a team</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
