"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@recursor/convex/_generated/api";
import { Id } from "@recursor/convex/_generated/dataModel";
import { PixelButton } from "../../shared/PixelButton";
import { AGENT_COLORS } from "../../../lib/theme";

interface ChatTabProps {
  stackId: Id<"agent_stacks">;
}

export function ChatTab({ stackId }: ChatTabProps) {
  const [message, setMessage] = useState("");
  const messages = useQuery(api.messages.getTimeline, { stackId });
  const sendMessage = useMutation(api.messages.send);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-scroll to bottom when component mounts
  useEffect(() => {
    scrollToBottom();
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    
    await sendMessage({
      from_stack_id: stackId,
      to_stack_id: stackId,
      from_agent_type: "visitor",
      content: message,
      message_type: "visitor",
    });
    
    setMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide space-y-2 mb-4 min-h-0 max-h-[500px]">
        {!messages && (
          <div className="text-[var(--foreground)]/60 font-mono text-sm">Loading messages...</div>
        )}
        
        {messages && messages.length === 0 && (
          <div className="text-center py-8 text-[var(--foreground)]/60 font-mono text-sm">
            No messages yet. Start a conversation!
          </div>
        )}
        
        {messages?.map((msg) => {
          const isVisitor = msg.message_type === "visitor";
          const agentColor = !isVisitor
            ? AGENT_COLORS[msg.from_agent_type as keyof typeof AGENT_COLORS] || "var(--accent-primary)"
            : "var(--accent-secondary)";

          return (
            <div
              key={msg._id}
              className={`chat-message ${isVisitor ? "visitor" : "agent"}`}
              style={{
                borderLeftColor: agentColor,
              }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="text-xs font-bold uppercase"
                  style={{ color: agentColor }}
                >
                  {isVisitor ? "You" : msg.from_agent_type}
                </div>
                <div className="text-xs text-[var(--foreground)]/50">
                  {new Date(msg.created_at).toLocaleTimeString()}
                </div>
              </div>
              <div className="mt-1 text-sm text-[var(--foreground)]">
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t-2 border-[var(--panel-border)] pt-4 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-[var(--background)] border-2 border-[var(--panel-border)] text-[var(--foreground)] font-mono text-sm focus:border-[var(--accent-primary)] focus:outline-none"
          />
          <PixelButton onClick={handleSend} disabled={!message.trim()}>
            Send
          </PixelButton>
        </div>
      </div>
    </div>
  );
}

