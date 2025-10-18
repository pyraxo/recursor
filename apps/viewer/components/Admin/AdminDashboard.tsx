"use client";

import { api } from "@recursor/convex/_generated/api";
import { Card } from "@repo/ui/components/card";
import { useQuery } from "convex/react";
import {
  CheckCircle2,
  Circle,
  Hammer,
  Lightbulb,
  PauseCircle,
  PlayCircle,
  Presentation,
  StopCircle,
  Users,
} from "lucide-react";
import { GlobalExecutionControls } from "./GlobalExecutionControls";
import { CreateTeamForm } from "./CreateTeamForm";
import { TeamManagementList } from "./TeamManagementList";

export function AdminDashboard({
  onNavigateToTeam,
}: {
  onNavigateToTeam?: (stackId: string) => void;
}) {
  const stacks = useQuery(api.agents.listStacks);

  const phaseDistribution = {
    total: stacks?.length || 0,
    ideation: stacks?.filter((s: any) => s.phase === "ideation").length || 0,
    building: stacks?.filter((s: any) => s.phase === "building").length || 0,
    demo: stacks?.filter((s: any) => s.phase === "demo").length || 0,
    completed: stacks?.filter((s: any) => s.phase === "completed").length || 0,
  };

  const executionStatus = {
    running:
      stacks?.filter((s: any) => s.execution_state === "running").length || 0,
    paused:
      stacks?.filter((s: any) => s.execution_state === "paused").length || 0,
    stopped:
      stacks?.filter((s: any) => s.execution_state === "stopped").length || 0,
    idle:
      stacks?.filter(
        (s: any) => !s.execution_state || s.execution_state === "idle"
      ).length || 0,
  };

  return (
    <div className="h-full bg-background dark overflow-auto">
      <div className="w-full p-6 md:p-8 lg:p-12">
        {/* Header */}
        <header className="mb-12">
          <h1 className="font-mono text-4xl font-bold tracking-tight text-foreground mb-3">
            Admin Dashboard
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            Manage agent teams and monitor hackathon progress
          </p>
        </header>

        {/* Global Controls */}
        {stacks && stacks.length > 0 && (
          <Card className="mb-8 border-border bg-card p-6">
            <GlobalExecutionControls />
          </Card>
        )}

        {/* Phase Distribution */}
        <section className="mb-8">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Phase Distribution · {phaseDistribution.total} teams
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  Total Teams
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-foreground">
                {phaseDistribution.total}
              </div>
            </Card>

            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Lightbulb className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  Ideation
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-foreground">
                {phaseDistribution.ideation}
              </div>
            </Card>

            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Hammer className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  Building
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-foreground">
                {phaseDistribution.building}
              </div>
            </Card>

            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Presentation className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  Demo
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-foreground">
                {phaseDistribution.demo}
              </div>
            </Card>

            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  Completed
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-foreground">
                {phaseDistribution.completed}
              </div>
            </Card>
          </div>
        </section>

        {/* Execution Status */}
        <section className="mb-12">
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Execution Status
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-green-500/30 bg-green-500/5 p-6 hover:border-green-500/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <PlayCircle className="h-4 w-4 text-green-500" />
                <span className="font-mono text-xs text-green-500">
                  Running
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-green-500">
                {executionStatus.running}
              </div>
            </Card>

            <Card className="border-yellow-500/30 bg-yellow-500/5 p-6 hover:border-yellow-500/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <PauseCircle className="h-4 w-4 text-yellow-500" />
                <span className="font-mono text-xs text-yellow-500">
                  Paused
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-yellow-500">
                {executionStatus.paused}
              </div>
            </Card>

            <Card className="border-red-500/30 bg-red-500/5 p-6 hover:border-red-500/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <StopCircle className="h-4 w-4 text-red-500" />
                <span className="font-mono text-xs text-red-500">Stopped</span>
              </div>
              <div className="font-mono text-3xl font-bold text-red-500">
                {executionStatus.stopped}
              </div>
            </Card>

            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Circle className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono text-xs text-muted-foreground">
                  Idle
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-foreground">
                {executionStatus.idle}
              </div>
            </Card>
          </div>
        </section>

        {/* Team Management */}
        <section>
          <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground mb-4">
            Team Management
          </h2>
          <div className="grid lg:grid-cols-[400px_1fr] gap-6">
            <CreateTeamForm />
            <TeamManagementList onNavigateToTeam={onNavigateToTeam} />
          </div>
        </section>
      </div>
    </div>
  );
}
