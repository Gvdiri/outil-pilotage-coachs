"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createExpense,
  deleteExpense,
  setBudget,
} from "@/lib/actions/finances";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";
import { FilterChip } from "@/components/FilterChip";
import { BarChart } from "@/components/charts/Charts";
import { useToast } from "@/components/Toast";
import {
  Field,
  FormModal,
  inputClass,
  PrimaryButton,
  SecondaryButton,
} from "@/components/FormModal";
import {
  addMonthsISO,
  formatDateShort,
  formatEUR,
  monthLabelLong,
  todayISO,
} from "@/lib/dates";
import {
  byCategory,
  cashflowByMonth,
  monthOf,
  monthSummary,
  recurringTotal,
} from "@/lib/finances";
import { monthLabel } from "@/lib/paiements";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_META,
  type Budget,
  type Expense,
  type ExpenseCategory,
  type Payment,
} from "@/lib/types";

export function FinancesView({
  expenses,
  payments,
  budgets,
  migrationMissing,
}: {
  expenses: Expense[];
  payments: Payment[];
  budgets: Budget[];
  migrationMissing: boolean;
}) {
  const [month, setMonth] = useState(monthOf(todayISO()));
  const [addOpen, setAddOpen] = useState(false);

  const summary = useMemo(
    () => monthSummary(payments, expenses, month),
    [payments, expenses, month],
  );
  const cats = useMemo(() => byCategory(expenses, month), [expenses, month]);
  const cashflow = useMemo(
    () => cashflowByMonth(payments, expenses, todayISO(), 6),
    [payments, expenses],
  );
  const monthExpenses = useMemo(
    () =>
      expenses
        .filter((e) => monthOf(e.date) === month)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, month],
  );
  const recurring = useMemo(() => recurringTotal(expenses), [expenses]);
  const maxCat = Math.max(...cats.map((c) => c.total), 1);

  if (migrationMissing) {
    return (
      <div>
        <PageHeader title="Finances" subtitle="Gestion de trésorerie" />
        <div className="rounded-xl border border-[var(--tone-amber-fg)]/30 bg-surface p-6">
          <p className="text-sm leading-relaxed text-muted">
            ⚠️ Le module Finances a besoin de la migration{" "}
            <code className="rounded bg-background px-1.5 py-0.5 text-xs">
              supabase/migrations/0004_finances.sql
            </code>{" "}
            : exécute-la une fois dans le SQL Editor de Supabase, puis recharge
            cette page.
          </p>
        </div>
      </div>
    );
  }

  // 6 derniers mois pour le sélecteur. On passe par addMonthsISO (qui clampe
  // les fins de mois) et par le fuseau Paris : un new Date().setMonth() naïf
  // duplique les mois quand on est le 31 et que le mois précédent en a 30.
  const monthOptions = Array.from({ length: 6 }, (_, i) =>
    monthOf(addMonthsISO(monthOf(todayISO()) + "-01", -i)),
  );

  return (
    <div>
      <PageHeader
        title="Finances"
        subtitle="Trésorerie du business — entrées, sorties, résultat"
        action={
          <PrimaryButton type="button" onClick={() => setAddOpen(true)}>
            + Dépense
          </PrimaryButton>
        }
      />

      {/* Sélecteur de mois */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {monthOptions.map((m) => (
          <FilterChip
            key={m}
            active={month === m}
            onClick={() => setMonth(m)}
            label={monthLabelLong(m)}
          />
        ))}
      </div>

      {/* KPIs du mois */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Revenus encaissés" value={formatEUR(summary.revenue)} tone="green" sub="paiements clients" />
        <StatCard label="Dépenses" value={formatEUR(summary.expenses)} tone="orange" />
        <StatCard
          label="Résultat net"
          value={formatEUR(summary.net)}
          tone={summary.net >= 0 ? "green" : "red"}
          sub={summary.net >= 0 ? "bénéfice" : "perte"}
        />
        <StatCard
          label="Marge"
          value={summary.margin !== null ? `${summary.margin}%` : "—"}
          tone={summary.margin === null ? "gray" : summary.margin >= 0 ? "green" : "red"}
          sub={recurring > 0 ? `dont ${formatEUR(recurring)}/mois récurrents` : undefined}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        {/* Trésorerie 6 mois */}
        <section className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-2 text-xs font-medium text-muted">
            📈 Résultat net — 6 derniers mois
          </p>
          <BarChart
            data={cashflow.map((c) => ({ label: monthLabel(c.month), value: Math.max(c.net, 0) }))}
            formatValue={(v) => `${Math.round(v).toLocaleString("fr-FR")} €`}
          />
          <p className="mt-2 text-[11px] text-muted">
            (revenus encaissés − dépenses, par mois)
          </p>
          {/* Le graphe clampe les nets négatifs à 0 : sans cette ligne, un mois
              à −2 000 € serait dessiné comme un mois à l'équilibre. */}
          {cashflow.some((c) => c.net < 0) ? (
            <p
              className="mt-1 text-[11px] font-medium"
              style={{ color: "var(--tone-red-fg)" }}
            >
              Mois en perte :{" "}
              {cashflow
                .filter((c) => c.net < 0)
                .map((c) => `${monthLabel(c.month)} ${formatEUR(c.net)}`)
                .join(" · ")}
            </p>
          ) : null}
        </section>

        {/* Répartition des dépenses */}
        <section className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-3 text-xs font-medium text-muted">
            🧭 Où va l&apos;argent ce mois-ci
          </p>
          {summary.expenses === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              Aucune dépense enregistrée ce mois.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {cats
                .filter((c) => c.total > 0)
                .map((c) => {
                  const meta = EXPENSE_CATEGORY_META[c.category];
                  return (
                    <div key={c.category} className="flex items-center gap-2">
                      <span className="w-28 shrink-0 text-xs text-muted">{meta.label}</span>
                      <div className="h-3 flex-1 overflow-hidden rounded-full bg-background">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(c.total / maxCat) * 100}%`,
                            backgroundColor: `var(--tone-${meta.tone}-fg)`,
                          }}
                        />
                      </div>
                      <span className="w-20 shrink-0 text-right text-xs font-semibold">
                        {formatEUR(c.total)}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </div>

      {/* Budgets par catégorie */}
      <BudgetSection
        month={month}
        budgets={budgets}
        spentByCat={Object.fromEntries(cats.map((c) => [c.category, c.total])) as Record<ExpenseCategory, number>}
      />

      {/* Liste des dépenses du mois */}
      {monthExpenses.length === 0 ? (
        <EmptyState
          icon="💸"
          title="Aucune dépense ce mois"
          hint="Ajoute tes dépenses (pub, outils, sous-traitance…) pour suivre ta trésorerie."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="px-3 py-2.5 font-medium">Date</th>
                <th className="px-3 py-2.5 font-medium">Libellé</th>
                <th className="px-3 py-2.5 font-medium">Catégorie</th>
                <th className="px-3 py-2.5 text-right font-medium">Montant</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {monthExpenses.map((e) => {
                const meta = EXPENSE_CATEGORY_META[e.category];
                return (
                  <tr key={e.id} className="border-b border-border/60 last:border-0">
                    <td className="whitespace-nowrap px-3 py-2.5 text-muted">
                      {formatDateShort(e.date)}
                    </td>
                    <td className="px-3 py-2.5 font-medium">
                      {e.label}
                      {e.recurring ? (
                        <span className="ml-1.5 text-[11px] text-muted">🔁 récurrent</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge tone={meta.tone} label={meta.label} size="xs" />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                      {formatEUR(Number(e.amount))}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <DeleteExpense id={e.id} label={e.label} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {addOpen ? (
        <ExpenseModal defaultMonth={month} onClose={() => setAddOpen(false)} />
      ) : null}
    </div>
  );
}

// Budgets par catégorie : dépensé vs plafond, édition inline, alerte dépassement.
function BudgetSection({
  month,
  budgets,
  spentByCat,
}: {
  month: string;
  budgets: Budget[];
  spentByCat: Record<ExpenseCategory, number>;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [draft, setDraft] = useState("");

  const budgetOf = (c: ExpenseCategory) =>
    budgets.find((b) => b.month === month && b.category === c)?.amount ?? 0;

  function save(cat: ExpenseCategory) {
    // `|| 0` ne rattrape que NaN : on borne aussi les valeurs négatives.
    const value = Math.max(0, parseFloat(draft.replace(",", ".")) || 0);
    startTransition(async () => {
      const res = await setBudget(month, cat, value);
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Budget mis à jour");
        setEditing(null);
        router.refresh();
      }
    });
  }

  // On n'affiche que les catégories qui ont un budget OU une dépense.
  const rows = EXPENSE_CATEGORIES.filter(
    (c) => budgetOf(c) > 0 || (spentByCat[c] ?? 0) > 0,
  );

  return (
    <section className="mb-4 rounded-xl border border-border bg-surface p-4">
      <h2 className="mb-1 text-sm font-bold">🎯 Budgets du mois</h2>
      <p className="mb-3 text-xs text-muted">
        Fixe un plafond par catégorie : une alerte apparaît si tu le dépasses.
      </p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">
          Aucun budget défini. Clique sur une catégorie pour lui fixer un
          plafond.
        </p>
      ) : null}
      <div className="flex flex-col gap-2.5">
        {EXPENSE_CATEGORIES.map((c) => {
          const meta = EXPENSE_CATEGORY_META[c];
          const budget = budgetOf(c);
          const spent = spentByCat[c] ?? 0;
          // Au premier lancement (aucun budget, aucune dépense) on affiche
          // toutes les catégories : sinon le message « clique sur une
          // catégorie » juste au-dessus ne désigne rien de cliquable.
          if (budget === 0 && spent === 0 && rows.length > 0) return null;
          const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
          const over = budget > 0 && spent > budget;
          return (
            <div key={c} className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-xs text-muted">{meta.label}</span>
              <div className="h-3 min-w-24 flex-1 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${budget > 0 ? pct : 0}%`,
                    backgroundColor: over ? "var(--tone-red-fg)" : `var(--tone-${meta.tone}-fg)`,
                  }}
                />
              </div>
              {editing === c ? (
                <span className="flex items-center gap-1">
                  <input
                    autoFocus
                    inputMode="decimal"
                    className={`${inputClass} w-24 py-1`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && save(c)}
                    placeholder="€"
                  />
                  <button onClick={() => save(c)} disabled={isPending} className="text-xs font-medium text-primary">
                    OK
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => {
                    setEditing(c);
                    setDraft(budget > 0 ? String(budget) : "");
                  }}
                  className="w-32 shrink-0 text-right text-xs"
                >
                  <span className={over ? "font-semibold text-danger" : ""}>
                    {formatEUR(spent)}
                  </span>
                  <span className="text-muted">
                    {" / "}
                    {budget > 0 ? formatEUR(budget) : "définir"}
                  </span>
                </button>
              )}
              {over ? (
                <StatusBadge tone="red" label="Dépassé" size="xs" />
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function DeleteExpense({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Supprimer la dépense « ${label} » ?`)) return;
        startTransition(async () => {
          const res = await deleteExpense(id);
          if (res.error) toast(`Erreur : ${res.error}`, "error");
          else {
            toast("Dépense supprimée");
            router.refresh();
          }
        });
      }}
      className="rounded-md p-1 text-muted transition-colors hover:text-danger"
      title="Supprimer"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      </svg>
    </button>
  );
}

function ExpenseModal({
  defaultMonth,
  onClose,
}: {
  defaultMonth: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(
    defaultMonth === monthOf(todayISO()) ? todayISO() : `${defaultMonth}-01`,
  );
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("outils");
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!(value > 0)) {
      toast("Le montant doit être supérieur à 0.", "error");
      return;
    }
    startTransition(async () => {
      const res = await createExpense({
        date,
        label: label.trim(),
        amount: value,
        category,
        recurring,
        notes: notes.trim() || null,
      });
      if (res.error) toast(`Erreur : ${res.error}`, "error");
      else {
        toast("Dépense ajoutée");
        onClose();
        router.refresh();
      }
    });
  }

  return (
    <FormModal open title="Nouvelle dépense" onClose={onClose}>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Libellé" required>
          <input
            required
            autoFocus
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex : Abonnement CapCut Pro"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant (€)" required>
            <input required inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="19,99" />
          </Field>
          <Field label="Date" required>
            <input type="date" required className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Catégorie">
          <select className={inputClass} value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {EXPENSE_CATEGORY_META[c].label}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          Dépense récurrente (abonnement mensuel)
        </label>
        <Field label="Note">
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <SecondaryButton onClick={onClose}>Annuler</SecondaryButton>
          <PrimaryButton disabled={isPending || !label.trim()}>
            {isPending ? "Ajout…" : "Ajouter"}
          </PrimaryButton>
        </div>
      </form>
    </FormModal>
  );
}
