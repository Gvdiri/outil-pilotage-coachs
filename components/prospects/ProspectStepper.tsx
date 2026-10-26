"use client";

// Parcours de closing : stepper horizontal cliquable (pattern Pipedrive/HubSpot).
// Un clic sur une étape = changement de statut ; la dernière étape convertit
// en client. "No-show" et "Perdu" sont gérés à part (états de sortie).

import type { ProspectStatus } from "@/lib/types";

const STEPS: { key: ProspectStatus; label: string }[] = [
  { key: "nouveau", label: "Nouveau" },
  { key: "contacte", label: "Contacté" },
  { key: "en_conversation", label: "En conversation" },
  { key: "rdv_pris", label: "RDV pris" },
  { key: "gagne", label: "Closé ✓" },
];

const ORDER: Partial<Record<ProspectStatus, number>> = {
  nouveau: 0,
  contacte: 1,
  en_conversation: 2,
  rdv_pris: 3,
  gagne: 4,
  // no_show : revient visuellement au niveau "RDV pris"
  no_show: 3,
};

export function ProspectStepper({
  status,
  disabled,
  onStep,
}: {
  status: ProspectStatus;
  disabled: boolean;
  onStep: (to: ProspectStatus) => void;
}) {
  const current = ORDER[status] ?? -1; // perdu -> -1 : rien d'atteint
  const isLost = status === "perdu";

  return (
    <div className={`kanban-scroll overflow-x-auto ${isLost ? "opacity-50" : ""}`}>
      <div className="flex min-w-max items-center py-1">
        {STEPS.map((step, i) => {
          const reached = i <= current;
          const isCurrent = i === current && status !== "no_show";
          const isWin = step.key === "gagne";
          return (
            <div key={step.key} className="flex items-center">
              {i > 0 ? (
                <span
                  className="h-0.5 w-6 sm:w-10"
                  style={{
                    backgroundColor: reached ? "var(--primary)" : "var(--border)",
                  }}
                />
              ) : null}
              <button
                disabled={disabled || isLost}
                onClick={() => onStep(step.key)}
                title={
                  isWin
                    ? "Marquer comme closé et convertir en client"
                    : `Passer à « ${step.label} »`
                }
                className={`flex flex-col items-center gap-1 px-1.5 transition-opacity disabled:cursor-not-allowed ${
                  disabled ? "" : "hover:opacity-80"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isCurrent ? "ring-2 ring-offset-2 ring-offset-[var(--surface)]" : ""
                  }`}
                  style={{
                    backgroundColor: reached
                      ? isWin
                        ? "var(--tone-green-fg)"
                        : "var(--primary)"
                      : "var(--tone-gray-bg)",
                    color: reached ? "#fff" : "var(--muted)",
                    ...(isCurrent
                      ? ({ "--tw-ring-color": "var(--primary)" } as React.CSSProperties)
                      : {}),
                  }}
                >
                  {reached && !isCurrent ? "✓" : i + 1}
                </span>
                <span
                  className={`whitespace-nowrap text-[11px] ${
                    isCurrent ? "font-bold" : "text-muted"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
