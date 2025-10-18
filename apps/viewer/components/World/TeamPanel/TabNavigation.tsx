"use client";

interface TabNavigationProps {
  activeTab: "readme" | "chat" | "livestream";
  onTabChange: (tab: "readme" | "chat" | "livestream") => void;
}

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const tabs = [
    { id: "readme" as const, label: "README" },
    { id: "chat" as const, label: "Chat" },
    { id: "livestream" as const, label: "Livestream" },
  ];

  return (
    <div className="flex gap-1 border-b-2 border-[var(--panel-border)] mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 font-mono text-sm transition-all ${
            activeTab === tab.id
              ? "bg-[var(--accent-primary)] text-[var(--background)] border-2 border-[var(--accent-primary)] border-b-0 translate-y-[2px]"
              : "bg-transparent text-[var(--foreground)]/70 border-2 border-transparent hover:text-[var(--accent-primary)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

