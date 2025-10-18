"use client";

import { api } from "@recursor/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { ACCENT_COLORS } from "../../lib/theme";

interface DataPoint {
  time: string;
  scores: { [teamName: string]: number };
}

export function ProgressChart() {
  const stacks = useQuery(api.agents.listStacks);
  const leaderboard = useQuery(api.judging.getLeaderboard);

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
      <Card>
        <CardContent>
          <div className="text-muted-foreground text-center py-8">
            No data to display yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const teamNames = stacks.map((s) => s.participant_name);
  const maxScore = 100;
  const chartHeight = 300;
  const chartWidth = 800;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Progress Over Time</CardTitle>
        <CardDescription>
          Team performance throughout the hackathon
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative" style={{ height: chartHeight }}>
          <div className="overflow-x-auto">
            <svg
              width={chartWidth}
              height={chartHeight}
              className="border rounded-md"
            >
              <rect
                width={chartWidth}
                height={chartHeight}
                fill="var(--background)"
              />

              {[0, 25, 50, 75, 100].map((value) => {
                const y =
                  chartHeight - (value / maxScore) * (chartHeight - 40) - 20;
                return (
                  <g key={value}>
                    <line
                      x1={40}
                      y1={y}
                      x2={chartWidth - 20}
                      y2={y}
                      stroke="var(--border)"
                      strokeWidth="1"
                      strokeDasharray="4,4"
                      opacity="0.3"
                    />
                    <text
                      x={10}
                      y={y + 4}
                      fill="var(--muted-foreground)"
                      fontSize="10"
                      fontFamily="monospace"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {teamNames.map((teamName, teamIndex) => {
                const color =
                  chartData.colors[teamIndex % chartData.colors.length];
                const points = chartData.data
                  .map((point, i) => {
                    const x =
                      40 +
                      (i / (chartData.data.length - 1)) * (chartWidth - 60);
                    const score = point.scores[teamName] || 0;
                    const y =
                      chartHeight -
                      20 -
                      (score / maxScore) * (chartHeight - 40);
                    return `${x},${y}`;
                  })
                  .join(" ");

                return (
                  <g key={teamName}>
                    <polyline
                      points={points}
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {chartData.data.map((point, i) => {
                      const x =
                        40 +
                        (i / (chartData.data.length - 1)) * (chartWidth - 60);
                      const score = point.scores[teamName] || 0;
                      const y =
                        chartHeight -
                        20 -
                        (score / maxScore) * (chartHeight - 40);
                      return (
                        <circle key={i} cx={x} cy={y} r={3} fill={color} />
                      );
                    })}
                  </g>
                );
              })}

              {chartData.data.map((point, i) => {
                const x =
                  40 + (i / (chartData.data.length - 1)) * (chartWidth - 60);
                return (
                  <text
                    key={i}
                    x={x}
                    y={chartHeight - 5}
                    fill="var(--muted-foreground)"
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
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {teamNames.map((name, index) => (
            <div key={name} className="flex items-center gap-2 text-xs">
              <div
                className="w-3 h-3 rounded-full border-2"
                style={{
                  backgroundColor:
                    chartData.colors[index % chartData.colors.length],
                  borderColor:
                    chartData.colors[index % chartData.colors.length],
                }}
              />
              <span className="text-muted-foreground truncate">{name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
