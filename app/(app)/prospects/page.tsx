import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { ProspectsView } from "@/components/prospects/ProspectsView";
import type { Prospect, ProspectingDay } from "@/lib/types";

export const metadata: Metadata = { title: "Prospects" };

export default async function ProspectsPage() {
  // Env absente : le layout affiche "Configuration requise", la page s'efface.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const [{ data, error }, trackerRes] = await Promise.all([
    supabase.from("prospects").select("*").order("created_at", { ascending: false }),
    // Tracker (V2) : peut ne pas exister si migration 0005 pas passée.
    supabase.from("prospecting_daily").select("*").order("date", { ascending: false }).limit(30),
  ]);

  if (error) {
    throw new Error(`Chargement des prospects impossible : ${error.message}`);
  }

  return (
    <ProspectsView
      initialProspects={(data ?? []) as Prospect[]}
      prospectingDays={(trackerRes.data ?? []) as ProspectingDay[]}
      trackerAvailable={trackerRes.error === null}
    />
  );
}
