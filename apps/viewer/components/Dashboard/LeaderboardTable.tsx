"use client";

import { api } from "@recursor/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import { useQuery } from "convex/react";
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
  const leaderboard = useQuery(api.judging.getLeaderboard);

  const teamScores = useMemo(() => {
    if (!leaderboard) return [];

    const scores: TeamScore[] = leaderboard.map((entry: any) => ({
      name: entry.name,
      overall: entry.technical_merit + entry.execution + entry.polish + entry.wow_factor,
      technical: entry.technical_merit,
      execution: entry.execution,
      polish: entry.polish,
      wow: entry.wow_factor,
    }));

    return scores;
  }, [leaderboard]);

  // Show loading state while query is pending
  if (leaderboard === undefined) {
    return (
      <div className="pixel-panel">
        <div className="text-center py-12">
          <div className="text-[var(--foreground)] font-mono text-lg mb-4">
            ⏱️ Loading Leaderboard...
          </div>
          <div className="text-[var(--foreground)]/60 font-mono text-sm">
            Fetching judging results
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
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Leaderboard</CardTitle>
        <CardDescription>Team rankings and scores</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left uppercase text-xs">
                    Rank
                  </TableHead>
                  <TableHead className="text-left uppercase text-xs">
                    Team
                  </TableHead>
                  <TableHead className="text-right uppercase text-xs">
                    Overall
                  </TableHead>
                  <TableHead className="text-right uppercase text-xs">
                    Tech
                  </TableHead>
                  <TableHead className="text-right uppercase text-xs">
                    Exec
                  </TableHead>
                  <TableHead className="text-right uppercase text-xs">
                    Polish
                  </TableHead>
                  <TableHead className="text-right uppercase text-xs">
                    Wow
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamScores.map((team, index) => (
                  <TableRow key={team.name}>
                    <TableCell className="font-bold">
                      {index === 0 && <span>🥇</span>}
                      {index === 1 && <span>🥈</span>}
                      {index === 2 && <span>🥉</span>}
                      {index > 2 && (
                        <span className="text-muted-foreground">
                          #{index + 1}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{team.name}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums">
                      {team.overall}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {team.technical}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {team.execution}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {team.polish}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">
                      {team.wow}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
