// Seed de démonstration COMPLET — couvre toutes les situations pour tester
// le logiciel dans tous les sens. Injecte via service_role dans la vraie base.
//
//   npx tsx scripts/seed-demo.ts           -> insère (idempotent : n'ajoute pas de doublon)
//   npx tsx scripts/seed-demo.ts --reset   -> supprime d'abord toutes les données "Démo"
//
// Tous les enregistrements sont préfixés "Démo " (clients/prospects) ou marqués,
// pour être purgés facilement avant la vraie mise en production.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// --- Chargement des variables depuis .env.local -----------------------------
function loadEnv() {
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // pas de .env.local : on suppose les variables déjà présentes
  }
}
loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquantes.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// --- Helpers de dates -------------------------------------------------------
const DAY = 86400000;
function iso(offsetDays: number): string {
  return new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);
}
function ts(offsetDays: number, hour = 14): string {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}
function monday(offsetWeeks: number): string {
  const d = new Date(Date.now() + offsetWeeks * 7 * DAY);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return d.toISOString().slice(0, 10);
}
function addMonths(isoDate: string, n: number): string {
  const [y, m, dd] = isoDate.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m - 1 + n, Math.min(dd, last))).toISOString().slice(0, 10);
}

const RESET = process.argv.includes("--reset");

// Wipe complet des données métier (garde profils/comptes). Utilisé par --reset
// pour repartir sur un jeu de démonstration propre, sans doublon.
async function reset() {
  console.log("🧹 Nettoyage complet des données métier…");
  // .not("id","is",null) = "toutes les lignes" (filtre valide exigé par PostgREST).
  const wipe = (t: string) => db.from(t).delete().not("id", "is", null);
  await wipe("payments");
  await wipe("client_followup_response");
  await wipe("client_onboarding_response");
  await wipe("clients");
  await wipe("prospects");
  await wipe("tasks");
  await wipe("content_items");
  await wipe("meetings");
}

// ---------------------------------------------------------------------------
// Définition des clients : chaque cas de figure imaginable.
// ---------------------------------------------------------------------------
interface FollowupSpec {
  week: number; // 0 = cette semaine, -1 = semaine dernière…
  forme: number;
  seances: string;
  satisfaction: number;
  actions: "Oui" | "Non";
  progres?: string;
  blocages?: string;
  engagement?: string;
}
interface ClientSpec {
  name: string;
  contact: string;
  phone?: string;
  status: "actif" | "pause" | "termine";
  offer: string;
  progress: string;
  startOffset: number; // jours
  priceTotal?: number;
  installments?: number;
  firstPaymentOffset?: number; // jours (date 1er paiement)
  paidCount?: number; // nb d'échéances déjà encaissées
  lastMissedLate?: boolean; // la prochaine échéance est-elle en retard ?
  nextAction?: string;
  nextActionOffset?: number;
  lastContactOffset?: number;
  notes?: string;
  archived?: boolean;
  onboarding?: Record<string, string>;
  followups?: FollowupSpec[];
}

const OBJ = {
  muscleup: "Réussir mon premier muscle-up",
  frontlever: "Tenir un front lever 5 secondes",
  perte: "Perdre 6 kg et me tonifier",
  handstand: "Tenir un handstand libre 30s",
  masse: "Prendre 4 kg de muscle",
};

