# 04 — Modèle de données (Supabase / PostgreSQL)

Toutes les tables ont `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`
et (sauf mention) `updated_at timestamptz default now()`. Activer la **RLS** avec une policy simple :
tout utilisateur authentifié peut tout lire/écrire (équipe de 2, accès complet).

## `profiles` (les 2 membres)
| Champ | Type | Description |
|---|---|---|
| id | uuid (FK auth.users) | Lien vers le compte Supabase Auth. |
| name | text | "Alex" / "Sam". |
| role | text | "acquisition" / "contenu" (informatif). |

## `tasks` (Module 2)
| Champ | Type | Description |
|---|---|---|
| title | text | Intitulé. |
| description | text null | Détail optionnel. |
| assignee | text | `alex` \| `sam`. |
| priority | text | `basse` \| `moyenne` \| `haute` \| `urgente`. |
| status | text | `a_faire` \| `en_cours` \| `bloque` \| `termine`. |
| due_date | date null | Date limite. |

## `content_items` (Module 3)
| Champ | Type | Description |
|---|---|---|
| title | text | Idée / titre. |
| notes | text null | Script, angle, notes de prod. |
| platform | text | `instagram` \| `tiktok` \| `autre`. |
| stage | text | `idee` \| `script` \| `tournage` \| `montage` \| `programme` \| `publie`. |
| assignee | text null | `alex` \| `sam`. |
| scheduled_date | date null | Date de programmation. |
| published_date | date null | Date de publication réelle. |
| link | text null | Lien du post publié. |

## `prospects` (Module 4)
| Champ | Type | Description |
|---|---|---|
| name | text | Nom / @ Instagram. |
| source | text default 'instagram' | Canal. |
| status | text | `nouveau` \| `contacte` \| `en_conversation` \| `rdv_pris` \| `no_show` \| `gagne` \| `perdu`. |
| assignee | text null | `alex` \| `sam`. |
| next_action | text null | Prochaine action. |
| next_action_date | date null | Date de prochaine action / relance. |
| rdv_at | timestamptz null | Date/heure du RDV (alimente le Dashboard). |
| notes | text null | Historique / contexte. |

## `clients` (Module 5)
| Champ | Type | Description |
|---|---|---|
| name | text | Nom du client. |
| contact | text null | @ / email / téléphone. |
| status | text | `actif` \| `pause` \| `termine`. |
| offer | text null | Programme / offre. |
| progress | text null | Avancement (ex : "semaine 4/12"). |
| start_date | date null | Début d'accompagnement. |
| next_action | text null | Prochaine action. |
| next_action_date | date null | Date de prochaine action. |
| notes | text null | Notes de suivi. |

## `payments` (Module 5, lié à un client)
| Champ | Type | Description |
|---|---|---|
| client_id | uuid (FK clients) | Client concerné. |
| amount | numeric | Montant. |
| currency | text default 'EUR' | Devise. |
| status | text | `paye` \| `en_attente` \| `en_retard`. |
| due_date | date null | Échéance. |
| paid_date | date null | Date de paiement réel. |
| notes | text null | Ex : 1er versement, mensualité. |

## `docs` (Module 6)
| Champ | Type | Description |
|---|---|---|
| title | text | Titre. |
| type | text | `sop` \| `script` \| `ressource` \| `modele`. |
| content | text | Contenu (markdown / texte riche). |
| tags | text null | Mots-clés séparés par virgule. |

## `meetings` (Module 7)
| Champ | Type | Description |
|---|---|---|
| date | date | Date de la réunion. |
| objectives | text null | Objectifs. |
| decisions | text null | Décisions. |
| problems | text null | Problèmes rencontrés. |
| action_items | text null | Actions à réaliser (peuvent générer des tâches). |

## `clients` — champ ajouté (module formulaires, voir `08`)
| Champ | Type | Description |
|---|---|---|
| form_token | text unique | Lien unique pour rattacher les réponses de formulaire à ce client. |

(Optionnel : ajouter aussi `form_token` sur `prospects` si on veut envoyer un formulaire avant conversion.)

## `client_onboarding_response` (1 par client)
| Champ | Type | Description |
|---|---|---|
| client_id | uuid (FK clients) | Client concerné. |
| submitted_at | timestamptz | Date de soumission. |
| answers | jsonb | Réponses (champs dynamiques/configurables). |

## `client_followup_response` (plusieurs par client, suivi récurrent)
| Champ | Type | Description |
|---|---|---|
| client_id | uuid (FK clients) | Client concerné. |
| period | date | Date / semaine du suivi. |
| answers | jsonb | Réponses (champs dynamiques/configurables). |
