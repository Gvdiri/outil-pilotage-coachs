// Branding et configuration produit — le seul endroit spécifique au client.
// Pour réutiliser le socle chez un autre client : changer ces constantes + le seed SQL.

export const APP_NAME = "CoachOS";
// Logo : P·M, les 2 associés (le "x" du nom fait la liaison).
export const APP_INITIALS = "PM";
export const APP_TAGLINE = "Le cerveau commun d'Alex & Sam";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
