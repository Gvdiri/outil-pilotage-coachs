// Écritures résilientes aux colonnes pas encore migrées.
// Tant que la migration 0003 n'est pas passée, on retire silencieusement les
// colonnes inconnues et on réessaie — l'app reste utilisable sans crasher.

/** true si l'erreur PostgREST signale une colonne absente du schéma. */
export function isMissingColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === "PGRST204" ||
    /could not find|does not exist|column/i.test(e.message ?? "")
  );
}

/** Retire une liste de clés d'un objet (copie). */
export function omit<T extends Record<string, unknown>>(
  obj: T,
  keys: string[],
): Partial<T> {
  const copy: Record<string, unknown> = { ...obj };
  for (const k of keys) delete copy[k];
  return copy as Partial<T>;
}

// Colonnes ajoutées par la migration 0003 (à retirer en repli).
export const CLIENT_0003_COLS = ["email", "instagram"];
export const PROSPECT_0003_COLS = [
  "email",
  "phone",
  "instagram",
  "pain",
  "desired",
  "objective",
  "objections",
];
