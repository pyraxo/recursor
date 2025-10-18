"use client";

import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { CreateTeamForm } from "./CreateTeamForm";
import { TeamManagementList } from "./TeamManagementList";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

export function AdminDashboard() {
  const stacks = useQuery(api.agents.listStacks);

  const stats = {
    total: stacks?.length || 0,
    ideation: stacks?.filter((s: any) => s.phase === "ideation").length || 0,
    building: stacks?.filter((s: any) => s.phase === "building").length || 0,
    demo: stacks?.filter((s: any) => s.phase === "demo").length || 0,
    completed: stacks?.filter((s: any) => s.phase === "completed").length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage agent teams and monitor hackathon progress
        </p>
      </div>

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

      <div className="grid grid-cols-2 gap-6">
        <CreateTeamForm />
        <TeamManagementList />
      </div>
    </div>
  );
}

