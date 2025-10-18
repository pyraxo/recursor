"use client";

import { api } from "@recursor/convex/_generated/api";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { useQuery } from "convex/react";

export function MetricsBar() {
  const stacks = useQuery(api.agents.listStacks);

  const elapsedTime = () => {
    if (!stacks || stacks.length === 0) return "00:00:00";

    const earliest = Math.min(...stacks.map((s) => s.created_at));
    const elapsed = Date.now() - earliest;

    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const activeAgents = stacks ? stacks.length * 4 : 0;

  const mockIterations = stacks
    ? stacks.length * Math.floor(Math.random() * 50 + 20)
    : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardDescription>Elapsed Time</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {elapsedTime()}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Total Iterations</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {mockIterations}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Active Agents</CardDescription>
          <CardTitle className="text-3xl tabular-nums">
            {activeAgents}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
