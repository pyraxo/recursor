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
  const stacks = useQuery(api.agents.listStacks);

  const teamScores = useMemo(() => {
    if (!stacks) return [];

    const scores: TeamScore[] = stacks.map((stack) => {
      const technical = Math.floor(Math.random() * 40 + 60);
      const execution = Math.floor(Math.random() * 40 + 60);
      const polish = Math.floor(Math.random() * 40 + 60);
      const wow = Math.floor(Math.random() * 40 + 60);
      const overall = Math.floor((technical + execution + polish + wow) / 4);

      return {
        name: stack.participant_name,
        overall,
        technical,
        execution,
        polish,
        wow,
      };
    });

    return scores.sort((a, b) => b.overall - a.overall);
  }, [stacks]);

  if (!stacks) {
    return (
      <Card>
        <CardContent>
          <div className="text-muted-foreground text-center py-8">
            Loading leaderboard...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (teamScores.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="text-muted-foreground text-center py-8">
            No teams to display yet
          </div>
        </CardContent>
      </Card>
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
