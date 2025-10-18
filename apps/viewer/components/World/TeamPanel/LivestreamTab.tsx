"use client";

import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { AGENT_COLORS } from "../../../lib/theme";

interface LivestreamTabProps {
  stackId: Id<"agent_stacks">;
}

export function LivestreamTab({ stackId }: LivestreamTabProps) {
  const stack = useQuery(api.agents.getStack, { stackId });
  const todos = useQuery(api.todos.getByStack, { stackId });
  const traces = useQuery(api.traces.getRecent, { stackId, limit: 20 });

  if (!stack) {
    return <div className="text-[var(--foreground)]/60 font-mono text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-4 font-mono text-sm h-full overflow-y-auto scrollbar-hide">
      <div>
        <h3 className="text-[var(--accent-primary)] font-bold mb-2">Live Activity</h3>
        <div className="text-[var(--foreground)]/80">
          Current Phase: <span className="text-[var(--accent-secondary)]">{stack.phase}</span>
        </div>
      </div>

      {traces && traces.length > 0 ? (
        <div className="border-t-2 border-[var(--panel-border)] pt-4">
          <h4 className="text-[var(--accent-secondary)] font-bold mb-2">Recent Traces</h4>
          <div className="space-y-2">
            {traces.map((trace) => {
              const agentColor = AGENT_COLORS[trace.agent_type as keyof typeof AGENT_COLORS] || "var(--accent-primary)";
              
              return (
                <div
                  key={trace._id}
                  className="bg-[var(--background)] p-3 border-l-3 rounded"
                  style={{ borderLeftColor: agentColor, borderLeftWidth: "3px" }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-xs font-bold uppercase"
                      style={{ color: agentColor }}
                    >
                      {trace.agent_type}
                    </span>
                    <span className="text-xs text-[var(--foreground)]/50">
                      {new Date(trace.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--foreground)]/80 mb-1">
                    {trace.thought}
                  </div>
                  <div className="text-xs text-[var(--accent-quaternary)]">
                    Action: {trace.action}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border-t-2 border-[var(--panel-border)] pt-4">
          <h4 className="text-[var(--accent-secondary)] font-bold mb-2">Agent States</h4>
          <div className="space-y-2">
            {stack.agents.map((agent) => {
              const agentColor = AGENT_COLORS[agent.agent_type as keyof typeof AGENT_COLORS] || "var(--accent-primary)";
              
              return (
                <div
                  key={agent._id}
                  className="bg-[var(--background)] p-3 border-l-3 rounded"
                  style={{ borderLeftColor: agentColor, borderLeftWidth: "3px" }}
                >
                  <div
                    className="font-bold uppercase mb-2"
                    style={{ color: agentColor }}
                  >
                    {agent.agent_type}
                  </div>
                  {agent.current_context.active_task ? (
                    <div className="text-xs text-[var(--foreground)]/80">
                      Working on: {agent.current_context.active_task}
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--foreground)]/60">
                      Idle
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {todos && todos.length > 0 && (
        <div className="border-t-2 border-[var(--panel-border)] pt-4">
          <h4 className="text-[var(--accent-secondary)] font-bold mb-2">Recent Todos</h4>
          <div className="space-y-1">
            {todos.slice(0, 5).map((todo) => (
              <div
                key={todo._id}
                className="text-xs flex items-center gap-2"
              >
                <span
                  className={
                    todo.status === "completed"
                      ? "text-[var(--accent-primary)]"
                      : todo.status === "in_progress"
                        ? "text-[var(--accent-quaternary)]"
                        : "text-[var(--foreground)]/60"
                  }
                >
                  {todo.status === "completed" ? "✓" : todo.status === "in_progress" ? "→" : "○"}
                </span>
                <span className="text-[var(--foreground)]/80">{todo.content}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

