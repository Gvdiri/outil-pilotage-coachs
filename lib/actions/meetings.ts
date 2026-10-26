"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Server Actions du module Réunions hebdo.

export interface MeetingInput {
  date: string;
  objectives: string | null;
  decisions: string | null;
  problems: string | null;
  action_items: string | null;
}

type Result = { error?: string; id?: string };

export async function createMeeting(input: MeetingInput): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("meetings")
    .insert(input)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/reunions");
  return { id: data.id };
}

export async function updateMeeting(
  id: string,
  input: Partial<MeetingInput>,
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("meetings").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/reunions");
  return { id };
}

export async function deleteMeeting(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("meetings").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/reunions");
  return {};
}
