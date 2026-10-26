// Définition des champs des formulaires clients publics (docs/08).
// Configurables ici (jeu par défaut raisonnable) : les réponses étant stockées
// en jsonb, modifier cette liste ne demande AUCUNE migration. Les champs exacts
// seront ajustés avec Alex & Sam.

export interface FormFieldDef {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "date";
  options?: string[];
  required?: boolean;
  placeholder?: string;
}

export const ONBOARDING_FIELDS: FormFieldDef[] = [
  {
    key: "email",
    label: "Ton adresse email",
    type: "text",
    required: true,
    placeholder: "toi@exemple.com",
  },
  {
    key: "whatsapp",
    label: "Ton numéro WhatsApp",
    type: "text",
    placeholder: "+33 6 12 34 56 78",
  },
  {
    key: "objectif",
    label: "Ton objectif principal",
    type: "textarea",
    required: true,
    placeholder: "Ex : réussir mon premier muscle-up, perdre 5 kg…",
  },
  {
    key: "niveau",
    label: "Ton niveau actuel",
    type: "select",
    required: true,
    options: ["Débutant", "Intermédiaire", "Avancé"],
  },
  {
    key: "dispo",
    label: "Combien de séances par semaine peux-tu faire ?",
    type: "select",
    required: true,
    options: ["2", "3", "4", "5+"],
  },
  {
    key: "materiel",
    label: "Ton matériel / lieu d'entraînement",
    type: "text",
    placeholder: "Ex : barre de traction à la maison, salle…",
  },
  {
    key: "blessures",
    label: "Blessures ou contraintes à connaître",
    type: "textarea",
    placeholder: "Laisse vide si rien à signaler",
  },
  {
    key: "attentes",
    label: "Qu'attends-tu de cet accompagnement ?",
    type: "textarea",
  },
  {
    key: "instagram",
    label: "Ton pseudo Instagram (optionnel)",
    type: "text",
    placeholder: "@ton.pseudo",
  },
  // Engagement : ancre le rituel du retour hebdo dès le départ (les clients
  // qui s'engagent explicitement décrochent beaucoup moins ensuite).
  {
    key: "engagement_hebdo",
    label:
      "Je m'engage à remplir un retour chaque semaine pour que mon coach ajuste mon programme",
    type: "select",
    required: true,
    options: ["Oui, je m'engage"],
  },
];

export const FOLLOWUP_FIELDS: FormFieldDef[] = [
  {
    key: "forme",
    label: "Ton niveau de forme cette semaine (1 à 10)",
    type: "select",
    required: true,
    options: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  },
  {
    key: "seances",
    label: "Combien de séances as-tu faites cette semaine ?",
    type: "select",
    required: true,
    options: ["0", "1", "2", "3", "4", "5+"],
  },
  {
    key: "progres",
    label: "Tes progrès / victoires de la semaine",
    type: "textarea",
    placeholder: "Même les petites victoires comptent !",
  },
  {
    key: "blocages",
    label: "Tes difficultés ou blocages",
    type: "textarea",
  },
  {
    key: "questions",
    label: "Tes questions pour le coach",
    type: "textarea",
  },
  {
    key: "satisfaction",
    label: "Ta satisfaction de l'accompagnement (1 à 5)",
    type: "select",
    required: true,
    options: ["1", "2", "3", "4", "5"],
  },
  // Passage à l'action : le Oui/Non binaire alimente le taux global, les
  // badges ✓/✗ par semaine et la détection des séries de "Non".
  {
    key: "actions_faites",
    label: "As-tu réalisé les actions que tu t'étais fixées la semaine dernière ?",
    type: "select",
    required: true,
    options: ["Oui", "Non"],
  },
  {
    key: "actions_semaine",
    label: "Quelles actions t'engages-tu à réaliser la semaine prochaine ?",
    type: "textarea",
    required: true,
    placeholder: "Écris-les : ça augmente vraiment le passage à l'action.",
  },
];

/** Libellé d'une clé de réponse (retombe sur la clé si champ supprimé depuis). */
export function labelForKey(fields: FormFieldDef[], key: string): string {
  return fields.find((f) => f.key === key)?.label ?? key;
}
