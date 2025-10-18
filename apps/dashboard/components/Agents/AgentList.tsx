"use client";
import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Button } from "@repo/ui/button";

export function AgentList({ onSelect }: { onSelect: (id: string) => void }) {
  const stacks = useQuery(api.agents.listStacks);
  if (!stacks) return <div className="text-muted-foreground">Loading...</div>;
  return (
    <div className="space-y-2">
      {stacks.map((s) => (
        <Button
          key={s._id}
          variant="outline"
          className="w-full justify-start text-left h-auto py-3"
          onClick={() => onSelect(s._id)}
        >
          <div className="w-full">
            <div className="font-semibold">{s.participant_name}</div>
            <div className="text-xs text-muted-foreground">
              Phase: {s.phase}
            </div>
          </div>
        </Button>
      ))}
    </div>
  );
}
