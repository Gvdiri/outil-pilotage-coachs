"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFormConfig } from "@/lib/actions/forms";
import { PageHeader } from "@/components/PageHeader";
import { FilterChip } from "@/components/FilterChip";
import { useToast } from "@/components/Toast";
import { Field, inputClass, PrimaryButton } from "@/components/FormModal";
import type { FormFieldDef } from "@/lib/forms";
import type { BuilderConfig } from "@/app/(app)/formulaires/page";

// Éditeur visuel des 2 formulaires clients : questions éditables,
// réordonnables, avec aperçu live à droite. Les clés des champs existants ne
// changent jamais (elles indexent l'historique des réponses).

const TYPE_LABELS: Record<FormFieldDef["type"], string> = {
  text: "Texte court",
  textarea: "Texte long",
  number: "Nombre",
  select: "Liste de choix",
  date: "Date",
};

function newKey(existing: Set<string>): string {
  let i = 1;
  while (existing.has(`question_${i}`)) i++;
  return `question_${i}`;
}

export function FormBuilder({
  initialConfigs,
  migrationMissing,
}: {
  initialConfigs: BuilderConfig[];
  migrationMissing: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [kind, setKind] = useState<"onboarding" | "suivi">("onboarding");
  const [configs, setConfigs] = useState(initialConfigs);
  const [dirty, setDirty] = useState(false);

  const config = configs.find((c) => c.kind === kind)!;

  function update(patch: Partial<BuilderConfig>) {
    setConfigs((cs) =>
      cs.map((c) => (c.kind === kind ? { ...c, ...patch } : c)),
    );
    setDirty(true);
  }

  function updateField(index: number, patch: Partial<FormFieldDef>) {
    update({
      fields: config.fields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    });
  }

  function moveField(index: number, dir: -1 | 1) {
    const to = index + dir;
    if (to < 0 || to >= config.fields.length) return;
    const fields = [...config.fields];
    [fields[index], fields[to]] = [fields[to], fields[index]];
    update({ fields });
  }

  function removeField(index: number) {
    const f = config.fields[index];
    if (
      !window.confirm(
        `Supprimer la question « ${f.label} » ?\nLes réponses déjà reçues restent conservées dans les fiches.`,
      )
    )
      return;
    update({ fields: config.fields.filter((_, i) => i !== index) });
  }

  function addField() {
    const keys = new Set(config.fields.map((f) => f.key));
    update({
      fields: [
        ...config.fields,
        { key: newKey(keys), label: "Nouvelle question", type: "text", required: false },
      ],
    });
  }

  function save() {
    startTransition(async () => {
      const res = await saveFormConfig(kind, {
        title: config.title,
        description: config.description,
        fields: config.fields,
      });
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Formulaire enregistré — les liens clients sont à jour ✓");
        setDirty(false);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <PageHeader
        title="Formulaires clients"
        subtitle="Modifie les questions : les liens envoyés aux clients sont mis à jour instantanément, sans casser l'historique."
        action={
          <PrimaryButton type="button" onClick={save} disabled={isPending || !dirty}>
            {isPending ? "Enregistrement…" : dirty ? "Enregistrer" : "Enregistré ✓"}
          </PrimaryButton>
        }
      />

      {migrationMissing ? (
        <p className="mb-4 rounded-lg bg-[var(--tone-amber-bg)] px-3 py-2 text-sm text-[var(--tone-amber-fg)]">
          ⚠ La migration <code>supabase/migrations/0002_upgrade_v2.sql</code>{" "}
          n&apos;a pas encore été exécutée : l&apos;enregistrement échouera tant
          qu&apos;elle n&apos;est pas passée dans le SQL Editor.
        </p>
      ) : null}

      <div className="mb-4 flex gap-1.5">
        <FilterChip
          active={kind === "onboarding"}
          onClick={() => setKind("onboarding")}
          label="📋 Onboarding"
        />
        <FilterChip
          active={kind === "suivi"}
          onClick={() => setKind("suivi")}
          label="📊 Suivi hebdo"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Éditeur */}
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <Field label="Titre (interne)">
              <input
                className={inputClass}
                value={config.title}
                onChange={(e) => update({ title: e.target.value })}
              />
            </Field>
            <div className="mt-3">
              <Field label="Texte d'introduction (vu par le client)">
                <textarea
                  rows={2}
                  className={inputClass}
                  value={config.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </Field>
            </div>
          </div>

          {config.fields.map((f, i) => (
            <div key={f.key} className="rounded-xl border border-border bg-surface p-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1">
                  <button
                    onClick={() => moveField(i, -1)}
                    disabled={i === 0}
                    className="rounded px-1 text-xs text-muted hover:bg-background disabled:opacity-30"
                    title="Monter"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveField(i, 1)}
                    disabled={i === config.fields.length - 1}
                    className="rounded px-1 text-xs text-muted hover:bg-background disabled:opacity-30"
                    title="Descendre"
                  >
                    ▼
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    className={`${inputClass} font-medium`}
                    value={f.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                    placeholder="Intitulé de la question"
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <select
                      className={`${inputClass} w-auto text-xs`}
                      value={f.type}
                      onChange={(e) =>
                        updateField(i, {
                          type: e.target.value as FormFieldDef["type"],
                          ...(e.target.value === "select" && !f.options
                            ? { options: ["Option 1", "Option 2"] }
                            : {}),
                        })
                      }
                    >
                      {Object.entries(TYPE_LABELS).map(([t, label]) => (
                        <option key={t} value={t}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted">
                      <input
                        type="checkbox"
                        checked={!!f.required}
                        onChange={(e) => updateField(i, { required: e.target.checked })}
                      />
                      Obligatoire
                    </label>
                    <button
                      onClick={() => removeField(i)}
                      className="ml-auto text-xs text-danger underline-offset-2 hover:underline"
                    >
                      Supprimer
                    </button>
                  </div>
                  {f.type === "select" ? (
                    <div className="mt-2">
                      <input
                        className={`${inputClass} text-xs`}
                        value={(f.options ?? []).join(", ")}
                        onChange={(e) =>
                          updateField(i, { options: e.target.value.split(",").map((o) => o.trimStart()) })
                        }
                        placeholder="Options séparées par des virgules : Oui, Non"
                      />
                    </div>
                  ) : null}
                  {f.type !== "select" && f.type !== "date" ? (
                    <div className="mt-2">
                      <input
                        className={`${inputClass} text-xs`}
                        value={f.placeholder ?? ""}
                        onChange={(e) => updateField(i, { placeholder: e.target.value })}
                        placeholder="Texte d'exemple affiché dans le champ (optionnel)"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addField}
            className="rounded-xl border border-dashed border-border bg-surface/50 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary-soft"
          >
            + Ajouter une question
          </button>
        </div>

        {/* Aperçu live */}
        <div className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Aperçu — ce que verra le client
          </p>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-bold">
              {kind === "onboarding" ? "Bienvenue Julien 👋" : "Ton suivi de la semaine, Julien 💪"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              {config.description}
            </p>
            <div className="mt-5 flex flex-col gap-4">
              {config.fields.map((f) => (
                <Field key={f.key} label={f.label} required={f.required}>
                  {f.type === "textarea" ? (
                    <textarea rows={2} disabled className={inputClass} placeholder={f.placeholder} />
                  ) : f.type === "select" ? (
                    <select disabled className={inputClass}>
                      <option>Choisir…</option>
                      {(f.options ?? []).map((o, j) => (
                        <option key={j}>{o}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      disabled
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      className={inputClass}
                      placeholder={f.placeholder}
                    />
                  )}
                </Field>
              ))}
              <span className="pointer-events-none inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white opacity-70">
                {kind === "onboarding" ? "Envoyer mes réponses" : "Envoyer mon suivi"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
