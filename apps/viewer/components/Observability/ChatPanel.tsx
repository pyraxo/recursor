"use client";
import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { useMutation, useQuery } from "convex/react";
import { Bot, Send, User as UserIcon } from "lucide-react";
import { useState } from "react";

export function ChatPanel({ stackId }: { stackId: Id<"agent_stacks"> }) {
  const [senderName, setSenderName] = useState("Visitor");
  const [message, setMessage] = useState("");
  const chatHistory = useQuery(api.userMessages.getChatHistory, {
    team_id: stackId,
    limit: 50,
  });
  const sendMessage = useMutation(api.userMessages.send);

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      await sendMessage({
        team_id: stackId,
        sender_name: senderName || "Visitor",
        content: message,
      });
      setMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserIcon className="w-5 h-5" />
          Team Chat
        </CardTitle>
        <CardDescription>
          Send messages to the team. The Planner will analyze them and decide
          how to respond.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat History */}
        <ScrollArea className="h-[400px] border rounded-lg p-4">
          {!chatHistory || chatHistory.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">
              No messages yet. Start a conversation!
            </div>
          ) : (
            <div className="space-y-4">
              {chatHistory.map((msg: any) => (
                <div key={msg._id} className="space-y-2">
                  {/* User Message */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <UserIcon className="w-4 h-4 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {msg.sender_name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(msg.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                        {msg.content}
                      </div>
                    </div>
                  </div>

                  {/* Agent Response */}
                  {msg.response && (
                    <div className="flex items-start gap-3 ml-8">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-medium">
                            Team Agent
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.response.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                          {msg.response.content}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending Response Indicator */}
                  {!msg.response && msg.processed && (
                    <div className="ml-8 text-xs text-muted-foreground italic">
                      Message processed, response may appear soon...
                    </div>
                  )}
                  {!msg.processed && (
                    <div className="ml-8 text-xs text-yellow-500 italic">
                      Waiting for team to see this message...
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Your name (optional)"
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              className="w-32"
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Type a message to the team..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!message.trim()}>
              <Send className="w-4 h-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
