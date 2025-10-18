"use client";

import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { useMemo } from "react";

interface TeamScore {
  name: string;
  overall: number;
  technical: number;
  execution: number;
  polish: number;
  wow: number;
}

export function LeaderboardTable() {
  const hasJudgingAPI = api && 'judging' in api;
  const leaderboard = hasJudgingAPI ? useQuery(api.judging.getLeaderboard) : null;

  const teamScores = useMemo(() => {
    if (!leaderboard) return [];

    const scores: TeamScore[] = leaderboard.map((entry: any) => ({
      name: entry.name,
      overall: Math.floor(entry.total_score / 4),
      technical: entry.technical_merit,
      execution: entry.execution,
      polish: entry.polish,
      wow: entry.wow_factor,
    }));

    return scores;
  }, [leaderboard]);

  if (!hasJudgingAPI || leaderboard === undefined || leaderboard === null) {
    return (
      <div className="pixel-panel">
        <div className="text-center py-12">
          <div className="text-[var(--foreground)] font-mono text-lg mb-4">
            ⏱️ Judging System Initializing
          </div>
          <div className="text-[var(--foreground)]/60 font-mono text-sm">
            Judges will begin evaluating teams soon.
          </div>
          <div className="text-[var(--foreground)]/40 font-mono text-xs mt-2">
            Auto-judging runs every 5 minutes
          </div>
        </div>
      </div>
    );
  }

  if (teamScores.length === 0) {
    return (
      <div className="pixel-panel">
        <div className="text-center py-12">
          <div className="text-[var(--foreground)] font-mono text-lg mb-4">
            📊 Waiting for Teams to Build
          </div>
          <div className="text-[var(--foreground)]/60 font-mono text-sm">
            No teams have artifacts to judge yet.
          </div>
          <div className="text-[var(--foreground)]/40 font-mono text-xs mt-2">
            Teams need to create artifacts before judging can begin
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pixel-panel">
      <h2 className="text-xl font-mono font-bold text-[var(--accent-primary)] uppercase tracking-wider mb-4">
        Leaderboard
      </h2>
      
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="border-b-2 border-[var(--panel-border)]">
              <th className="text-left py-3 px-2 text-[var(--foreground)]/80 font-bold uppercase text-xs">
                Rank
              </th>
              <th className="text-left py-3 px-2 text-[var(--foreground)]/80 font-bold uppercase text-xs">
                Team
              </th>
              <th className="text-right py-3 px-2 text-[var(--foreground)]/80 font-bold uppercase text-xs">
                Overall
              </th>
              <th className="text-right py-3 px-2 text-[var(--foreground)]/80 font-bold uppercase text-xs">
                Tech
              </th>
              <th className="text-right py-3 px-2 text-[var(--foreground)]/80 font-bold uppercase text-xs">
                Exec
              </th>
              <th className="text-right py-3 px-2 text-[var(--foreground)]/80 font-bold uppercase text-xs">
                Polish
              </th>
              <th className="text-right py-3 px-2 text-[var(--foreground)]/80 font-bold uppercase text-xs">
                Wow
              </th>
            </tr>
          </thead>
          <tbody>
            {teamScores.map((team, index) => {
              const rankClass =
                index === 0
                  ? "leaderboard-row-gold"
                  : index === 1
                    ? "leaderboard-row-silver"
                    : index === 2
                      ? "leaderboard-row-bronze"
                      : "";

              return (
                <tr
                  key={team.name}
                  className={`border-b border-[var(--panel-border)]/50 ${rankClass}`}
                >
                  <td className="py-3 px-2 font-bold">
                    {index === 0 && <span className="text-[var(--gold)]">🥇</span>}
                    {index === 1 && <span className="text-[var(--silver)]">🥈</span>}
                    {index === 2 && <span className="text-[var(--bronze)]">🥉</span>}
                    {index > 2 && <span className="text-[var(--foreground)]/60">#{index + 1}</span>}
                  </td>
                  <td className="py-3 px-2 text-[var(--foreground)]">{team.name}</td>
                  <td className="py-3 px-2 text-right font-bold text-[var(--accent-primary)] tabular-nums">
                    {team.overall}
                  </td>
                  <td className="py-3 px-2 text-right text-[var(--foreground)]/80 tabular-nums">
                    {team.technical}
                  </td>
                  <td className="py-3 px-2 text-right text-[var(--foreground)]/80 tabular-nums">
                    {team.execution}
                  </td>
                  <td className="py-3 px-2 text-right text-[var(--foreground)]/80 tabular-nums">
                    {team.polish}
                  </td>
                  <td className="py-3 px-2 text-right text-[var(--foreground)]/80 tabular-nums">
                    {team.wow}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

