"use client";

import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { PixelPanel } from "../shared/PixelPanel";

export function AdminTab() {
  const stacks = useQuery(api.agents.listStacks);

  return (
    <div className="p-6 space-y-6">
      <PixelPanel title="System Administration">
        <div className="space-y-4 font-mono text-sm">
          <div className="border-b-2 border-[var(--panel-border)] pb-4">
            <h3 className="text-[var(--accent-primary)] font-bold mb-2 uppercase">
              System Stats
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[var(--foreground)]/60 text-xs mb-1">Active Teams</div>
                <div className="text-2xl font-bold text-[var(--accent-primary)]">
                  {stacks?.length || 0}
                </div>
              </div>
              <div>
                <div className="text-[var(--foreground)]/60 text-xs mb-1">Total Agents</div>
                <div className="text-2xl font-bold text-[var(--accent-primary)]">
                  {(stacks?.length || 0) * 4}
                </div>
              </div>
            </div>
          </div>

          <div className="border-b-2 border-[var(--panel-border)] pb-4">
            <h3 className="text-[var(--accent-primary)] font-bold mb-2 uppercase">
              Team Management
            </h3>
            <div className="space-y-2">
              {stacks?.map((stack) => (
                <div
                  key={stack._id}
                  className="flex items-center justify-between p-3 bg-[var(--background)] border-2 border-[var(--panel-border)]"
                >
                  <div>
                    <div className="font-bold text-[var(--foreground)]">
                      {stack.participant_name}
                    </div>
                    <div className="text-xs text-[var(--foreground)]/60">
                      Phase: {stack.phase}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 text-xs font-bold uppercase ${
                        stack.execution_state === "running"
                          ? "bg-green-500/20 text-green-500 border border-green-500"
                          : stack.execution_state === "paused"
                          ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500"
                          : "bg-gray-500/20 text-gray-500 border border-gray-500"
                      }`}
                    >
                      {stack.execution_state || "idle"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center text-[var(--foreground)]/40 text-xs">
            Additional admin features coming soon
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
