import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { computeDashboard } from "@/lib/dashboard";
import { globalInsights } from "@/lib/insights";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import {
  formatDateShort,
  formatDateTime,
  formatEUR,
  todayISO,
  tsToParisDateISO,
} from "@/lib/dates";
import {
  ASSIGNEE_LABELS,
  ASSIGNEE_TONES,
  CONTENT_STAGES,
  CONTENT_STAGE_META,
  PROSPECT_STATUS_META,
  TASK_PRIORITY_META,
  type Assignee,
  type Client,
  type ContentItem,
  type FollowupResponse,
  type Payment,
  type Prospect,
  type Task,
} from "@/lib/types";

// Dashboard — la vue matinale. Tout est agrégé en direct depuis les tables.
export default async function DashboardPage() {
  // Env absente : le layout affiche "Configuration requise", la page s'efface.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();

  const [tasksRes, prospectsRes, clientsRes, paymentsRes, contentsRes, followupsRes] =
    await Promise.all([
      supabase.from("tasks").select("*"),
      supabase.from("prospects").select("*"),
      supabase.from("clients").select("*"),
      supabase.from("payments").select("*"),
      supabase.from("content_items").select("*"),
      supabase.from("client_followup_response").select("*"),
    ]);

  const tasks = (tasksRes.data ?? []) as Task[];
  const prospects = (prospectsRes.data ?? []) as Prospect[];
  // Les clients archivés (corbeille) sortent de toutes les statistiques
  const clients = ((clientsRes.data ?? []) as Client[]).filter(
    (c) => !c.archived,
  );
  const clientIds = new Set(clients.map((c) => c.id));
  const payments = ((paymentsRes.data ?? []) as Payment[]).filter((p) =>
    clientIds.has(p.client_id),
  );

  const data = computeDashboard({
    tasks,
    prospects,
    clients,
    payments,
    contents: (contentsRes.data ?? []) as ContentItem[],
    today: todayISO(),
    now: new Date(),
  });

  // Insights par règles : regrouper paiements et retours par client
  const paymentsByClient = new Map<string, Payment[]>();
  for (const p of payments) {
    const list = paymentsByClient.get(p.client_id) ?? [];
    list.push(p);
    paymentsByClient.set(p.client_id, list);
  }
  const followupsByClient = new Map<string, FollowupResponse[]>();
  for (const f of (followupsRes.data ?? []) as FollowupResponse[]) {
    if (!clientIds.has(f.client_id)) continue;
    const list = followupsByClient.get(f.client_id) ?? [];
    list.push(f);
    followupsByClient.set(f.client_id, list);
  }
  const insights = globalInsights({
    tasks,
    prospects,
    clients,
    paymentsByClient,
    followupsByClient,
    today: todayISO(),
  });

  const { indicators: kpi } = data;
  const today = todayISO();
  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold lg:text-2xl">Bonjour 👋</h1>
        <p className="mt-0.5 text-sm capitalize text-muted">{todayLabel}</p>
      </div>

      {/* Analyse du matin — insights par règles */}
      <section className="rounded-xl border border-border bg-surface p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          💡 À savoir ce matin
        </p>
        <div className="flex flex-col gap-1.5">
          {insights.map((ins, i) => {
            const color =
              ins.tone === "red"
                ? "var(--tone-red-fg)"
                : ins.tone === "amber"
                  ? "var(--tone-amber-fg)"
                  : ins.tone === "green"
                    ? "var(--tone-green-fg)"
                    : "var(--tone-blue-fg)";
            const line = (
              <span className="text-sm leading-relaxed" style={{ color }}>
                {ins.text}
              </span>
            );
            return ins.href ? (
              <Link key={i} href={ins.href} className="hover:underline">
                {line}
              </Link>
            ) : (
              <p key={i}>{line}</p>
            );
          })}
        </div>
      </section>

      {/* Bloc 4 — Indicateurs clés */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Prospects actifs"
          value={kpi.prospectsActifs}
          sub="en conversation ou RDV pris"
          tone="cyan"
          href="/prospects"
        />
        <StatCard
          label="À relancer aujourd'hui"
          value={kpi.aRelancer}
          tone={kpi.aRelancer > 0 ? "red" : "green"}
          sub={kpi.aRelancer > 0 ? "ne les laisse pas refroidir" : "rien en attente"}
          href="/prospects"
        />
        <StatCard
          label="RDV cette semaine"
          value={kpi.rdvSemaine}
          tone="amber"
          href="/prospects"
        />
        <StatCard
          label="Clients actifs"
          value={kpi.clientsActifs}
          tone="green"
          href="/clients"
        />
        <StatCard
          label="CA encaissé ce mois"
          value={formatEUR(kpi.caEncaisseMois)}
          tone="green"
          href="/clients"
        />
        <StatCard
          label="Retards de paiement"
          value={kpi.paiementsEnRetardCount}
          sub={
            kpi.paiementsEnRetardCount > 0
              ? `${formatEUR(kpi.paiementsEnRetardSum)} à relancer${kpi.paiementsEnAttenteCount > 0 ? ` · ${formatEUR(kpi.paiementsEnAttenteSum)} à venir` : ""}`
              : kpi.paiementsEnAttenteCount > 0
                ? `${formatEUR(kpi.paiementsEnAttenteSum)} à encaisser (à venir)`
                : "tout est encaissé"
          }
          tone={kpi.paiementsEnRetardCount > 0 ? "red" : "green"}
          href="/clients"
        />
        <StatCard
          label="Contenus en cours"
          value={kpi.contenusEnCours}
          sub="entre script et programmation"
          tone="violet"
          href="/contenu"
        />
        <StatCard
          label="Tâches en retard"
          value={kpi.tachesEnRetard}
          tone={kpi.tachesEnRetard > 0 ? "red" : "green"}
          sub={kpi.tachesEnRetard > 0 ? "à rattraper" : "aucun retard"}
          href="/taches"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bloc 1 — Tâches du jour */}
        <Block title="Tâches du jour" href="/taches">
          {data.tasksToday.alex.length === 0 &&
          data.tasksToday.sam.length === 0 ? (
            <BlockEmpty text="Aucune tâche pour aujourd'hui 🎉" />
          ) : (
            <div className="flex flex-col gap-4">
              {(["alex", "sam"] as Assignee[]).map((who) =>
                data.tasksToday[who].length > 0 ? (
                  <div key={who}>
                    <p
                      className="mb-1.5 text-xs font-bold uppercase tracking-wide"
                      style={{ color: `var(--tone-${ASSIGNEE_TONES[who]}-fg)` }}
                    >
                      {ASSIGNEE_LABELS[who]}
                    </p>
                    <ul className="flex flex-col gap-1.5">
                      {data.tasksToday[who].map((t) => {
                        const late = t.due_date !== null && t.due_date < today;
                        return (
                          <li key={t.id} className="flex items-center gap-2 text-sm">
                            <StatusBadge
                              tone={TASK_PRIORITY_META[t.priority].tone}
                              label={TASK_PRIORITY_META[t.priority].label}
                              size="xs"
                            />
                            <span className={`truncate ${late ? "font-semibold text-danger" : ""}`}>
                              {t.title}
                            </span>
                            {t.due_date ? (
                              <span
                                className={`ml-auto shrink-0 text-xs ${late ? "font-bold text-danger" : "text-muted"}`}
                              >
                                {late ? "en retard · " : ""}
                                {formatDateShort(t.due_date)}
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null,
              )}
            </div>
          )}
        </Block>

        {/* Bloc 2 — Priorités de la semaine */}
        <Block title="Priorités de la semaine" href="/taches">
          {data.weekPriorities.length === 0 ? (
            <BlockEmpty text="Aucune tâche haute/urgente à 7 jours." />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.weekPriorities.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-sm">
                  <StatusBadge
                    tone={TASK_PRIORITY_META[t.priority].tone}
                    label={TASK_PRIORITY_META[t.priority].label}
                    size="xs"
                  />
                  <span className="truncate">{t.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted">
                    {ASSIGNEE_LABELS[t.assignee]} · {formatDateShort(t.due_date)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Block>

        {/* Bloc 3 — Rendez-vous */}
        <Block title="Prochains rendez-vous" href="/prospects">
          {data.upcomingRdv.length === 0 ? (
            <BlockEmpty text="Aucun RDV planifié sur les 7 prochains jours." />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {data.upcomingRdv.map((p) => {
                const isToday =
                  p.rdv_at !== null && tsToParisDateISO(p.rdv_at) === today;
                return (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    {isToday ? (
                      <StatusBadge tone="red" label="Aujourd'hui" size="xs" />
                    ) : null}
                    <Link
                      href={`/prospects/${p.id}`}
                      className={`truncate font-medium hover:underline ${isToday ? "font-bold" : ""}`}
                    >
                      {p.name}
                    </Link>
                    <StatusBadge
                      tone={PROSPECT_STATUS_META[p.status].tone}
                      label={PROSPECT_STATUS_META[p.status].label}
                      size="xs"
                    />
                    <span
                      className={`ml-auto shrink-0 text-xs ${isToday ? "font-bold text-danger" : "text-muted"}`}
                    >
                      {formatDateTime(p.rdv_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Block>

        {/* Bloc 5 — État des contenus */}
        <Block title="État des contenus" href="/contenu">
          <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {CONTENT_STAGES.map((s) => (
              <div
                key={s}
                className="flex flex-col items-center rounded-lg border border-border/70 bg-background/50 px-1 py-2"
              >
                <span
                  className="text-lg font-bold"
                  style={{ color: `var(--tone-${CONTENT_STAGE_META[s].tone}-fg)` }}
                >
                  {data.contentByStage[s]}
                </span>
                <span className="text-[10px] text-muted">
                  {CONTENT_STAGE_META[s].label}
                </span>
              </div>
            ))}
          </div>
          {data.nextScheduled.length > 0 ? (
            <>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
                Prochaines publications
              </p>
              <ul className="flex flex-col gap-1.5">
                {data.nextScheduled.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="truncate">{c.title}</span>
                    <span className="ml-auto shrink-0 text-xs font-medium text-[var(--tone-amber-fg)]">
                      📅 {formatDateShort(c.scheduled_date)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <BlockEmpty text="Rien de programmé pour l'instant." />
          )}
        </Block>
      </div>
    </div>
  );
}

function Block({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">{title}</h2>
        <Link
          href={href}
          className="text-xs font-medium text-primary hover:underline"
        >
          Voir tout →
        </Link>
      </div>
      {children}
    </section>
  );
}

function BlockEmpty({ text }: { text: string }) {
  return <p className="py-2 text-sm text-muted">{text}</p>;
}
