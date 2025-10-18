"use client";

import { AdminDashboard } from "./AdminDashboard";

export function AdminTab({
  onNavigateToTeam,
}: {
  onNavigateToTeam?: (stackId: string) => void;
}) {
  return <AdminDashboard onNavigateToTeam={onNavigateToTeam} />;
}
