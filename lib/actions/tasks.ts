"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Assignee, TaskPriority, TaskStatus } from "@/lib/types";

// Server Actions du module Tâches.

export interface TaskInput {
  title: string;
  description: string | null;
  assignee: Assignee;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
}

type Result = { error?: string; id?: string };

function revalidate() {
  revalidatePath("/taches");
  revalidatePath("/");
}

export async function createTask(input: TaskInput): Promise<Result> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert(input)
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidate();
  return { id: data.id };
}

export async function updateTask(
  id: string,
  input: Partial<TaskInput>,
): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update(input).eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return { id };
}

export async function deleteTask(id: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidate();
  return {};
}
