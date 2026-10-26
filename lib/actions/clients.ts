"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  hasPlan,
  installmentAmount,
  isSettled,
  nextDueDate,
  paidCount,
} from "@/lib/paiements";
import { todayISO } from "@/lib/dates";
import {
  CLIENT_0003_COLS,
  isMissingColumnError,
  omit,
} from "@/lib/supabase/resilient";
import type { ClientStatus, PaymentStatus } from "@/lib/types";

// Server Actions du CRM Clients + paiements.

export interface ClientInput {
  name: string;
  contact: string | null;
  email: string | null;
  instagram: string | null;
  phone: string | null;
  status: ClientStatus;
  offer: string | null;
  progress: string | null;
  start_date: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  // Plan de paiement
  price_total: number | null;
  installments: number | null;
  first_payment_date: string | null;
}

export interface PaymentInput {
  amount: number;
  status: PaymentStatus;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
}

type Result = { error?: string; id?: string };

function revalidateClient(id?: string) {
  revalidatePath("/clients");
  if (id) revalidatePath(`/clients/${id}`);
  revalidatePath("/");
}

export async function createClientRecord(
  input: Partial<ClientInput> & { name: string },
): Promise<Result> {
  const supabase = await createClient();
  const payload = { status: "actif", ...input };
  let { data, error } = await supabase
    .from("clients")
    .insert(payload)
    .select("id")
    .single();
  // Repli : colonnes 0003 pas encore migrées -> on réessaie sans elles.
  if (error && isMissingColumnError(error)) {
    ({ data, error } = await supabase
      .from("clients")
      .insert(omit(payload, CLIENT_0003_COLS))
      .select("id")
      .single());
  }
  if (error || !data) return { error: error?.message ?? "Création impossible" };
  revalidateClient(data.id);
  return { id: data.id };
}

export async function updateClientRecord(
  id: string,
  input: Partial<ClientInput>,
): Promise<Result> {
  const supabase = await createClient();

  // Garde-fou : impossible de fixer moins d'échéances que de paiements déjà
  // encaissés (désynchroniserait tout le plan).
  if (input.installments !== undefined && input.installments !== null) {
    const { count } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("client_id", id)
      .eq("status", "paye");
    if ((count ?? 0) > input.installments) {
      return {
        error: `${count} paiement(s) déjà encaissé(s) : le nombre d'échéances ne peut pas être inférieur.`,
      };
    }
  }

  let { error } = await supabase.from("clients").update(input).eq("id", id);
  if (error && isMissingColumnError(error)) {
    ({ error } = await supabase
      .from("clients")
      .update(omit(input, CLIENT_0003_COLS))
      .eq("id", id));
  }
  if (error) return { error: error.message };
  revalidateClient(id);
  return { id };
}

export async function deleteClientRecord(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidateClient();
  return {};
}

// --- Paiements -------------------------------------------------------------

export async function addPayment(
  clientId: string,
  input: PaymentInput,
): Promise<Result> {
  if (!(input.amount > 0)) {
    return { error: "Le montant doit être supérieur à 0." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .insert({ client_id: clientId, ...input });
  if (error) return { error: error.message };
  revalidateClient(clientId);
  return {};
}

export async function updatePayment(
  paymentId: string,
  clientId: string,
  input: Partial<PaymentInput>,
): Promise<Result> {
  if (input.amount !== undefined && !(input.amount > 0)) {
    return { error: "Le montant doit être supérieur à 0." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update(input)
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidateClient(clientId);
  return {};
}

/** Raccourci 1 clic : marque un paiement comme payé aujourd'hui. */
export async function markPaymentPaid(
  paymentId: string,
  clientId: string,
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({ status: "paye", paid_date: todayISO() })
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidateClient(clientId);
  return {};
}

/**
 * Annule un "payé" fait par erreur : repasse le paiement en attente (SANS le
 * supprimer) → l'échéance et le suivi de retard restent cohérents.
 */
export async function unmarkPaymentPaid(
  paymentId: string,
  clientId: string,
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({ status: "en_attente", paid_date: null })
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidateClient(clientId);
  return {};
}

export async function deletePayment(
  paymentId: string,
  clientId: string,
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("payments").delete().eq("id", paymentId);
  if (error) return { error: error.message };
  revalidateClient(clientId);
  return {};
}

/** Archive un client (corbeille) : disparaît des listes/stats, restaurable. */
export async function archiveClient(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived: true, archived_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateClient(id);
  return {};
}

/** Restaure un client archivé (tout son historique revient). */
export async function restoreClient(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ archived: false, archived_at: null })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateClient(id);
  return {};
}

/** "Contacté aujourd'hui" : met à jour la date de dernier contact en 1 clic. */
export async function markContactedToday(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({ last_contact_date: todayISO() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidateClient(id);
  return {};
}

/**
 * Enregistre l'échéance suivante du plan en 1 clic : montant auto (prix ÷ nb),
 * date payée = aujourd'hui, note "Échéance k/n". Le passage à "soldé" et
 * l'arrêt des relances se déduisent tout seuls du compte de paiements.
 */
export async function recordPlannedPayment(clientId: string): Promise<Result> {
  const supabase = await createClient();

  const [{ data: client }, { data: payments }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("payments").select("status").eq("client_id", clientId),
  ]);
  if (!client) return { error: "Client introuvable" };

  const paid = payments ?? [];

  if (!hasPlan(client)) {
    return { error: "Configure d'abord le plan (prix total + nombre de fois)." };
  }
  if (isSettled(client, paid)) {
    return { error: "Le plan est déjà soldé : toutes les échéances sont payées." };
  }

  const k = paidCount(paid) + 1;
  const { error } = await supabase.from("payments").insert({
    client_id: clientId,
    amount: installmentAmount(client),
    status: "paye",
    due_date: nextDueDate(client, paid),
    paid_date: todayISO(),
    notes: `Échéance ${k}/${client.installments}`,
  });
  if (error) return { error: error.message };
  revalidateClient(clientId);
  return {};
}

/** Annule le dernier paiement encaissé (erreur de saisie). */
export async function cancelLastPayment(clientId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("payments")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "paye")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!last) return { error: "Aucun paiement encaissé à annuler." };

  const { error } = await supabase.from("payments").delete().eq("id", last.id);
  if (error) return { error: error.message };
  revalidateClient(clientId);
  return {};
}

/** Regénère le token de formulaire d'un client (invalide l'ancien lien). */
export async function regenerateFormToken(clientId: string): Promise<Result> {
  const supabase = await createClient();
  const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const { error } = await supabase
    .from("clients")
    .update({ form_token: token })
    .eq("id", clientId);
  if (error) return { error: error.message };
  revalidateClient(clientId);
  return {};
}