const clients: ClientSpec[] = [
  // 1. Client modèle : paie en 3x, 2 payées, tout va bien, très engagé
  {
    name: "Hugo Bernard",
    contact: "@hugo.calisthenics",
    phone: "+33612345601",
    status: "actif",
    offer: "Coaching 12 semaines",
    progress: "Semaine 8/12",
    startOffset: -56,
    priceTotal: 1350,
    installments: 3,
    firstPaymentOffset: -56,
    paidCount: 2,
    nextAction: "Point hebdo + ajuster le programme tractions",
    nextActionOffset: 2,
    lastContactOffset: -3,
    onboarding: { email: "hugo@example.com", whatsapp: "+33612345601", objectif: OBJ.muscleup, niveau: "Intermédiaire", dispo: "4", materiel: "Barre + anneaux", attentes: "Un vrai cadre et du suivi" },
    followups: [
      { week: -5, forme: 6, seances: "3", satisfaction: 4, actions: "Oui", progres: "Première traction stricte" },
      { week: -4, forme: 7, seances: "4", satisfaction: 4, actions: "Oui", progres: "3 tractions d'affilée" },
      { week: -3, forme: 7, seances: "4", satisfaction: 5, actions: "Oui" },
      { week: -2, forme: 8, seances: "4", satisfaction: 5, actions: "Oui", progres: "Négatives de muscle-up" },
      { week: -1, forme: 8, seances: "5+", satisfaction: 5, actions: "Oui", engagement: "Filmer une tentative de muscle-up" },
      { week: 0, forme: 8, seances: "4", satisfaction: 5, actions: "Oui" },
    ],
  },
  // 2. Paiement EN RETARD : échéance dépassée, à relancer
  {
    name: "Emma Ricci",
    contact: "emma.ricci@example.com",
    phone: "+33612345602",
    status: "actif",
    offer: "Coaching 12 semaines",
    progress: "Semaine 10/12",
    startOffset: -70,
    priceTotal: 1200,
    installments: 3,
    firstPaymentOffset: -70,
    paidCount: 2, // 3e échéance devait tomber il y a ~10j -> en retard
    nextAction: "Relancer pour la 3e échéance",
    nextActionOffset: 0,
    lastContactOffset: -12,
    onboarding: { email: "emma.ricci@example.com", whatsapp: "+33612345602", objectif: OBJ.perte, niveau: "Débutant", dispo: "3", attentes: "Perdre du poids durablement" },
    followups: [
      { week: -4, forme: 6, seances: "3", satisfaction: 4, actions: "Oui" },
      { week: -3, forme: 6, seances: "3", satisfaction: 4, actions: "Oui" },
      { week: -2, forme: 5, seances: "2", satisfaction: 3, actions: "Non", blocages: "Semaine chargée au travail" },
      { week: -1, forme: 6, seances: "3", satisfaction: 4, actions: "Oui" },
    ],
  },
  // 3. Client à RISQUE ÉLEVÉ : satisfaction basse + silence + Non répétés
  {
    name: "Karim Aliane",
    contact: "@karim.prog",
    phone: "+33612345603",
    status: "actif",
    offer: "Coaching 8 semaines",
    progress: "Semaine 5/8",
    startOffset: -35,
    priceTotal: 800,
    installments: 2,
    firstPaymentOffset: -35,
    paidCount: 1,
    nextAction: "APPEL de recadrage — motivation en chute",
    nextActionOffset: -1,
    lastContactOffset: -18,
    onboarding: { email: "karim@example.com", whatsapp: "+33612345603", objectif: OBJ.frontlever, niveau: "Intermédiaire", dispo: "3", attentes: "Débloquer le front lever" },
    followups: [
      { week: -4, forme: 5, seances: "2", satisfaction: 3, actions: "Non", blocages: "Manque de temps" },
      { week: -3, forme: 4, seances: "1", satisfaction: 2, actions: "Non", blocages: "Démotivé, je stagne" },
      // silence sur -2, -1, 0
    ],
  },
  // 4. Paiement UNIQUE (1x) déjà soldé -> jamais de relance
  {
    name: "Sofia Nardone",
    contact: "@sofia.cali",
    phone: "+33612345604",
    status: "actif",
    offer: "Programme express 4 semaines",
    progress: "Semaine 2/4",
    startOffset: -14,
    priceTotal: 400,
    installments: 1,
    firstPaymentOffset: -14,
    paidCount: 1,
    nextAction: "Envoyer la vidéo de correction",
    nextActionOffset: 3,
    lastContactOffset: -2,
    onboarding: { email: "sofia@example.com", whatsapp: "+33612345604", objectif: OBJ.handstand, niveau: "Avancé", dispo: "5+" },
    followups: [
      { week: -1, forme: 8, seances: "5+", satisfaction: 5, actions: "Oui", progres: "Handstand 15s au mur" },
      { week: 0, forme: 9, seances: "5+", satisfaction: 5, actions: "Oui" },
    ],
  },
  // 5. Plan 3x SOLDÉ (les 3 payées) -> "penser au renouvellement"
  {
    name: "Thomas Girard",
    contact: "@thomas_street",
    phone: "+33612345605",
    status: "actif",
    offer: "Coaching 12 semaines",
    progress: "Semaine 12/12",
    startOffset: -84,
    priceTotal: 1500,
    installments: 3,
    firstPaymentOffset: -84,
    paidCount: 3,
    nextAction: "Proposer le renouvellement",
    nextActionOffset: 1,
    lastContactOffset: -5,
    onboarding: { email: "thomas@example.com", whatsapp: "+33612345605", objectif: OBJ.masse, niveau: "Avancé", dispo: "4" },
    followups: [
      { week: -3, forme: 8, seances: "4", satisfaction: 5, actions: "Oui" },
      { week: -2, forme: 8, seances: "4", satisfaction: 5, actions: "Oui" },
      { week: -1, forme: 9, seances: "5+", satisfaction: 5, actions: "Oui", progres: "+3,5 kg depuis le début" },
    ],
  },
  // 6. Client PRÉSENTIEL (même parcours) sans plan configuré -> signalé
  {
    name: "Inès Moreau",
    contact: "@ines.fit",
    phone: "+33612345606",
    status: "actif",
    offer: "Coaching présentiel",
    progress: "Semaine 3/10",
    startOffset: -21,
    nextAction: "Configurer son plan de paiement (payé en cash)",
    nextActionOffset: 0,
    lastContactOffset: -1,
    onboarding: { email: "ines@example.com", whatsapp: "+33612345606", objectif: OBJ.perte, niveau: "Débutant", dispo: "2" },
    followups: [
      { week: -1, forme: 6, seances: "2", satisfaction: 4, actions: "Oui" },
      { week: 0, forme: 6, seances: "3", satisfaction: 4, actions: "Oui" },
    ],
  },
  // 7. Client qui n'a JAMAIS rempli son onboarding -> à relancer
  {
    name: "Yanis Cohen",
    contact: "@yanis.move",
    phone: "+33612345607",
    status: "actif",
    offer: "Coaching 8 semaines",
    progress: "Semaine 1/8",
    startOffset: -5,
    priceTotal: 600,
    installments: 2,
    firstPaymentOffset: -5,
    paidCount: 1,
    nextAction: "Relancer pour le questionnaire d'onboarding",
    nextActionOffset: 0,
    lastContactOffset: -5,
    // pas d'onboarding, pas de followups
  },
  // 8. Satisfaction en BAISSE progressive (signal orange, pas encore rouge)
  {
    name: "Chloé Fabre",
    contact: "@chloe.calis",
    phone: "+33612345608",
    status: "actif",
    offer: "Coaching 12 semaines",
    progress: "Semaine 6/12",
    startOffset: -42,
    priceTotal: 1200,
    installments: 3,
    firstPaymentOffset: -42,
    paidCount: 2,
    nextAction: "Comprendre la baisse de motivation",
    nextActionOffset: 1,
    lastContactOffset: -4,
    onboarding: { email: "chloe@example.com", whatsapp: "+33612345608", objectif: OBJ.muscleup, niveau: "Débutant", dispo: "3" },
    followups: [
      { week: -3, forme: 7, seances: "4", satisfaction: 5, actions: "Oui" },
      { week: -2, forme: 6, seances: "3", satisfaction: 4, actions: "Oui" },
      { week: -1, forme: 5, seances: "2", satisfaction: 3, actions: "Non", blocages: "Je ne vois pas de résultats" },
      { week: 0, forme: 5, seances: "2", satisfaction: 3, actions: "Oui" },
    ],
  },
  // 9. Client EN PAUSE (blessure)
  {
    name: "Nico Vidal",
    contact: "@nico_vdl",
    phone: "+33612345609",
    status: "pause",
    offer: "Coaching 8 semaines",
    progress: "Semaine 3/8 (en pause)",
    startOffset: -30,
    priceTotal: 700,
    installments: 2,
    firstPaymentOffset: -30,
    paidCount: 1,
    nextAction: "Reprise prévue début du mois prochain",
    nextActionOffset: 14,
    lastContactOffset: -8,
    notes: "Pause pour blessure au poignet.",
    onboarding: { email: "nico@example.com", whatsapp: "+33612345609", objectif: OBJ.frontlever, niveau: "Intermédiaire", dispo: "3" },
  },
  // 10. Client TERMINÉ (accompagnement fini, soldé)
  {
    name: "Sarah Lopez",
    contact: "@sarah.moves",
    phone: "+33612345610",
    status: "termine",
    offer: "Coaching 12 semaines",
    progress: "Terminé 12/12",
    startOffset: -140,
    priceTotal: 1350,
    installments: 3,
    firstPaymentOffset: -140,
    paidCount: 3,
    notes: "Objectif atteint : premier muscle-up ! Ambassadrice.",
    onboarding: { email: "sarah@example.com", whatsapp: "+33612345610", objectif: OBJ.muscleup, niveau: "Débutant", dispo: "4" },
  },
  // 11. Client ARCHIVÉ (corbeille)
  {
    name: "Ancien Client",
    contact: "@ancien",
    status: "termine",
    offer: "Programme express",
    progress: "Archivé",
    startOffset: -200,
    archived: true,
  },
  // 12. Gros payeur en 6x, 4 payées, en cours
  {
    name: "Julien Perrot",
    contact: "@julien.perrot",
    phone: "+33612345612",
    status: "actif",
    offer: "Coaching premium 6 mois",
    progress: "Mois 4/6",
    startOffset: -100,
    priceTotal: 2400,
    installments: 6,
    firstPaymentOffset: -100,
    paidCount: 4,
    nextAction: "Bilan mi-parcours",
    nextActionOffset: 4,
    lastContactOffset: -2,
    onboarding: { email: "julien.perrot@example.com", whatsapp: "+33612345612", objectif: OBJ.frontlever, niveau: "Avancé", dispo: "5+", attentes: "Passer au niveau supérieur" },
    followups: [
      { week: -2, forme: 8, seances: "5+", satisfaction: 5, actions: "Oui" },
      { week: -1, forme: 9, seances: "5+", satisfaction: 5, actions: "Oui", progres: "Front lever tenu 3s !" },
      { week: 0, forme: 8, seances: "4", satisfaction: 4, actions: "Oui" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Prospects : tous les statuts, avec raisons de perte.
// ---------------------------------------------------------------------------
const prospects = [
  { name: "@marco.fit", status: "en_conversation", assignee: "alex", next_action: "Répondre sur les tarifs", next_action_date: iso(0), notes: "Très motivé, veut perdre 10kg." },
  { name: "@lisa_muscu", status: "en_conversation", assignee: "alex", next_action: "Proposer un appel", next_action_date: iso(1), notes: "Suit depuis 6 mois." },
  { name: "@alex.grind", status: "en_conversation", assignee: "alex", next_action: "Relancer, sans réponse depuis 2j", next_action_date: iso(-1) },
  { name: "@sarah.workout", status: "rdv_pris", assignee: "alex", next_action: "Appel de closing", rdv_at: ts(0, 15), notes: "RDV aujourd'hui 15h. Budget OK." },
  { name: "@kevin.street", status: "rdv_pris", assignee: "alex", next_action: "Appel découverte", rdv_at: ts(1, 11) },
  { name: "@amelie.yoga", status: "rdv_pris", assignee: "alex", next_action: "Closing", rdv_at: ts(3, 18) },
  { name: "@nouveau1", status: "nouveau", assignee: "alex", next_action: "Premier message", next_action_date: iso(0) },
  { name: "@nouveau2", status: "nouveau", assignee: "alex" },
  { name: "@contacte1", status: "contacte", assignee: "alex", next_action: "Relancer J+3", next_action_date: iso(-2) },
  { name: "@contacte2", status: "contacte", assignee: "alex", next_action: "Relancer", next_action_date: iso(1) },
  { name: "@noshow1", status: "no_show", assignee: "alex", next_action: "Reprogrammer le RDV", next_action_date: iso(0), notes: "N'est pas venu au 1er RDV." },
  { name: "@gagne1", status: "gagne", assignee: "alex", notes: "Closé ! Devenu client." },
  { name: "@gagne2", status: "gagne", assignee: "alex" },
  { name: "@gagne3", status: "gagne", assignee: "alex" },
  { name: "@perdu1", status: "perdu", assignee: "alex", lost_reason: "trop cher", notes: "Budget insuffisant." },
  { name: "@perdu2", status: "perdu", assignee: "alex", lost_reason: "trop cher" },
  { name: "@perdu3", status: "perdu", assignee: "alex", lost_reason: "pas le bon moment" },
  { name: "@perdu4", status: "perdu", assignee: "alex", lost_reason: "veut réfléchir" },
];

// ---------------------------------------------------------------------------
// Tâches, contenus, réunions
// ---------------------------------------------------------------------------
const tasks = [
  { title: "Relancer les prospects chauds", description: "Liste 'en conversation'.", assignee: "alex", priority: "haute", status: "en_cours", due_date: iso(0) },
  { title: "Appel de closing @sarah.workout", description: "Préparer l'offre 12 semaines.", assignee: "alex", priority: "urgente", status: "a_faire", due_date: iso(0) },
  { title: "Relancer Emma pour la 3e échéance", assignee: "alex", priority: "haute", status: "a_faire", due_date: iso(0) },
  { title: "Appel de recadrage avec Karim", description: "Motivation en chute, silence 3 semaines.", assignee: "alex", priority: "urgente", status: "a_faire", due_date: iso(-1) },
  { title: "Monter la vidéo muscle-up", description: "Rushs dans le drive.", assignee: "sam", priority: "haute", status: "en_cours", due_date: iso(-2) },
  { title: "Écrire le script du prochain reel", assignee: "sam", priority: "moyenne", status: "a_faire", due_date: iso(3) },
  { title: "Programmer les posts de la semaine", assignee: "sam", priority: "moyenne", status: "a_faire", due_date: iso(2) },
  { title: "Mettre à jour le script de closing", description: "Intégrer les objections 'trop cher'.", assignee: "alex", priority: "basse", status: "bloque", due_date: iso(7) },
  { title: "Bilan mensuel des chiffres", assignee: "alex", priority: "moyenne", status: "termine", due_date: iso(-3) },
  { title: "Filmer 3 exercices tutos", assignee: "sam", priority: "haute", status: "termine", due_date: iso(-1) },
];

const contents = [
  { title: "10 000 abonnés : ce qu'on a appris", platform: "instagram", stage: "idee", assignee: "sam" },
  { title: "Morning routine mobilité", platform: "tiktok", stage: "idee", assignee: "sam" },
  { title: "Routine mobilité du matin", notes: "Accroche : 'raide comme un piquet ?'", platform: "instagram", stage: "script", assignee: "sam" },
  { title: "Défi 30 jours de tractions ep.1", platform: "tiktok", stage: "tournage", assignee: "sam" },
  { title: "3 erreurs qui bloquent ton muscle-up", platform: "instagram", stage: "montage", assignee: "sam" },
  { title: "Transformation de un coach solo — S8", notes: "Avant/après, autorisation OK.", platform: "instagram", stage: "programme", assignee: "alex", scheduled_date: iso(1) },
  { title: "Q&R spécial débutants", platform: "tiktok", stage: "programme", assignee: "sam", scheduled_date: iso(3) },
  { title: "3 exos pour débloquer le handstand", platform: "tiktok", stage: "publie", assignee: "sam", scheduled_date: iso(-6), published_date: iso(-6), link: "https://www.tiktok.com/@coach-os/video/demo" },
  { title: "Pourquoi tu stagnes en calisthénie", platform: "instagram", stage: "publie", assignee: "sam", scheduled_date: iso(-10), published_date: iso(-10), link: "https://www.instagram.com/p/demo" },
];

async function insertIfEmpty(
  table: string,
  rows: Record<string, unknown>[],
  probe: string,
  probeVal: string,
) {
  const { data: existing } = await db.from(table).select("id").eq(probe, probeVal).limit(1);
  if (existing && existing.length > 0) {
    console.log(`  ⏭  ${table} : données démo déjà présentes, on saute.`);
    return false;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await db.from(table).insert(rows as any);
  if (error) {
    console.error(`  ❌ ${table} : ${error.message}`);
    return false;
  }
  console.log(`  ✓ ${table} : ${rows.length} lignes.`);
  return true;
}

async function main() {
  if (RESET) await reset();

  console.log("🌱 Injection des données de démonstration…\n");

  // --- Clients + paiements + réponses ---
  const { data: existingClient } = await db
    .from("clients")
    .select("id")
    .like("name", "Démo %")
    .limit(1);

  if (existingClient && existingClient.length > 0) {
    console.log("  ⏭  Clients démo déjà présents (relance avec --reset pour régénérer).");
  } else {
    for (const c of clients) {
      const { data: inserted, error } = await db
        .from("clients")
        .insert({
          name: c.name,
          contact: c.contact,
          phone: c.phone ?? null,
          status: c.status,
          offer: c.offer,
          progress: c.progress,
          start_date: iso(c.startOffset),
          next_action: c.nextAction ?? null,
          next_action_date: c.nextActionOffset !== undefined ? iso(c.nextActionOffset) : null,
          last_contact_date: c.lastContactOffset !== undefined ? iso(c.lastContactOffset) : null,
          notes: c.notes ?? null,
          price_total: c.priceTotal ?? null,
          installments: c.installments ?? null,
          first_payment_date: c.firstPaymentOffset !== undefined ? iso(c.firstPaymentOffset) : null,
          archived: c.archived ?? false,
          archived_at: c.archived ? new Date().toISOString() : null,
        })
        .select("id")
        .single();
      if (error || !inserted) {
        console.error(`  ❌ client ${c.name} : ${error?.message}`);
        continue;
      }
      const clientId = inserted.id;

      // Paiements : k payées + la suivante (attente ou retard)
      if (c.priceTotal && c.installments && c.firstPaymentOffset !== undefined) {
        const amount = Math.round((c.priceTotal / c.installments) * 100) / 100;
        const firstDate = iso(c.firstPaymentOffset);
        const paid = c.paidCount ?? 0;
        const rows: Record<string, unknown>[] = [];
        for (let i = 0; i < paid; i++) {
          const due = addMonths(firstDate, i);
          rows.push({ client_id: clientId, amount, status: "paye", due_date: due, paid_date: due, notes: `Échéance ${i + 1}/${c.installments}` });
        }
        // échéance suivante non payée si pas soldé
        if (paid < c.installments) {
          const due = addMonths(firstDate, paid);
          rows.push({ client_id: clientId, amount, status: "en_attente", due_date: due, paid_date: null, notes: `Échéance ${paid + 1}/${c.installments}` });
        }
        if (rows.length) await db.from("payments").insert(rows);
      }

      // Onboarding
      if (c.onboarding) {
        await db.from("client_onboarding_response").insert({
          client_id: clientId,
          submitted_at: ts(c.startOffset + 1, 10),
          answers: c.onboarding,
        });
      }

      // Suivis hebdo
      if (c.followups?.length) {
        const rows = c.followups.map((f) => ({
          client_id: clientId,
          period: monday(f.week),
          submitted_at: ts(f.week * 7 + 1, 18),
          answers: {
            forme: String(f.forme),
            seances: f.seances,
            satisfaction: String(f.satisfaction),
            actions_faites: f.actions,
            ...(f.progres ? { progres: f.progres } : {}),
            ...(f.blocages ? { blocages: f.blocages } : {}),
            ...(f.engagement ? { actions_semaine: f.engagement } : {}),
          },
        }));
        await db.from("client_followup_response").insert(rows);
      }
    }
    console.log(`  ✓ clients : ${clients.length} (avec paiements, onboarding, suivis).`);
  }

  // --- Prospects ---
  await insertIfEmpty(
    "prospects",
    prospects.map((p) => ({ source: "instagram", ...p })),
    "name",
    "Démo @marco.fit",
  );

  // --- Tâches ---
  await insertIfEmpty("tasks", tasks, "title", "Relancer les prospects chauds");

  // --- Contenus ---
  await insertIfEmpty("content_items", contents, "title", "Routine mobilité du matin");

  // --- Réunion (marquée __demo__ dans objectives pour purge) ---
  await insertIfEmpty(
    "meetings",
    [
      {
        date: iso(-7),
        objectives: "__demo__",
        decisions: "- Concentrer la prospection sur les abonnés récents\n- Sam passe en face cam pour les conseils techniques",
        problems: "- Trop de 'je vais réfléchir' en closing\n- Retard sur le montage",
        action_items: "Alex : réécrire la partie objections\nSam : rattraper les 2 montages\nEnsemble : revoir les stats des reels",
      },
    ],
    "objectives",
    "__demo__",
  );

  console.log("\n✅ Terminé. Recharge l'app pour voir les données.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
