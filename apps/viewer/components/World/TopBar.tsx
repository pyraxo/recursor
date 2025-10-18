"use client";

import { api } from "@recursor/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
      className="w-full bg-card border-b-2 border-border flex items-center shadow-sm"
      style={{
        paddingLeft: "48px",
        paddingRight: "48px",
        paddingTop: "24px",
        paddingBottom: "24px",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
      }}
    >
      <div className="flex items-center">
        <h1 className="text-4xl font-mono font-bold text-primary tracking-wide">
          Re<span className="text-primary">Cursor</span>
        </h1>
      </div>

      <div className="flex items-center gap-3 bg-muted border-2 border-border rounded-xl p-2">
        <Link href="/">
          <button
            className={`font-mono font-bold text-base rounded-lg transition-all duration-200 ${
              isWorldView
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
            style={{
              padding: "12px 36px",
            }}
          >
            World View
          </button>
        </Link>
        <Link href="/dashboard">
          <button
            className={`font-mono font-bold text-base rounded-lg transition-all duration-200 ${
              isDashboard
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:text-foreground"
            }`}
            style={{
              padding: "12px 36px",
            }}
          >
            Dashboard
          </button>
        </Link>
      </div>

      <div className="flex items-center justify-end gap-3 text-base font-mono">
        <span className="text-foreground">Time Elapsed:</span>
        <span className="text-primary font-bold tabular-nums text-lg">
          {elapsedTime()}
        </span>
      </div>
    </div>
  );
}
