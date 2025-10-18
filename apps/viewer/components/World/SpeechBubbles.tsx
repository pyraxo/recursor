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
  const recentTraces = useQuery(api.traces.getRecentAll, { limit: 100 });
  const [bubbles, setBubbles] = useState<BubbleState[]>([]);

  const agentMessages = {
    planner: [
      "Planning next steps...",
      "Analyzing requirements...",
      "Creating tasks...",
    ],
    builder: [
      "Building features...",
      "Writing code...",
      "Implementing design...",
    ],
    reviewer: [
      "Reviewing progress...",
      "Testing functionality...",
      "Providing feedback...",
    ],
    communicator: [
      "Coordinating with team...",
      "Sharing updates...",
      "Responding to messages...",
    ],
  };

  useEffect(() => {
    if (!stacks || stacks.length === 0) return;

    const interval = setInterval(() => {
      const allAgents: string[] = [];
      stacks.slice(0, 5).forEach((stack, teamIndex) => {
        ["planner", "builder", "reviewer", "communicator"].forEach((type) => {
          allAgents.push(`${teamIndex}-${type}-${stack._id}`);
        });
      });

      if (allAgents.length === 0) return;

      const randomAgent = allAgents[Math.floor(Math.random() * allAgents.length)];
      if (!randomAgent) return;

      const [teamIndexStr, agentType, stackId] = randomAgent.split("-");

      let message = "...";

      if (recentTraces && recentTraces.length > 0) {
        const stackTraces = recentTraces.filter(
          (t: any) => String(t.stack_id) === stackId && t.agent_type === agentType
        );

        if (stackTraces.length > 0) {
          const recentTrace = stackTraces[0];
          message = recentTrace.thought?.substring(0, 60) || recentTrace.action?.substring(0, 60) || "Working...";
          if (message.length > 57) message = message.substring(0, 57) + "...";
        } else {
          const stackAgentStates = stacks.find((s) => String(s._id) === stackId)?.agents?.find(
            (a: any) => a.agent_type === agentType
          );
          if (stackAgentStates?.current_context?.active_task) {
            message = stackAgentStates.current_context.active_task.substring(0, 60);
            if (message.length > 57) message = message.substring(0, 57) + "...";
          } else {
            const messages = agentMessages[agentType as keyof typeof agentMessages];
            if (messages) {
              message = messages[Math.floor(Math.random() * messages.length)];
            }
          }
        }
      } else {
        const messages = agentMessages[agentType as keyof typeof agentMessages];
        if (messages) {
          message = messages[Math.floor(Math.random() * messages.length)];
        }
      }

      setBubbles((prev) => {
        const filtered = prev.filter((b) => b.agentKey !== randomAgent);
        return [
          ...filtered,
          {
            agentKey: randomAgent,
            visible: true,
            message,
          },
        ];
      });

      setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.agentKey !== randomAgent));
      }, 3000);
    }, 1500);

    return () => clearInterval(interval);
  }, [stacks, recentTraces]);

  if (!stacks) return null;

  return (
    <>
      {bubbles.map((bubble) => {
        const [teamIndexStr, agentType] = bubble.agentKey.split("-");
        const teamIndex = parseInt(teamIndexStr);
        const agentTypeIndex = ["planner", "builder", "reviewer", "communicator"].indexOf(agentType);
        const posIndex = teamIndex * 4 + agentTypeIndex;
        const pos = agentPositions[posIndex];

        if (!pos) return null;

        const mapWidth = 1024;
        const bubbleMaxWidth = 250;
        const padding = 20;
        
        let leftPos = pos.x;
        let translateX = "-50%";
        
        if (pos.x < bubbleMaxWidth / 2 + padding) {
          leftPos = padding;
          translateX = "0%";
        } else if (pos.x > mapWidth - bubbleMaxWidth / 2 - padding) {
          leftPos = mapWidth - padding;
          translateX = "-100%";
        }

        return (
          <div
            key={bubble.agentKey}
            className="absolute pointer-events-none"
            style={{
              left: `${leftPos}px`,
              top: `${pos.y - 40}px`,
              transform: `translate(${translateX}, -100%)`,
              animation: "speech-bubble-appear 0.3s ease-out",
              zIndex: 20,
              maxWidth: `${bubbleMaxWidth}px`,
            }}
          >
            <div
              className="relative bg-white backdrop-blur-sm rounded-lg py-1.5 text-xs font-mono"
              style={{
                border: "2px solid #333",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                paddingLeft: "12px",
                paddingRight: "12px",
                whiteSpace: "normal",
                wordWrap: "break-word",
                overflowWrap: "break-word",
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
