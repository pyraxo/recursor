"use client";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function LiveFeed() {
  const traces = useQuery(api.traces.getRecent, { limit: 100 });
  if (!traces) return <div>Loading...</div>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {traces.map((t) => (
        <div
          key={t._id}
          style={{ padding: 8, border: "1px solid #333", borderRadius: 6 }}
        >
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {new Date(t.timestamp).toLocaleTimeString()}
          </div>
          <div style={{ fontWeight: 600 }}>{t.agent_type}</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{t.thought}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>action: {t.action}</div>
        </div>
      ))}
    </div>
  );
}
