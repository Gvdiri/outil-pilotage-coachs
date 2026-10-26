"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createClientRecord,
  deleteClientRecord,
  restoreClient,
} from "@/lib/actions/clients";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { FilterChip } from "@/components/FilterChip";
import { BarChart, LineChart } from "@/components/charts/Charts";
import { useToast } from "@/components/Toast";
import {
  Field,
  FormModal,
  inputClass,
  PrimaryButton,
  SecondaryButton,
} from "@/components/FormModal";
import {
  addDaysISO,
  currentMonthBounds,
  formatDateShort,
  formatEUR,
  isDueToday,
  todayISO,
} from "@/lib/dates";
import {
  monthLabel,
  planState,
  revenueBetween,
  revenueByMonth,
} from "@/lib/paiements";
import { RISK_META, churnRisk, globalWeeklyStats } from "@/lib/suivi";
import {
  CLIENT_STATUSES,
  CLIENT_STATUS_META,
  effectivePaymentStatus,
  type ClientStatus,
} from "@/lib/types";
import type { ClientWithPayments } from "@/app/(app)/clients/page";

type Period = "mois" | "3mois" | "6mois" | "annee";

/** État de paiement affiché dans la liste : plan intelligent d'abord, sinon
 *  déduction depuis les paiements bruts. */
function paymentSummary(client: ClientWithPayments, today: string) {
  const plan = planState(client, client.payments, today);
  if (plan.kind === "solde") return { label: "Soldé ✓", tone: "green" as const };
  if (plan.kind === "en_retard") return { label: "En retard", tone: "red" as const };
  if (plan.kind === "en_cours")
    return { label: `${plan.paid}/${plan.total} payées`, tone: "blue" as const };
  const effective = client.payments.map((p) => effectivePaymentStatus(p, today));
  if (effective.includes("en_retard")) return { label: "En retard", tone: "red" as const };
  if (effective.includes("en_attente")) return { label: "En attente", tone: "amber" as const };
  if (effective.length > 0) return { label: "À jour", tone: "green" as const };
  return { label: "Aucun paiement", tone: "gray" as const };
}

