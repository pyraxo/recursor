import { ReactNode } from "react";

interface PixelPanelProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function PixelPanel({ children, className = "", title }: PixelPanelProps) {
  return (
    <div className={`pixel-panel ${className}`}>
      {title && (
        <div className="mb-4 pb-2 border-b-2 border-[var(--panel-border)]">
          <h2 className="text-lg font-mono text-[var(--accent-primary)] uppercase tracking-wider">
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  );
}

