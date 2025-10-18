"use client";

import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { CreateTeamForm } from "./CreateTeamForm";
import { TeamManagementList } from "./TeamManagementList";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { Separator } from "@repo/ui/separator";
import { GlobalExecutionControls } from "../Controls/GlobalExecutionControls";
import { Users, Lightbulb, Hammer, Presentation, CheckCircle2, Play, Pause, Square, Circle } from "lucide-react";

export function AdminDashboard() {
  const stacks = useQuery(api.agents.listStacks);

  const stats = {
    total: stacks?.length || 0,
    ideation: stacks?.filter((s: any) => s.phase === "ideation").length || 0,
    building: stacks?.filter((s: any) => s.phase === "building").length || 0,
    demo: stacks?.filter((s: any) => s.phase === "demo").length || 0,
    completed: stacks?.filter((s: any) => s.phase === "completed").length || 0,
  };

  // Calculate execution status stats
  const executionStats = {
    running: stacks?.filter((s: any) => s.execution_state === "running").length || 0,
    paused: stacks?.filter((s: any) => s.execution_state === "paused").length || 0,
    stopped: stacks?.filter((s: any) => s.execution_state === "stopped").length || 0,
    idle: stacks?.filter((s: any) => !s.execution_state || s.execution_state === "idle").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage agent teams and monitor hackathon progress
        </p>
      </div>

      <Separator />

      {/* Global Execution Controls */}
      <GlobalExecutionControls />

      <Separator />

      {/* Phase Statistics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold">Phase Distribution</h2>
          <Badge variant="secondary">{stats.total} teams</Badge>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Teams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Ideation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.ideation}</div>
            </CardContent>
          </Card>
          <Card className="hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Hammer className="w-4 h-4" />
                Building
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.building}</div>
            </CardContent>
          </Card>
          <Card className="hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Presentation className="w-4 h-4" />
                Demo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.demo}</div>
            </CardContent>
          </Card>
          <Card className="hover:bg-accent/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Execution Status Statistics */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Execution Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-green-900 bg-green-950/20 hover:bg-green-950/30 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-400 flex items-center gap-2">
                <Play className="w-4 h-4" />
                Running
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {executionStats.running}
              </div>
            </CardContent>
          </Card>
          <Card className="border-yellow-900 bg-yellow-950/20 hover:bg-yellow-950/30 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-400 flex items-center gap-2">
                <Pause className="w-4 h-4" />
                Paused
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">
                {executionStats.paused}
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-900 bg-red-950/20 hover:bg-red-950/30 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
                <Square className="w-4 h-4" />
                Stopped
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">
                {executionStats.stopped}
              </div>
            </CardContent>
          </Card>
          <Card className="border-gray-700 bg-gray-800/20 hover:bg-gray-800/30 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
                <Circle className="w-4 h-4" />
                Idle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-400">
                {executionStats.idle}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Team Management */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Team Management</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CreateTeamForm />
          <TeamManagementList />
        </div>
      </div>
    </div>
  );
}
