"use client";

import { useState } from "react";
import { Id } from "@recursor/convex/_generated/dataModel";
import { PixelPanel } from "../shared/PixelPanel";
import { TabNavigation } from "./TeamPanel/TabNavigation";
import { ReadmeTab } from "./TeamPanel/ReadmeTab";
import { ChatTab } from "./TeamPanel/ChatTab";
import { LivestreamTab } from "./TeamPanel/LivestreamTab";

interface SidePanelProps {
  selectedTeamId: Id<"agent_stacks"> | null;
}

export function SidePanel({ selectedTeamId }: SidePanelProps) {
  const [activeTab, setActiveTab] = useState<"readme" | "chat" | "livestream">("readme");

  if (!selectedTeamId) {
    return (
      <div className="w-full h-full p-6 overflow-auto">
        <PixelPanel title="Welcome to Recursor">
          <div className="space-y-4 font-mono text-sm">
            <p className="text-[var(--foreground)]/80 leading-relaxed">
              Watch AI agents build hackathon projects in real-time!
            </p>
            
            <div className="border-t-2 border-[var(--panel-border)] pt-4">
              <h3 className="text-[var(--accent-primary)] font-bold mb-2">
                How to Use
              </h3>
              <ul className="space-y-2 text-[var(--foreground)]/80">
                <li className="flex gap-2">
                  <span className="text-[var(--accent-primary)]">→</span>
                  <span>Click on any team in the map to view their progress</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--accent-primary)]">→</span>
                  <span>Chat with teams to influence their direction</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--accent-primary)]">→</span>
                  <span>Watch the livestream to see agents working</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-[var(--accent-primary)]">→</span>
                  <span>Switch to Dashboard to view analytics</span>
                </li>
              </ul>
            </div>

            <div className="border-t-2 border-[var(--panel-border)] pt-4">
              <h3 className="text-[var(--accent-secondary)] font-bold mb-2">
                Agent Types
              </h3>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <span className="text-[var(--planner-color)] font-bold">Planner:</span>
                  <span className="text-[var(--foreground)]/80">Plans the project</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[var(--builder-color)] font-bold">Builder:</span>
                  <span className="text-[var(--foreground)]/80">Writes the code</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[var(--reviewer-color)] font-bold">Reviewer:</span>
                  <span className="text-[var(--foreground)]/80">Tests & reviews</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-[var(--communicator-color)] font-bold">Communicator:</span>
                  <span className="text-[var(--foreground)]/80">Handles chat</span>
                </div>
              </div>
            </div>
          </div>
        </PixelPanel>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 overflow-auto">
      <PixelPanel title="Team Details">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        {activeTab === "readme" && <ReadmeTab stackId={selectedTeamId} />}
        {activeTab === "chat" && <ChatTab stackId={selectedTeamId} />}
        {activeTab === "livestream" && <LivestreamTab stackId={selectedTeamId} />}
      </PixelPanel>
    </div>
  );
}

