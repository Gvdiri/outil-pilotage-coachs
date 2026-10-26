// Logique serveur partagée des formulaires publics : validation de token et
// nettoyage des réponses. Utilisée par les pages /form/* et les routes
// /api/public/*. Ne JAMAIS exposer autre chose que le prénom du client.

import { createAdminClient } from "@/lib/supabase/admin";
import {
  FOLLOWUP_FIELDS,
  ONBOARDING_FIELDS,
  type FormFieldDef,
} from "@/lib/forms";

const TOKEN_RE = /^[a-f0-9]{16,64}$/i;

export interface PublicClientInfo {
  id: string;
  firstName: string;
  contact: string | null;
  email: string | null;
  instagram: string | null;
  phone: string | null;
}

/** Valide un token et renvoie le strict minimum sur le client, sinon null. */
export async function findClientByToken(
  token: string,
): Promise<PublicClientInfo | null> {
  if (!TOKEN_RE.test(token)) return null;
  const admin = createAdminClient();
  // select("*") : résilient aux colonnes pas encore migrées (une colonne
  // manquante dans un select explicite ferait passer TOUS les tokens pour
  // invalides — vécu). On ne renvoie ensuite que le strict minimum.
  const { data } = await admin
    .from("clients")
    .select("*")
    .eq("form_token", token)
    .maybeSingle();
  if (!data) return null;
  const d = data as {
    email?: string | null;
    instagram?: string | null;
    phone?: string | null;
  };
  return {
    id: data.id,
    firstName: (data.name as string).split(" ")[0],
    contact: data.contact ?? null,
    email: d.email ?? null,
    instagram: d.instagram ?? null,
    phone: d.phone ?? null,
  };
}

/** Date de soumission de l'onboarding si déjà rempli (pour un message propre). */
export async function findOnboardingSubmission(
  clientId: string,
): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("client_onboarding_response")
      .select("submitted_at")
      .eq("client_id", clientId)
      .maybeSingle();
    return data?.submitted_at ?? null;
  } catch {
    return null;
  }
}

export interface PublicFormConfig {
  title: string;
  description: string;
  fields: FormFieldDef[];
}

const DEFAULT_CONFIGS: Record<"onboarding" | "suivi", PublicFormConfig> = {
  onboarding: {
    title: "Questionnaire de départ",
    description:
      "Avant de démarrer ton accompagnement, réponds à ces quelques questions : elles permettent à ton coach de te préparer un programme vraiment adapté. Ça prend 3 minutes.",
    fields: ONBOARDING_FIELDS,
  },
  suivi: {
    title: "Ton suivi de la semaine",
    description:
      "Fais le point sur ta semaine : ton coach lit chaque réponse pour ajuster ton programme. Si tu réponds deux fois la même semaine, ta dernière réponse remplace la précédente.",
    fields: FOLLOWUP_FIELDS,
  },
};

/**
 * Config du formulaire : celle éditée dans l'app (table form_config) si elle
 * existe, sinon le jeu par défaut. Jamais d'erreur : les formulaires publics
 * doivent toujours fonctionner.
 */
export async function getPublicFormConfig(
  kind: "onboarding" | "suivi",
): Promise<PublicFormConfig> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("form_config")
      .select("title, description, fields")
      .eq("kind", kind)
      .maybeSingle();
    if (data && Array.isArray(data.fields) && data.fields.length > 0) {
      return data as PublicFormConfig;
    }
  } catch {
    // table absente ou service_role manquante : on retombe sur les défauts
  }
  return DEFAULT_CONFIGS[kind];
}

/**
 * Ne garde QUE les clés déclarées dans la définition du formulaire, en texte
 * borné. Vérifie les champs requis. Retourne les réponses propres ou une erreur.
 */
export function sanitizeAnswers(
  fields: FormFieldDef[],
  raw: unknown,
): { answers?: Record<string, string>; error?: string } {
  if (typeof raw !== "object" || raw === null) {
    return { error: "Réponses manquantes." };
  }
  const input = raw as Record<string, unknown>;
  const answers: Record<string, string> = {};

  for (const field of fields) {
    const value = input[field.key];
    const text =
      typeof value === "string"
        ? value.trim().slice(0, 4000)
        : typeof value === "number"
          ? String(value)
          : "";
    if (field.required && text === "") {
      return { error: `Le champ « ${field.label} » est requis.` };
    }
    if (field.type === "select" && text !== "" && field.options) {
      if (!field.options.includes(text)) {
        return { error: `Valeur invalide pour « ${field.label} ».` };
      }
    }
    if (text !== "") answers[field.key] = text;
  }
  return { answers };
}
