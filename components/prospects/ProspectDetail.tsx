"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  convertProspectToClient,
  deleteProspect,
  updateProspect,
} from "@/lib/actions/prospects";
import { StatusBadge, AssigneeChip } from "@/components/StatusBadge";
import { ProspectStepper } from "@/components/prospects/ProspectStepper";
import { useToast } from "@/components/Toast";
import {
  Field,
  FormModal,
  inputClass,
  PrimaryButton,
  SecondaryButton,
} from "@/components/FormModal";
import { formatDate, formatDateShort, formatDateTime, isDueToday } from "@/lib/dates";
import {
  ASSIGNEE_LABELS,
  ASSIGNEE_TONES,
  PROSPECT_STATUSES,
  PROSPECT_STATUS_META,
  type Assignee,
  type Prospect,
  type ProspectStatus,
} from "@/lib/types";

/** timestamptz -> valeur pour <input type="datetime-local"> (heure locale). */
function tsToLocalInput(ts: string | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ProspectDetail({ prospect }: { prospect: Prospect }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  const meta = PROSPECT_STATUS_META[prospect.status];
  const toRelance =
    isDueToday(prospect.next_action_date) &&
    !["gagne", "perdu"].includes(prospect.status);

  function changeStatus(status: ProspectStatus) {
    startTransition(async () => {
      const res = await updateProspect(prospect.id, { status });
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast(`Statut : ${PROSPECT_STATUS_META[status].label}`);
        router.refresh();
      }
    });
  }

  // Étape cliquée dans le parcours de closing
  function onStep(to: ProspectStatus) {
    if (to === prospect.status) return;
    if (to === "gagne") {
      onConvert();
      return;
    }
    changeStatus(to);
  }

  // Passage en "perdu" : capture de la raison (data d'objections)
  function onLost() {
    const reason = window.prompt(
      "Raison de la perte ? (ex : trop cher, pas le bon moment, silence…)\nCette donnée alimente l'analyse des objections.",
      prospect.lost_reason ?? "",
    );
    if (reason === null) return; // annulé
    startTransition(async () => {
      const res = await updateProspect(prospect.id, {
        status: "perdu",
        lost_reason: reason.trim() || null,
      });
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Prospect marqué perdu");
        router.refresh();
      }
    });
  }

  function onConvert() {
    if (
      !window.confirm(
        `Convertir « ${prospect.name} » en client ?\nUne fiche client sera créée et le prospect passera en "Gagné".`,
      )
    )
      return;
    startTransition(async () => {
      const res = await convertProspectToClient(prospect.id);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Prospect converti en client 🎉");
        router.push(`/clients/${res.id}`);
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!window.confirm(`Supprimer définitivement « ${prospect.name} » ?`)) return;
    startTransition(async () => {
      const res = await deleteProspect(prospect.id);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Prospect supprimé");
        router.push("/prospects");
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/prospects"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        ← Prospects
      </Link>

      {/* En-tête : nom + statut (changement en 1 clic) */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold lg:text-2xl">{prospect.name}</h1>
          {toRelance ? <StatusBadge tone="red" label="À relancer" /> : null}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/rapport/prospect/${prospect.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium transition-colors hover:bg-background"
            title="Fiche de prépa d'appel en PDF"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5M12 12v6M9 15l3 3 3-3" />
            </svg>
            Prépa appel
          </a>
          <select
            value={prospect.status}
            disabled={isPending}
            onChange={(e) => changeStatus(e.target.value as ProspectStatus)}
            className="rounded-full border-0 px-3 py-1.5 text-sm font-semibold outline-none"
            style={{
              backgroundColor: `var(--tone-${meta.tone}-bg)`,
              color: `var(--tone-${meta.tone}-fg)`,
            }}
          >
            {PROSPECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROSPECT_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fiche de closing : la matière de l'appel */}
      {(prospect.objective || prospect.pain || prospect.desired || prospect.objections) ? (
        <div className="mb-4 rounded-xl border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            🎯 Fiche de closing
          </p>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {prospect.objective ? (
              <ClosingRow label="Objectif visé">{prospect.objective}</ClosingRow>
            ) : null}
            {prospect.pain ? (
              <ClosingRow label="Douleur / situation actuelle">{prospect.pain}</ClosingRow>
            ) : null}
            {prospect.desired ? (
              <ClosingRow label="Situation désirée">{prospect.desired}</ClosingRow>
            ) : null}
            {prospect.objections ? (
              <ClosingRow label="Objections à préparer">{prospect.objections}</ClosingRow>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Parcours de closing */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Parcours de closing
          </p>
          <div className="flex items-center gap-2">
            {prospect.status === "rdv_pris" ? (
              <button
                onClick={() => changeStatus("no_show")}
                disabled={isPending}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-[var(--tone-orange-fg)] transition-colors hover:bg-[var(--tone-orange-bg)]"
              >
                No-show
              </button>
            ) : null}
            {prospect.status !== "perdu" && prospect.status !== "gagne" ? (
              <button
                onClick={onLost}
                disabled={isPending}
                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
              >
                ✗ Perdu
              </button>
            ) : null}
          </div>
        </div>
        <ProspectStepper
          status={prospect.status}
          disabled={isPending}
          onStep={onStep}
        />
        {prospect.status === "no_show" ? (
          <p className="mt-2 text-xs text-[var(--tone-orange-fg)]">
            ⚠ No-show au dernier RDV — reprends contact ou reprogramme, puis
            clique sur « RDV pris ».
          </p>
        ) : null}
        {prospect.status === "perdu" ? (
          <p className="mt-2 text-sm">
            <span className="font-semibold text-danger">Perdu</span>
            {prospect.lost_reason ? (
              <span className="text-muted"> — raison : « {prospect.lost_reason} »</span>
            ) : (
              <span className="text-muted"> — raison non renseignée</span>
            )}
            <button
              onClick={onLost}
              className="ml-2 text-xs text-primary underline-offset-2 hover:underline"
            >
              modifier
            </button>
          </p>
        ) : null}
      </div>

      {/* Infos */}
      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="Source">{prospect.source}</InfoCard>
        <InfoCard label="Assigné">
          {prospect.assignee ? (
            <span className="inline-flex items-center gap-2">
              <AssigneeChip
                tone={ASSIGNEE_TONES[prospect.assignee]}
                name={ASSIGNEE_LABELS[prospect.assignee]}
              />
              {ASSIGNEE_LABELS[prospect.assignee]}
            </span>
          ) : (
            "Non assigné"
          )}
        </InfoCard>
        <InfoCard label="Prochaine action">
          {prospect.next_action ?? "—"}
          {prospect.next_action_date ? (
            <span className={`block text-xs ${toRelance ? "font-semibold text-danger" : "text-muted"}`}>
              {formatDateShort(prospect.next_action_date)}
            </span>
          ) : null}
        </InfoCard>
        <InfoCard label="Rendez-vous">
          {prospect.rdv_at ? formatDateTime(prospect.rdv_at) : "Aucun RDV planifié"}
        </InfoCard>
      </div>

      {/* Notes */}
      <div className="mt-3 rounded-xl border border-border bg-surface p-4">
        <p className="mb-1 text-xs font-medium text-muted">Notes</p>
        {prospect.notes ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{prospect.notes}</p>
        ) : (
          <p className="text-sm text-muted">Aucune note pour l&apos;instant.</p>
        )}
      </div>

      <p className="mt-2 text-xs text-muted">
        Ajouté le {formatDate(prospect.created_at.slice(0, 10))}
      </p>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-2">
        <PrimaryButton type="button" onClick={() => setEditOpen(true)}>
          Modifier
        </PrimaryButton>
        {prospect.status !== "gagne" ? (
          <button
            onClick={onConvert}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--tone-green-fg)] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            ✓ Convertir en client
          </button>
        ) : null}
        <button
          onClick={onDelete}
          disabled={isPending}
          className="ml-auto inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
        >
          Supprimer
        </button>
      </div>

      {editOpen ? (
        <ProspectFormModal
          open
          prospect={prospect}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </div>
  );
}

function InfoCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-1 text-xs font-medium text-muted">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

function ClosingRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm">{children}</p>
    </div>
  );
}

function ProspectFormModal({
  open,
  prospect,
  onClose,
}: {
  open: boolean;
  prospect: Prospect;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(prospect.name);
  const [source, setSource] = useState(prospect.source);
  const [assignee, setAssignee] = useState<Assignee | "">(prospect.assignee ?? "");
  const [nextAction, setNextAction] = useState(prospect.next_action ?? "");
  const [nextActionDate, setNextActionDate] = useState(prospect.next_action_date ?? "");
  const [rdvAt, setRdvAt] = useState(tsToLocalInput(prospect.rdv_at));
  const [notes, setNotes] = useState(prospect.notes ?? "");
  // Coordonnées
  const [email, setEmail] = useState(prospect.email ?? "");
  const [instagram, setInstagram] = useState(prospect.instagram ?? "");
  const [phone, setPhone] = useState(prospect.phone ?? "");
  // Fiche de closing
  const [objective, setObjective] = useState(prospect.objective ?? "");
  const [pain, setPain] = useState(prospect.pain ?? "");
  const [desired, setDesired] = useState(prospect.desired ?? "");
  const [objections, setObjections] = useState(prospect.objections ?? "");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateProspect(prospect.id, {
        name: name.trim(),
        source: source.trim() || "instagram",
        assignee: assignee || null,
        next_action: nextAction.trim() || null,
        next_action_date: nextActionDate || null,
        rdv_at: rdvAt ? new Date(rdvAt).toISOString() : null,
        notes: notes.trim() || null,
        email: email.trim() || null,
        instagram: instagram.trim() || null,
        phone: phone.trim() || null,
        objective: objective.trim() || null,
        pain: pain.trim() || null,
        desired: desired.trim() || null,
        objections: objections.trim() || null,
      });
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Prospect mis à jour");
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <FormModal open={open} wide title="Modifier le prospect" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <p className="border-b border-border pb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
          Identité &amp; coordonnées
        </p>
        <Field label="Nom / @instagram" required>
          <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Email">
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prospect@example.com" />
          </Field>
          <Field label="Instagram">
            <input className={inputClass} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@pseudo" />
          </Field>
          <Field label="WhatsApp">
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6…" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source">
            <input className={inputClass} value={source} onChange={(e) => setSource(e.target.value)} />
          </Field>
          <Field label="Assigné">
            <select className={inputClass} value={assignee} onChange={(e) => setAssignee(e.target.value as Assignee | "")}>
              <option value="">Non assigné</option>
              <option value="alex">Alex</option>
              <option value="sam">Sam</option>
            </select>
          </Field>
        </div>

        <p className="mt-1 border-b border-border pb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
          Fiche de closing
        </p>
        <Field label="Objectif visé">
          <input className={inputClass} value={objective} onChange={(e) => setObjective(e.target.value)} placeholder="Où veut-il aller ? (ex : premier muscle-up)" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Douleur / situation actuelle">
            <textarea rows={3} className={inputClass} value={pain} onChange={(e) => setPain(e.target.value)} placeholder="Ce qui le bloque, sa frustration…" />
          </Field>
          <Field label="Situation désirée">
            <textarea rows={3} className={inputClass} value={desired} onChange={(e) => setDesired(e.target.value)} placeholder="À quoi ressemble sa réussite" />
          </Field>
        </div>
        <Field label="Objections anticipées">
          <textarea rows={2} className={inputClass} value={objections} onChange={(e) => setObjections(e.target.value)} placeholder="Prix, temps, doute… à préparer avant l'appel" />
        </Field>

        <p className="mt-1 border-b border-border pb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
          Suivi
        </p>
        <Field label="Prochaine action">
          <input
            className={inputClass}
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="Ex : relancer sur les tarifs"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de prochaine action">
            <input type="date" className={inputClass} value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
          </Field>
          <Field label="RDV (date et heure)">
            <input type="datetime-local" className={inputClass} value={rdvAt} onChange={(e) => setRdvAt(e.target.value)} />
          </Field>
        </div>
        <Field label="Notes libres">
          <textarea
            rows={3}
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Historique, contexte…"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton disabled={isPending}>
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </PrimaryButton>
        </div>
      </form>
    </FormModal>
  );
}
