"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DocType } from "@/lib/types";

// Server Actions du module Documentation interne.

export interface DocInput {
  title: string;
  type: DocType;
  content: string;
  tags: string | null;
}

type Result = { error?: string; id?: string };

export async function createDoc(input: DocInput): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("docs")
    .insert(input)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/docs");
  return { id: data.id };
}

export async function updateDoc(
  id: string,
  input: Partial<DocInput>,
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("docs").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/docs");
  revalidatePath(`/docs/${id}`);
  return { id };
}

export async function deleteDoc(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("docs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/docs");
  return {};
}
