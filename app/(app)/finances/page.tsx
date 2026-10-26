import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { FinancesView } from "@/components/finances/FinancesView";
import type { Budget, Expense, Payment } from "@/lib/types";

export const metadata: Metadata = { title: "Finances" };

export default async function FinancesPage() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();

  // expenses/budgets peuvent ne pas exister si la migration 0004 n'est pas passée.
  const [expensesRes, paymentsRes, budgetsRes] = await Promise.all([
    supabase.from("expenses").select("*").order("date", { ascending: false }),
    supabase.from("payments").select("*"),
    supabase.from("budgets").select("*"),
  ]);

  const migrationMissing = expensesRes.error !== null;

  // Les paiements alimentent tous les revenus : mieux vaut une erreur visible
  // qu'un dashboard qui affiche 0 € de revenus et une « perte » silencieuse.
  // (budgets peut rester vide : « aucun budget défini » est un état valide.)
  if (paymentsRes.error) {
    throw new Error(
      `Chargement des paiements impossible : ${paymentsRes.error.message}`,
    );
  }

  return (
    <FinancesView
      expenses={(expensesRes.data ?? []) as Expense[]}
      payments={(paymentsRes.data ?? []) as Payment[]}
      budgets={(budgetsRes.data ?? []) as Budget[]}
      migrationMissing={migrationMissing}
    />
  );
}
