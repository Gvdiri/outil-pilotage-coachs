"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/dates";

// Tracker de prospection : upsert de la ligne du jour (1 par date).

type Result = { error?: string };

/** Incrémente (ou décrémente) un compteur du jour. Jamais négatif. */
export async function bumpProspecting(
  field: "dm" | "calls" | "closings",
  delta: number,
): Promise<Result> {
  const supabase = await createClient();
  const date = todayISO();

  // Incrément atomique côté base (migration 0006) : Alex et Sam peuvent
  // cliquer en même temps sans qu'un des deux clics soit perdu.
  const { error } = await supabase.rpc("bump_prospecting", {
    p_date: date,
    p_field: field,
    p_delta: delta,
  });

  if (!error) {
    revalidatePath("/prospects");
    return {};
  }

  // PGRST202 = fonction absente du schéma : la migration 0006 n'a pas encore
  // été jouée. On retombe sur l'ancien chemin pour ne pas bloquer le tracker.
  if (error.code === "PGRST202") {
    return bumpFallback(supabase, date, field, delta);
  }
  return { error: error.message };
}

/** Ancien chemin lecture-puis-écriture, gardé tant que 0006 n'est pas jouée. */
async function bumpFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  date: string,
  field: "dm" | "calls" | "closings",
  delta: number,
): Promise<Result> {
  const { data: existing, error: readError } = await supabase
    .from("prospecting_daily")
    .select("id, dm, calls, closings")
    .eq("date", date)
    .maybeSingle();

  if (readError) return { error: readError.message };

  const current = existing ? (existing[field] as number) : 0;
  const next = Math.max(0, current + delta);

  const { error } = existing
    ? await supabase
        .from("prospecting_daily")
        .update({ [field]: next })
        .eq("id", existing.id)
    : await supabase
        .from("prospecting_daily")
        .upsert({ date, [field]: next }, { onConflict: "date" });

  if (error) return { error: error.message };
  revalidatePath("/prospects");
  return {};
}

/** Saisie directe des 3 compteurs du jour (rattrapage). */
export async function setProspecting(
  dm: number,
  calls: number,
  closings: number,
): Promise<Result> {
  const supabase = await createClient();
  const date = todayISO();
  const { error } = await supabase
    .from("prospecting_daily")
    .upsert(
      { date, dm: Math.max(0, dm), calls: Math.max(0, calls), closings: Math.max(0, closings) },
      { onConflict: "date" },
    );
  if (error) return { error: error.message };
  revalidatePath("/prospects");
  return {};
}
