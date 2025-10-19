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
import { CreateTeamForm } from "./CreateTeamForm";
import { GlobalExecutionControls } from "./GlobalExecutionControls";
import { TeamManagementList } from "./TeamManagementList";

export function AdminDashboard({
  onNavigateToTeam,
}: {
  onNavigateToTeam?: (stackId: string) => void;
}) {
  const stacks = useQuery(api.agents.listStacks);

  const phaseDistribution = {
    total: stacks?.length || 0,
    ideation: stacks?.filter((s) => s.phase === "ideation").length || 0,
    building: stacks?.filter((s) => s.phase === "building").length || 0,
    demo: stacks?.filter((s) => s.phase === "demo").length || 0,
    completed: stacks?.filter((s) => s.phase === "completed").length || 0,
  };

  const executionStatus = {
    running: stacks?.filter((s) => s.execution_state === "running").length || 0,
    paused: stacks?.filter((s) => s.execution_state === "paused").length || 0,
    stopped: stacks?.filter((s) => s.execution_state === "stopped").length || 0,
    idle:
      stacks?.filter((s) => !s.execution_state || s.execution_state === "idle")
        .length || 0,
  };

  return (
    <div className="w-full bg-background">
      <div className="w-full px-6 pt-6 pb-6 md:px-8 md:pt-8 md:pb-8 lg:px-12 lg:pt-12 lg:pb-12">
        {/* Global Controls */}
        {stacks && stacks.length > 0 && (
          <Card className="mb-8 border-border bg-card p-6">
            <GlobalExecutionControls />
          </Card>
        )}

        {/* Phase Distribution */}
        <section className="mb-8">
          <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Phase Distribution · {phaseDistribution.total} teams
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Users className="h-6 w-6 text-muted-foreground" />
                <span className="font-mono text-base text-muted-foreground">
                  Total Teams
                </span>
              </div>
              <div className="font-mono text-5xl font-bold text-foreground">
                {phaseDistribution.total}
              </div>
            </Card>

            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Lightbulb className="h-6 w-6 text-muted-foreground" />
                <span className="font-mono text-base text-muted-foreground">
                  Ideation
                </span>
              </div>
              <div className="font-mono text-5xl font-bold text-foreground">
                {phaseDistribution.ideation}
              </div>
            </Card>

            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Hammer className="h-6 w-6 text-muted-foreground" />
                <span className="font-mono text-base text-muted-foreground">
                  Building
                </span>
              </div>
              <div className="font-mono text-5xl font-bold text-foreground">
                {phaseDistribution.building}
              </div>
            </Card>

            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Presentation className="h-6 w-6 text-muted-foreground" />
                <span className="font-mono text-base text-muted-foreground">
                  Demo
                </span>
              </div>
              <div className="font-mono text-5xl font-bold text-foreground">
                {phaseDistribution.demo}
              </div>
            </Card>

            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                <span className="font-mono text-base text-muted-foreground">
                  Completed
                </span>
              </div>
              <div className="font-mono text-5xl font-bold text-foreground">
                {phaseDistribution.completed}
              </div>
            </Card>
          </div>
        </section>

        {/* Execution Status */}
        <section className="mb-12">
          <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-4">
            Execution Status
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-green-600/30 bg-green-50 p-6 hover:border-green-600/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <PlayCircle className="h-6 w-6 text-green-700" />
                <span className="font-mono text-base text-green-700">
                  Running
                </span>
              </div>
              <div className="font-mono text-5xl font-bold text-green-700">
                {executionStatus.running}
              </div>
            </Card>

            <Card className="border-amber-600/30 bg-amber-50 p-6 hover:border-amber-600/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <PauseCircle className="h-6 w-6 text-amber-700" />
                <span className="font-mono text-base text-amber-700">
                  Paused
                </span>
              </div>
              <div className="font-mono text-5xl font-bold text-amber-700">
                {executionStatus.paused}
              </div>
            </Card>

            <Card className="border-red-600/30 bg-red-50 p-6 hover:border-red-600/50 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <StopCircle className="h-6 w-6 text-red-700" />
                <span className="font-mono text-base text-red-700">
                  Stopped
                </span>
              </div>
              <div className="font-mono text-5xl font-bold text-red-700">
                {executionStatus.stopped}
              </div>
            </Card>

            <Card className="border-border bg-card p-6 hover:border-foreground/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <Circle className="h-6 w-6 text-muted-foreground" />
                <span className="font-mono text-base text-muted-foreground">
                  Idle
                </span>
              </div>
              <div className="font-mono text-5xl font-bold text-foreground">
                {executionStatus.idle}
              </div>
            </Card>
          </div>
        </section>

        {/* Team Management */}
        <section>
          <h2 className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-4">
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
