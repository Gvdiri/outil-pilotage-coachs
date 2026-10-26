import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { TasksView } from "@/components/tasks/TasksView";
import type { Task } from "@/lib/types";

export const metadata: Metadata = { title: "Tâches" };

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ nouvelle?: string; titre?: string }>;
}) {
  const params = await searchParams;
  // Env absente : le layout affiche "Configuration requise", la page s'efface.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Chargement des tâches impossible : ${error.message}`);
  }

  return (
    <TasksView
      initialTasks={(data ?? []) as Task[]}
      // Pré-remplissage depuis une réunion ("créer une tâche" sur une action)
      openCreate={params.nouvelle === "1"}
      prefillTitle={params.titre ?? ""}
    />
  );
}
