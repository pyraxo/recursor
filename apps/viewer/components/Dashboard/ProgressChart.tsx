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
  const judgmentHistory = useQuery(api.judging.getAllJudgmentHistory);

  const chartData = useMemo(() => {
    if (!stacks || stacks.length === 0) {
      return { data: [], colors: [], teamNames: [] };
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

    const teamNames = stacks.map((s) => s.participant_name);

    // If no judgments yet, show empty chart
    if (!judgmentHistory || judgmentHistory.length === 0) {
      return {
        data: [{ time: "Start", scores: Object.fromEntries(teamNames.map(n => [n, 0])) }],
        colors,
        teamNames
      };
    }

    // Group judgments by team
    const teamJudgments = new Map<string, Array<{ time: number; score: number }>>();

    judgmentHistory.forEach((j) => {
      if (!teamJudgments.has(j.team_name)) {
        teamJudgments.set(j.team_name, []);
      }
      // Convert total_score (out of 40) to percentage (out of 100)
      const score = Math.round((j.total_score / 40) * 100);
      teamJudgments.get(j.team_name)!.push({
        time: j.judged_at,
        score: Math.min(100, Math.max(0, score)),
      });
    });

    // Find all unique timestamps across all teams
    const allTimestamps = new Set<number>();
    judgmentHistory.forEach((j) => allTimestamps.add(j.judged_at));
    const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

    // If we have timestamps, use them; otherwise show single point
    if (sortedTimestamps.length === 0) {
      return {
        data: [{ time: "Start", scores: Object.fromEntries(teamNames.map(n => [n, 0])) }],
        colors,
        teamNames
      };
    }

    const startTime = sortedTimestamps[0]!; // Safe because we checked length > 0

    // Build data points from actual judgments
    const data: DataPoint[] = sortedTimestamps.map((timestamp, idx) => {
      const point: DataPoint = {
        // Show elapsed minutes from start
        time: idx === 0 ? "Start" : `+${Math.round((timestamp - startTime) / 60000)}m`,
        scores: {},
      };

      // For each team, find their score at this timestamp
      teamNames.forEach((teamName) => {
        const judgments = teamJudgments.get(teamName) || [];

        // Find the most recent judgment at or before this timestamp
        const relevantJudgments = judgments.filter(j => j.time <= timestamp);

        if (relevantJudgments.length > 0) {
          // Use the most recent judgment
          const latestJudgment = relevantJudgments[relevantJudgments.length - 1]!; // Safe because we checked length > 0
          point.scores[teamName] = latestJudgment.score;
        } else {
          // No judgment yet for this team at this time
          point.scores[teamName] = 0;
        }
      });

      return point;
    });

    return { data, colors, teamNames };
  }, [stacks, judgmentHistory]);

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

  const { teamNames } = chartData;
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
