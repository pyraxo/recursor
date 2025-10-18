"use client";

import { useState } from "react";
import { AgentDetail } from "../components/Agents/AgentDetail";
import { AgentList } from "../components/Agents/AgentList";
import { LiveFeed } from "../components/Feed/LiveFeed";

export default function Page() {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr 1fr",
        gap: 16,
        padding: 16,
      }}
    >
      <div>
        <h2>Agents</h2>
        <AgentList onSelect={setSelected} />
      </div>
      <div>
        <h2>Live Feed</h2>
        <LiveFeed />
      </div>
      <div>
        <h2>Detail</h2>
        {selected ? (
          <AgentDetail stackId={selected as any} />
        ) : (
          <div>Select an agent</div>
        )}
      </div>
    </div>
  );
}
