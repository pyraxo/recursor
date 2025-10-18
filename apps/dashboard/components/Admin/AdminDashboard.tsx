"use client";

import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { CreateTeamForm } from "./CreateTeamForm";
import { TeamManagementList } from "./TeamManagementList";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { GlobalExecutionControls } from "../Controls/GlobalExecutionControls";

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage agent teams and monitor hackathon progress
        </p>
      </div>

      {/* Global Execution Controls */}
      <GlobalExecutionControls />

      {/* Phase Statistics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Teams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ideation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ideation}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Building
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.building}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Demo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.demo}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Execution Status Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-green-900 bg-green-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-400">
              Running
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {executionStats.running}
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-900 bg-yellow-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-400">
              Paused
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">
              {executionStats.paused}
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-900 bg-red-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-400">
              Stopped
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">
              {executionStats.stopped}
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-700 bg-gray-800/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
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

      <div className="grid grid-cols-2 gap-6">
        <CreateTeamForm />
        <TeamManagementList />
      </div>
    </div>
  );
}

