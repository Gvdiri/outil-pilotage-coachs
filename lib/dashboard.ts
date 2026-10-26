// Logique pure du Dashboard (docs/03) : aucun accès BDD, 100 % testable.
// Tout est agrégé depuis les tables — rien n'est stocké en plus.

import {
  effectivePaymentStatus,
  type Assignee,
  type Client,
  type ContentItem,
  type ContentStage,
  type Payment,
  type Prospect,
  type Task,
} from "./types";
import { addDaysISO, currentMonthBounds, tsToParisDateISO } from "./dates";

export interface DashboardIndicators {
  prospectsActifs: number; // en_conversation ou rdv_pris
  aRelancer: number; // next_action_date <= aujourd'hui (hors gagné/perdu)
  rdvSemaine: number; // rdv_at dans les 7 prochains jours
  clientsActifs: number;
  caEncaisseMois: number; // somme des payés du mois en cours
  paiementsEnRetardCount: number; // échéances effectivement en retard
  paiementsEnRetardSum: number;
  paiementsEnAttenteCount: number; // en attente non échues
  paiementsEnAttenteSum: number;
  contenusEnCours: number; // tout sauf idée et publié
  tachesEnRetard: number; // due_date < aujourd'hui, non terminées
}

export interface DashboardData {
  indicators: DashboardIndicators;
  tasksToday: Record<Assignee, Task[]>; // limite = aujourd'hui OU en cours
  weekPriorities: Task[]; // haute/urgente à 7 jours, non terminées
  upcomingRdv: Prospect[]; // rdv_at à venir (7 jours), triés
  contentByStage: Record<ContentStage, number>;
  nextScheduled: ContentItem[]; // prochains "Programmé" avec date
}

export function computeDashboard(input: {
  tasks: Task[];
  prospects: Prospect[];
  clients: Client[];
  payments: Payment[];
  contents: ContentItem[];
  today: string; // ISO Europe/Paris
  now: Date;
}): DashboardData {
  const { tasks, prospects, clients, payments, contents, today, now } = input;
  const weekEnd = addDaysISO(today, 7);
  const { start: monthStart, end: monthEnd } = currentMonthBounds();

  // --- Bloc 1 : tâches du jour (limite = aujourd'hui OU statut en cours) ---
  const isTodayTask = (t: Task) =>
    t.status !== "termine" && (t.due_date === today || t.status === "en_cours");
  const overdueFirst = (a: Task, b: Task) =>
    (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999");
  const tasksToday: Record<Assignee, Task[]> = {
    alex: tasks.filter((t) => isTodayTask(t) && t.assignee === "alex").sort(overdueFirst),
    sam: tasks.filter((t) => isTodayTask(t) && t.assignee === "sam").sort(overdueFirst),
  };

  // --- Bloc 2 : priorités de la semaine ---
  const weekPriorities = tasks
    .filter(
      (t) =>
        t.status !== "termine" &&
        (t.priority === "haute" || t.priority === "urgente") &&
        t.due_date !== null &&
        t.due_date >= today &&
        t.due_date <= weekEnd,
    )
    .sort(
      (a, b) =>
        (a.due_date ?? "").localeCompare(b.due_date ?? "") ||
        (a.priority === "urgente" ? -1 : 1) - (b.priority === "urgente" ? -1 : 1),
    );

  // --- Bloc 3 : RDV à venir (aujourd'hui + 7 jours) ---
  const upcomingRdv = prospects
    .filter((p) => {
      if (!p.rdv_at) return false;
      const d = new Date(p.rdv_at);
      if (d.getTime() < now.getTime()) return false;
      return tsToParisDateISO(p.rdv_at) <= weekEnd;
    })
    .sort((a, b) => (a.rdv_at ?? "").localeCompare(b.rdv_at ?? ""));

  // --- Bloc 4 : indicateurs ---
  const activeStatuses = ["en_conversation", "rdv_pris"];
  const prospectsActifs = prospects.filter((p) =>
    activeStatuses.includes(p.status),
  ).length;

  const aRelancer = prospects.filter(
    (p) =>
      p.next_action_date !== null &&
      p.next_action_date <= today &&
      !["gagne", "perdu"].includes(p.status),
  ).length;

  const clientsActifs = clients.filter((c) => c.status === "actif").length;

  const caEncaisseMois = payments
    .filter(
      (p) =>
        p.status === "paye" &&
        p.paid_date !== null &&
        p.paid_date >= monthStart &&
        p.paid_date <= monthEnd,
    )
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Retard (échéance dépassée) et attente (à venir) séparés : le retard est
  // l'info actionnable, l'attente est juste "à encaisser".
  const enRetard = payments.filter(
    (p) => effectivePaymentStatus(p, today) === "en_retard",
  );
  const enAttente = payments.filter(
    (p) => effectivePaymentStatus(p, today) === "en_attente",
  );
  const sum = (arr: Payment[]) => arr.reduce((s, p) => s + Number(p.amount), 0);

  const tachesEnRetard = tasks.filter(
    (t) => t.due_date !== null && t.due_date < today && t.status !== "termine",
  ).length;

  // --- Bloc 5 : état des contenus ---
  const contentByStage = {
    idee: 0,
    script: 0,
    tournage: 0,
    montage: 0,
    programme: 0,
    publie: 0,
  } as Record<ContentStage, number>;
  for (const c of contents) contentByStage[c.stage]++;

  const contenusEnCours = contents.filter(
    (c) => c.stage !== "idee" && c.stage !== "publie",
  ).length;

  const nextScheduled = contents
    .filter((c) => c.stage === "programme" && c.scheduled_date !== null)
    .sort((a, b) =>
      (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""),
    )
    .slice(0, 5);

  return {
    indicators: {
      prospectsActifs,
      aRelancer,
      rdvSemaine: upcomingRdv.length,
      clientsActifs,
      caEncaisseMois,
      paiementsEnRetardCount: enRetard.length,
      paiementsEnRetardSum: sum(enRetard),
      paiementsEnAttenteCount: enAttente.length,
      paiementsEnAttenteSum: sum(enAttente),
      contenusEnCours,
      tachesEnRetard,
    },
    tasksToday,
    weekPriorities,
    upcomingRdv,
    contentByStage,
    nextScheduled,
  };
}
