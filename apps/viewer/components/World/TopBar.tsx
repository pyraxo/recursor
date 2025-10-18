"use client";

import Link from "next/link";
import { PixelButton } from "../shared/PixelButton";
import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";

export function TopBar() {
  const stacks = useQuery(api.agents.listStacks);

  const elapsedTime = () => {
    if (!stacks || stacks.length === 0) return "00:00:00";
    
    const earliest = Math.min(...stacks.map((s) => s.created_at));
    const elapsed = Date.now() - earliest;
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full bg-[var(--panel-bg)] border-b-2 border-[var(--panel-border)] px-6 py-3 flex items-center justify-between shadow-[0_4px_0_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-mono font-bold text-[var(--accent-primary)] uppercase tracking-wider">
          Recursor
        </h1>
        <div className="flex items-center gap-2 text-sm font-mono">
          <span className="text-[var(--foreground)]">Time Elapsed:</span>
          <span className="text-[var(--accent-secondary)] font-bold tabular-nums">
            {elapsedTime()}
          </span>
        </div>
      </div>
      <Link href="/dashboard">
        <PixelButton variant="secondary">Dashboard</PixelButton>
      </Link>
    </div>
  );
}

