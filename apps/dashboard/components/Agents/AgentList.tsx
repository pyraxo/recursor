"use client";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function AgentList({ onSelect }: { onSelect: (id: string) => void }) {
  const stacks = useQuery(api.agents.listStacks);
  if (!stacks) return <div>Loading...</div>;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {stacks.map((s) => (
        <button
          key={s._id}
          style={{
            textAlign: "left",
            padding: 8,
            border: "1px solid #333",
            borderRadius: 6,
          }}
          onClick={() => onSelect(s._id)}
        >
          <div style={{ fontWeight: 600 }}>{s.participant_name}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Phase: {s.phase}</div>
        </button>
      ))}
    </div>
  );
}
