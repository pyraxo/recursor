"use client";
import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Card, CardContent } from "@repo/ui/card";

export function LiveFeed() {
  const traces = useQuery(api.traces.getRecent, { limit: 100 });
  if (!traces)
    return <div className="text-muted-foreground">Loading...</div>;
  return (
    <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
      {traces.map((t) => (
        <Card key={t._id}>
          <CardContent className="p-3 space-y-1">
            <div className="text-xs text-muted-foreground">
              {new Date(t.timestamp).toLocaleTimeString()}
            </div>
            <div className="font-semibold text-sm">{t.agent_type}</div>
            <div className="text-sm whitespace-pre-wrap">{t.thought}</div>
            <div className="text-xs text-muted-foreground">
              action: {t.action}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
