"use client";

import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { PixelPanel } from "../shared/PixelPanel";
import { AGENT_COLORS } from "../../lib/theme";

export function ObservabilityTab() {
  const stacks = useQuery(api.agents.listStacks);

  // Get traces for all stacks (we'll need to add this query)
  // const traces = useQuery(api.traces.getRecentTraces, { limit: 50 });

  return (
    <div className="p-6 space-y-6">
      <PixelPanel title="System Observability">
        <div className="space-y-4 font-mono text-sm">
          <div className="border-b-2 border-[var(--panel-border)] pb-4">
            <h3 className="text-[var(--accent-primary)] font-bold mb-2 uppercase">
              Execution Overview
            </h3>
            <div className="space-y-2">
              {stacks?.map((stack) => (
                <div
                  key={stack._id}
                  className="p-3 bg-[var(--background)] border-2 border-[var(--panel-border)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-[var(--foreground)]">
                      {stack.participant_name}
                    </div>
                    <div className="text-xs text-[var(--foreground)]/60">
                      {stack.last_executed_at
                        ? `Last: ${new Date(stack.last_executed_at).toLocaleTimeString()}`
                        : "Never executed"}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="text-center">
                      <div style={{ color: AGENT_COLORS.planner }} className="font-bold">
                        Planner
                      </div>
                      <div className="text-[var(--foreground)]/60">Idle</div>
                    </div>
                    <div className="text-center">
                      <div style={{ color: AGENT_COLORS.builder }} className="font-bold">
                        Builder
                      </div>
                      <div className="text-[var(--foreground)]/60">Idle</div>
                    </div>
                    <div className="text-center">
                      <div style={{ color: AGENT_COLORS.communicator }} className="font-bold">
                        Communicator
                      </div>
                      <div className="text-[var(--foreground)]/60">Idle</div>
                    </div>
                    <div className="text-center">
                      <div style={{ color: AGENT_COLORS.reviewer }} className="font-bold">
                        Reviewer
                      </div>
                      <div className="text-[var(--foreground)]/60">Idle</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b-2 border-[var(--panel-border)] pb-4">
            <h3 className="text-[var(--accent-primary)] font-bold mb-2 uppercase">
              Recent Activity
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-hide">
              <div className="text-center py-8 text-[var(--foreground)]/40 text-xs">
                Activity traces will appear here
              </div>
            </div>
          </div>

          <div className="text-center text-[var(--foreground)]/40 text-xs">
            Detailed observability features coming soon
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
