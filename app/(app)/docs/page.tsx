import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { DocsView } from "@/components/docs/DocsView";
import type { Doc } from "@/lib/types";

export const metadata: Metadata = { title: "Docs" };

export default async function DocsPage() {
  // Env absente : le layout affiche "Configuration requise", la page s'efface.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("docs")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(`Chargement des docs impossible : ${error.message}`);
  }

  return <DocsView initialDocs={(data ?? []) as Doc[]} />;
}
