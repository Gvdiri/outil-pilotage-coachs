// Logique pure du suivi client (delivery) : passage à l'action, complétion
// des retours, score de risque. Aucune BDD — 100 % testable.
//
// Les stats sont RÉSILIENTES : un champ absent (formulaire modifié par le
// coach) rend simplement la stat neutre, il ne casse jamais rien.

import { addDaysISO, mondayOfWeekISO } from "./dates";
import type { FollowupResponse } from "./types";

export interface SuiviPoint {
  period: string; // lundi de la semaine ISO
  satisfaction: number | null; // 1..5
  forme: number | null; // 1..10
  actionsFaites: boolean | null; // Oui/Non
}

function num(v: string | undefined): number | null {
  if (v === undefined || v === "") return null;
  const n = parseFloat(String(v).replace("+", ""));
  return Number.isFinite(n) ? n : null;
}

/** Transforme l'historique jsonb en points exploitables, du plus ancien au plus récent. */
export function toPoints(followups: FollowupResponse[]): SuiviPoint[] {
  return [...followups]
    .sort((a, b) => a.period.localeCompare(b.period))
    .map((f) => ({
      period: f.period,
      satisfaction: num(f.answers.satisfaction),
      forme: num(f.answers.forme),
      actionsFaites:
        f.answers.actions_faites === "Oui"
          ? true
          : f.answers.actions_faites === "Non"
            ? false
            : null,
    }));
}

/** % de "Oui" au passage à l'action sur les `weeks` dernières semaines. null si aucune donnée. */
export function actionRate(
  points: SuiviPoint[],
  todayISO: string,
  weeks = 4,
): number | null {
  const since = addDaysISO(mondayOfWeekISO(todayISO), -7 * (weeks - 1));
  const relevant = points.filter(
    (p) => p.period >= since && p.actionsFaites !== null,
  );
  if (relevant.length === 0) return null;
  const yes = relevant.filter((p) => p.actionsFaites === true).length;
  return Math.round((yes / relevant.length) * 100);
}

/**
 * Élan (momentum) du passage à l'action : score cumulé qui MONTE à chaque
 * semaine avec action (+1) et DESCEND sans action (-1). Visualise si le client
 * avance vers son objectif ou décroche. Renvoie une valeur par semaine.
 */
export function actionMomentum(
  points: SuiviPoint[],
): { period: string; value: number }[] {
  let score = 0;
  const out: { period: string; value: number }[] = [];
  for (const p of points) {
    if (p.actionsFaites === true) score += 1;
    else if (p.actionsFaites === false) score -= 1;
    out.push({ period: p.period, value: score });
  }
  return out;
}

/** Nombre de "Non" consécutifs en fin d'historique (≥ 2 = recadrage nécessaire). */
export function noStreak(points: SuiviPoint[]): number {
  let streak = 0;
  for (let i = points.length - 1; i >= 0; i--) {
    const v = points[i].actionsFaites;
    if (v === false) streak++;
    else if (v === true) break;
    // null (question non posée cette semaine-là) : on ignore, on continue
  }
  return streak;
}

/** Retours reçus ÷ attendus sur les `weeks` dernières semaines (en %). */
export function completionRate(
  followups: Pick<FollowupResponse, "period">[],
  todayISO: string,
  weeks = 4,
): number {
  const monday = mondayOfWeekISO(todayISO);
  const expected: string[] = [];
  for (let i = 0; i < weeks; i++) expected.push(addDaysISO(monday, -7 * i));
  const got = new Set(followups.map((f) => f.period));
  const received = expected.filter((w) => got.has(w)).length;
  return Math.round((received / weeks) * 100);
}

/** Semaines de silence : nombre de semaines consécutives sans retour (0 = a répondu cette semaine). */
export function weeksSilent(
  followups: Pick<FollowupResponse, "period">[],
  todayISO: string,
): number {
  if (followups.length === 0) return Infinity;
  const last = followups
    .map((f) => f.period)
    .sort()
    .at(-1)!;
  const monday = mondayOfWeekISO(todayISO);
  let weeks = 0;
  let cursor = monday;
  while (cursor > last && weeks < 52) {
    weeks++;
    cursor = addDaysISO(cursor, -7);
  }
  return weeks;
}

