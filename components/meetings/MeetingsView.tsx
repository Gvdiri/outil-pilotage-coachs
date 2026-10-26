"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createMeeting,
  deleteMeeting,
  updateMeeting,
} from "@/lib/actions/meetings";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/components/Toast";
import {
  Field,
  FormModal,
  inputClass,
  PrimaryButton,
  SecondaryButton,
} from "@/components/FormModal";
import { formatDateShort, todayISO } from "@/lib/dates";
import type { Meeting } from "@/lib/types";

/** Découpe un bloc de texte en items (une ligne = une action). */
function splitItems(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

export function MeetingsView({
  initialMeetings,
}: {
  initialMeetings: Meeting[];
}) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);

  return (
    <div>
      <PageHeader
        title="Réunions hebdo"
        subtitle="Objectifs, décisions, problèmes et actions — semaine par semaine"
        action={
          <PrimaryButton type="button" onClick={() => setCreating(true)}>
            + Réunion
          </PrimaryButton>
        }
      />

      {initialMeetings.length === 0 ? (
        <EmptyState
          icon="🗓️"
          title="Aucun compte-rendu"
          hint="Ajoute le compte-rendu de votre prochaine réunion hebdo."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {initialMeetings.map((m) => (
            <MeetingCard key={m.id} meeting={m} onEdit={() => setEditing(m)} />
          ))}
        </div>
      )}

      {creating ? <MeetingFormModal onClose={() => setCreating(false)} /> : null}
      {editing ? (
        <MeetingFormModal meeting={editing} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}

function MeetingCard({
  meeting,
  onEdit,
}: {
  meeting: Meeting;
  onEdit: () => void;
}) {
  const actions = splitItems(meeting.action_items);

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold capitalize">
          Réunion du {formatDateShort(meeting.date)}
        </h2>
        <button
          onClick={onEdit}
          className="text-xs font-medium text-primary hover:underline"
        >
          Modifier
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <MeetingSection emoji="🎯" title="Objectifs" text={meeting.objectives} />
        <MeetingSection emoji="✅" title="Décisions" text={meeting.decisions} />
        <MeetingSection emoji="⚠️" title="Problèmes" text={meeting.problems} />
        <div>
          <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
            🚀 Actions à réaliser
          </p>
          {actions.length === 0 ? (
            <p className="text-sm text-muted">—</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="min-w-0 flex-1">{a}</span>
                  <Link
                    href={`/taches?nouvelle=1&titre=${encodeURIComponent(a)}`}
                    className="shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary-soft"
                    title="Créer une tâche pré-remplie depuis cette action"
                  >
                    + tâche
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function MeetingSection({
  emoji,
  title,
  text,
}: {
  emoji: string;
  title: string;
  text: string | null;
}) {
  const items = splitItems(text);
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
        {emoji} {title}
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">—</p>
      ) : (
        <ul className="flex list-disc flex-col gap-1 pl-4 text-sm">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MeetingFormModal({
  meeting,
  onClose,
}: {
  meeting?: Meeting;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(meeting?.date ?? todayISO());
  const [objectives, setObjectives] = useState(meeting?.objectives ?? "");
  const [decisions, setDecisions] = useState(meeting?.decisions ?? "");
  const [problems, setProblems] = useState(meeting?.problems ?? "");
  const [actionItems, setActionItems] = useState(meeting?.action_items ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const input = {
      date,
      objectives: objectives.trim() || null,
      decisions: decisions.trim() || null,
      problems: problems.trim() || null,
      action_items: actionItems.trim() || null,
    };
    startTransition(async () => {
      const res = meeting
        ? await updateMeeting(meeting.id, input)
        : await createMeeting(input);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast(meeting ? "Compte-rendu mis à jour" : "Compte-rendu créé");
        onClose();
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!meeting) return;
    if (!window.confirm("Supprimer ce compte-rendu ?")) return;
    startTransition(async () => {
      const res = await deleteMeeting(meeting.id);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Compte-rendu supprimé");
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <FormModal
      open
      wide
      title={meeting ? "Modifier le compte-rendu" : "Nouvelle réunion"}
      onClose={onClose}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Date de la réunion" required>
          <input
            type="date"
            required
            className={`${inputClass} max-w-48`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="🎯 Objectifs (un par ligne)">
            <textarea rows={4} className={inputClass} value={objectives} onChange={(e) => setObjectives(e.target.value)} />
          </Field>
          <Field label="✅ Décisions (une par ligne)">
            <textarea rows={4} className={inputClass} value={decisions} onChange={(e) => setDecisions(e.target.value)} />
          </Field>
          <Field label="⚠️ Problèmes rencontrés">
            <textarea rows={4} className={inputClass} value={problems} onChange={(e) => setProblems(e.target.value)} />
          </Field>
          <Field label="🚀 Actions à réaliser (une par ligne)">
            <textarea
              rows={4}
              className={inputClass}
              value={actionItems}
              onChange={(e) => setActionItems(e.target.value)}
              placeholder={"Alex : réécrire le script\nSam : monter la vidéo"}
            />
          </Field>
        </div>
        <p className="text-xs text-muted">
          💡 Chaque ligne d&apos;« Actions à réaliser » aura un bouton « + tâche »
          pour créer une tâche pré-remplie.
        </p>
        <div className="flex items-center justify-end gap-2">
          {meeting ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={isPending}
              className="mr-auto text-sm font-medium text-danger hover:underline"
            >
              Supprimer
            </button>
          ) : null}
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton disabled={isPending}>
            {isPending ? "Enregistrement…" : meeting ? "Enregistrer" : "Créer"}
          </PrimaryButton>
        </div>
      </form>
    </FormModal>
  );
}
