"use client";

import { useState } from "react";
import { LineChart, WeeklyTicks } from "@/components/charts/Charts";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateShort, todayISO } from "@/lib/dates";
import {
  RISK_META,
  actionMomentum,
  actionRate,
  churnRisk,
  completionRate,
  toPoints,
} from "@/lib/suivi";
import { labelForKey, type FormFieldDef } from "@/lib/forms";
import type { FollowupResponse } from "@/lib/types";

type Tab = "satisfaction" | "forme" | "actions";

// Section Suivi hebdo de la fiche client : stats, courbes d'évolution,
// passage à l'action semaine par semaine, historique des retours.
export function SuiviSection({
  followups,
  followupFields,
}: {
  followups: FollowupResponse[];
  followupFields: FormFieldDef[];
}) {
  const [tab, setTab] = useState<Tab>("satisfaction");
  const today = todayISO();
  const points = toPoints(followups);

  const rate = actionRate(points, today);
  const completion = completionRate(followups, today);
  const risk = churnRisk(followups, today);
  const lastSat = [...points].reverse().find((p) => p.satisfaction !== null);

  const shortLabel = (period: string) =>
    formatDateShort(period).replace(/^\S+\s/, ""); // "29 juin"
  const chartPoints = points.slice(-10).map((p) => ({
    label: shortLabel(p.period),
    value: tab === "satisfaction" ? p.satisfaction : p.forme,
  }));
  // Courbe d'élan : score cumulé (+1 action / -1 sans action)
  const momentum = actionMomentum(points).slice(-10);
  const momentumPoints = momentum.map((m) => ({
    label: shortLabel(m.period),
    value: m.value,
  }));
  const momentumMin = Math.min(0, ...momentum.map((m) => m.value)) - 1;
  const momentumMax = Math.max(1, ...momentum.map((m) => m.value)) + 1;
  const tickData = points.slice(-10).map((p) => ({
    label: shortLabel(p.period),
    done: p.actionsFaites,
  }));

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold">📊 Suivi hebdo</h2>
        <StatusBadge tone={RISK_META[risk.level].tone} label={RISK_META[risk.level].label} />
      </div>

      {followups.length === 0 ? (
        <p className="text-sm text-muted">
          Pas encore de retour hebdo — envoie-lui le lien de suivi (section
          Formulaires ci-dessous).
        </p>
      ) : (
        <>
          {/* Mini-stats */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            <MiniStat
              label="Passage à l'action"
              value={rate !== null ? `${rate}%` : "—"}
              tone={rate === null ? "gray" : rate >= 75 ? "green" : rate >= 50 ? "amber" : "red"}
            />
            <MiniStat
              label="Dernière satisfaction"
              value={lastSat ? `${lastSat.satisfaction}/5` : "—"}
              tone={
                !lastSat ? "gray" : lastSat.satisfaction! >= 4 ? "green" : lastSat.satisfaction! >= 3 ? "amber" : "red"
              }
            />
            <MiniStat
              label="Assiduité (4 sem.)"
              value={`${completion}%`}
              tone={completion >= 75 ? "green" : completion >= 50 ? "amber" : "red"}
            />
          </div>

          {/* Graphes */}
          <div className="mb-1 flex gap-1.5">
            {(
              [
                ["satisfaction", "Satisfaction"],
                ["forme", "Forme"],
                ["actions", "Passage à l'action"],
              ] as [Tab, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  tab === key
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border text-muted hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "actions" ? (
            <>
              {/* Courbe d'élan : monte s'il agit, descend s'il décroche */}
              <LineChart
                data={momentumPoints}
                min={momentumMin}
                max={momentumMax}
                color="var(--tone-green-fg)"
                formatValue={(v) => (v > 0 ? `+${v}` : String(v))}
              />
              <p className="mt-1 text-center text-[11px] text-muted">
                Élan cumulé : +1 par semaine où il passe à l&apos;action, −1 sinon
              </p>
              <div className="mt-1 border-t border-border/60 pt-2">
                <WeeklyTicks data={tickData} />
              </div>
            </>
          ) : (
            <LineChart
              data={chartPoints}
              min={1}
              max={tab === "satisfaction" ? 5 : 10}
            />
          )}

          {/* Historique détaillé */}
          <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
            Historique ({followups.length})
          </p>
          <div className="flex flex-col gap-2">
            {followups.map((f) => {
              const done = f.answers.actions_faites;
              return (
                <details
                  key={f.id}
                  className="rounded-lg border border-border/70 bg-background/50 p-3"
                >
                  <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                    Semaine du {formatDateShort(f.period)}
                    {done === "Oui" ? (
                      <StatusBadge tone="green" label="✓ actions faites" size="xs" />
                    ) : done === "Non" ? (
                      <StatusBadge tone="red" label="✗ pas d'action" size="xs" />
                    ) : null}
                  </summary>
                  <dl className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {Object.entries(f.answers)
                      .filter(([, v]) => v !== "")
                      .map(([key, value]) => (
                        <div key={key}>
                          <dt className="text-xs text-muted">
                            {labelForKey(followupFields, key)}
                          </dt>
                          <dd className="whitespace-pre-wrap text-sm">{String(value)}</dd>
                        </div>
                      ))}
                  </dl>
                </details>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "gray" | "green" | "amber" | "red";
}) {
  return (
    <div className="rounded-lg bg-background/50 px-2 py-2.5 text-center">
      <p
        className="glow-number text-lg font-bold"
        style={{ color: `var(--tone-${tone}-fg)` }}
      >
        {value}
      </p>
      <p className="text-[10px] text-muted">{label}</p>
    </div>
  );
}
