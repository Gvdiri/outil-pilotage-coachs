"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Assignee, ContentPlatform, ContentStage } from "@/lib/types";

// Server Actions du pipeline contenu.

export interface ContentInput {
  title: string;
  notes: string | null;
  platform: ContentPlatform;
  stage: ContentStage;
  assignee: Assignee | null;
  scheduled_date: string | null;
  published_date: string | null;
  link: string | null;
}

type Result = { error?: string; id?: string };

function revalidate() {
  revalidatePath("/contenu");
  revalidatePath("/");
}

export async function createContent(
  input: Partial<ContentInput> & { title: string },
): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_items")
    .insert({ platform: "instagram", stage: "idee", ...input })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidate();
  return { id: data.id };
}

export async function updateContent(
  id: string,
  input: Partial<ContentInput>,
): Promise<Result> {
  // Règle métier : impossible de programmer sans date de programmation.
  if (input.stage === "programme" && input.scheduled_date === null) {
    return { error: "Un contenu programmé doit avoir une date de programmation." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("content_items")
    .update(input)
    .eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { id };
}

export async function deleteContent(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return {};
}
