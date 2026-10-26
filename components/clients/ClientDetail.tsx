"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  archiveClient,
  markContactedToday,
  regenerateFormToken,
  updateClientRecord,
} from "@/lib/actions/clients";
import { emailFollowupLink, emailOnboardingLink } from "@/lib/actions/emails";
import { useToast } from "@/components/Toast";
import {
  Field,
  FormModal,
  inputClass,
  PrimaryButton,
  SecondaryButton,
} from "@/components/FormModal";
import { PaymentPlanCard } from "@/components/clients/PaymentPlanCard";
import { SuiviSection } from "@/components/clients/SuiviSection";
import { formatDate, formatDateShort, isDueToday, todayISO } from "@/lib/dates";
import { clientInsights } from "@/lib/insights";
import { waLink } from "@/lib/contact";
import { labelForKey, type FormFieldDef } from "@/lib/forms";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_META,
  type Client,
  type ClientStatus,
  type FollowupResponse,
  type OnboardingResponse,
  type Payment,
} from "@/lib/types";

export function ClientDetail({
  client,
  payments,
  onboarding,
  followups,
  onboardingFields,
  followupFields,
}: {
  client: Client;
  payments: Payment[];
  onboarding: OnboardingResponse | null;
  followups: FollowupResponse[];
  onboardingFields: FormFieldDef[];
  followupFields: FormFieldDef[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  const meta = CLIENT_STATUS_META[client.status];
  const today = todayISO();
  const actionDue = isDueToday(client.next_action_date) && client.status === "actif";
  const insights = clientInsights({ client, payments, followups, today });
  // WhatsApp : téléphone dédié, sinon réponse d'onboarding, sinon contact
  const wa =
    waLink(client.phone) ??
    waLink(onboarding?.answers.whatsapp) ??
    waLink(client.contact);

  function changeStatus(status: ClientStatus) {
    startTransition(async () => {
      const res = await updateClientRecord(client.id, { status });
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast(`Statut : ${CLIENT_STATUS_META[status].label}`);
        router.refresh();
      }
    });
  }

  function onArchive() {
    if (
      !window.confirm(
        `Archiver « ${client.name} » ?\nIl disparaît des listes et des stats, mais tout son historique est conservé dans la corbeille (restaurable à tout moment).`,
      )
    )
      return;
    startTransition(async () => {
      const res = await archiveClient(client.id);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Client archivé — restaurable depuis la corbeille");
        router.push("/clients");
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <Link
          href="/clients"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          ← Clients
        </Link>
      </div>

      {/* En-tête : nom + statut + Modifier */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold lg:text-2xl">{client.name}</h1>
        {client.contact ? (
          <span className="text-sm text-muted">{client.contact}</span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <a
            href={`/api/rapport/client/${client.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition-colors hover:bg-background"
            title="Télécharger le bilan PDF de ce client"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5M12 12v6M9 15l3 3 3-3" />
            </svg>
            Rapport PDF
          </a>
          <select
            value={client.status}
            disabled={isPending}
            onChange={(e) => changeStatus(e.target.value as ClientStatus)}
            className="rounded-full border-0 px-3 py-1.5 text-sm font-semibold outline-none"
            style={{
              backgroundColor: `var(--tone-${meta.tone}-bg)`,
              color: `var(--tone-${meta.tone}-fg)`,
            }}
          >
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_STATUS_META[s].label}
              </option>
            ))}
          </select>
          <SecondaryButton onClick={() => setEditOpen(true)}>Modifier</SecondaryButton>
        </div>
      </div>

      {/* Analyse automatique */}
      {insights.length > 0 ? (
        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
            💡 Analyse
          </p>
          {insights.map((ins, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed"
              style={{
                color:
                  ins.tone === "red"
                    ? "var(--tone-red-fg)"
                    : ins.tone === "amber"
                      ? "var(--tone-amber-fg)"
                      : ins.tone === "green"
                        ? "var(--tone-green-fg)"
                        : "var(--tone-blue-fg)",
              }}
            >
              {ins.text}
            </p>
          ))}
        </div>
      ) : null}

      {/* Disposition 2 colonnes : contenu principal + rail d'infos à droite */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        {/* ------- Colonne principale ------- */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* Suivi hebdo (stats + graphes + historique) */}
          <SuiviSection followups={followups} followupFields={followupFields} />

          {/* Réponse d'onboarding */}
          <section className="rounded-xl border border-border bg-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">📋 Questionnaire d&apos;onboarding</h2>
              {onboarding ? (
                <StatusBadgeInline tone="green" label="Rempli" />
              ) : (
                <StatusBadgeInline tone="amber" label="En attente" />
              )}
            </div>
            {onboarding ? (
              <>
                <p className="mb-2 text-xs text-muted">
                  Reçu le {formatDate(onboarding.submitted_at.slice(0, 10))}
                </p>
                <dl className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {Object.entries(onboarding.answers)
                    .filter(([, v]) => v !== "")
                    .map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          {labelForKey(onboardingFields, key)}
                        </dt>
                        <dd className="whitespace-pre-wrap text-sm">{String(value)}</dd>
                      </div>
                    ))}
                </dl>
              </>
            ) : (
              <p className="text-sm text-muted">
                Pas encore rempli — copie le lien d&apos;onboarding (à droite) et
                envoie-le au client.
              </p>
            )}
          </section>

          {/* Notes */}
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-2 text-sm font-bold">📝 Notes</h2>
            {client.notes ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{client.notes}</p>
            ) : (
              <p className="text-sm text-muted">Aucune note pour l&apos;instant.</p>
            )}
          </section>
        </div>

        {/* ------- Rail droit ------- */}
        <div className="flex flex-col gap-4">
          {/* Coordonnées */}
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-bold">👤 Coordonnées</h2>
            <div className="flex flex-col gap-2.5">
              <InfoRow label="Email">
                {client.email ?? onboarding?.answers.email ?? client.contact ?? "—"}
              </InfoRow>
              <InfoRow label="Instagram">
                {client.instagram ?? onboarding?.answers.instagram ?? "—"}
              </InfoRow>
              <InfoRow label="WhatsApp">
                {client.phone ?? onboarding?.answers.whatsapp ?? "—"}
              </InfoRow>
              <InfoRow label="Offre / programme">{client.offer ?? "—"}</InfoRow>
              <div className="grid grid-cols-2 gap-2">
                <InfoRow label="Début">
                  {client.start_date ? formatDate(client.start_date) : "—"}
                </InfoRow>
                <InfoRow label="Avancement">{client.progress ?? "—"}</InfoRow>
              </div>
            </div>
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#25d366] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2Zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.3-.5 0-1 .2-3.4-.7-2.9-1.1-4.7-4-4.9-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.1.1.3 0 .5-.3.6-.7.9-.5 1.2.8 1.3 1.7 2.1 3 2.7.3.2.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.4 0 .1 0 .7-.2 1.1Z" />
                </svg>
                Contacter sur WhatsApp
              </a>
            ) : null}
          </section>

          {/* Paiements (moteur intelligent) */}
          <PaymentPlanCard
            client={client}
            payments={payments}
            onConfigure={() => setEditOpen(true)}
          />

          {/* Suivi & relances */}
          <RelancesCard client={client} today={today} actionDue={actionDue} />

          {/* Liens formulaires */}
          <FormsCard client={client} />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onArchive}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:bg-background hover:text-danger"
        >
          🗑 Archiver le client
        </button>
      </div>

      {editOpen ? (
        <ClientEditModal client={client} onClose={() => setEditOpen(false)} />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-border pb-1 text-[11px] font-bold uppercase tracking-wider text-muted">
      {children}
    </p>
  );
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

function StatusBadgeInline({
  tone,
  label,
}: {
  tone: "green" | "amber";
  label: string;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `var(--tone-${tone}-bg)`,
        color: `var(--tone-${tone}-fg)`,
      }}
    >
      {label}
    </span>
  );
}

// Suivi & relances : dernier contact + prochaine action + "Contacté aujourd'hui"
function RelancesCard({
  client,
  today,
  actionDue,
}: {
  client: Client;
  today: string;
  actionDue: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  function contacted() {
    startTransition(async () => {
      const res = await markContactedToday(client.id);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Dernier contact mis à jour ✓");
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-3 text-sm font-bold">🔔 Suivi &amp; relances</h2>
      <div className="flex flex-col gap-2.5">
        <InfoRow label="Dernier contact">
          {client.last_contact_date ? (
            <>
              {formatDate(client.last_contact_date)}
              {client.last_contact_date === today ? (
                <span className="text-xs text-[var(--tone-green-fg)]"> (aujourd&apos;hui)</span>
              ) : null}
            </>
          ) : (
            "—"
          )}
        </InfoRow>
        <InfoRow label="Prochaine action">
          {client.next_action ?? "—"}
          {client.next_action_date ? (
            <span
              className={`block text-xs ${actionDue ? "font-semibold text-danger" : "text-muted"}`}
            >
              {formatDateShort(client.next_action_date)}
              {actionDue ? " — à faire" : ""}
            </span>
          ) : null}
        </InfoRow>
      </div>
      <button
        onClick={contacted}
        disabled={isPending || client.last_contact_date === today}
        className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-background disabled:opacity-50"
      >
        ✓ Contacté aujourd&apos;hui
      </button>
    </section>
  );
}

function FormsCard({ client }: { client: Client }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const links = [
    {
      key: "onboarding" as const,
      label: "📋 Questionnaire d'onboarding (une fois)",
      url: `${origin}/form/onboarding/${client.form_token}`,
    },
    {
      key: "suivi" as const,
      label: "💪 Retour hebdomadaire (chaque semaine)",
      url: `${origin}/form/suivi/${client.form_token}`,
    },
  ];

  async function copy(url: string, label: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast(`Lien ${label} copié ✓`);
    } catch {
      toast("Impossible de copier le lien", "error");
    }
  }

  function sendByEmail(kind: "onboarding" | "suivi") {
    startTransition(async () => {
      const res =
        kind === "onboarding"
          ? await emailOnboardingLink(client.id)
          : await emailFollowupLink(client.id);
      if (res.error) toast(res.error, "error");
      else toast("Email envoyé au client ✓");
    });
  }

  function regenerate() {
    if (!window.confirm("Regénérer le lien ? Les anciens liens envoyés ne fonctionneront plus."))
      return;
    startTransition(async () => {
      const res = await regenerateFormToken(client.id);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Nouveau lien généré");
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-1 text-sm font-bold">🔗 Liens à envoyer au client</h2>
      <p className="mb-3 text-xs leading-relaxed text-muted">
        Copie le lien et envoie-le toi-même (DM, WhatsApp…). La réponse se
        range automatiquement dans cette fiche.
      </p>
      <div className="flex flex-col gap-2">
        {links.map((l) => (
          <div key={l.label}>
            <p className="mb-1 text-xs font-semibold">{l.label}</p>
            <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2">
              <p className="min-w-0 flex-1 truncate text-xs text-muted">{l.url}</p>
              <button
                onClick={() => copy(l.url, l.label)}
                className="shrink-0 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-background"
              >
                Copier
              </button>
              <button
                onClick={() => sendByEmail(l.key)}
                disabled={isPending}
                className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
                title="Envoyer ce lien au client par email"
              >
                ✉ Envoyer
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Link
          href="/formulaires"
          className="text-xs font-medium text-primary hover:underline"
        >
          Éditer les questions
        </Link>
        <button
          onClick={regenerate}
          disabled={isPending}
          className="text-xs text-muted underline-offset-2 hover:underline"
        >
          Regénérer les liens
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

function ClientEditModal({
  client,
  onClose,
}: {
  client: Client;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(client.name);
  const [email, setEmail] = useState(client.email ?? "");
  const [instagram, setInstagram] = useState(client.instagram ?? "");
  const [phone, setPhone] = useState(client.phone ?? "");
  const [offer, setOffer] = useState(client.offer ?? "");
  const [progress, setProgress] = useState(client.progress ?? "");
  const [startDate, setStartDate] = useState(client.start_date ?? "");
  const [nextAction, setNextAction] = useState(client.next_action ?? "");
  const [nextActionDate, setNextActionDate] = useState(client.next_action_date ?? "");
  const [notes, setNotes] = useState(client.notes ?? "");
  // Plan de paiement
  const [priceTotal, setPriceTotal] = useState(
    client.price_total !== null ? String(client.price_total) : "",
  );
  const [installments, setInstallments] = useState(
    client.installments !== null ? String(client.installments) : "",
  );
  const [firstPaymentDate, setFirstPaymentDate] = useState(
    client.first_payment_date ?? "",
  );

  const priceValue = parseFloat(priceTotal.replace(",", "."));
  const installmentsValue = parseInt(installments, 10);
  const perInstallment =
    priceValue > 0 && installmentsValue >= 1
      ? Math.round((priceValue / installmentsValue) * 100) / 100
      : null;

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (priceTotal && !(priceValue > 0)) {
      toast("Le prix total doit être un montant valide.", "error");
      return;
    }
    startTransition(async () => {
      const res = await updateClientRecord(client.id, {
        name: name.trim(),
        email: email.trim() || null,
        instagram: instagram.trim() || null,
        contact: email.trim() || instagram.trim() || null,
        phone: phone.trim() || null,
        offer: offer.trim() || null,
        progress: progress.trim() || null,
        start_date: startDate || null,
        next_action: nextAction.trim() || null,
        next_action_date: nextActionDate || null,
        notes: notes.trim() || null,
        price_total: priceValue > 0 ? priceValue : null,
        installments: installmentsValue >= 1 ? installmentsValue : null,
        first_payment_date: firstPaymentDate || null,
      });
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Fiche mise à jour");
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <FormModal open wide title="Modifier la fiche client" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <SectionTitle>Identité</SectionTitle>
        <Field label="Nom" required>
          <input required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Email">
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
          </Field>
          <Field label="Instagram">
            <input className={inputClass} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@pseudo" />
          </Field>
          <Field label="WhatsApp">
            <input
              className={inputClass}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
            />
          </Field>
        </div>
        <SectionTitle>Accompagnement</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Offre / programme">
            <input className={inputClass} value={offer} onChange={(e) => setOffer(e.target.value)} />
          </Field>
          <Field label="Avancement">
            <input className={inputClass} value={progress} onChange={(e) => setProgress(e.target.value)} placeholder="Ex : semaine 4/12" />
          </Field>
        </div>

        {/* Plan de paiement */}
        <div className="rounded-xl border border-border bg-background/50 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            💶 Plan de paiement
          </p>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Prix total (€)">
              <input inputMode="decimal" className={inputClass} value={priceTotal} onChange={(e) => setPriceTotal(e.target.value)} placeholder="1350" />
            </Field>
            <Field label="En combien de fois">
              <select className={inputClass} value={installments} onChange={(e) => setInstallments(e.target.value)}>
                <option value="">—</option>
                {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? "1 fois (unique)" : `${n} fois`}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date du 1er paiement">
              <input type="date" className={inputClass} value={firstPaymentDate} onChange={(e) => setFirstPaymentDate(e.target.value)} />
            </Field>
          </div>
          <p className="mt-2 text-xs text-muted">
            {perInstallment !== null
              ? `→ ${installmentsValue} échéance${installmentsValue > 1 ? "s" : ""} de ${perInstallment.toLocaleString("fr-FR")} € (calcul automatique). Les relances s'arrêtent toutes seules une fois soldé.`
              : "Renseigne le prix et le nombre de fois : le montant par échéance, les relances et l'arrêt automatique se calculent tout seuls."}
          </p>
        </div>

        <SectionTitle>Suivi</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début d'accompagnement">
            <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
          <Field label="Date de prochaine action">
            <input type="date" className={inputClass} value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Prochaine action">
          <input className={inputClass} value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Ex : point hebdo, envoyer le programme…" />
        </Field>
        <Field label="Notes">
          <textarea rows={3} className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
