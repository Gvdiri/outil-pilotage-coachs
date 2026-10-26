import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client service_role — SERVEUR UNIQUEMENT. Contourne la RLS.
// Utilisé exclusivement par les routes publiques de formulaires (validation de
// token + écriture de la réponse). Ne JAMAIS l'importer dans du code client.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquante : requise pour les formulaires publics.",
    );
  }
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
