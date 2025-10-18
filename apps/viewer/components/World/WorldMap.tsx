"use client";

import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useState } from "react";
import { AGENT_COLORS } from "../../lib/theme";
import { FloatingParticles } from "./FloatingParticles";
import { SpeechBubbles } from "./SpeechBubbles";

interface WorldMapProps {
  selectedTeamId: Id<"agent_stacks"> | null;
  onSelectTeam: (id: Id<"agent_stacks">) => void;
}

export function WorldMap({ selectedTeamId, onSelectTeam }: WorldMapProps) {
  const stacks = useQuery(api.agents.listStacks);
  const [hoveredTeamId, setHoveredTeamId] = useState<Id<"agent_stacks"> | null>(
    null
  );

  if (!stacks) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-[var(--accent-primary)] font-mono">
          Loading simulation...
        </div>
      </div>
    );
  }

  const agentTypes = [
    "planner",
    "builder",
    "reviewer",
    "communicator",
  ] as const;

  const agentPositions = [
    // Team 1 (Alpha) - center coordinates, will use transform to center sprite
    { x: 215, y: 211 }, // planner (P1)
    { x: 163, y: 123 }, // builder (B1)
    { x: 93, y: 171 }, // reviewer (R1)
    { x: 115, y: 258 }, // communicator (C1)

    // Team 2 (Beta)
    { x: 699, y: 518 }, // planner (P2)
    { x: 631, y: 438 }, // builder (B2)
    { x: 563, y: 505 }, // reviewer (R2)
    { x: 583, y: 559 }, // communicator (C2)

    // Team 3 (Gamma)
    { x: 220, y: 791 }, // planner (P3)
    { x: 156, y: 795 }, // builder (B3)
    { x: 101, y: 876 }, // reviewer (R3)
    { x: 219, y: 905 }, // communicator (C3)

    // Team 4 (Delta)
    { x: 683, y: 788 }, // planner (P4)
    { x: 621, y: 779 }, // builder (B4)
    { x: 565, y: 789 }, // reviewer (R4)
    { x: 684, y: 902 }, // communicator (C4)

    // Team 5 (Epsilon)
    { x: 934, y: 787 }, // planner (P5)
    { x: 871, y: 778 }, // builder (B5)
    { x: 808, y: 782 }, // reviewer (R5)
    { x: 816, y: 905 }, // communicator (C5)
  ];

  return (
    <div className="w-full min-h-full bg-[var(--background)] flex justify-center p-8">
      <div
        className="relative flex-shrink-0"
        style={{
          width: "1024px",
          height: "1024px",
          backgroundImage: "url(/assets/map/map.png)",
          backgroundSize: "100% 100%",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <FloatingParticles />
        <SpeechBubbles agentPositions={agentPositions} />

        {stacks.slice(0, 5).map((stack: any, teamIndex: number) => {
          const isSelected = selectedTeamId === stack._id;
          const isHovered = hoveredTeamId === stack._id;

          const teamPositions = [
            agentPositions[teamIndex * 4],
            agentPositions[teamIndex * 4 + 1],
            agentPositions[teamIndex * 4 + 2],
            agentPositions[teamIndex * 4 + 3],
          ].filter((p): p is { x: number; y: number } => p !== undefined);

          const minX = Math.min(...teamPositions.map((p) => p.x)) - 50;
          const maxX = Math.max(...teamPositions.map((p) => p.x)) + 50;
          const minY = Math.min(...teamPositions.map((p) => p.y)) - 50;
          const maxY = Math.max(...teamPositions.map((p) => p.y)) + 50;

          return (
            <div key={stack._id}>
              <div
                className="cursor-pointer"
                onClick={() => onSelectTeam(stack._id)}
                onMouseEnter={() => setHoveredTeamId(stack._id)}
                onMouseLeave={() => setHoveredTeamId(null)}
                style={{
                  position: "absolute",
                  left: `${minX}px`,
                  top: `${minY}px`,
                  width: `${maxX - minX}px`,
                  height: `${maxY - minY}px`,
                  border: isSelected
                    ? "3px solid var(--accent-primary)"
                    : isHovered
                      ? "3px solid rgba(0, 255, 135, 0.5)"
                      : "3px solid transparent",
                  borderRadius: "8px",
                  transition:
                    "border 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
                  pointerEvents: "auto",
                  backgroundColor: isHovered
                    ? "rgba(0, 255, 135, 0.05)"
                    : "transparent",
                  boxShadow: isHovered
                    ? "0 0 20px rgba(0, 255, 135, 0.3)"
                    : "none",
                  transform: "none",
                }}
              >
                {(isSelected || isHovered) && (
                  <div
                    className="absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[var(--panel-bg)] border-2 border-[var(--accent-primary)] px-3 py-1 rounded text-sm font-mono"
                    style={{ pointerEvents: "none" }}
                  >
                    {stack.participant_name}
                  </div>
                )}
              </div>
              {agentTypes.map((type, agentIndex) => {
                const posIndex = teamIndex * 4 + agentIndex;
                const pos = agentPositions[posIndex];

                if (!pos) return null;

                return (
                  <div
                    key={`${stack._id}-${type}`}
                    style={{
                      position: "absolute",
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      transform: "translate(-50%, -50%)",
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      className="relative"
                      style={{
                        animationName: isHovered ? "sprite-bob" : "none",
                        animationDuration: "0.6s",
                        animationTimingFunction: "ease-in-out",
                        animationIterationCount: "infinite",
                        animationDelay: `${agentIndex * 0.1}s`,
                      }}
                    >
                      <img
                        src={`/assets/sprites/${type}.png`}
                        alt={type}
                        className={
                          type === "builder" ? "w-28 h-28" : "w-24 h-24"
                        }
                        style={{
                          filter: isSelected
                            ? "drop-shadow(0 0 8px var(--accent-primary))"
                            : "drop-shadow(2px 2px 4px rgba(0,0,0,0.5))",
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement("div");
                            fallback.className =
                              "w-24 h-24 rounded border-2 flex items-center justify-center";
                            fallback.style.borderColor = AGENT_COLORS[type];
                            fallback.style.backgroundColor = `${AGENT_COLORS[type]}20`;
                            fallback.textContent = type.charAt(0).toUpperCase();
                            fallback.style.fontSize = "24px";
                            fallback.style.fontWeight = "bold";
                            fallback.style.color = AGENT_COLORS[type];
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {stacks.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-white rounded-lg shadow-lg px-8 py-6 border-2 border-gray-200">
              <p className="text-gray-900 font-mono text-lg mb-2">
                No teams active yet
              </p>
              <p className="text-gray-600 font-mono text-sm">
                Waiting for simulation to start...
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
