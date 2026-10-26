"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  CLIENT_0003_COLS,
  PROSPECT_0003_COLS,
  isMissingColumnError,
  omit,
} from "@/lib/supabase/resilient";
import type { Assignee, ProspectStatus } from "@/lib/types";

// Server Actions du CRM Prospects. Toutes passent par le client Supabase
// authentifié (RLS) — une session valide est donc requise.

export interface ProspectInput {
  name: string;
  source?: string;
  status: ProspectStatus;
  assignee: Assignee | null;
  next_action: string | null;
  next_action_date: string | null;
  rdv_at: string | null;
  notes: string | null;
  lost_reason: string | null;
  // Coordonnées
  email: string | null;
  phone: string | null;
  instagram: string | null;
  // Fiche de closing
  pain: string | null;
  desired: string | null;
  objective: string | null;
  objections: string | null;
}

type Result = { error?: string; id?: string };

export async function createProspect(
  input: Partial<ProspectInput> & { name: string },
): Promise<Result> {
  const supabase = await createClient();
  const payload = { source: "instagram", status: "nouveau", ...input };
  let { data, error } = await supabase
    .from("prospects")
    .insert(payload)
    .select("id")
    .single();
  if (error && isMissingColumnError(error)) {
    ({ data, error } = await supabase
      .from("prospects")
      .insert(omit(payload, PROSPECT_0003_COLS))
      .select("id")
      .single());
  }
  if (error || !data) return { error: error?.message ?? "Création impossible" };
  revalidatePath("/prospects");
  revalidatePath("/");
  return { id: data.id };
}

export async function updateProspect(
  id: string,
  input: Partial<ProspectInput>,
): Promise<Result> {
  const supabase = await createClient();
  let { error } = await supabase.from("prospects").update(input).eq("id", id);
  if (error && isMissingColumnError(error)) {
    ({ error } = await supabase
      .from("prospects")
      .update(omit(input, PROSPECT_0003_COLS))
      .eq("id", id));
  }
  if (error) return { error: error.message };
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${id}`);
  revalidatePath("/");
  return { id };
}

export async function deleteProspect(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/prospects");
  revalidatePath("/");
  return {};
}

/**
 * Convertit un prospect en client : crée la fiche client (reprend nom/contact
 * et notes), passe le prospect en "gagné", renvoie l'id du client créé.
 */
export async function convertProspectToClient(id: string): Promise<Result> {
  const supabase = await createClient();

  const { data: prospect, error: fetchError } = await supabase
    .from("prospects")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError || !prospect) {
    return { error: fetchError?.message ?? "Prospect introuvable" };
  }

  // Instagram : soit le champ dédié, soit le nom s'il commence par @
  const instagram =
    prospect.instagram ??
    (typeof prospect.name === "string" && prospect.name.startsWith("@")
      ? prospect.name
      : null);

  // On reprend toute la matière de closing dans les notes du client : elle
  // reste précieuse pour la delivery (objectif, douleur, situation désirée).
  const closingNotes = [
    prospect.objective ? `Objectif : ${prospect.objective}` : null,
    prospect.pain ? `Douleur / point de départ : ${prospect.pain}` : null,
    prospect.desired ? `Situation désirée : ${prospect.desired}` : null,
    prospect.notes ? `Notes prospection : ${prospect.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const clientPayload = {
    name: prospect.name,
    email: prospect.email ?? null,
    phone: prospect.phone ?? null,
    instagram,
    contact: prospect.email ?? instagram,
    status: "actif",
    start_date: new Date().toISOString().slice(0, 10),
    next_action: "Envoyer le questionnaire d'onboarding",
    next_action_date: new Date().toISOString().slice(0, 10),
    notes: closingNotes || "Converti depuis le CRM Prospects.",
  };
  let { data: client, error: insertError } = await supabase
    .from("clients")
    .insert(clientPayload)
    .select("id")
    .single();
  if (insertError && isMissingColumnError(insertError)) {
    ({ data: client, error: insertError } = await supabase
      .from("clients")
      .insert(omit(clientPayload, CLIENT_0003_COLS))
      .select("id")
      .single());
  }
  if (insertError || !client) {
    return { error: insertError?.message ?? "Conversion impossible" };
  }

  const { error: updateError } = await supabase
    .from("prospects")
    .update({ status: "gagne" })
    .eq("id", id);
  if (updateError) return { error: updateError.message };

  revalidatePath("/prospects");
  revalidatePath("/clients");
  revalidatePath("/");
  return { id: client.id };
}
