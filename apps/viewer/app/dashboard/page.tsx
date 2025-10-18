"use client";

import { LeaderboardTable } from "../../components/Dashboard/LeaderboardTable";
import { MetricsBar } from "../../components/Dashboard/MetricsBar";
import { ProgressChart } from "../../components/Dashboard/ProgressChart";
import { TopBar } from "../../components/World/TopBar";

export default function DashboardScreen() {
  return (
    <div className="h-screen flex flex-col bg-background">
      <TopBar />

      <div className="flex-1 overflow-auto">
        <div className="max-w-[1400px] mx-auto p-8 space-y-8">
          <MetricsBar />

          <div className="grid gap-8 lg:grid-cols-2">
            <LeaderboardTable />

            <ProgressChart />
          </div>
        </div>
      </div>
    </div>
  );
}
