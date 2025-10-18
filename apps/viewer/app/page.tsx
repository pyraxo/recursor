"use client";

import { useState } from "react";
import { Id } from "@recursor/convex/_generated/dataModel";
import { TopBar } from "../components/World/TopBar";
import { WorldMap } from "../components/World/WorldMap";
import { SidePanel } from "../components/World/SidePanel";

export default function WorldScreen() {
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"agent_stacks"> | null>(null);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <TopBar />
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          <WorldMap
            selectedTeamId={selectedTeamId}
            onSelectTeam={setSelectedTeamId}
          />
        </div>
        
        <div className="w-[480px] border-l-2 border-[var(--panel-border)] bg-[var(--panel-bg)] overflow-auto">
          <SidePanel selectedTeamId={selectedTeamId} />
        </div>
      </div>
    </div>
  );
}

