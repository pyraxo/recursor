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
        <div className="mb-4 pb-2 border-b-2 border-border">
          <h2 className="text-lg text-primary uppercase tracking-wider font-bold">
            {title}
          </h2>
        </div>
      )}
      {children}
    </div>
  );
}

