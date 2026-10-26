"use client";

import { useState } from "react";
import type { FormFieldDef } from "@/lib/forms";
import { Field, inputClass, PrimaryButton } from "@/components/FormModal";

// Formulaire public générique (onboarding + suivi) : rend les champs déclarés,
// poste en JSON vers l'API publique, affiche une confirmation simple.

export function PublicForm({
  title,
  intro,
  fields,
  endpoint,
  token,
  submitLabel,
  alreadyFilledAt = null,
}: {
  title: string;
  intro: string;
  fields: FormFieldDef[];
  endpoint: string;
  token: string;
  submitLabel: string;
  alreadyFilledAt?: string | null;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function setValue(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers: values }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Une erreur est survenue. Réessaie.");
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError("Connexion impossible. Vérifie ton réseau et réessaie.");
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <span className="text-4xl">✅</span>
        <h1 className="mt-3 text-lg font-bold">Merci, c&apos;est envoyé !</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Tes réponses ont bien été transmises à ton coach. Tu peux fermer
          cette page.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-1.5 text-sm leading-relaxed text-muted">{intro}</p>

      {alreadyFilledAt ? (
        <p className="mt-4 rounded-lg bg-[var(--tone-green-bg)] px-3 py-2.5 text-sm text-[var(--tone-green-fg)]">
          ✓ Tu as déjà rempli ce questionnaire le{" "}
          {new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "long",
          }).format(new Date(alreadyFilledAt))}
          . Si tu le renvoies, tes nouvelles réponses remplaceront les
          précédentes.
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} required={f.required}>
            {f.type === "textarea" ? (
              <textarea
                rows={3}
                required={f.required}
                className={inputClass}
                placeholder={f.placeholder}
                value={values[f.key] ?? ""}
                onChange={(e) => setValue(f.key, e.target.value)}
              />
            ) : f.type === "select" ? (
              <select
                required={f.required}
                className={inputClass}
                value={values[f.key] ?? ""}
                onChange={(e) => setValue(f.key, e.target.value)}
              >
                <option value="" disabled>
                  Choisir…
                </option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                required={f.required}
                className={inputClass}
                placeholder={f.placeholder}
                value={values[f.key] ?? ""}
                onChange={(e) => setValue(f.key, e.target.value)}
              />
            )}
          </Field>
        ))}

        {error ? (
          <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <PrimaryButton disabled={submitting}>
          {submitting ? "Envoi…" : submitLabel}
        </PrimaryButton>
      </form>
    </div>
  );
}
