"use client";

import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { Badge } from "@repo/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { useQuery } from "convex/react";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  GitBranch,
  Layers,
  TrendingUp,
  Zap,
} from "lucide-react";

export function OrchestrationMonitor({
  stackId,
}: {
  stackId: Id<"agent_stacks">;
}) {
  const stats = useQuery(api.orchestration.getOrchestrationStats, { stackId });
  const workStatus = useQuery(api.orchestration.getWorkDetectionStatus, {
    stackId,
  });
  const recentExecutions = useQuery(api.orchestration.getRecentExecutions, {
    stackId,
    limit: 10,
  });

  if (!stats) {
    return <div className="text-muted-foreground">Loading stats...</div>;
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case "running":
        return <Activity className="w-4 h-4 text-blue-400 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getWorkStatusColor = (hasWork: boolean, priority: number) => {
    if (!hasWork) return "text-muted-foreground";
    if (priority >= 8) return "text-red-400";
    if (priority >= 6) return "text-yellow-400";
    return "text-green-400";
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Total Cycles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCycles}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Last 24 hours
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg Duration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(stats.avgCycleDurationMs)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Per cycle
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Parallel Exec
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avgParallelExecutions.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Avg agents/cycle
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Success Rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalCycles > 0
                ? Math.round((stats.completedCycles / stats.totalCycles) * 100)
                : 0}
              %
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats.completedCycles} / {stats.totalCycles}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Work Detection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Work Detection Status
          </CardTitle>
          {workStatus && (
            <CardDescription className="text-xs">
              Updated {formatTime(workStatus.computedAt)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {!workStatus ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              No work detection data yet
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Planner */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Planner</span>
                  <Badge
                    variant={workStatus.planner.hasWork ? "default" : "outline"}
                    className={getWorkStatusColor(
                      workStatus.planner.hasWork,
                      workStatus.planner.priority
                    )}
                  >
                    Priority: {workStatus.planner.priority}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {workStatus.planner.reason}
                </div>
              </div>

              {/* Builder */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Builder</span>
                  <Badge
                    variant={workStatus.builder.hasWork ? "default" : "outline"}
                    className={getWorkStatusColor(
                      workStatus.builder.hasWork,
                      workStatus.builder.priority
                    )}
                  >
                    Priority: {workStatus.builder.priority}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {workStatus.builder.reason}
                </div>
              </div>

              {/* Communicator */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Communicator</span>
                  <Badge
                    variant={
                      workStatus.communicator.hasWork ? "default" : "outline"
                    }
                    className={getWorkStatusColor(
                      workStatus.communicator.hasWork,
                      workStatus.communicator.priority
                    )}
                  >
                    Priority: {workStatus.communicator.priority}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {workStatus.communicator.reason}
                </div>
              </div>

              {/* Reviewer */}
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Reviewer</span>
                  <Badge
                    variant={workStatus.reviewer.hasWork ? "default" : "outline"}
                    className={getWorkStatusColor(
                      workStatus.reviewer.hasWork,
                      workStatus.reviewer.priority
                    )}
                  >
                    Priority: {workStatus.reviewer.priority}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {workStatus.reviewer.reason}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Orchestration Cycles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!recentExecutions || recentExecutions.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No execution history yet
            </div>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2 pr-4">
                {recentExecutions.map((exec) => (
                  <div
                    key={exec._id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    {getStatusIcon(exec.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant="outline" className="text-xs capitalize">
                          {exec.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(exec.started_at)}
                        </span>
                      </div>
                      {exec.completed_at && (
                        <div className="text-xs text-muted-foreground">
                          Duration:{" "}
                          {formatDuration(exec.completed_at - exec.started_at)}
                        </div>
                      )}
                      {exec.decision && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Decision:{" "}
                          <span className="capitalize">{exec.decision}</span>
                          {exec.pause_duration && (
                            <span>
                              {" "}
                              ({formatDuration(exec.pause_duration)} pause)
                            </span>
                          )}
                        </div>
                      )}
                      {exec.graph_summary && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <GitBranch className="w-3 h-3" />
                            {exec.graph_summary.agents_run.join(", ")} •{" "}
                            {exec.graph_summary.waves} wave(s) •{" "}
                            {exec.graph_summary.parallel_executions} parallel
                          </span>
                        </div>
                      )}
                      {exec.error && (
                        <div className="text-xs text-red-400 mt-1">
                          Error: {exec.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
