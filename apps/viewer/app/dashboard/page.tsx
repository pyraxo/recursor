"use client";

import Link from "next/link";
import { PixelButton } from "../../components/shared/PixelButton";
import { MetricsBar } from "../../components/Dashboard/MetricsBar";
import { LeaderboardTable } from "../../components/Dashboard/LeaderboardTable";
import { ProgressChart } from "../../components/Dashboard/ProgressChart";

export default function DashboardScreen() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="w-full bg-[var(--panel-bg)] border-b-2 border-[var(--panel-border)] px-6 py-3 flex items-center justify-between shadow-[0_4px_0_rgba(0,0,0,0.5)]">
        <h1 className="text-xl font-mono font-bold text-[var(--accent-primary)] uppercase tracking-wider">
          Dashboard
        </h1>
        <Link href="/">
          <PixelButton variant="secondary">World View</PixelButton>
        </Link>
      </div>

      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        <MetricsBar />
        
        <LeaderboardTable />
        
        <ProgressChart />
      </div>
    </div>
  );
}

