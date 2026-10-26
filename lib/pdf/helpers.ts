// Helpers pour les PDF. Pièges connus (react-pdf / polices standard) :
// - Les polices PDF standard (Helvetica) n'ont PAS d'emoji -> aucun emoji.
// - L'espace fine insécable française rend mal -> espace normale via nf().

/** Nombre formaté FR sans espace fine (1600 -> "1 600"). */
export function nf(n: number): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 })
    .format(n)
    .replace(/[  ]/g, " ");
}

export function eur(n: number): string {
  return `${nf(n)} EUR`;
}

export function dateFR(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso.length <= 10 ? iso + "T12:00:00Z" : iso));
}

export const COLORS = {
  primary: "#4f46e5",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  bg: "#f6f7f9",
  green: "#15803d",
  amber: "#b45309",
  red: "#b91c1c",
};
