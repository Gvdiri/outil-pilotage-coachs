import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { ContentView } from "@/components/content/ContentView";
import type { ContentItem } from "@/lib/types";

export const metadata: Metadata = { title: "Contenu" };

export default async function ContentPage() {
  // Env absente : le layout affiche "Configuration requise", la page s'efface.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Chargement du pipeline impossible : ${error.message}`);
  }

  return <ContentView initialItems={(data ?? []) as ContentItem[]} />;
}
