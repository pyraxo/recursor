"use client";

import { api } from "@recursor/convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { MessageCard } from "./MessageCard";

export function MessagesTab() {
  const messages = useQuery(api.messages.getAllMessages);
  const [filterTeam, setFilterTeam] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<
    "all" | "visitor" | "agent" | "broadcast"
  >("all");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  if (!messages) {
    return (
      <div className="flex items-center justify-center h-full text-center">
        <div className="text-muted-foreground text-sm">Loading messages...</div>
      </div>
    );
  }

  // Apply filters
  const filteredMessages = messages.filter((msg) => {
    if (filterTeam && msg.from_team_name !== filterTeam) return false;
    if (filterType === "visitor" && msg.message_type !== "visitor")
      return false;
    if (filterType === "agent" && msg.message_type === "visitor") return false;
    if (filterType === "broadcast" && msg.message_type !== "broadcast")
      return false;
    return true;
  });

  // Get unique team names for filter
  const uniqueTeams = Array.from(
    new Set(messages.map((msg) => msg.from_team_name))
  ).sort();

  return (
    <div className="flex flex-col h-full w-full">
      {/* Filter Bar */}
      <div className="bg-card border-b-2 border-border p-4">
        <div className="flex gap-4 items-center flex-wrap">
          {/* Team Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Team:
            </label>
            <select
              value={filterTeam || "all"}
              onChange={(e) =>
                setFilterTeam(e.target.value === "all" ? null : e.target.value)
              }
              className="px-3 py-1 bg-background border-2 border-border text-foreground text-sm focus:border-primary focus:outline-none"
            >
              <option value="all">All Teams</option>
              {uniqueTeams.map((team) => (
                <option key={team} value={team}>
                  {team}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Type:
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-1 bg-background border-2 border-border text-foreground text-sm focus:border-primary focus:outline-none"
            >
              <option value="all">All Messages</option>
              <option value="visitor">Visitor Only</option>
              <option value="agent">Agent Only</option>
              <option value="broadcast">Broadcasts</option>
            </select>
          </div>

          {/* Message Count */}
          <div className="ml-auto text-xs text-muted-foreground">
            {filteredMessages.length} message
            {filteredMessages.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-8 text-muted-foreground text-sm">
              No messages found
            </div>
          </div>
        ) : (
          <>
            {filteredMessages.map((msg) => (
              <MessageCard
                key={msg._id}
                message={msg}
                onTeamClick={(teamName) => setFilterTeam(teamName)}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
    </div>
  );
}