export interface GlobalWeekStat {
  period: string; // lundi de la semaine
  avgSatisfaction: number | null; // moyenne /5 sur la semaine
  actionRate: number | null; // % de "Oui" sur la semaine
  responses: number; // nb de retours reçus cette semaine-là
}

/**
 * Agrégats globaux de l'accompagnement, semaine par semaine (tous clients
 * confondus) : satisfaction moyenne + taux de passage à l'action.
 * Renvoie les `weeks` dernières semaines, de la plus ancienne à la plus récente.
 */
export function globalWeeklyStats(
  followups: FollowupResponse[],
  todayISO: string,
  weeks = 8,
): GlobalWeekStat[] {
  const monday = mondayOfWeekISO(todayISO);
  const out: GlobalWeekStat[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const period = addDaysISO(monday, -7 * i);
    const ofWeek = followups.filter((f) => f.period === period);
    const sats = ofWeek
      .map((f) => num(f.answers.satisfaction))
      .filter((v): v is number => v !== null);
    const actions = ofWeek
      .map((f) => f.answers.actions_faites)
      .filter((v) => v === "Oui" || v === "Non");
    out.push({
      period,
      avgSatisfaction:
        sats.length > 0
          ? Math.round((sats.reduce((s, v) => s + v, 0) / sats.length) * 10) / 10
          : null,
      actionRate:
        actions.length > 0
          ? Math.round(
              (actions.filter((v) => v === "Oui").length / actions.length) * 100,
            )
          : null,
      responses: ofWeek.length,
    });
  }
  return out;
}

export type RiskLevel = "aucun_retour" | "faible" | "moyen" | "eleve";

export interface Risk {
  level: RiskLevel;
  reasons: string[];
}

/**
 * Score de risque de churn par règles (repris de l'outil d'un coach solo) :
 * silence ≥ 2 semaines +2, satisfaction ≤ 2 +2, dernière satisfaction en
 * baisse de ≥ 2 points +1, série de "Non" ≥ 2 +2, un "Non" isolé +1.
 * ≥ 3 = élevé, 2 = moyen, sinon faible. Neutre si aucun retour (pas de
 * fausse alerte sur un client tout neuf).
 */
export function churnRisk(
  followups: FollowupResponse[],
  todayISO: string,
): Risk {
  if (followups.length === 0) {
    return { level: "aucun_retour", reasons: ["Aucun retour hebdo reçu"] };
  }
  const points = toPoints(followups);
  const reasons: string[] = [];
  let score = 0;

  const silent = weeksSilent(followups, todayISO);
  if (silent >= 2) {
    score += 2;
    reasons.push(`Silence depuis ${silent} semaines`);
  }

  const lastSat = [...points].reverse().find((p) => p.satisfaction !== null);
  if (lastSat && lastSat.satisfaction! <= 2) {
    score += 2;
    reasons.push(`Satisfaction basse (${lastSat.satisfaction}/5)`);
  } else {
    const sats = points.filter((p) => p.satisfaction !== null);
    if (sats.length >= 2) {
      const delta =
        sats[sats.length - 1].satisfaction! - sats[sats.length - 2].satisfaction!;
      if (delta <= -2) {
        score += 1;
        reasons.push("Satisfaction en forte baisse");
      }
    }
  }

  const streak = noStreak(points);
  if (streak >= 2) {
    score += 2;
    reasons.push(`${streak} semaines sans passage à l'action`);
  } else if (streak === 1) {
    score += 1;
    reasons.push("Pas de passage à l'action cette semaine");
  }

  const level: RiskLevel = score >= 3 ? "eleve" : score === 2 ? "moyen" : "faible";
  return { level, reasons };
}

export const RISK_META: Record<
  RiskLevel,
  { label: string; tone: "gray" | "green" | "amber" | "red" }
> = {
  aucun_retour: { label: "Pas encore de retour", tone: "gray" },
  faible: { label: "Risque faible", tone: "green" },
  moyen: { label: "Risque moyen", tone: "amber" },
  eleve: { label: "Risque élevé", tone: "red" },
};
