"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PixelButton } from "../shared/PixelButton";
import { useQuery } from "convex/react";
import { api } from "@recursor/convex/_generated/api";

export function TopBar() {
  const stacks = useQuery(api.agents.listStacks);
  const pathname = usePathname();

  const elapsedTime = () => {
    if (!stacks || stacks.length === 0) return "00:00:00";
    
    const earliest = Math.min(...stacks.map((s) => s.created_at));
    const elapsed = Date.now() - earliest;
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const isWorldView = pathname === "/";
  const isDashboard = pathname === "/dashboard";

  return (
    <div 
      className="w-full bg-[var(--panel-bg)] border-b-2 border-[var(--panel-border)] flex items-center shadow-[0_4px_0_rgba(0,0,0,0.5)]"
      style={{ paddingLeft: "48px", paddingRight: "48px", paddingTop: "24px", paddingBottom: "24px", display: "grid", gridTemplateColumns: "1fr auto 1fr" }}
    >
      <div className="flex items-center">
        <h1 className="text-4xl font-mono font-bold text-[var(--accent-primary)] tracking-wide">
          Re<span className="text-[var(--accent-secondary)]">Cursor</span>
        </h1>
      </div>
      
      <div className="flex items-center gap-3 bg-[var(--background)] border-2 border-[var(--panel-border)] rounded-xl p-2" style={{ boxShadow: "inset 0 2px 8px rgba(0,0,0,0.3)" }}>
        <Link href="/">
          <button
            className={`font-mono font-bold text-base rounded-lg transition-all duration-200 ${
              isWorldView
                ? "text-[var(--background)]"
                : "bg-[var(--panel-bg)] text-[var(--foreground)]/50 hover:text-[var(--foreground)]/70"
            }`}
            style={
              isWorldView
                ? {
                    background: "linear-gradient(145deg, #00d435, #00ff41)",
                    boxShadow: "inset 3px 3px 6px rgba(0,0,0,0.4), inset -2px -2px 4px rgba(0,255,65,0.2)",
                    padding: "12px 36px",
                    transform: "translateY(2px)"
                  }
                : {
                    boxShadow: "2px 2px 4px rgba(0,0,0,0.2)",
                    padding: "12px 36px"
                  }
            }
          >
            World View
          </button>
        </Link>
        <Link href="/dashboard">
          <button
            className={`font-mono font-bold text-base rounded-lg transition-all duration-200 ${
              isDashboard
                ? "text-[var(--background)]"
                : "bg-[var(--panel-bg)] text-[var(--foreground)]/50 hover:text-[var(--foreground)]/70"
            }`}
            style={
              isDashboard
                ? {
                    background: "linear-gradient(145deg, #00a8cc, #00d4ff)",
                    boxShadow: "inset 3px 3px 6px rgba(0,0,0,0.4), inset -2px -2px 4px rgba(0,212,255,0.2)",
                    padding: "12px 36px",
                    transform: "translateY(2px)"
                  }
                : {
                    boxShadow: "2px 2px 4px rgba(0,0,0,0.2)",
                    padding: "12px 36px"
                  }
            }
          >
            Dashboard
          </button>
        </Link>
      </div>

      <div className="flex items-center justify-end gap-3 text-base font-mono">
        <span className="text-[var(--foreground)]/80">Time Elapsed:</span>
        <span className="text-[var(--accent-secondary)] font-bold tabular-nums text-lg">
          {elapsedTime()}
        </span>
      </div>
    </div>
  );
}

