"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FormFieldDef } from "@/lib/forms";

// Server Actions de l'éditeur de formulaires. Les clés des champs existants ne
// changent JAMAIS (elles indexent les réponses historiques en jsonb).

type Result = { error?: string };

const FIELD_TYPES = ["text", "textarea", "number", "select", "date"];
const KEY_RE = /^[a-z0-9_]{1,40}$/;

function validateFields(fields: FormFieldDef[]): string | null {
  if (fields.length === 0) return "Le formulaire doit avoir au moins une question.";
  if (fields.length > 30) return "30 questions maximum.";
  const seen = new Set<string>();
  for (const f of fields) {
    if (!KEY_RE.test(f.key)) return `Clé de champ invalide : « ${f.key} ».`;
    if (seen.has(f.key)) return `Clé de champ en double : « ${f.key} ».`;
    seen.add(f.key);
    if (!f.label?.trim()) return "Chaque question doit avoir un intitulé.";
    if (!FIELD_TYPES.includes(f.type)) return `Type inconnu : « ${f.type} ».`;
    if (f.type === "select" && (!f.options || f.options.filter((o) => o.trim()).length < 2)) {
      return `« ${f.label} » : une liste de choix doit avoir au moins 2 options.`;
    }
  }
  return null;
}

export async function saveFormConfig(
  kind: "onboarding" | "suivi",
  input: { title: string; description: string; fields: FormFieldDef[] },
): Promise<Result> {
  const title = input.title.trim();
  if (!title) return { error: "Le titre du formulaire est requis." };

  // Nettoyage : on ne garde que les propriétés attendues
  const fields: FormFieldDef[] = input.fields.map((f) => ({
    key: f.key,
    label: f.label.trim(),
    type: f.type,
    required: !!f.required,
    ...(f.placeholder?.trim() ? { placeholder: f.placeholder.trim() } : {}),
    ...(f.type === "select"
      ? { options: (f.options ?? []).map((o) => o.trim()).filter(Boolean) }
      : {}),
  }));

  const invalid = validateFields(fields);
  if (invalid) return { error: invalid };

  const supabase = await createClient();
  const { error } = await supabase
    .from("form_config")
    .upsert(
      { kind, title, description: input.description.trim(), fields },
      { onConflict: "kind" },
    );
  if (error) return { error: error.message };

  revalidatePath("/formulaires");
  return {};
}
