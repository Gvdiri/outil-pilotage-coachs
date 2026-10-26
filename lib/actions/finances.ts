"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseCategory } from "@/lib/types";

// Server Actions du module Finances.

export interface ExpenseInput {
  date: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  recurring: boolean;
  notes: string | null;
}

type Result = { error?: string; id?: string };

export async function createExpense(input: ExpenseInput): Promise<Result> {
  if (!(input.amount > 0)) return { error: "Le montant doit être supérieur à 0." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .insert(input)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { id: data.id };
}

export async function updateExpense(
  id: string,
  input: Partial<ExpenseInput>,
): Promise<Result> {
  if (input.amount !== undefined && !(input.amount > 0)) {
    return { error: "Le montant doit être supérieur à 0." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return { id };
}

export async function deleteExpense(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return {};
}

/** Définit (ou met à jour) le budget d'une catégorie pour un mois. */
export async function setBudget(
  month: string,
  category: ExpenseCategory,
  amount: number,
): Promise<Result> {
  // 0 est valide (= effacer le plafond), négatif non : sans ce garde-fou, la
  // contrainte CHECK de la base remonte son message brut dans le toast.
  if (!(amount >= 0)) {
    return { error: "Le budget ne peut pas être négatif." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("budgets")
    .upsert({ month, category, amount }, { onConflict: "month,category" });
  if (error) return { error: error.message };
  revalidatePath("/finances");
  return {};
}
