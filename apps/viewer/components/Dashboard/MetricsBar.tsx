"use client";

import { api } from "@recursor/convex/_generated/api";
import { useQuery } from "convex/react";

export function MetricsBar() {
  const stacks = useQuery(api.agents.listStacks);

  const elapsedTime = () => {
    if (!stacks || stacks.length === 0) return "00:00:00";

    const earliest = Math.min(...stacks.map((s) => s.created_at));
    const elapsed = Date.now() - earliest;

    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const activeAgents = stacks ? stacks.length * 4 : 0;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="pixel-panel text-center">
        <div className="text-sm text-[var(--foreground)]/70 mb-1 font-mono uppercase">
          Elapsed Time
        </div>
        <div className="text-3xl font-mono font-bold text-[var(--accent-primary)] tabular-nums">
          {elapsedTime()}
        </div>
      </div>
      
      <div className="pixel-panel text-center">
        <div className="text-sm text-[var(--foreground)]/70 mb-1 font-mono uppercase">
          Total Iterations
        </div>
        <div className="text-3xl font-mono font-bold text-[var(--accent-secondary)] tabular-nums">
          0
        </div>
      </div>
      
      <div className="pixel-panel text-center">
        <div className="text-sm text-[var(--foreground)]/70 mb-1 font-mono uppercase">
          Active Agents
        </div>
        <div className="text-3xl font-mono font-bold text-[var(--accent-quaternary)] tabular-nums">
          {activeAgents}
        </div>
      </div>
    </div>
  );
}
