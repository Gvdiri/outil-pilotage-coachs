// Moteur de paiement intelligent — logique pure, sans BDD, 100 % testable.
//
// Principe : le coach configure UNE fois le plan (prix total + nombre
// d'échéances + date du 1er paiement). Tout le reste se DÉDUIT de
// l'historique `payments` : échéances payées, prochaine échéance, retard,
// soldé. On ne stocke jamais ce qui peut être calculé.

import { addMonthsISO } from "./dates";
import type { Client, Payment } from "./types";

export type PlanClient = Pick<
  Client,
  "price_total" | "installments" | "first_payment_date"
>;

/** Le plan de paiement est-il configuré ? */
export function hasPlan(client: PlanClient): boolean {
  return (
    client.price_total !== null &&
    client.price_total > 0 &&
    client.installments !== null &&
    client.installments >= 1
  );
}

/** Montant d'une échéance (prix ÷ nombre de fois), arrondi au centime. */
export function installmentAmount(client: PlanClient): number | null {
  if (!hasPlan(client)) return null;
  return Math.round((client.price_total! / client.installments!) * 100) / 100;
}

/** Nombre d'échéances déjà payées = paiements "payé" de ce client. */
export function paidCount(payments: Pick<Payment, "status">[]): number {
  return payments.filter((p) => p.status === "paye").length;
}

/** true si toutes les échéances du plan sont encaissées. */
export function isSettled(
  client: PlanClient,
  payments: Pick<Payment, "status">[],
): boolean {
  if (!hasPlan(client)) return false;
  return paidCount(payments) >= client.installments!;
}

/**
 * Date de la prochaine échéance : 1er paiement + k mois (k = déjà payées).
 * null si pas de plan, pas de date de départ, ou déjà soldé.
 * Paiement unique déjà payé -> null (plus jamais de relance).
 */
export function nextDueDate(
  client: PlanClient,
  payments: Pick<Payment, "status">[],
): string | null {
  if (!hasPlan(client) || !client.first_payment_date) return null;
  if (isSettled(client, payments)) return null;
  return addMonthsISO(client.first_payment_date, paidCount(payments));
}

export type PlanState =
  | { kind: "aucun" } // pas de plan configuré
  | { kind: "solde"; paid: number; total: number } // tout encaissé
  | {
      kind: "en_cours" | "en_retard";
      paid: number;
      total: number;
      amount: number;
      nextDue: string | null;
    };

/** État synthétique du plan — alimente badges, relances et Dashboard. */
export function planState(
  client: PlanClient,
  payments: Pick<Payment, "status">[],
  todayISO: string,
): PlanState {
  if (!hasPlan(client)) return { kind: "aucun" };
  const paid = paidCount(payments);
  const total = client.installments!;
  if (paid >= total) return { kind: "solde", paid, total };
  const nextDue = nextDueDate(client, payments);
  const late = nextDue !== null && nextDue < todayISO;
  return {
    kind: late ? "en_retard" : "en_cours",
    paid,
    total,
    amount: installmentAmount(client)!,
    nextDue,
  };
}

/**
 * Somme encaissée par mois sur les `months` derniers mois (histogramme CA).
 * Renvoie du plus ancien au plus récent : [{ month: "2026-02", total: 900 }, …]
 */
export function revenueByMonth(
  payments: Pick<Payment, "status" | "paid_date" | "amount">[],
  todayISO: string,
  months: number,
): { month: string; total: number }[] {
  const result: { month: string; total: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const month = addMonthsISO(todayISO.slice(0, 7) + "-01", -i).slice(0, 7);
    result.push({ month, total: 0 });
  }
  const index = new Map(result.map((r, i) => [r.month, i]));
  for (const p of payments) {
    if (p.status !== "paye" || !p.paid_date) continue;
    const i = index.get(p.paid_date.slice(0, 7));
    if (i !== undefined) result[i].total += Number(p.amount);
  }
  return result;
}

/** Somme encaissée entre deux dates ISO incluses. */
export function revenueBetween(
  payments: Pick<Payment, "status" | "paid_date" | "amount">[],
  start: string,
  end: string,
): number {
  return payments
    .filter(
      (p) =>
        p.status === "paye" &&
        p.paid_date !== null &&
        p.paid_date >= start &&
        p.paid_date <= end,
    )
    .reduce((s, p) => s + Number(p.amount), 0);
}

/** "2026-07" -> "juil." (libellé court pour l'histogramme). */
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    month: "short",
  }).format(new Date(month + "-15T12:00:00Z"));
}
