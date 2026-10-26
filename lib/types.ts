// Types et enums partagés — source de vérité unique pour tous les statuts/étapes.
// Chaque statut a un libellé FR et un "tone" de couleur consommé par <StatusBadge>.

export type Assignee = "alex" | "sam";

export type TaskStatus = "a_faire" | "en_cours" | "bloque" | "termine";
export type TaskPriority = "basse" | "moyenne" | "haute" | "urgente";

export type ContentStage =
  | "idee"
  | "script"
  | "tournage"
  | "montage"
  | "programme"
  | "publie";
export type ContentPlatform = "instagram" | "tiktok" | "autre";

export type ProspectStatus =
  | "nouveau"
  | "contacte"
  | "en_conversation"
  | "rdv_pris"
  | "no_show"
  | "gagne"
  | "perdu";

export type ClientStatus = "actif" | "pause" | "termine";
export type PaymentStatus = "paye" | "en_attente" | "en_retard";

export type DocType = "sop" | "script" | "ressource" | "modele";

export type ExpenseCategory =
  | "pub"
  | "outils"
  | "sous_traitance"
  | "materiel"
  | "formation"
  | "charges"
  | "divers";

// ---------------------------------------------------------------------------
// Tones de couleurs (mappés sur les classes du StatusBadge)
// ---------------------------------------------------------------------------
export type BadgeTone =
  | "gray"
  | "blue"
  | "cyan"
  | "violet"
  | "amber"
  | "orange"
  | "red"
  | "green";

type Meta<T extends string> = Record<T, { label: string; tone: BadgeTone }>;

export const ASSIGNEES: Assignee[] = ["alex", "sam"];
export const ASSIGNEE_LABELS: Record<Assignee, string> = {
  alex: "Alex",
  sam: "Sam",
};
// Pastille par personne (cohérente partout)
export const ASSIGNEE_TONES: Record<Assignee, BadgeTone> = {
  alex: "blue",
  sam: "violet",
};

export const TASK_STATUSES: TaskStatus[] = [
  "a_faire",
  "en_cours",
  "bloque",
  "termine",
];
export const TASK_STATUS_META: Meta<TaskStatus> = {
  a_faire: { label: "À faire", tone: "gray" },
  en_cours: { label: "En cours", tone: "blue" },
  bloque: { label: "Bloqué", tone: "red" },
  termine: { label: "Terminé", tone: "green" },
};

export const TASK_PRIORITIES: TaskPriority[] = [
  "basse",
  "moyenne",
  "haute",
  "urgente",
];
export const TASK_PRIORITY_META: Meta<TaskPriority> = {
  basse: { label: "Basse", tone: "gray" },
  moyenne: { label: "Moyenne", tone: "blue" },
  haute: { label: "Haute", tone: "orange" },
  urgente: { label: "Urgente", tone: "red" },
};

export const CONTENT_STAGES: ContentStage[] = [
  "idee",
  "script",
  "tournage",
  "montage",
  "programme",
  "publie",
];
export const CONTENT_STAGE_META: Meta<ContentStage> = {
  idee: { label: "Idée", tone: "gray" },
  script: { label: "Script", tone: "violet" },
  tournage: { label: "Tournage", tone: "orange" },
  montage: { label: "Montage", tone: "blue" },
  programme: { label: "Programmé", tone: "amber" },
  publie: { label: "Publié", tone: "green" },
};

export const CONTENT_PLATFORMS: ContentPlatform[] = [
  "instagram",
  "tiktok",
  "autre",
];
export const CONTENT_PLATFORM_META: Meta<ContentPlatform> = {
  instagram: { label: "Instagram", tone: "violet" },
  tiktok: { label: "TikTok", tone: "cyan" },
  autre: { label: "Autre", tone: "gray" },
};

export const PROSPECT_STATUSES: ProspectStatus[] = [
  "nouveau",
  "contacte",
  "en_conversation",
  "rdv_pris",
  "no_show",
  "gagne",
  "perdu",
];
export const PROSPECT_STATUS_META: Meta<ProspectStatus> = {
  nouveau: { label: "Nouveau", tone: "gray" },
  contacte: { label: "Contacté", tone: "blue" },
  en_conversation: { label: "En conversation", tone: "cyan" },
  rdv_pris: { label: "RDV pris", tone: "amber" },
  no_show: { label: "No-show", tone: "orange" },
  gagne: { label: "Gagné", tone: "green" },
  perdu: { label: "Perdu", tone: "red" },
};

