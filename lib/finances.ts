// Logique pure du module Finances (trésorerie). Aucun accès BDD.
// Revenus = paiements encaissés (déjà dans l'app) ; dépenses = table expenses.

import { addMonthsISO } from "./dates";
import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
  type Payment,
} from "./types";

/** "2026-07-04" -> "2026-07" */
export function monthOf(iso: string): string {
  return iso.slice(0, 7);
}

/** Revenus encaissés d'un mois (YYYY-MM) depuis les paiements payés. */
export function revenueForMonth(payments: Payment[], month: string): number {
  return payments
    .filter((p) => p.status === "paye" && p.paid_date && monthOf(p.paid_date) === month)
    .reduce((s, p) => s + Number(p.amount), 0);
}

/** Dépenses d'un mois. */
export function expensesForMonth(expenses: Expense[], month: string): number {
  return expenses
    .filter((e) => monthOf(e.date) === month)
    .reduce((s, e) => s + Number(e.amount), 0);
}

export interface MonthSummary {
  revenue: number;
  expenses: number;
  net: number; // résultat = revenus - dépenses
  margin: number | null; // net / revenus en %
}

export function monthSummary(
  payments: Payment[],
  expenses: Expense[],
  month: string,
): MonthSummary {
  const revenue = revenueForMonth(payments, month);
  const exp = expensesForMonth(expenses, month);
  const net = revenue - exp;
  return {
    revenue,
    expenses: exp,
    net,
    margin: revenue > 0 ? Math.round((net / revenue) * 100) : null,
  };
}

/** Dépenses d'un mois réparties par catégorie (toutes catégories, 0 inclus). */
export function byCategory(
  expenses: Expense[],
  month: string,
): { category: ExpenseCategory; total: number }[] {
  const totals = Object.fromEntries(
    EXPENSE_CATEGORIES.map((c) => [c, 0]),
  ) as Record<ExpenseCategory, number>;
  for (const e of expenses) {
    if (monthOf(e.date) === month) totals[e.category] += Number(e.amount);
  }
  return EXPENSE_CATEGORIES.map((c) => ({ category: c, total: totals[c] })).sort(
    (a, b) => b.total - a.total,
  );
}

/** Trésorerie nette des `months` derniers mois (du plus ancien au plus récent). */
export function cashflowByMonth(
  payments: Payment[],
  expenses: Expense[],
  todayISO: string,
  months: number,
): { month: string; revenue: number; expenses: number; net: number }[] {
  const out: { month: string; revenue: number; expenses: number; net: number }[] = [];
  const startMonth = monthOf(todayISO) + "-01";
  for (let i = months - 1; i >= 0; i--) {
    const m = monthOf(addMonthsISO(startMonth, -i));
    const revenue = revenueForMonth(payments, m);
    const exp = expensesForMonth(expenses, m);
    out.push({ month: m, revenue, expenses: exp, net: revenue - exp });
  }
  return out;
}

/** Total des dépenses récurrentes (abonnements mensuels). */
export function recurringTotal(expenses: Expense[]): number {
  // On déduplique par label pour éviter de compter 3× le même abonnement.
  // On garde le montant le plus RÉCENT (un tarif d'abonnement peut changer),
  // en comparant les dates plutôt qu'en se fiant au tri de l'appelant.
  const seen = new Map<string, { date: string; amount: number }>();
  for (const e of expenses) {
    if (!e.recurring) continue;
    const key = e.label.toLowerCase();
    const prev = seen.get(key);
    if (!prev || e.date > prev.date) {
      seen.set(key, { date: e.date, amount: Number(e.amount) });
    }
  }
  return [...seen.values()].reduce((s, v) => s + v.amount, 0);
}
