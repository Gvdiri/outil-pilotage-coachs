"use client";

// Puce de filtre réutilisable (statuts, priorités, types…).
export function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-surface text-muted hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
