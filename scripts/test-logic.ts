// Tests de la logique métier pure (sans BDD) : npx tsx scripts/test-logic.ts
// Couvre : helpers de dates, statut effectif des paiements, agrégats du Dashboard.

import {
  addDaysISO,
  currentMonthBounds,
  formatEUR,
  isOverdue,
  isDueToday,
  isWithinNextDays,
  todayISO,
  tsToParisDateISO,
} from "../lib/dates";
import { effectivePaymentStatus } from "../lib/types";
import { computeDashboard } from "../lib/dashboard";
import { addMonthsISO, mondayOfWeekISO } from "../lib/dates";
import {
  installmentAmount,
  isSettled,
  nextDueDate,
  planState,
  revenueByMonth,
} from "../lib/paiements";
import {
  actionRate,
  churnRisk,
  completionRate,
  noStreak,
  toPoints,
  weeksSilent,
} from "../lib/suivi";
import { clientInsights } from "../lib/insights";
import type {
  Client,
  ContentItem,
  Payment,
  Prospect,
  Task,
} from "../lib/types";

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name}\n      attendu ${e}\n      obtenu  ${a}`);
  }
}

// ---------------------------------------------------------------------------
console.log("\n— lib/dates —");
const today = todayISO();
check("todayISO est au format YYYY-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(today), true);
check("addDaysISO +1", addDaysISO("2026-07-02", 1), "2026-07-03");
check("addDaysISO passage de mois", addDaysISO("2026-06-30", 1), "2026-07-01");
check("addDaysISO passage d'année", addDaysISO("2025-12-31", 1), "2026-01-01");
check("addDaysISO année bissextile", addDaysISO("2028-02-28", 1), "2028-02-29");
check("addDaysISO négatif", addDaysISO("2026-07-01", -1), "2026-06-30");
check("isOverdue hier", isOverdue(addDaysISO(today, -1)), true);
check("isOverdue aujourd'hui = false", isOverdue(today), false);
check("isOverdue null = false", isOverdue(null), false);
check("isDueToday aujourd'hui", isDueToday(today), true);
check("isDueToday hier (en retard = à relancer)", isDueToday(addDaysISO(today, -1)), true);
check("isDueToday demain = false", isDueToday(addDaysISO(today, 1)), false);
check("isWithinNextDays borne 7 incluse", isWithinNextDays(addDaysISO(today, 7), 7), true);
check("isWithinNextDays 8 jours = false", isWithinNextDays(addDaysISO(today, 8), 7), false);
check("isWithinNextDays passé = false", isWithinNextDays(addDaysISO(today, -1), 7), false);

const bounds = currentMonthBounds();
check("currentMonthBounds start = 1er du mois", bounds.start.endsWith("-01"), true);
check("currentMonthBounds même mois", bounds.start.slice(0, 7) === today.slice(0, 7), true);
check("currentMonthBounds end >= today", bounds.end >= today, true);

// Un timestamptz tard le soir UTC bascule au lendemain en heure de Paris (été : UTC+2)
check(
  "tsToParisDateISO gère le fuseau (23h UTC en été -> lendemain à Paris)",
  tsToParisDateISO("2026-07-02T23:00:00Z"),
  "2026-07-03",
);
check("formatEUR entier", formatEUR(1600), "1 600 €");
check("formatEUR décimales", formatEUR(450.5), "450,50 €");

// ---------------------------------------------------------------------------
console.log("\n— effectivePaymentStatus —");
check(
  "en_attente échu -> en_retard",
  effectivePaymentStatus({ status: "en_attente", due_date: addDaysISO(today, -1) }, today),
  "en_retard",
);
check(
  "en_attente échéance aujourd'hui -> reste en_attente",
  effectivePaymentStatus({ status: "en_attente", due_date: today }, today),
  "en_attente",
);
check(
  "en_attente futur -> en_attente",
  effectivePaymentStatus({ status: "en_attente", due_date: addDaysISO(today, 5) }, today),
  "en_attente",
);
check(
  "en_attente sans échéance -> en_attente",
  effectivePaymentStatus({ status: "en_attente", due_date: null }, today),
  "en_attente",
);
check(
  "paye échu -> reste paye",
  effectivePaymentStatus({ status: "paye", due_date: addDaysISO(today, -10) }, today),
  "paye",
);

// ---------------------------------------------------------------------------
console.log("\n— computeDashboard —");

const base = { id: "x", created_at: "", updated_at: "" };
const tasks: Task[] = [
  // due aujourd'hui, à faire -> tâche du jour Alex
  { ...base, id: "t1", title: "A", description: null, assignee: "alex", priority: "haute", status: "a_faire", due_date: today },
  // en cours sans date -> tâche du jour Sam
  { ...base, id: "t2", title: "B", description: null, assignee: "sam", priority: "moyenne", status: "en_cours", due_date: null },
  // en retard, non terminée -> compteur retard (et pas tâche du jour : ni auj. ni en cours)
  { ...base, id: "t3", title: "C", description: null, assignee: "alex", priority: "urgente", status: "bloque", due_date: addDaysISO(today, -3) },
  // terminée en retard -> ne compte pas
  { ...base, id: "t4", title: "D", description: null, assignee: "alex", priority: "haute", status: "termine", due_date: addDaysISO(today, -3) },
  // haute à 5 jours -> priorité semaine
  { ...base, id: "t5", title: "E", description: null, assignee: "sam", priority: "haute", status: "a_faire", due_date: addDaysISO(today, 5) },
  // haute à 10 jours -> hors semaine
  { ...base, id: "t6", title: "F", description: null, assignee: "alex", priority: "haute", status: "a_faire", due_date: addDaysISO(today, 10) },
  // basse à 2 jours -> pas une priorité
  { ...base, id: "t7", title: "G", description: null, assignee: "alex", priority: "basse", status: "a_faire", due_date: addDaysISO(today, 2) },
];

const pBase = { source: "instagram", assignee: null, next_action: null, notes: null, lost_reason: null, email: null, phone: null, instagram: null, pain: null, desired: null, objective: null, objections: null };
const prospects: Prospect[] = [
  { ...base, ...pBase, id: "p1", name: "@a", status: "en_conversation", next_action_date: today, rdv_at: null },
  { ...base, ...pBase, id: "p2", name: "@b", status: "rdv_pris", next_action_date: null, rdv_at: new Date(Date.now() + 24 * 3600e3).toISOString() },
  { ...base, ...pBase, id: "p3", name: "@c", status: "contacte", next_action_date: addDaysISO(today, -2), rdv_at: null },
  // perdu avec relance passée -> exclu du "à relancer"
  { ...base, ...pBase, id: "p4", name: "@d", status: "perdu", next_action_date: addDaysISO(today, -2), rdv_at: null },
  // RDV dans le passé -> pas dans les prochains RDV
  { ...base, ...pBase, id: "p5", name: "@e", status: "no_show", next_action_date: null, rdv_at: new Date(Date.now() - 24 * 3600e3).toISOString() },
  // RDV dans 10 jours -> hors semaine
  { ...base, ...pBase, id: "p6", name: "@f", status: "rdv_pris", next_action_date: null, rdv_at: new Date(Date.now() + 10 * 24 * 3600e3).toISOString() },
];

const cBase = { contact: null, email: null, instagram: null, phone: null, last_contact_date: null, archived: false, archived_at: null, offer: null, progress: null, start_date: null, next_action: null, next_action_date: null, notes: null, form_token: "tok", price_total: null, installments: null, first_payment_date: null };
const clients: Client[] = [
  { ...base, ...cBase, id: "c1", name: "C1", status: "actif" },
  { ...base, ...cBase, id: "c2", name: "C2", status: "actif" },
  { ...base, ...cBase, id: "c3", name: "C3", status: "pause" },
];

const payBase = { client_id: "c1", currency: "EUR", notes: null };
const payments: Payment[] = [
  // payé ce mois -> CA
  { ...base, ...payBase, id: "m1", amount: 450, status: "paye", due_date: null, paid_date: today },
  // payé le mois dernier -> hors CA du mois
  { ...base, ...payBase, id: "m2", amount: 999, status: "paye", due_date: null, paid_date: addDaysISO(bounds.start, -1) },
  // en attente échu -> à risque (en retard)
  { ...base, ...payBase, id: "m3", amount: 450, status: "en_attente", due_date: addDaysISO(today, -4), paid_date: null },
  // en attente futur -> à risque aussi
  { ...base, ...payBase, id: "m4", amount: 300, status: "en_attente", due_date: addDaysISO(today, 20), paid_date: null },
];

const ctBase = { notes: null, assignee: null, published_date: null, link: null };
const contents: ContentItem[] = [
  { ...base, ...ctBase, id: "k1", title: "I", platform: "instagram", stage: "idee", scheduled_date: null },
  { ...base, ...ctBase, id: "k2", title: "S", platform: "tiktok", stage: "script", scheduled_date: null },
  { ...base, ...ctBase, id: "k3", title: "M", platform: "instagram", stage: "montage", scheduled_date: null },
  { ...base, ...ctBase, id: "k4", title: "P1", platform: "instagram", stage: "programme", scheduled_date: addDaysISO(today, 2) },
  { ...base, ...ctBase, id: "k5", title: "P2", platform: "tiktok", stage: "programme", scheduled_date: addDaysISO(today, 1) },
  { ...base, ...ctBase, id: "k6", title: "Pub", platform: "tiktok", stage: "publie", scheduled_date: null },
];

const d = computeDashboard({
  tasks,
  prospects,
  clients,
  payments,
  contents,
  today,
  now: new Date(),
});

check("tâches du jour Alex (due auj.)", d.tasksToday.alex.map((t) => t.id), ["t1"]);
check("tâches du jour Sam (en cours)", d.tasksToday.sam.map((t) => t.id), ["t2"]);
// t1 (haute, due aujourd'hui) apparaît AUSSI ici : "dans les 7 prochains jours"
// inclut aujourd'hui (docs/03, bloc 2) — la redondance avec le bloc 1 est voulue.
check("priorités semaine = haute/urgente à 7j non terminées", d.weekPriorities.map((t) => t.id), ["t1", "t5"]);
check("tâches en retard (non terminées)", d.indicators.tachesEnRetard, 1);
check("prospects actifs (conv + rdv)", d.indicators.prospectsActifs, 3);
check("à relancer (échue, hors perdu/gagné)", d.indicators.aRelancer, 2);
check("RDV semaine (futurs, <=7j)", d.indicators.rdvSemaine, 1);
check("RDV triés et filtrés", d.upcomingRdv.map((p) => p.id), ["p2"]);
check("clients actifs", d.indicators.clientsActifs, 2);
check("CA encaissé ce mois", d.indicators.caEncaisseMois, 450);
check("paiements en retard (count)", d.indicators.paiementsEnRetardCount, 1);
check("paiements en retard (somme)", d.indicators.paiementsEnRetardSum, 450);
check("paiements en attente (count)", d.indicators.paiementsEnAttenteCount, 1);
check("paiements en attente (somme)", d.indicators.paiementsEnAttenteSum, 300);
check("contenus en cours (hors idée/publié)", d.indicators.contenusEnCours, 4);
check("répartition par étape", d.contentByStage, {
  idee: 1, script: 1, tournage: 0, montage: 1, programme: 2, publie: 1,
});
check("prochains programmés triés par date", d.nextScheduled.map((c) => c.id), ["k5", "k4"]);

// ---------------------------------------------------------------------------
console.log("\n— lib/paiements (moteur de paiement) —");
{
  check("addMonthsISO simple", addMonthsISO("2026-03-15", 1), "2026-04-15");
  check("addMonthsISO fin de mois (31 janv +1 = 28 févr)", addMonthsISO("2026-01-31", 1), "2026-02-28");
  check("addMonthsISO bissextile (31 janv 2028 +1 = 29 févr)", addMonthsISO("2028-01-31", 1), "2028-02-29");
  check("addMonthsISO passage d'année", addMonthsISO("2026-11-30", 2), "2027-01-30");
  check("addMonthsISO négatif", addMonthsISO("2026-03-31", -1), "2026-02-28");

  const plan3x = { price_total: 1350, installments: 3, first_payment_date: "2026-05-10" };
  const paye = { status: "paye" as const };
  const attente = { status: "en_attente" as const };

  check("montant par échéance 1350/3", installmentAmount(plan3x), 450);
  check("montant arrondi 1000/3", installmentAmount({ ...plan3x, price_total: 1000 }), 333.33);
  check("pas de plan -> pas de montant", installmentAmount({ price_total: null, installments: null, first_payment_date: null }), null);
  check("prochaine échéance (0 payé) = 1er paiement", nextDueDate(plan3x, []), "2026-05-10");
  check("prochaine échéance (1 payé) = +1 mois", nextDueDate(plan3x, [paye]), "2026-06-10");
  check("prochaine échéance (2 payés) = +2 mois", nextDueDate(plan3x, [paye, paye]), "2026-07-10");
  check("soldé (3 payés) -> plus d'échéance", nextDueDate(plan3x, [paye, paye, paye]), null);
  check("les en_attente ne comptent pas comme payés", nextDueDate(plan3x, [paye, attente]), "2026-06-10");
  check("isSettled 3/3", isSettled(plan3x, [paye, paye, paye]), true);
  check("paiement unique payé -> soldé, jamais de relance", isSettled({ ...plan3x, installments: 1 }, [paye]), true);

  check("planState en retard (échéance passée)", planState(plan3x, [paye], "2026-06-15").kind, "en_retard");
  check("planState en cours (échéance future)", planState(plan3x, [paye], "2026-06-05").kind, "en_cours");
  check("planState soldé", planState(plan3x, [paye, paye, paye], "2026-08-01").kind, "solde");
  check("planState sans plan", planState({ price_total: null, installments: null, first_payment_date: null }, [], today).kind, "aucun");

  const revs = revenueByMonth(
    [
      { status: "paye", paid_date: "2026-07-02", amount: 450 },
      { status: "paye", paid_date: "2026-07-20", amount: 300 },
      { status: "paye", paid_date: "2026-06-10", amount: 450 },
      { status: "en_attente", paid_date: "2026-07-02", amount: 999 },
      { status: "paye", paid_date: "2025-12-01", amount: 999 },
    ],
    "2026-07-04",
    3,
  );
  check("revenueByMonth : 3 mois du plus ancien au plus récent", revs.map((r) => r.month), ["2026-05", "2026-06", "2026-07"]);
  check("revenueByMonth : sommes justes (en_attente et hors fenêtre exclus)", revs.map((r) => r.total), [0, 450, 750]);
}

console.log("\n— lib/suivi (passage à l'action, risque) —");
{
  const addD = addDaysISO;
  const monday = mondayOfWeekISO(today);
  const fu = (weeksAgo: number, answers: Record<string, string>) => ({
    id: `f${weeksAgo}`, client_id: "c", period: addD(monday, -7 * weeksAgo),
    submitted_at: "", answers,
  });

  check("mondayOfWeekISO d'un samedi", mondayOfWeekISO("2026-07-04"), "2026-06-29");
  check("mondayOfWeekISO d'un lundi = lui-même", mondayOfWeekISO("2026-06-29"), "2026-06-29");
  check("mondayOfWeekISO d'un dimanche", mondayOfWeekISO("2026-07-05"), "2026-06-29");

  const hist = [
    fu(3, { actions_faites: "Oui", satisfaction: "5", forme: "8" }),
    fu(2, { actions_faites: "Oui", satisfaction: "4" }),
    fu(1, { actions_faites: "Non", satisfaction: "3" }),
    fu(0, { actions_faites: "Non", satisfaction: "3", blocages: "trop de taf" }),
  ];
  check("actionRate 2 Oui / 4 = 50%", actionRate(toPoints(hist), today), 50);
  check("noStreak : 2 Non consécutifs", noStreak(toPoints(hist)), 2);
  check("noStreak : cassé par un Oui", noStreak(toPoints([fu(1, { actions_faites: "Non" }), fu(0, { actions_faites: "Oui" })])), 0);
  check("completionRate 4/4 semaines", completionRate(hist, today), 100);
  check("completionRate 2/4 semaines", completionRate([hist[0], hist[3]], today), 50);
  check("weeksSilent : a répondu cette semaine", weeksSilent(hist, today), 0);
  check("weeksSilent : dernier retour il y a 3 semaines", weeksSilent([fu(3, {})], today), 3);

  check("churnRisk : aucun retour -> neutre", churnRisk([], today).level, "aucun_retour");
  check("churnRisk : historique sain -> faible", churnRisk([fu(1, { actions_faites: "Oui", satisfaction: "5" }), fu(0, { actions_faites: "Oui", satisfaction: "5" })], today).level, "faible");
  check(
    "churnRisk : silence + satisfaction basse -> élevé",
    churnRisk([fu(3, { satisfaction: "2", actions_faites: "Non" })], today).level,
    "eleve",
  );
  check("churnRisk : 2 Non -> moyen", churnRisk(hist, today).level, "moyen");
}

console.log("\n— lib/insights —");
{
  const clientBase = {
    id: "c1", name: "Test", contact: null, email: null, instagram: null, phone: null, last_contact_date: null, archived: false, archived_at: null, status: "actif" as const,
    offer: null, progress: null, start_date: null, next_action: null,
    next_action_date: null, notes: null, form_token: "t",
    price_total: 900, installments: 2, first_payment_date: addDaysISO(today, -40),
    created_at: "", updated_at: "",
  };
  const payePayment = {
    id: "p1", client_id: "c1", amount: 450, currency: "EUR", status: "paye" as const,
    due_date: null, paid_date: addDaysISO(today, -40), notes: null, created_at: "", updated_at: "",
  };
  const ins = clientInsights({ client: clientBase, payments: [payePayment], followups: [], today });
  check("insight paiement en retard détecté", ins.some((i) => i.text.includes("en retard")), true);
  check("insight aucun retour hebdo", ins.some((i) => i.text.includes("Aucun retour hebdo")), true);
}

// ---------------------------------------------------------------------------
console.log(`\n${passed} tests OK, ${failed} en échec.`);
if (failed > 0) process.exit(1);
