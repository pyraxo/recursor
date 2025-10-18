"use client";

import { useState } from "react";
import { Id } from "@recursor/convex/_generated/dataModel";
import { TopBar } from "../components/World/TopBar";
import { WorldMap } from "../components/World/WorldMap";
import { SidePanel } from "../components/World/SidePanel";
import { MainTabs, TabType } from "../components/Navigation/MainTabs";
import { MessagesTab } from "../components/Messages/MessagesTab";
import { AdminTab } from "../components/Admin/AdminTab";
import { ObservabilityTab } from "../components/Observability/ObservabilityTab";

export default function WorldScreen() {
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"agent_stacks"> | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("world");

  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
      <TopBar />
      <MainTabs activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 min-h-0 flex">
        {activeTab === "world" && (
          <>
            <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
              <WorldMap
                selectedTeamId={selectedTeamId}
                onSelectTeam={setSelectedTeamId}
              />
            </div>

            <div className="w-[480px] flex-shrink-0 border-l-2 border-[var(--panel-border)] bg-[var(--panel-bg)] overflow-y-auto overflow-x-hidden">
              <SidePanel selectedTeamId={selectedTeamId} />
            </div>
          </>
        )}

        {activeTab === "messages" && <MessagesTab />}
        {activeTab === "admin" && <AdminTab />}
        {activeTab === "observability" && <ObservabilityTab />}
      </div>
    </div>
  );
}

