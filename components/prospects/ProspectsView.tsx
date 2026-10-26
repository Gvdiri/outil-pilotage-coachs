"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createProspect } from "@/lib/actions/prospects";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge, AssigneeChip } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { FilterChip } from "@/components/FilterChip";
import { ProspectingTracker } from "@/components/prospects/ProspectingTracker";
import { useToast } from "@/components/Toast";
import { inputClass, PrimaryButton } from "@/components/FormModal";
import { formatDateShort, formatDateTime, isDueToday } from "@/lib/dates";
import {
  ASSIGNEE_LABELS,
  ASSIGNEE_TONES,
  PROSPECT_STATUSES,
  PROSPECT_STATUS_META,
  type Assignee,
  type Prospect,
  type ProspectStatus,
} from "@/lib/types";

type SortKey = "name" | "status" | "next_action_date" | "created_at";

const STATUS_ORDER: Record<ProspectStatus, number> = {
  nouveau: 0,
  contacte: 1,
  en_conversation: 2,
  rdv_pris: 3,
  no_show: 4,
  gagne: 5,
  perdu: 6,
};

export function ProspectsView({
  initialProspects,
  prospectingDays = [],
  trackerAvailable = false,
}: {
  initialProspects: Prospect[];
  prospectingDays?: import("@/lib/types").ProspectingDay[];
  trackerAvailable?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  // Ajout rapide (une ligne : nom + statut)
  const [quickName, setQuickName] = useState("");
  const [quickStatus, setQuickStatus] = useState<ProspectStatus>("nouveau");

  // Filtres + tri
  const [statusFilter, setStatusFilter] = useState<ProspectStatus | "tous">("tous");
  const [assigneeFilter, setAssigneeFilter] = useState<Assignee | "tous">("tous");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const prospects = useMemo(() => {
    let list = initialProspects;
    if (statusFilter !== "tous") list = list.filter((p) => p.status === statusFilter);
    if (assigneeFilter !== "tous") list = list.filter((p) => p.assignee === assigneeFilter);
    const sorted = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name, "fr");
      else if (sortKey === "status") cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      else if (sortKey === "next_action_date")
        cmp = (a.next_action_date ?? "9999").localeCompare(b.next_action_date ?? "9999");
      else cmp = a.created_at.localeCompare(b.created_at);
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [initialProspects, statusFilter, assigneeFilter, sortKey, sortAsc]);

  const relanceCount = initialProspects.filter(
    (p) =>
      isDueToday(p.next_action_date) && !["gagne", "perdu"].includes(p.status),
  ).length;

  // KPIs du funnel — uniquement des métriques concrètes, déduites des fiches :
  // le taux de closing = gagnés ÷ décidés (gagnés + perdus). Pas d'estimation.
  const funnel = useMemo(() => {
    const won = initialProspects.filter((p) => p.status === "gagne").length;
    const lost = initialProspects.filter((p) => p.status === "perdu").length;
    const decided = won + lost;
    const pipeline = initialProspects.length - decided;
    const rdv = initialProspects.filter((p) => p.status === "rdv_pris").length;
    const reasons = initialProspects
      .filter((p) => p.status === "perdu" && p.lost_reason)
      .map((p) => p.lost_reason!.trim().toLowerCase());
    const counts = new Map<string, number>();
    for (const r of reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
    const topReason = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    return {
      pipeline,
      rdv,
      won,
      closingRate: decided > 0 ? Math.round((won / decided) * 100) : null,
      topReason,
    };
  }, [initialProspects]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function onQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = quickName.trim();
    if (!name) return;
    startTransition(async () => {
      const res = await createProspect({ name, status: quickStatus });
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast(`Prospect « ${name} » ajouté`);
        setQuickName("");
        router.refresh();
      }
    });
  }

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? " ↑" : " ↓") : "";

  return (
    <div>
      <PageHeader
        title="Prospects"
        subtitle={
          relanceCount > 0
            ? `${relanceCount} prospect${relanceCount > 1 ? "s" : ""} à relancer aujourd'hui`
            : "Aucune relance en attente"
        }
      />

      {/* KPIs du funnel (métriques concrètes, déduites des fiches) */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FunnelStat label="Pipeline actif" value={String(funnel.pipeline)} tone="cyan" sub="prospects en cours" />
        <FunnelStat label="RDV pris" value={String(funnel.rdv)} tone="amber" sub="appels à venir" />
        <FunnelStat label="Prospects gagnés" value={String(funnel.won)} tone="green" sub="convertis en clients" />
        <FunnelStat
          label="Taux de conversion"
          value={funnel.closingRate !== null ? `${funnel.closingRate}%` : "—"}
          tone={
            funnel.closingRate === null ? "gray" : funnel.closingRate >= 50 ? "green" : funnel.closingRate >= 25 ? "amber" : "red"
          }
          sub={
            funnel.closingRate !== null
              ? `${funnel.won} gagnés ÷ décidés`
              : "dès le 1er prospect décidé"
          }
        />
      </div>
      {funnel.topReason && funnel.topReason[1] >= 2 ? (
        <p className="mb-4 rounded-lg bg-[var(--tone-blue-bg)] px-3 py-2 text-sm text-[var(--tone-blue-fg)]">
          🧠 Objection la plus fréquente : « {funnel.topReason[0]} » (×
          {funnel.topReason[1]}) — un angle à travailler dans le contenu et le
          script de closing.
        </p>
      ) : null}

      {/* Tracker de prospection quotidien (V2) */}
      {trackerAvailable ? <ProspectingTracker days={prospectingDays} /> : null}

      {/* Ajout rapide */}
      <form
        onSubmit={onQuickAdd}
        className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface p-3"
      >
        <span className="text-lg font-bold text-primary">+</span>
        <input
          className={`${inputClass} min-w-40 flex-1`}
          placeholder="Nom ou @instagram du prospect…"
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
        />
        <select
          className={`${inputClass} w-auto`}
          value={quickStatus}
          onChange={(e) => setQuickStatus(e.target.value as ProspectStatus)}
        >
          {PROSPECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROSPECT_STATUS_META[s].label}
            </option>
          ))}
        </select>
        <PrimaryButton disabled={isPending || !quickName.trim()}>
          {isPending ? "Ajout…" : "Ajouter"}
        </PrimaryButton>
      </form>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="kanban-scroll flex gap-1.5 overflow-x-auto">
          <FilterChip
            active={statusFilter === "tous"}
            onClick={() => setStatusFilter("tous")}
            label={`Tous (${initialProspects.length})`}
          />
          {PROSPECT_STATUSES.map((s) => {
            const count = initialProspects.filter((p) => p.status === s).length;
            if (count === 0 && statusFilter !== s) return null;
            return (
              <FilterChip
                key={s}
                active={statusFilter === s}
                onClick={() => setStatusFilter(statusFilter === s ? "tous" : s)}
                label={`${PROSPECT_STATUS_META[s].label} (${count})`}
              />
            );
          })}
        </div>
        <select
          className={`${inputClass} ml-auto w-auto`}
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value as Assignee | "tous")}
        >
          <option value="tous">Assigné : tous</option>
          <option value="alex">Alex</option>
          <option value="sam">Sam</option>
        </select>
      </div>

      {/* Tableau */}
      {prospects.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Aucun prospect ici"
          hint="Ajoute ton premier prospect avec le champ ci-dessus, ou change de filtre."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <Th onClick={() => toggleSort("name")}>Nom{sortArrow("name")}</Th>
                <Th onClick={() => toggleSort("status")}>Statut{sortArrow("status")}</Th>
                <Th>Prochaine action</Th>
                <Th onClick={() => toggleSort("next_action_date")}>
                  Date{sortArrow("next_action_date")}
                </Th>
                <Th>RDV</Th>
                <Th>Assigné</Th>
              </tr>
            </thead>
            <tbody>
              {prospects.map((p) => {
                const toRelance =
                  isDueToday(p.next_action_date) &&
                  !["gagne", "perdu"].includes(p.status);
                return (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/prospects/${p.id}`)}
                    className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-background"
                  >
                    <td className="px-3 py-2.5 font-medium">
                      <Link
                        href={`/prospects/${p.id}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge
                        tone={PROSPECT_STATUS_META[p.status].tone}
                        label={PROSPECT_STATUS_META[p.status].label}
                      />
                    </td>
                    <td className="max-w-56 truncate px-3 py-2.5 text-muted">
                      {p.next_action ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        {formatDateShort(p.next_action_date)}
                        {toRelance ? (
                          <StatusBadge tone="red" label="À relancer" size="xs" />
                        ) : null}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                      {p.rdv_at ? formatDateTime(p.rdv_at) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {p.assignee ? (
                        <span className="inline-flex items-center gap-1.5">
                          <AssigneeChip
                            tone={ASSIGNEE_TONES[p.assignee]}
                            name={ASSIGNEE_LABELS[p.assignee]}
                          />
                          <span className="text-muted">
                            {ASSIGNEE_LABELS[p.assignee]}
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FunnelStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "gray" | "cyan" | "amber" | "green" | "red";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p
        className="glow-number mt-0.5 text-xl font-bold"
        style={{ color: `var(--tone-${tone}-fg)` }}
      >
        {value}
      </p>
      <p className="text-[11px] text-muted">{sub}</p>
    </div>
  );
}

function Th({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <th
      className={`px-3 py-2.5 font-medium ${onClick ? "cursor-pointer select-none hover:text-foreground" : ""}`}
      onClick={onClick}
    >
      {children}
    </th>
  );
}
