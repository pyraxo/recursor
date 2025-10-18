"use client";

import { AdminDashboard } from "./AdminDashboard";

export function AdminTab() {
  // Note: Navigation to observability view is handled by the main app's tab system
  // The onNavigateToTeam callback could be enhanced to switch tabs + set selected team
  return <AdminDashboard />;
}
