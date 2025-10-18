"use client";

import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { AGENT_COLORS } from "../../../lib/theme";
import { PixelButton } from "../../shared/PixelButton";

interface ChatTabProps {
  stackId: Id<"agent_stacks">;
}

export function ChatTab({ stackId }: ChatTabProps) {
  const [senderName, setSenderName] = useState("Visitor");
  const [message, setMessage] = useState("");
  const chatHistory = useQuery(api.userMessages.getChatHistory, {
    team_id: stackId,
    limit: 50,
  });
  const sendMessage = useMutation(api.userMessages.send);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Auto-scroll to bottom when component mounts
  useEffect(() => {
    scrollToBottom();
  }, []);

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide space-y-4 mb-4 min-h-0 max-h-[500px]">
        {!chatHistory && (
          <div className="text-[var(--foreground)]/60 font-mono text-sm">
            Loading messages...
          </div>
        )}

        {chatHistory && chatHistory.length === 0 && (
          <div className="text-center py-8 text-[var(--foreground)]/60 font-mono text-sm">
            No messages yet. Start a conversation!
          </div>
        )}

        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {chatHistory?.map((msg: any) => (
          <div key={msg._id} className="space-y-2">
            {/* User Message */}
            <div
              className="chat-message visitor"
              style={{
                borderLeftColor: "var(--accent-secondary)",
              }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="text-xs font-bold uppercase"
                  style={{ color: "var(--accent-secondary)" }}
                >
                  {msg.sender_name}
                </div>
                <div className="text-xs text-[var(--foreground)]/50">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div className="mt-1 text-sm text-[var(--foreground)]">
                {msg.content}
              </div>
            </div>

            {/* Agent Response */}
            {msg.response && (
              <div
                className="chat-message agent ml-6"
                style={{
                  borderLeftColor: AGENT_COLORS.communicator,
                }}
              >
                <div className="flex items-start gap-2">
                  <div
                    className="text-xs font-bold uppercase"
                    style={{ color: AGENT_COLORS.communicator }}
                  >
                    {msg.response.from_agent_type || "Team Agent"}
                  </div>
                  <div className="text-xs text-[var(--foreground)]/50">
                    {new Date(msg.response.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="mt-1 text-sm text-[var(--foreground)]">
                  {msg.response.content}
                </div>
              </div>
            )}

            {/* Status Indicators */}
            {!msg.response && msg.processed && (
              <div className="ml-6 text-xs text-yellow-500 font-mono italic">
                ⏳ Message processed, response may appear soon...
              </div>
            )}
            {!msg.processed && (
              <div className="ml-6 text-xs text-[var(--foreground)]/50 font-mono italic">
                ⏸ Waiting for team to see this message...
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t-2 border-[var(--panel-border)] pt-4 flex-shrink-0 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Your name"
            className="w-32 px-3 py-2 bg-[var(--background)] border-2 border-[var(--panel-border)] text-[var(--foreground)] font-mono text-sm focus:border-[var(--accent-primary)] focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message to the team..."
            className="flex-1 px-3 py-2 bg-[var(--background)] border-2 border-[var(--panel-border)] text-[var(--foreground)] font-mono text-sm focus:border-[var(--accent-primary)] focus:outline-none"
          />
          <PixelButton
            onClick={handleSend}
            disabled={!message.trim()}
            variant="primary"
          >
            Send
          </PixelButton>
        </div>
      </div>
    </div>
  );
}
