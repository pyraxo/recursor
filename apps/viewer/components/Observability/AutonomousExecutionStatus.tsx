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
import { useQuery } from "convex/react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Pause,
  Play,
  XCircle,
} from "lucide-react";

interface AutonomousExecutionStatusProps {
  stackId: Id<"agent_stacks">;
}

interface AgentExecutionState {
  agentType: string;
  executionState: "idle" | "executing" | "error";
  currentWork: string | null;
  lastUpdate: number;
}

export function AutonomousExecutionStatus({
  stackId,
}: AutonomousExecutionStatusProps) {
  // Get overall execution state
  const executionStatus = useQuery(api.agents.getExecutionStatus, { stackId });

  // Get agent execution states (already transformed by the query)
  const agentExecutionStates: AgentExecutionState[] =
    useQuery(api.agentExecution.getExecutionStates, { stackId }) || [];

  // Determine overall system state
  const systemState = executionStatus?.execution_state || "idle";
  const isProcessing =
    executionStatus?.last_activity_at &&
    Date.now() - executionStatus.last_activity_at < 5000;

  // Count active agents
  const activeAgents = agentExecutionStates.filter(
    (a) => a.executionState === "executing"
  ).length;
  const idleAgents = agentExecutionStates.filter(
    (a) => a.executionState === "idle"
  ).length;
  const errorAgents = agentExecutionStates.filter(
    (a) => a.executionState === "error"
  ).length;

  const getStateIcon = (state: string) => {
    switch (state) {
      case "running":
        return <Play className="w-4 h-4 text-green-500" />;
      case "paused":
        return <Pause className="w-4 h-4 text-yellow-500" />;
      case "stopped":
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAgentStateIcon = (state: string) => {
    switch (state) {
      case "executing":
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getAgentStateBadge = (state: string) => {
    switch (state) {
      case "executing":
        return (
          <Badge variant="default" className="bg-blue-500">
            Working
          </Badge>
        );
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Idle</Badge>;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Autonomous Execution Status
            </CardTitle>
            <CardDescription>
              Real-time agent activity and work processing
            </CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getStateIcon(systemState)}
              <span className="text-sm font-medium capitalize">
                {systemState}
              </span>
            </div>
            {isProcessing && (
              <Badge variant="outline" className="animate-pulse">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Processing
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activeAgents}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              Active Agents
            </div>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
            <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {idleAgents}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Idle Agents
            </div>
          </div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {errorAgents}
            </div>
            <div className="text-xs text-red-600 dark:text-red-400">
              Error Agents
            </div>
          </div>
        </div>

        {/* Individual Agent Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Agent Activity
          </h4>
          {agentExecutionStates.map((agent) => (
            <div
              key={agent.agentType}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getAgentStateIcon(agent.executionState)}
                <div>
                  <div className="font-medium capitalize">
                    {agent.agentType}
                  </div>
                  {agent.currentWork ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {agent.currentWork}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Waiting for work...
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getAgentStateBadge(agent.executionState)}
                {agent.lastUpdate > 0 && (
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(agent.lastUpdate), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Work Queue Status (placeholder for future enhancement) */}
        <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Work Detection
              </span>
            </div>
            <span className="text-xs text-blue-600 dark:text-blue-400">
              Continuously monitoring for available work
            </span>
          </div>
        </div>

        {/* Last Activity */}
        {executionStatus?.last_activity_at && (
          <div className="mt-4 text-xs text-gray-500 text-center">
            Last activity:{" "}
            {formatDistanceToNow(new Date(executionStatus.last_activity_at), {
              addSuffix: true,
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
