"use client";
import { api } from "@recursor/convex/_generated/api";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { useQuery } from "convex/react";
import { ChevronRight, User, Users, Code2 } from "lucide-react";

export function AgentList({ onSelect }: { onSelect: (id: string) => void }) {
  const stacks = useQuery(api.agents.listStacks);

  if (!stacks) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (stacks.length === 0) {
    return (
      <Card className="p-8 text-center">
        <User className="w-12 h-12 mx-auto text-muted-foreground opacity-50 mb-2" />
        <div className="text-sm text-muted-foreground">No teams yet</div>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-2 pr-4">
        {stacks.map((s: any) => {
          const executionState = s.execution_state || "idle";
          const teamType = s.team_type || "standard";

          const getStatusColor = () => {
            switch (executionState) {
              case "running":
                return "bg-green-900/50 text-green-400 border-green-800";
              case "paused":
                return "bg-yellow-900/50 text-yellow-400 border-yellow-800";
              case "stopped":
                return "bg-red-900/50 text-red-400 border-red-800";
              default:
                return "bg-gray-800 text-gray-400 border-gray-700";
            }
          };

          const getTeamTypeStyles = () => {
            switch (teamType) {
              case "cursor":
                return {
                  container: "bg-cyan-900/50 text-cyan-400 border-cyan-800",
                  icon: Code2,
                  label: "Cursor",
                };
              case "standard":
              default:
                return {
                  container: "bg-indigo-900/50 text-indigo-400 border-indigo-800",
                  icon: Users,
                  label: "Multi-Agent",
                };
            }
          };

          const teamTypeStyles = getTeamTypeStyles();
          const TeamTypeIcon = teamTypeStyles.icon;

          return (
            <Button
              key={s._id}
              variant="outline"
              className="w-full justify-start text-left h-auto py-4 px-4 hover:bg-accent/70 transition-all group"
              onClick={() => onSelect(s._id)}
            >
              <div className="flex items-center gap-3 w-full">
                <User className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate mb-1">
                    {s.participant_name}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="capitalize text-xs">
                      {s.phase}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`uppercase text-xs ${getStatusColor()}`}
                    >
                      {executionState}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`uppercase text-xs ${teamTypeStyles.container}`}
                    >
                      <span className="flex items-center gap-1">
                        <TeamTypeIcon className="h-2.5 w-2.5" />
                        {teamTypeStyles.label}
                      </span>
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </div>
            </Button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
