// Helpers de dates centralisés — tout est calculé en fuseau Europe/Paris,
// quel que soit le fuseau du serveur (Vercel tourne en UTC).

const TZ = "Europe/Paris";

/** Date du jour au format ISO (YYYY-MM-DD) en Europe/Paris. */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

/** ISO (YYYY-MM-DD) d'une date décalée de n jours par rapport à aujourd'hui. */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z"); // midi UTC : aucun risque de bascule de jour
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Bornes du mois en cours (Europe/Paris) : [premier jour, dernier jour] en ISO. */
export function currentMonthBounds(): { start: string; end: string } {
  const today = todayISO();
  const [y, m] = today.split("-").map(Number);
  const start = `${today.slice(0, 7)}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const end = `${today.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

/** true si la date ISO est strictement passée (retard). */
export function isOverdue(iso: string | null | undefined): boolean {
  return !!iso && iso < todayISO();
}

/** true si la date ISO est aujourd'hui ou passée (à relancer). */
export function isDueToday(iso: string | null | undefined): boolean {
  return !!iso && iso <= todayISO();
}

/** true si la date ISO tombe dans les `days` prochains jours (aujourd'hui inclus). */
export function isWithinNextDays(
  iso: string | null | undefined,
  days: number,
): boolean {
  if (!iso) return false;
  const today = todayISO();
  return iso >= today && iso <= addDaysISO(today, days);
}

/** "2026-07-02" -> "jeu. 2 juil." */
export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso + "T12:00:00Z"));
}

/** "2026-07-02" -> "02/07/2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(iso + "T12:00:00Z"));
}

/** Timestamptz -> "jeu. 2 juil. à 14:30" (Europe/Paris). */
export function formatDateTime(ts: string | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts);
  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  const time = new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${date} à ${time}`;
}

/** Date (YYYY-MM-DD) d'un timestamptz en Europe/Paris — pour comparer à aujourd'hui. */
export function tsToParisDateISO(ts: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(ts));
}

/** true si le RDV (timestamptz) est à venir et dans les `days` prochains jours. */
export function isUpcomingWithinDays(
  ts: string | null | undefined,
  days: number,
): boolean {
  if (!ts) return false;
  const d = new Date(ts);
  if (d.getTime() < Date.now()) return false;
  return tsToParisDateISO(ts) <= addDaysISO(todayISO(), days);
}

/**
 * Ajoute n mois à une date ISO en gérant les fins de mois :
 * 31 janvier + 1 mois = 28/29 février (jamais un débordement sur mars).
 */
export function addMonthsISO(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const targetMonth = m - 1 + months;
  const lastDay = new Date(Date.UTC(y, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(d, lastDay);
  const result = new Date(Date.UTC(y, targetMonth, day));
  return result.toISOString().slice(0, 10);
}

/**
 * Lundi de la semaine ISO d'une date (YYYY-MM-DD) — clé de dédoublonnage des
 * suivis hebdo : 1 réponse par semaine et par client.
 */
export function mondayOfWeekISO(iso: string): string {
  const d = new Date(iso + "T12:00:00Z");
  const day = d.getUTCDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** "2026-07" -> "juil. 2026" (sélecteur de mois du module Finances). */
export function monthLabelLong(month: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    month: "short",
    year: "numeric",
  }).format(new Date(month + "-15T12:00:00Z"));
}

/** Montant en euros : 1600 -> "1 600 €" (espace normale, pas d'espace fine). */
export function formatEUR(amount: number): string {
  const formatted = new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  })
    .format(amount)
    // l'espace fine insécable rend mal dans certains contextes (PDF, emails)
    .replace(/[  ]/g, " ");
  return `${formatted} €`;
}
