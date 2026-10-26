import type { BadgeTone } from "@/lib/types";

// LE composant de badge unique : toutes les couleurs de statut de l'app
// passent par lui (cohérence visuelle globale).

const TONE_STYLES: Record<BadgeTone, string> = {
  gray: "bg-[var(--tone-gray-bg)] text-[var(--tone-gray-fg)]",
  blue: "bg-[var(--tone-blue-bg)] text-[var(--tone-blue-fg)]",
  cyan: "bg-[var(--tone-cyan-bg)] text-[var(--tone-cyan-fg)]",
  violet: "bg-[var(--tone-violet-bg)] text-[var(--tone-violet-fg)]",
  amber: "bg-[var(--tone-amber-bg)] text-[var(--tone-amber-fg)]",
  orange: "bg-[var(--tone-orange-bg)] text-[var(--tone-orange-fg)]",
  red: "bg-[var(--tone-red-bg)] text-[var(--tone-red-fg)]",
  green: "bg-[var(--tone-green-bg)] text-[var(--tone-green-fg)]",
};

export function StatusBadge({
  tone,
  label,
  size = "sm",
}: {
  tone: BadgeTone;
  label: string;
  size?: "xs" | "sm";
}) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full font-medium ${
        size === "xs" ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs"
      } ${TONE_STYLES[tone]}`}
    >
      {label}
    </span>
  );
}

/** Petite pastille ronde colorée (assigné Alex/Sam, plateformes...). */
export function Dot({ tone }: { tone: BadgeTone }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${TONE_STYLES[tone].split(" ")[0]}`}
      style={{ backgroundColor: `var(--tone-${tone}-fg)` }}
    />
  );
}

/** Pastille avec initiale (avatar minimal de l'assigné). */
export function AssigneeChip({
  tone,
  name,
}: {
  tone: BadgeTone;
  name: string;
}) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${TONE_STYLES[tone]}`}
      title={name}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
