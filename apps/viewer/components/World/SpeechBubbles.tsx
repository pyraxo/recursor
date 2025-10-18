"use client";

import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { useEffect, useState } from "react";

interface SpeechBubblesProps {
  agentPositions: Array<{ x: number; y: number }>;
}

interface BubbleState {
  agentKey: string;
  visible: boolean;
  message: string;
}

export function SpeechBubbles({ agentPositions }: SpeechBubblesProps) {
  const stacks = useQuery(api.agents.listStacks);
  const [bubbles, setBubbles] = useState<BubbleState[]>([]);

  const agentMessages = {
    planner: [
      "Planning...",
      "Strategizing...",
      "Thinking...",
    ],
    builder: [
      "Building...",
      "Coding...",
      "Implementing...",
    ],
    reviewer: [
      "Reviewing...",
      "Testing...",
      "Debugging...",
    ],
  };

  useEffect(() => {
    if (!stacks || stacks.length === 0) return;

    const interval = setInterval(() => {
      const allAgents: string[] = [];
      stacks.slice(0, 5).forEach((stack, teamIndex) => {
        ["planner", "builder", "reviewer"].forEach((type) => {
          allAgents.push(`${teamIndex}-${type}`);
        });
      });

      if (allAgents.length === 0) return;

      const randomAgent = allAgents[Math.floor(Math.random() * allAgents.length)];
      const [teamIndexStr, agentType] = randomAgent.split("-");
      
      const messages = agentMessages[agentType as keyof typeof agentMessages];
      if (!messages) return;
      
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];

      setBubbles((prev) => {
        const filtered = prev.filter((b) => b.agentKey !== randomAgent);
        return [
          ...filtered,
          {
            agentKey: randomAgent,
            visible: true,
            message: randomMessage,
          },
        ];
      });

      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.agentKey !== randomAgent));
      }, 3000);
    }, 1500);

    return () => clearInterval(interval);
  }, [stacks]);

  if (!stacks) return null;

  return (
    <>
      {bubbles.map((bubble) => {
        const [teamIndexStr, agentType] = bubble.agentKey.split("-");
        const teamIndex = parseInt(teamIndexStr);
        const agentTypeIndex = ["planner", "builder", "reviewer"].indexOf(agentType);
        const posIndex = teamIndex * 4 + agentTypeIndex;
        const pos = agentPositions[posIndex];

        if (!pos) return null;

        return (
          <div
            key={bubble.agentKey}
            className="absolute pointer-events-none"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y - 40}px`,
              transform: "translate(-50%, -100%)",
              animation: "speech-bubble-appear 0.3s ease-out",
              zIndex: 20,
            }}
          >
            <div
              className="relative bg-white backdrop-blur-sm rounded-lg py-1.5 text-xs font-mono whitespace-nowrap"
              style={{
                border: "2px solid #333",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                paddingLeft: "12px",
                paddingRight: "12px",
              }}
            >
              <span style={{ color: "#000", fontWeight: "600" }}>{bubble.message}</span>

              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{
                  bottom: "-6px",
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "6px solid white",
                }}
              />
            </div>
          </div>
        );
      })}
    </>
  );
}