export function ClientsView({
  initialClients: allClients,
}: {
  initialClients: ClientWithPayments[];
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "tous">("tous");
  const [addOpen, setAddOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("mois");
  const [suiviTab, setSuiviTab] = useState<"satisfaction" | "actions">("satisfaction");
  const [showTrash, setShowTrash] = useState(false);
  const today = todayISO();

  // Les archivés sortent des listes et de toutes les stats (filtre en JS :
  // fonctionne aussi tant que la colonne n'est pas migrée).
  const initialClients = useMemo(
    () => allClients.filter((c) => !c.archived),
    [allClients],
  );
  const trashed = useMemo(
    () => allClients.filter((c) => c.archived),
    [allClients],
  );

  const clients = useMemo(() => {
    if (statusFilter === "tous") return initialClients;
    return initialClients.filter((c) => c.status === statusFilter);
  }, [initialClients, statusFilter]);

  const activeCount = initialClients.filter((c) => c.status === "actif").length;
  const allPayments = initialClients.flatMap((c) => c.payments);

  // Suivi global de l'accompagnement (tous clients actifs confondus)
  const weeklyStats = useMemo(
    () =>
      globalWeeklyStats(
        initialClients
          .filter((c) => c.status === "actif")
          .flatMap((c) => c.client_followup_response),
        today,
        8,
      ),
    [initialClients, today],
  );
  const hasSuiviData = weeklyStats.some((w) => w.responses > 0);

  // CA selon la période sélectionnée
  const { start: monthStart, end: monthEnd } = currentMonthBounds();
  const caPeriode =
    period === "mois"
      ? revenueBetween(allPayments, monthStart, monthEnd)
      : period === "3mois"
        ? revenueBetween(allPayments, addDaysISO(today, -90), today)
        : period === "6mois"
          ? revenueBetween(allPayments, addDaysISO(today, -180), today)
          : revenueBetween(allPayments, today.slice(0, 4) + "-01-01", today);
  const histogram = revenueByMonth(
    allPayments,
    today,
    period === "annee" ? 12 : period === "6mois" ? 6 : period === "3mois" ? 4 : 6,
  );

  // Clients à surveiller : risque élevé/moyen ou échéance en retard
  const watchlist = initialClients
    .filter((c) => c.status === "actif")
    .map((c) => {
      const risk = churnRisk(c.client_followup_response, today);
      const plan = planState(c, c.payments, today);
      const reasons = [...risk.reasons];
      if (plan.kind === "en_retard") reasons.unshift("Échéance de paiement en retard");
      const score =
        (plan.kind === "en_retard" ? 3 : 0) +
        (risk.level === "eleve" ? 3 : risk.level === "moyen" ? 1 : 0);
      return { client: c, risk, reasons, score };
    })
    .filter((w) => w.score >= 1 && w.risk.level !== "aucun_retour")
    .sort((a, b) => b.score - a.score);

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={`${activeCount} client${activeCount > 1 ? "s" : ""} actif${activeCount > 1 ? "s" : ""} accompagné${activeCount > 1 ? "s" : ""}`}
        action={
          <>
            <a
              href="/api/rapport/activite"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium transition-colors hover:bg-background"
              title="Télécharger le bilan d'activité PDF"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
                <path d="M14 3v5h5M12 12v6M9 15l3 3 3-3" />
              </svg>
              Rapport PDF
            </a>
            <PrimaryButton type="button" onClick={() => setAddOpen(true)}>
              + Client
            </PrimaryButton>
          </>
        }
      />

      {/* Vue business + vue accompagnement, côte à côte */}
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {/* CA encaissé + histogramme */}
        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted">
                💶 CA encaissé —{" "}
                {period === "mois"
                  ? "ce mois"
                  : period === "3mois"
                    ? "3 derniers mois"
                    : period === "6mois"
                      ? "6 derniers mois"
                      : "cette année"}
              </p>
              <p className="glow-number text-2xl font-bold" style={{ color: "var(--tone-green-fg)" }}>
                {formatEUR(caPeriode)}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["mois", "Ce mois"],
                  ["3mois", "3 mois"],
                  ["6mois", "6 mois"],
                  ["annee", "Année"],
                ] as [Period, string][]
              ).map(([key, label]) => (
                <FilterChip
                  key={key}
                  active={period === key}
                  onClick={() => setPeriod(key)}
                  label={label}
                />
              ))}
            </div>
          </div>
          <BarChart
            data={histogram.map((h) => ({
              label: monthLabel(h.month),
              value: h.total,
            }))}
            formatValue={(v) => `${Math.round(v).toLocaleString("fr-FR")} €`}
          />
        </section>

        {/* Santé de l'accompagnement : satisfaction moyenne / passage à l'action */}
        <section className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted">
              📊 Santé de l&apos;accompagnement — 8 semaines
            </p>
            <div className="flex gap-1.5">
              <FilterChip
                active={suiviTab === "satisfaction"}
                onClick={() => setSuiviTab("satisfaction")}
                label="Satisfaction"
              />
              <FilterChip
                active={suiviTab === "actions"}
                onClick={() => setSuiviTab("actions")}
                label="Passage à l'action"
              />
            </div>
          </div>
          {hasSuiviData ? (
            <LineChart
              data={weeklyStats.map((w) => ({
                label: `${w.period.slice(8, 10)}/${w.period.slice(5, 7)}`,
                value:
                  suiviTab === "satisfaction" ? w.avgSatisfaction : w.actionRate,
              }))}
              min={suiviTab === "satisfaction" ? 1 : 0}
              max={suiviTab === "satisfaction" ? 5 : 100}
              height={150}
              color={
                suiviTab === "satisfaction"
                  ? "var(--tone-violet-fg)"
                  : "var(--tone-green-fg)"
              }
              formatValue={(v) =>
                suiviTab === "satisfaction" ? String(v) : `${v}%`
              }
            />
          ) : (
            <p className="flex h-[150px] items-center justify-center text-center text-xs text-muted">
              Les moyennes s&apos;afficheront dès les premiers retours hebdo de
              vos clients.
            </p>
          )}
        </section>
      </div>

      {/* Clients à surveiller */}
      {watchlist.length > 0 ? (
        <section className="mb-4 rounded-xl border border-[var(--tone-amber-fg)]/30 bg-surface p-4">
          <h2 className="mb-2 text-sm font-bold">
            👀 À surveiller ({watchlist.length})
          </h2>
          <div className="flex flex-col gap-1.5">
            {watchlist.map(({ client, reasons }) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-background"
              >
                <span className="font-semibold">{client.name}</span>
                <span className="text-xs text-muted">{reasons.join(" · ")}</span>
                <span className="ml-auto text-xs text-primary">Voir →</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <FilterChip
          active={statusFilter === "tous" && !showTrash}
          onClick={() => {
            setStatusFilter("tous");
            setShowTrash(false);
          }}
          label={`Tous (${initialClients.length})`}
        />
        {CLIENT_STATUSES.map((s) => {
          const count = initialClients.filter((c) => c.status === s).length;
          return (
            <FilterChip
              key={s}
              active={statusFilter === s && !showTrash}
              onClick={() => {
                setStatusFilter(statusFilter === s ? "tous" : s);
                setShowTrash(false);
              }}
              label={`${CLIENT_STATUS_META[s].label} (${count})`}
            />
          );
        })}
        {trashed.length > 0 || showTrash ? (
          <button
            onClick={() => setShowTrash((t) => !t)}
            className={`ml-auto whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              showTrash
                ? "border-danger bg-danger-soft text-danger"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            🗑 Corbeille ({trashed.length})
          </button>
        ) : null}
      </div>

      {showTrash ? (
        <TrashList trashed={trashed} onEmpty={() => setShowTrash(false)} />
      ) : null}

      {showTrash ? null : clients.length === 0 ? (
        <EmptyState
          icon="🤝"
          title="Aucun client ici"
          hint="Ajoute un client avec le bouton « + Client », ou convertis un prospect gagné."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-3 py-2.5 font-medium">Nom</th>
                <th className="px-3 py-2.5 font-medium">Statut</th>
                <th className="px-3 py-2.5 font-medium">Offre</th>
                <th className="px-3 py-2.5 font-medium">Prochaine action</th>
                <th className="px-3 py-2.5 font-medium">Paiements</th>
                <th className="px-3 py-2.5 font-medium">Suivi</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const pay = paymentSummary(c, today);
                const risk = churnRisk(c.client_followup_response, today);
                const riskMeta = RISK_META[risk.level];
                const actionDue = isDueToday(c.next_action_date) && c.status === "actif";
                return (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/clients/${c.id}`)}
                    className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-background"
                  >
                    <td className="px-3 py-2.5 font-medium">
                      <Link
                        href={`/clients/${c.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.name}
                      </Link>
                      {c.progress ? (
                        <span className="block text-xs text-muted">{c.progress}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge
                        tone={CLIENT_STATUS_META[c.status].tone}
                        label={CLIENT_STATUS_META[c.status].label}
                      />
                    </td>
                    <td className="max-w-40 truncate px-3 py-2.5 text-muted">
                      {c.offer ?? "—"}
                    </td>
                    <td className="max-w-48 px-3 py-2.5">
                      <span className="block truncate text-muted">
                        {c.next_action ?? "—"}
                      </span>
                      {c.next_action_date ? (
                        <span
                          className={`text-xs ${actionDue ? "font-semibold text-danger" : "text-muted"}`}
                        >
                          {formatDateShort(c.next_action_date)}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={pay.tone} label={pay.label} />
                    </td>
                    <td className="px-3 py-2.5">
                      {c.status === "actif" ? (
                        <StatusBadge tone={riskMeta.tone} label={riskMeta.label} size="xs" />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addOpen ? <ClientAddModal onClose={() => setAddOpen(false)} /> : null}
    </div>
  );
}

// Corbeille : clients archivés — restaurer ou supprimer définitivement.
function TrashList({
  trashed,
  onEmpty,
}: {
  trashed: ClientWithPayments[];
  onEmpty: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  if (trashed.length === 0) {
    return (
      <EmptyState
        icon="🗑"
        title="La corbeille est vide"
        hint="Les clients archivés apparaîtront ici, restaurables à tout moment."
      />
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-surface">
      {trashed.map((c) => (
        <div
          key={c.id}
          className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3 last:border-0"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium">{c.name}</p>
            <p className="text-xs text-muted">
              {c.offer ?? "—"}
              {c.archived_at
                ? ` · archivé le ${formatDateShort(c.archived_at.slice(0, 10))}`
                : ""}
            </p>
          </div>
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const res = await restoreClient(c.id);
                if (res.error) toast(`Erreur : ${res.error}`, "error");
                else {
                  toast(`« ${c.name} » restauré — tout son historique est revenu`);
                  if (trashed.length === 1) onEmpty();
                  router.refresh();
                }
              })
            }
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-[var(--tone-green-fg)] transition-colors hover:bg-[var(--tone-green-bg)]"
          >
            ↩ Restaurer
          </button>
          <button
            disabled={isPending}
            onClick={() => {
              if (
                !window.confirm(
                  `Supprimer DÉFINITIVEMENT « ${c.name} » ?\nSes paiements et réponses de formulaires seront perdus. Cette action est irréversible.`,
                )
              )
                return;
              startTransition(async () => {
                const res = await deleteClientRecord(c.id);
                if (res.error) toast(`Erreur : ${res.error}`, "error");
                else {
                  toast("Client supprimé définitivement");
                  if (trashed.length === 1) onEmpty();
                  router.refresh();
                }
              });
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger-soft"
          >
            Supprimer définitivement
          </button>
        </div>
      ))}
    </div>
  );
}

function ClientAddModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<ClientStatus>("actif");
  const [offer, setOffer] = useState("");
  const [startDate, setStartDate] = useState(todayISO());

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await createClientRecord({
        name: name.trim(),
        email: email.trim() || null,
        instagram: instagram.trim() || null,
        contact: email.trim() || instagram.trim() || null,
        phone: phone.trim() || null,
        status,
        offer: offer.trim() || null,
        start_date: startDate || null,
      });
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast(`Client « ${name.trim()} » créé — configure son plan de paiement`);
        onClose();
        router.push(`/clients/${res.id}`);
        router.refresh();
      }
    });
  }

  return (
    <FormModal open title="Nouveau client" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Nom" required>
          <input
            required
            autoFocus
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Prénom Nom"
          />
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Email">
            <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="client@example.com" />
          </Field>
          <Field label="Instagram">
            <input className={inputClass} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@pseudo" />
          </Field>
          <Field label="WhatsApp">
            <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 6…" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Statut">
            <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as ClientStatus)}>
              {CLIENT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {CLIENT_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Début d'accompagnement">
            <input type="date" className={inputClass} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Offre / programme">
          <input className={inputClass} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Ex : Coaching 12 semaines" />
        </Field>
        <p className="text-xs text-muted">
          💡 Le plan de paiement (prix, nombre de fois) se configure ensuite sur
          sa fiche.
        </p>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton disabled={isPending || !name.trim()}>
            {isPending ? "Création…" : "Créer le client"}
          </PrimaryButton>
        </div>
      </form>
    </FormModal>
  );
}
