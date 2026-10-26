import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { MeetingsView } from "@/components/meetings/MeetingsView";
import type { Meeting } from "@/lib/types";

export const metadata: Metadata = { title: "Réunions" };

export default async function MeetingsPage() {
  // Env absente : le layout affiche "Configuration requise", la page s'efface.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .select("*")
    .order("date", { ascending: false });

  if (error) {
    throw new Error(`Chargement des réunions impossible : ${error.message}`);
  }

  return <MeetingsView initialMeetings={(data ?? []) as Meeting[]} />;
}
