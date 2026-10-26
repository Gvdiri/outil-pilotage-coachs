"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bumpProspecting } from "@/lib/actions/prospecting";
import { useToast } from "@/components/Toast";
import { addDaysISO, todayISO } from "@/lib/dates";
import type { ProspectingDay } from "@/lib/types";

// Tracker de prospection quotidien : compteurs DM / Appels / Closings avec
// +/- rapides, et les VRAIS ratios (taux de closing = closings ÷ appels).
export function ProspectingTracker({ days }: { days: ProspectingDay[] }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const today = todayISO();
  const todayRow = days.find((d) => d.date === today);
  const dm = todayRow?.dm ?? 0;
  const calls = todayRow?.calls ?? 0;
  const closings = todayRow?.closings ?? 0;

  // Cumuls 7 derniers jours
  const stats = useMemo(() => {
    const since = addDaysISO(today, -6);
    const week = days.filter((d) => d.date >= since);
    const sum = (f: "dm" | "calls" | "closings") =>
      week.reduce((s, d) => s + d[f], 0);
    const wDm = sum("dm"), wCalls = sum("calls"), wClos = sum("closings");
    return {
      wDm,
      wCalls,
      wClos,
      closingRate: wCalls > 0 ? Math.round((wClos / wCalls) * 100) : null,
      callsPerClosing: wClos > 0 ? Math.round(wCalls / wClos) : null,
    };
  }, [days, today]);

  function bump(field: "dm" | "calls" | "closings", delta: number) {
    startTransition(async () => {
      const res = await bumpProspecting(field, delta);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else router.refresh();
    });
  }

  const counters: { key: "dm" | "calls" | "closings"; label: string; value: number; emoji: string }[] = [
    { key: "dm", label: "DM / outbound", value: dm, emoji: "✉️" },
    { key: "calls", label: "Appels", value: calls, emoji: "📞" },
    { key: "closings", label: "Closings", value: closings, emoji: "🤝" },
  ];

  return (
    <section className="mb-4 rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">🎯 Prospection du jour</h2>
        <span className="text-xs text-muted">Aujourd&apos;hui</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {counters.map((c) => (
          <div key={c.key} className="rounded-lg bg-background/60 p-2 text-center">
            <p className="text-[11px] text-muted">{c.emoji} {c.label}</p>
            <p className="glow-number my-1 text-2xl font-bold">{c.value}</p>
            <div className="flex items-center justify-center gap-1.5">
              <button
                onClick={() => bump(c.key, -1)}
                disabled={isPending || c.value === 0}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-sm font-bold text-muted hover:bg-surface disabled:opacity-30"
              >
                −
              </button>
              <button
                onClick={() => bump(c.key, 1)}
                disabled={isPending}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Vrais ratios sur 7 jours */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border/60 pt-3 text-xs">
        <span className="text-muted">
          7 jours : <strong className="text-foreground">{stats.wDm}</strong> DM ·{" "}
          <strong className="text-foreground">{stats.wCalls}</strong> appels ·{" "}
          <strong className="text-foreground">{stats.wClos}</strong> closings
        </span>
        <span
          style={{
            color:
              stats.closingRate === null
                ? "var(--muted)"
                : stats.closingRate >= 30
                  ? "var(--tone-green-fg)"
                  : "var(--tone-amber-fg)",
          }}
        >
          Taux de closing réel :{" "}
          <strong>{stats.closingRate !== null ? `${stats.closingRate}%` : "—"}</strong>
          {stats.callsPerClosing ? (
            <span className="text-muted"> ({stats.callsPerClosing} appels / closing)</span>
          ) : null}
        </span>
      </div>
    </section>
  );
}
