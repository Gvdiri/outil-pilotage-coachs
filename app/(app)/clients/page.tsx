import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { ClientsView } from "@/components/clients/ClientsView";
import type { Client, FollowupResponse, Payment } from "@/lib/types";

export const metadata: Metadata = { title: "Clients" };

export type ClientWithPayments = Client & {
  payments: Payment[];
  client_followup_response: FollowupResponse[];
};

export default async function ClientsPage() {
  // Env absente : le layout affiche "Configuration requise", la page s'efface.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("*, payments(*), client_followup_response(*)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Chargement des clients impossible : ${error.message}`);
  }

  return <ClientsView initialClients={(data ?? []) as ClientWithPayments[]} />;
}
