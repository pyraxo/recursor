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
import { Separator } from "@repo/ui/components/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import { useQuery } from "convex/react";
import {
  Activity,
  CheckCircle,
  CheckSquare,
  Circle,
  Clock,
  FileCode,
  Lightbulb,
  MessageSquare,
  User,
} from "lucide-react";
import { ExecutionControls } from "../Controls/ExecutionControls";
import { OrchestrationMonitor } from "./OrchestrationMonitor";
import { ChatPanel } from "./ChatPanel";

export function AgentDetail({ stackId }: { stackId: Id<"agent_stacks"> }) {
  const stack = useQuery(api.agents.getStack, { stackId });
  const idea = useQuery(api.project_ideas.get, { stackId });
  const todos = useQuery(api.todos.list, { stackId });
  const artifacts = useQuery(api.artifacts.list, { stackId });
  const timeline = useQuery(api.messages.getTimeline, { stackId });

  if (!stack) return <div className="text-muted-foreground">Loading...</div>;

  const getTodoIcon = (status: string) => {
    return status === "completed" ? (
      <CheckCircle className="w-4 h-4 text-green-400" />
    ) : (
      <Circle className="w-4 h-4 text-muted-foreground" />
    );
  };

  const getTodoCount = (status: string) => {
    return todos?.filter((t: any) => t.status === status).length || 0;
  };

  return (
    <div className="space-y-4">
      {/* Execution Controls at the top */}
      <ExecutionControls stackId={stackId} />

      {/* Team Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-6 h-6" />
              <div>
                <CardTitle>{stack.participant_name}</CardTitle>
                <CardDescription className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="capitalize">
                    {stack.phase}
                  </Badge>
                  {stack.created_at && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Created {new Date(stack.created_at).toLocaleDateString()}
                    </span>
                  )}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabbed Content */}
      <Tabs defaultValue="project" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="project" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Project
          </TabsTrigger>
          <TabsTrigger value="todos" className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            Todos
            {todos && todos.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {todos.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="artifacts" className="flex items-center gap-2">
            <FileCode className="w-4 h-4" />
            Artifacts
            {artifacts && artifacts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {artifacts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Messages
            {timeline && timeline.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {timeline.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="orchestration" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Orchestration
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Project Idea
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Title</div>
                <div className="font-medium">{idea?.title || "Not set"}</div>
              </div>
              <Separator />
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Description
                </div>
                <div className="text-sm text-foreground">
                  {idea?.description || "No description"}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="todos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CheckSquare className="w-5 h-5" />
                  Todo List
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <Badge
                    variant="outline"
                    className="bg-green-900/20 text-green-400 border-green-800"
                  >
                    {getTodoCount("completed")} completed
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-blue-900/20 text-blue-400 border-blue-800"
                  >
                    {getTodoCount("pending")} pending
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!todos || todos.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No todos yet
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {todos.map((t: any) => (
                      <div
                        key={t._id}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        {getTodoIcon(t.status)}
                        <div className="flex-1">
                          <div className="text-sm">{t.content}</div>
                          <Badge
                            variant="secondary"
                            className="mt-1 text-xs capitalize"
                          >
                            {t.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="artifacts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileCode className="w-5 h-5" />
                Build Artifacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!artifacts || artifacts.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No artifacts yet
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {artifacts.map((a: any) => (
                      <div
                        key={a._id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <FileCode className="w-4 h-4 text-primary" />
                          <div>
                            <Badge variant="outline" className="font-mono">
                              v{a.version}
                            </Badge>
                            <span className="ml-2 text-sm">{a.type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Message Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!timeline || timeline.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-8">
                  No messages yet
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {timeline.map((m: any) => (
                      <div
                        key={m._id}
                        className="border-l-2 border-primary pl-4 py-2 hover:bg-accent/30 transition-colors rounded-r"
                      >
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {m.message_type}
                          </Badge>
                          {m.from_agent_type && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {m.from_agent_type}
                            </Badge>
                          )}
                          {m.from_team_name && (
                            <span className="text-xs text-muted-foreground">
                              from {m.from_team_name}
                            </span>
                          )}
                        </div>
                        <div className="text-sm">{m.content}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orchestration" className="space-y-4">
          <OrchestrationMonitor stackId={stackId} />
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          <ChatPanel stackId={stackId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
