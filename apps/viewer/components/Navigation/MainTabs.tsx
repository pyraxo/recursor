"use client";

export type TabType = "world" | "messages" | "admin" | "observability";

interface MainTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function MainTabs({ activeTab, onTabChange }: MainTabsProps) {
  const tabs: { id: TabType; label: string }[] = [
    { id: "world", label: "World" },
    { id: "messages", label: "Messages" },
    { id: "admin", label: "Admin" },
    { id: "observability", label: "Observability" },
  ];

  return (
    <div className="flex gap-1 bg-[var(--panel-bg)] border-b-2 border-[var(--panel-border)] px-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === tab.id
              ? "bg-[var(--accent-primary)] text-[var(--background)] border-2 border-[var(--accent-primary)] border-b-0 translate-y-[2px] shadow-[0_-2px_0_rgba(0,255,135,0.5)]"
              : "bg-transparent text-[var(--foreground)]/70 border-2 border-transparent hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
