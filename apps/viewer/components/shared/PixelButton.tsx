import { ButtonHTMLAttributes, ReactNode } from "react";

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

export function PixelButton({
  variant = "primary",
  children,
  className = "",
  ...props
}: PixelButtonProps) {
  const baseStyles =
    "px-4 py-2 font-mono text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyles = {
    primary:
      "bg-[var(--accent-primary)] text-[var(--foreground)] border-2 border-[var(--accent-primary)] hover:bg-transparent hover:text-[var(--accent-primary)] shadow-[3px_3px_0_rgba(0,0,0,0.5)]",
    secondary:
      "bg-transparent text-[var(--accent-secondary)] border-2 border-[var(--accent-secondary)] hover:bg-[var(--accent-secondary)] hover:text-[var(--foreground)] shadow-[3px_3px_0_rgba(0,0,0,0.5)]",
    ghost:
      "bg-transparent text-[var(--foreground)] border-2 border-[var(--panel-border)] hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)] shadow-[2px_2px_0_rgba(0,0,0,0.3)]",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

