"use client";

import { AGENT_COLORS } from "../../lib/theme";

interface MessageCardProps {
  message: {
    _id: string;
    from_agent_type: string;
    from_team_name: string;
    to_team_name?: string | null;
    content: string;
    message_type: string;
    created_at: number;
  };
  onTeamClick?: (teamName: string) => void;
}

export function MessageCard({ message, onTeamClick }: MessageCardProps) {
  const isVisitor = message.message_type === "visitor";
  const isBroadcast = message.message_type === "broadcast";

  const agentColor = !isVisitor
    ? AGENT_COLORS[message.from_agent_type as keyof typeof AGENT_COLORS] || "var(--accent-primary)"
    : "var(--accent-secondary)";

  return (
    <div
      className="chat-message"
      style={{
        borderLeftColor: agentColor,
        borderLeftWidth: "4px",
        borderLeftStyle: "solid",
        backgroundColor: "var(--panel-bg)",
        padding: "12px 16px",
        marginBottom: "8px",
        borderRadius: "4px",
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Team Badge */}
          <button
            onClick={() => onTeamClick?.(message.from_team_name)}
            className="px-2 py-1 text-xs font-bold uppercase bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)] text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/30 transition-colors"
            style={{
              cursor: onTeamClick ? "pointer" : "default",
            }}
          >
            {message.from_team_name}
          </button>

          {/* Sender Type */}
          <div
            className="text-xs font-bold uppercase"
            style={{ color: agentColor }}
          >
            {isVisitor ? "Visitor" : message.from_agent_type}
          </div>

          {/* Message Type Badge */}
          {isBroadcast && (
            <span className="px-2 py-1 text-xs font-bold uppercase bg-yellow-500/20 border border-yellow-500 text-yellow-500">
              Broadcast
            </span>
          )}

          {/* Recipient Badge */}
          {message.to_team_name && !isBroadcast && (
            <span className="text-xs text-[var(--foreground)]/50">
              → {message.to_team_name}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-[var(--foreground)]/50 whitespace-nowrap">
          {new Date(message.created_at).toLocaleTimeString()}
        </div>
      </div>

      {/* Message Content */}
      <div className="text-sm text-[var(--foreground)] leading-relaxed">
        {message.content}
      </div>
    </div>
  );
}
