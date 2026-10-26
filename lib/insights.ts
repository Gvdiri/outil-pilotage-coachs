// Moteur d'insights par règles ("pseudo-IA" sans IA) : produit des phrases
// concrètes et actionnables depuis les données. Logique pure, testable.
// Principe : chaque phrase appelle une action — jamais de bruit.

import {
  actionRate,
  churnRisk,
  completionRate,
  noStreak,
  toPoints,
  weeksSilent,
} from "./suivi";
import { planState, revenueBetween } from "./paiements";
import { addDaysISO, addMonthsISO, currentMonthBounds, formatEUR } from "./dates";
import type {
  Client,
  FollowupResponse,
  Payment,
  Prospect,
  Task,
} from "./types";

export interface Insight {
  tone: "green" | "amber" | "red" | "blue";
  text: string;
  href?: string;
}

// ---------------------------------------------------------------------------
// Insights globaux (Dashboard) — max ~6 lignes, priorisées par gravité
// ---------------------------------------------------------------------------
export function globalInsights(input: {
  tasks: Task[];
  prospects: Prospect[];
  clients: Client[];
  paymentsByClient: Map<string, Payment[]>;
  followupsByClient: Map<string, FollowupResponse[]>;
  today: string;
}): Insight[] {
  const { tasks, prospects, clients, paymentsByClient, followupsByClient, today } =
    input;
  const red: Insight[] = [];
  const amber: Insight[] = [];
  const green: Insight[] = [];
  const blue: Insight[] = [];

  const actifs = clients.filter((c) => c.status === "actif");

  // Paiements en retard (plans)
  const latePlans = actifs.filter(
    (c) =>
      planState(c, paymentsByClient.get(c.id) ?? [], today).kind === "en_retard",
  );
  if (latePlans.length > 0) {
    red.push({
      tone: "red",
      text: `💸 Échéance en retard : ${latePlans.map((c) => c.name).join(", ")} — relance à faire.`,
      href: "/clients",
    });
  }

  // Clients à risque élevé
  const risky = actifs.filter(
    (c) => churnRisk(followupsByClient.get(c.id) ?? [], today).level === "eleve",
  );
  if (risky.length > 0) {
    red.push({
      tone: "red",
      text: `🚨 Client${risky.length > 1 ? "s" : ""} à risque : ${risky.map((c) => c.name).join(", ")} — prends de leurs nouvelles.`,
      href: "/clients",
    });
  }

  // Séries de "Non" au passage à l'action
  const stuck = actifs.filter(
    (c) => noStreak(toPoints(followupsByClient.get(c.id) ?? [])) >= 2,
  );
  for (const c of stuck) {
    if (!risky.includes(c)) {
      amber.push({
        tone: "amber",
        text: `⛔ ${c.name} ne passe plus à l'action (2+ semaines) — point de recadrage conseillé.`,
        href: `/clients/${c.id}`,
      });
    }
  }

  // Clients silencieux (plus de retours hebdo)
  const silent = actifs.filter((c) => {
    const f = followupsByClient.get(c.id) ?? [];
    return f.length > 0 && weeksSilent(f, today) >= 2;
  });
  if (silent.length > 0 && silent.some((c) => !risky.includes(c))) {
    amber.push({
      tone: "amber",
      text: `🔕 Sans retour hebdo depuis 2+ semaines : ${silent.map((c) => c.name).join(", ")}.`,
      href: "/clients",
    });
  }

  // Prospects à relancer
  const toFollow = prospects.filter(
    (p) =>
      p.next_action_date !== null &&
      p.next_action_date <= today &&
      !["gagne", "perdu"].includes(p.status),
  );
  if (toFollow.length > 0) {
    amber.push({
      tone: "amber",
      text: `🎯 ${toFollow.length} prospect${toFollow.length > 1 ? "s" : ""} à relancer aujourd'hui — un prospect chaud refroidit vite.`,
      href: "/prospects",
    });
  }

  // Tâches en retard
  const lateTasks = tasks.filter(
    (t) => t.due_date !== null && t.due_date < today && t.status !== "termine",
  );
  if (lateTasks.length > 0) {
    amber.push({
      tone: "amber",
      text: `⏰ ${lateTasks.length} tâche${lateTasks.length > 1 ? "s" : ""} en retard à rattraper ou replanifier.`,
      href: "/taches",
    });
  }

  // CA : encaissé ce mois + comparaison avec le mois précédent complet
  const allPayments = [...paymentsByClient.values()].flat();
  const { start, end } = currentMonthBounds();
  const caNow = revenueBetween(allPayments, start, end);
  const caPrev = revenueBetween(
    allPayments,
    addMonthsISO(start, -1),
    addDaysISO(start, -1),
  );
  if (caNow > 0) {
    green.push({
      tone: "green",
      text: `📈 ${formatEUR(caNow)} encaissés ce mois-ci${
        caPrev > 0 && caNow >= caPrev ? " — déjà au-dessus du mois dernier" : ""
      }.`,
      href: "/clients",
    });
  }

  // Raison de perte la plus fréquente (data d'objections)
  const reasons = prospects
    .filter((p) => p.status === "perdu" && p.lost_reason)
    .map((p) => p.lost_reason!.trim().toLowerCase());
  if (reasons.length >= 2) {
    const counts = new Map<string, number>();
    for (const r of reasons) counts.set(r, (counts.get(r) ?? 0) + 1);
    const [top, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (n >= 2) {
      blue.push({
        tone: "blue",
        text: `🧠 Objection la plus fréquente : « ${top} » (×${n}) — un angle à travailler dans le contenu.`,
      });
    }
  }

  const all = [...red, ...amber, ...green, ...blue];
  if (all.length === 0) {
    return [
      {
        tone: "green",
        text: "✅ Tout est au vert : pas de retard, pas de client à risque, pas de relance en attente.",
      },
    ];
  }
  return all.slice(0, 6);
}

// ---------------------------------------------------------------------------
// Insights par client (fiche) — état paiement, engagement, satisfaction
// ---------------------------------------------------------------------------
export function clientInsights(input: {
  client: Client;
  payments: Payment[];
  followups: FollowupResponse[];
  today: string;
}): Insight[] {
  const { client, payments, followups, today } = input;
  const out: Insight[] = [];
  const points = toPoints(followups);

  // Paiement
  const plan = planState(client, payments, today);
  if (plan.kind === "en_retard") {
    out.push({
      tone: "red",
      text: `💸 Échéance ${plan.paid + 1}/${plan.total} en retard (${formatEUR(plan.amount)}) — à relancer.`,
    });
  } else if (plan.kind === "solde") {
    out.push({
      tone: "green",
      text: `💰 Paiement soldé (${plan.total}/${plan.total} échéances) — penser au renouvellement.`,
    });
  }

  // Passage à l'action
  const rate = actionRate(points, today);
  const streak = noStreak(points);
  if (streak >= 2) {
    out.push({
      tone: "red",
      text: `⛔ ${streak} semaines consécutives sans passage à l'action — point de recadrage nécessaire.`,
    });
  } else if (rate !== null) {
    if (rate >= 75) {
      out.push({ tone: "green", text: `🔥 Passage à l'action : ${rate}% sur 4 semaines — il/elle avance.` });
    } else if (rate < 50) {
      out.push({ tone: "amber", text: `🐢 Passage à l'action : ${rate}% sur 4 semaines — à challenger.` });
    }
  }

  // Satisfaction : niveau + tendance
  const sats = points.filter((p) => p.satisfaction !== null);
  if (sats.length > 0) {
    const last = sats[sats.length - 1].satisfaction!;
    if (last <= 2) {
      out.push({ tone: "red", text: `😟 Satisfaction basse (${last}/5) au dernier retour — à creuser en appel.` });
    } else if (sats.length >= 3) {
      const prev = sats[sats.length - 2].satisfaction!;
      const prev2 = sats[sats.length - 3].satisfaction!;
      if (last < prev && prev < prev2) {
        out.push({ tone: "amber", text: `📉 Satisfaction en baisse ${prev2} → ${prev} → ${last} — signal à ne pas ignorer.` });
      } else if (last > prev && prev > prev2) {
        out.push({ tone: "green", text: `📈 Satisfaction en hausse ${prev2} → ${prev} → ${last}.` });
      }
    }
  }

  // Blocage signalé (verbatim du dernier retour)
  const lastFollowup = [...followups].sort((a, b) =>
    a.period.localeCompare(b.period),
  ).at(-1);
  const blocage = lastFollowup?.answers.blocages?.trim();
  if (blocage) {
    out.push({ tone: "amber", text: `🧱 Blocage signalé : « ${blocage.slice(0, 120)} »` });
  }

  // Régularité des retours
  if (followups.length > 0) {
    const silent = weeksSilent(followups, today);
    const completion = completionRate(followups, today);
    if (silent >= 2) {
      out.push({ tone: "red", text: `🔕 Aucun retour depuis ${silent} semaines — un client qui se tait décroche souvent.` });
    } else if (completion === 100) {
      out.push({ tone: "green", text: "✅ Retours hebdo remplis toutes les semaines — très engagé(e)." });
    }
  } else if (client.status === "actif") {
    out.push({ tone: "amber", text: "📭 Aucun retour hebdo pour l'instant — envoie-lui le lien de suivi." });
  }

  return out;
}
