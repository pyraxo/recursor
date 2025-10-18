"use client";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export function AgentDetail({ stackId }: { stackId: Id<"agent_stacks"> }) {
  const stack = useQuery(api.agents.getStack, { stackId });
  const idea = useQuery(api.project_ideas.get, { stackId });
  const todos = useQuery(api.todos.list, { stackId });
  const artifacts = useQuery(api.artifacts.list, { stackId });
  const timeline = useQuery(api.messages.getTimeline, { stackId });

  if (!stack) return <div>Loading...</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div>
        <h2 style={{ margin: 0 }}>{stack.participant_name}</h2>
        <div>Phase: {stack.phase}</div>
      </div>
      <div>
        <h3 style={{ margin: "8px 0" }}>Project</h3>
        <div>{idea?.title}</div>
        <div style={{ opacity: 0.8 }}>{idea?.description}</div>
      </div>
      <div>
        <h3 style={{ margin: "8px 0" }}>Todos</h3>
        <ul>
          {todos?.map((t) => (
            <li key={t._id}>
              [{t.status}] {t.content}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 style={{ margin: "8px 0" }}>Artifacts</h3>
        <ul>
          {artifacts?.map((a) => (
            <li key={a._id}>
              v{a.version} {a.type}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 style={{ margin: "8px 0" }}>Message Timeline</h3>
        <ul>
          {timeline?.map((m) => (
            <li key={m._id}>
              {m.message_type}: {m.content}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
