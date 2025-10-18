"use client";

import { TopBar } from "../../components/World/TopBar";
import { MetricsBar } from "../../components/Dashboard/MetricsBar";
import { LeaderboardTable } from "../../components/Dashboard/LeaderboardTable";
import { ProgressChart } from "../../components/Dashboard/ProgressChart";

export default function DashboardScreen() {
  return (
    <div className="h-screen flex flex-col bg-[var(--background)]">
      <TopBar />
      
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-6 space-y-6">
          <MetricsBar />
          
          <LeaderboardTable />
          
          <ProgressChart />
        </div>
      </div>
    </div>
  );
}

