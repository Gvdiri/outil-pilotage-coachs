import Link from "next/link";
import type { BadgeTone } from "@/lib/types";

const ACCENT: Record<BadgeTone, string> = {
  gray: "var(--tone-gray-fg)",
  blue: "var(--tone-blue-fg)",
  cyan: "var(--tone-cyan-fg)",
  violet: "var(--tone-violet-fg)",
  amber: "var(--tone-amber-fg)",
  orange: "var(--tone-orange-fg)",
  red: "var(--tone-red-fg)",
  green: "var(--tone-green-fg)",
};

// Compteur du Dashboard : un chiffre, un libellé, une couleur, un lien.
export function StatCard({
  label,
  value,
  sub,
  tone = "gray",
  href,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: BadgeTone;
  href?: string;
}) {
  const inner = (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-shadow hover:shadow-sm">
      <p className="text-xs font-medium text-muted">{label}</p>
      <div className="mt-1">
        <p className="glow-number text-2xl font-bold" style={{ color: ACCENT[tone] }}>
          {value}
        </p>
        {sub ? <p className="mt-0.5 text-xs text-muted">{sub}</p> : null}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
