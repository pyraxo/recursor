"use client";
import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";

export function AgentDetail({ stackId }: { stackId: Id<"agent_stacks"> }) {
  const stack = useQuery(api.agents.getStack, { stackId });
  const idea = useQuery(api.project_ideas.get, { stackId });
  const todos = useQuery(api.todos.list, { stackId });
  const artifacts = useQuery(api.artifacts.list, { stackId });
  const timeline = useQuery(api.messages.getTimeline, { stackId });

  if (!stack) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{stack.participant_name}</CardTitle>
          <div className="text-sm text-muted-foreground">
            Phase: {stack.phase}
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="font-medium">{idea?.title || "Not set"}</div>
          <div className="text-sm text-muted-foreground">
            {idea?.description || "No description"}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todos</CardTitle>
        </CardHeader>
        <CardContent>
          {!todos || todos.length === 0 ? (
            <div className="text-sm text-muted-foreground">No todos yet</div>
          ) : (
            <ul className="space-y-1">
              {todos.map((t: any) => (
                <li key={t._id} className="text-sm">
                  <span className="text-muted-foreground">[{t.status}]</span>{" "}
                  {t.content}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Artifacts</CardTitle>
        </CardHeader>
        <CardContent>
          {!artifacts || artifacts.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No artifacts yet
            </div>
          ) : (
            <ul className="space-y-1">
              {artifacts.map((a: any) => (
                <li key={a._id} className="text-sm">
                  v{a.version} - {a.type}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Message Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {!timeline || timeline.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No messages yet
            </div>
          ) : (
            <ul className="space-y-2">
              {timeline.map((m: any) => (
                <li key={m._id} className="text-sm border-l-2 pl-2">
                  <div className="text-xs text-muted-foreground">
                    {m.message_type}
                  </div>
                  <div>{m.content}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
