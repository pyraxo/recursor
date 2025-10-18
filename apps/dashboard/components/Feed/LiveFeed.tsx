"use client";
import { api } from "@recursor/convex/_generated/api";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { Separator } from "@repo/ui/components/separator";
import { useQuery } from "convex/react";
import { Activity, Clock, User, Zap, ArrowUp } from "lucide-react";
import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";

export interface LiveFeedRef {
  scrollToTop: () => void;
}

export const LiveFeed = forwardRef<LiveFeedRef>((props, ref) => {
  const traces = useQuery(api.traces.getRecentAll, { limit: 100 });
  const stacks = useQuery(api.agents.listStacks);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLengthRef = useRef(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

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

  // Track scroll position to show/hide the scroll-to-top button
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Show button if scrolled down more than 200px
      setShowScrollTop(container.scrollTop > 200);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  };

  // Expose scrollToTop method to parent via ref
  useImperativeHandle(ref, () => ({
    scrollToTop,
  }));

  if (!traces || !stacks)
    return <div className="text-muted-foreground text-sm">Loading...</div>;

  if (traces.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center space-y-2">
            <Activity className="w-12 h-12 mx-auto text-muted-foreground opacity-50" />
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
    const stack = stacks.find((s: any) => s._id === stackId);
    return stack?.participant_name || "Unknown";
  };

  const getAgentBadgeColor = (agentType: string) => {
    switch (agentType) {
      case "planner":
        return "bg-blue-900/50 text-blue-400 border-blue-800";
      case "builder":
        return "bg-purple-900/50 text-purple-400 border-purple-800";
      case "communicator":
        return "bg-green-900/50 text-green-400 border-green-800";
      case "reviewer":
        return "bg-orange-900/50 text-orange-400 border-orange-800";
      default:
        return "bg-gray-800 text-gray-400 border-gray-700";
    }
  };

  return (
    <div className="relative">
      <ScrollArea className="h-[calc(100vh-220px)]">
        <div ref={containerRef} className="space-y-2 pr-4">
        {traces.map((t: any) => (
          <Card key={t._id} className="hover:bg-accent/30 transition-colors">
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(t.timestamp).toLocaleTimeString()}</span>
                    <Separator orientation="vertical" className="h-3" />
                    <User className="w-3 h-3" />
                    <span className="font-semibold text-primary">
                      {getStackName(t.stack_id)}
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`capitalize ${getAgentBadgeColor(t.agent_type)}`}
                  >
                    {t.agent_type}
                  </Badge>
                </div>

                <Separator />

                {/* Thought */}
                <div className="text-sm text-foreground leading-relaxed">
                  {t.thought}
                </div>

                {/* Action */}
                <div className="flex items-start gap-2 text-xs">
                  <Zap className="w-3 h-3 mt-0.5 text-primary" />
                  <div className="flex-1">
                    <span className="text-muted-foreground">Action: </span>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {t.action}
                    </Badge>
                  </div>
                </div>

                {/* Result */}
                {t.result && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                      View result
                    </summary>
                    <div className="mt-2 p-3 bg-secondary rounded-md">
                      <pre className="text-xs overflow-x-auto max-w-full whitespace-pre-wrap break-words">
                        {typeof t.result === "string"
                          ? t.result
                          : JSON.stringify(t.result, null, 2)}
                      </pre>
                    </div>
                  </details>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </ScrollArea>

      {/* Floating scroll-to-top button */}
      {showScrollTop && (
        <Button
          size="sm"
          variant="outline"
          onClick={scrollToTop}
          className="absolute bottom-4 right-4 shadow-lg border-border bg-card hover:bg-accent transition-opacity"
        >
          <ArrowUp className="w-4 h-4 mr-1" />
          Top
        </Button>
      )}
    </div>
  );
});

LiveFeed.displayName = "LiveFeed";
