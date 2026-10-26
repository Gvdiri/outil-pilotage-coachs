import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { DocDetail } from "@/components/docs/DocDetail";
import type { Doc } from "@/lib/types";

export const metadata: Metadata = { title: "Document" };

export default async function DocDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Env absente : le layout affiche "Configuration requise", la page s'efface.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("docs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();

  return <DocDetail doc={data as Doc} />;
}
