"use client";

import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { useMemo } from "react";
import { ACCENT_COLORS } from "../../lib/theme";

interface DataPoint {
  time: string;
  scores: { [teamName: string]: number };
}

export function ProgressChart() {
  const stacks = useQuery(api.agents.listStacks);
  const hasJudgingAPI = api && 'judging' in api;
  const leaderboard = hasJudgingAPI ? useQuery(api.judging.getLeaderboard) : null;

  const chartData = useMemo(() => {
    if (!stacks || stacks.length === 0) {
      return { data: [], colors: [] };
    }

    const colors = [
      ACCENT_COLORS.primary,
      ACCENT_COLORS.secondary,
      ACCENT_COLORS.tertiary,
      ACCENT_COLORS.quaternary,
      "#ff1493",
      "#00ffff",
      "#ff4500",
      "#7fff00",
    ];

    if (!leaderboard || leaderboard.length === 0) {
      const timePoints = 10;
      const data: DataPoint[] = [];

      for (let i = 0; i <= timePoints; i++) {
        const point: DataPoint = {
          time: `T+${i}h`,
          scores: {},
        };

        stacks.forEach((stack) => {
          point.scores[stack.participant_name] = 0;
        });

        data.push(point);
      }

      return { data, colors };
    }

    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const timePoints = 10;
    const data: DataPoint[] = [];

    for (let i = 0; i <= timePoints; i++) {
      const point: DataPoint = {
        time: `T+${i}h`,
        scores: {},
      };

      stacks.forEach((stack) => {
        const teamJudgment = leaderboard.find((j: any) => j.name === stack.participant_name);
        if (teamJudgment) {
          const score = Math.floor(teamJudgment.total_score / 4 * 10);
          const simulatedProgress = (i / timePoints) * score;
          point.scores[stack.participant_name] = Math.min(100, simulatedProgress);
        } else {
          point.scores[stack.participant_name] = 0;
        }
      });

      data.push(point);
    }

    return { data, colors };
  }, [stacks, leaderboard]);

  if (!stacks || stacks.length === 0) {
    return (
      <div className="pixel-panel">
        <div className="text-[var(--foreground)]/60 font-mono text-center py-8">
          No data to display yet
        </div>
      </div>
    );
  }

  const teamNames = stacks.map((s) => s.participant_name);
  const maxScore = 100;
  const chartHeight = 300;
  const chartWidth = 800;

  return (
    <div className="pixel-panel">
      <h2 className="text-xl font-mono font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-4">
        Progress Over Time
      </h2>
      
      <div className="overflow-x-auto">
        <div className="relative" style={{ width: chartWidth, height: chartHeight }}>
          <svg width={chartWidth} height={chartHeight} className="border-2 border-[var(--panel-border)]">
            <rect width={chartWidth} height={chartHeight} fill="var(--background)" />
            
            {[0, 25, 50, 75, 100].map((value) => {
              const y = chartHeight - (value / maxScore) * (chartHeight - 40) - 20;
              return (
                <g key={value}>
                  <line
                    x1={40}
                    y1={y}
                    x2={chartWidth - 20}
                    y2={y}
                    stroke="var(--panel-border)"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={10}
                    y={y + 4}
                    fill="var(--foreground)"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {value}
                  </text>
                </g>
              );
            })}

            {teamNames.map((teamName, teamIndex) => {
              const color = chartData.colors[teamIndex % chartData.colors.length];
              const points = chartData.data
                .map((point, i) => {
                  const x = 40 + (i / (chartData.data.length - 1)) * (chartWidth - 60);
                  const score = point.scores[teamName] || 0;
                  const y = chartHeight - 20 - (score / maxScore) * (chartHeight - 40);
                  return `${x},${y}`;
                })
                .join(" ");

              return (
                <g key={teamName}>
                  <polyline
                    points={points}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinecap="square"
                  />
                  {chartData.data.map((point, i) => {
                    const x = 40 + (i / (chartData.data.length - 1)) * (chartWidth - 60);
                    const score = point.scores[teamName] || 0;
                    const y = chartHeight - 20 - (score / maxScore) * (chartHeight - 40);
                    return (
                      <rect
                        key={i}
                        x={x - 2}
                        y={y - 2}
                        width={4}
                        height={4}
                        fill={color}
                      />
                    );
                  })}
                </g>
              );
            })}

            {chartData.data.map((point, i) => {
              const x = 40 + (i / (chartData.data.length - 1)) * (chartWidth - 60);
              return (
                <text
                  key={i}
                  x={x}
                  y={chartHeight - 5}
                  fill="var(--foreground)"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {point.time}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {teamNames.map((name, index) => (
            <div key={name} className="flex items-center gap-2 text-xs font-mono">
              <div
                className="w-3 h-3 border-2"
                style={{
                  backgroundColor: chartData.colors[index % chartData.colors.length],
                  borderColor: chartData.colors[index % chartData.colors.length],
                }}
              />
              <span className="text-[var(--foreground)]/80 truncate">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

