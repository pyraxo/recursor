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
    <div className="flex gap-1 border-b-2 border-border mb-4">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-bold transition-all ${
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
