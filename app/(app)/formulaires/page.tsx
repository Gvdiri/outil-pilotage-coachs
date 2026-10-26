import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { FormBuilder } from "@/components/forms/FormBuilder";
import { FOLLOWUP_FIELDS, ONBOARDING_FIELDS, type FormFieldDef } from "@/lib/forms";

export const metadata: Metadata = { title: "Formulaires" };

export interface BuilderConfig {
  kind: "onboarding" | "suivi";
  title: string;
  description: string;
  fields: FormFieldDef[];
}

const DEFAULTS: BuilderConfig[] = [
  {
    kind: "onboarding",
    title: "Questionnaire de départ",
    description:
      "Avant de démarrer ton accompagnement, réponds à ces quelques questions : elles permettent à ton coach de te préparer un programme vraiment adapté. Ça prend 3 minutes.",
    fields: ONBOARDING_FIELDS,
  },
  {
    kind: "suivi",
    title: "Ton suivi de la semaine",
    description:
      "Fais le point sur ta semaine : ton coach lit chaque réponse pour ajuster ton programme.",
    fields: FOLLOWUP_FIELDS,
  },
];

export default async function FormulairesPage() {
  // Env absente : le layout affiche "Configuration requise", la page s'efface.
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("form_config")
    .select("kind, title, description, fields");

  const rows = (data ?? []) as BuilderConfig[];
  const configs = DEFAULTS.map(
    (d) => rows.find((r) => r.kind === d.kind) ?? d,
  );

  // La table form_config n'existe pas encore (migration 0002 non exécutée)
  const migrationMissing = data === null;

  return <FormBuilder initialConfigs={configs} migrationMissing={migrationMissing} />;
}
