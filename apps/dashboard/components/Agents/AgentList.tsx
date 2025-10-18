"use client";
import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Button } from "@repo/ui/button";
import { Badge } from "@repo/ui/badge";
import { ScrollArea } from "@repo/ui/scroll-area";
import { Card } from "@repo/ui/card";
import { User, ChevronRight } from "lucide-react";

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
          const executionState = s.execution_state || 'idle';
          const getStatusColor = () => {
            switch (executionState) {
              case 'running':
                return 'bg-green-900/50 text-green-400 border-green-800';
              case 'paused':
                return 'bg-yellow-900/50 text-yellow-400 border-yellow-800';
              case 'stopped':
                return 'bg-red-900/50 text-red-400 border-red-800';
              default:
                return 'bg-gray-800 text-gray-400 border-gray-700';
            }
          };

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
