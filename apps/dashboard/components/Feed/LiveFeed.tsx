"use client";
import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Card, CardContent } from "@repo/ui/card";
import { useEffect, useRef } from "react";

export function LiveFeed() {
  const traces = useQuery(api.traces.getRecent, { limit: 100 });
  const stacks = useQuery(api.agents.listStacks);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);

  useEffect(() => {
    if (
      traces &&
      traces.length > prevLengthRef.current &&
      containerRef.current
    ) {
      containerRef.current.scrollTop = 0;
    }
    prevLengthRef.current = traces?.length || 0;
  }, [traces]);

  if (!traces || !stacks)
    return <div className="text-muted-foreground text-sm">Loading...</div>;

  if (traces.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground">
              No agent activity yet
            </div>
            <div className="text-xs text-muted-foreground">
              Start running teams to see live traces here
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStackName = (stackId: string) => {
    const stack = stacks.find((s) => s._id === stackId);
    return stack?.participant_name || "Unknown";
  };

  return (
    <div
      ref={containerRef}
      className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto pr-2"
    >
      {traces.map((t) => (
        <Card key={t._id} className="hover:bg-accent/30 transition-colors">
          <CardContent className="p-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {new Date(t.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="font-semibold text-primary">
                    {getStackName(t.stack_id)}
                  </span>
                </div>
                <span className="font-medium text-accent-foreground bg-accent px-2 py-0.5 rounded">
                  {t.agent_type}
                </span>
              </div>

              <div className="text-sm text-foreground leading-relaxed">
                {t.thought}
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Action:</span>
                <span className="font-mono text-primary">{t.action}</span>
              </div>

              {t.result && (
                <details className="text-xs mt-1">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View result
                  </summary>
                  <pre className="mt-1 p-2 bg-secondary rounded text-xs overflow-x-auto">
                    {typeof t.result === "string"
                      ? t.result
                      : JSON.stringify(t.result, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
