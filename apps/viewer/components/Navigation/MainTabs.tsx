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
    <div className="flex gap-1 bg-card border-b-2 border-border px-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider transition-all ${
            activeTab === tab.id
              ? "bg-primary text-primary-foreground border-2 border-primary border-b-0"
              : "bg-transparent text-muted-foreground border-2 border-transparent hover:text-primary hover:bg-primary/10"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