export const CLIENT_STATUSES: ClientStatus[] = ["actif", "pause", "termine"];
export const CLIENT_STATUS_META: Meta<ClientStatus> = {
  actif: { label: "Actif", tone: "green" },
  pause: { label: "En pause", tone: "amber" },
  termine: { label: "Terminé", tone: "gray" },
};

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "paye",
  "en_attente",
  "en_retard",
];
export const PAYMENT_STATUS_META: Meta<PaymentStatus> = {
  paye: { label: "Payé", tone: "green" },
  en_attente: { label: "En attente", tone: "amber" },
  en_retard: { label: "En retard", tone: "red" },
};

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "pub",
  "outils",
  "sous_traitance",
  "materiel",
  "formation",
  "charges",
  "divers",
];
export const EXPENSE_CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; tone: BadgeTone }
> = {
  pub: { label: "Pub / Ads", tone: "violet" },
  outils: { label: "Outils & logiciels", tone: "blue" },
  sous_traitance: { label: "Sous-traitance", tone: "cyan" },
  materiel: { label: "Matériel", tone: "amber" },
  formation: { label: "Formation", tone: "green" },
  charges: { label: "Charges / impôts", tone: "red" },
  divers: { label: "Divers", tone: "gray" },
};

export interface Expense {
  id: string;
  date: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  recurring: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Budget {
  id: string;
  month: string; // YYYY-MM
  category: ExpenseCategory;
  amount: number;
  created_at: string;
  updated_at: string;
}

export interface ProspectingDay {
  id: string;
  date: string;
  dm: number;
  calls: number;
  closings: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const DOC_TYPES: DocType[] = ["sop", "script", "ressource", "modele"];
export const DOC_TYPE_META: Meta<DocType> = {
  sop: { label: "SOP", tone: "blue" },
  script: { label: "Script", tone: "violet" },
  ressource: { label: "Ressource", tone: "cyan" },
  modele: { label: "Modèle", tone: "amber" },
};

// ---------------------------------------------------------------------------
// Lignes de tables (miroir de supabase/schema.sql)
// ---------------------------------------------------------------------------
export interface Task {
  id: string;
  title: string;
  description: string | null;
  assignee: Assignee;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentItem {
  id: string;
  title: string;
  notes: string | null;
  platform: ContentPlatform;
  stage: ContentStage;
  assignee: Assignee | null;
  scheduled_date: string | null;
  published_date: string | null;
  link: string | null;
  created_at: string;
  updated_at: string;
}

export interface Prospect {
  id: string;
  name: string;
  source: string;
  status: ProspectStatus;
  assignee: Assignee | null;
  next_action: string | null;
  next_action_date: string | null;
  rdv_at: string | null;
  notes: string | null;
  lost_reason: string | null;
  // Coordonnées
  email: string | null;
  phone: string | null;
  instagram: string | null;
  // Fiche de closing (matière d'un appel de closing)
  pain: string | null; // douleur / problème actuel
  desired: string | null; // situation désirée
  objective: string | null; // objectif visé
  objections: string | null; // objections anticipées
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact: string | null; // libre (déprécié au profit de email/instagram)
  email: string | null;
  instagram: string | null;
  phone: string | null; // WhatsApp
  status: ClientStatus;
  offer: string | null;
  progress: string | null;
  start_date: string | null;
  next_action: string | null;
  next_action_date: string | null;
  notes: string | null;
  form_token: string;
  // Plan de paiement (moteur intelligent) — l'avancement se déduit de payments
  price_total: number | null;
  installments: number | null;
  first_payment_date: string | null;
  // Suivi & relances + corbeille
  last_contact_date: string | null;
  archived: boolean;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormConfig {
  id: string;
  kind: "onboarding" | "suivi";
  title: string;
  description: string;
  fields: import("./forms").FormFieldDef[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  client_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Doc {
  id: string;
  title: string;
  type: DocType;
  content: string;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: string;
  date: string;
  objectives: string | null;
  decisions: string | null;
  problems: string | null;
  action_items: string | null;
  created_at: string;
  updated_at: string;
}

export interface OnboardingResponse {
  id: string;
  client_id: string;
  submitted_at: string;
  answers: Record<string, string>;
}

export interface FollowupResponse {
  id: string;
  client_id: string;
  period: string;
  submitted_at: string;
  answers: Record<string, string>;
}

// Un paiement "en_attente" dont l'échéance est passée est EN RETARD (calculé,
// jamais stocké — cf. principe "ne pas stocker ce qui se déduit").
export function effectivePaymentStatus(
  p: Pick<Payment, "status" | "due_date">,
  todayISO: string,
): PaymentStatus {
  if (p.status === "en_attente" && p.due_date && p.due_date < todayISO) {
    return "en_retard";
  }
  return p.status;
}
