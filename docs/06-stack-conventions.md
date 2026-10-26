# 06 — Stack & conventions de code

## Stack
- **Front** : Next.js (App Router) + React + TypeScript + Tailwind CSS.
- **Back** : routes API Next.js (Route Handlers).
- **BDD + Auth** : Supabase (PostgreSQL + Auth email/mot de passe, 2 comptes : Alex et Sam).
- **Hébergement** : Vercel + Supabase, offres gratuites au démarrage.

## Structure de dossiers suggérée
```
app/
  (app)/                      # routes derrière auth
    page.tsx                  # dashboard
    taches/  contenu/  prospects/  clients/  docs/  reunions/
  login/
  api/
components/                   # UI partagée réutilisable (le socle)
  StatusBadge.tsx  DataTable.tsx  KanbanBoard.tsx  StatCard.tsx  FormModal.tsx
lib/
  supabase/                   # clients browser + server
  queries/                    # une requête par domaine (prospects.ts, clients.ts...)
  types.ts                    # enums/types partagés
  dates.ts                    # helpers de dates (fuseau Europe/Paris)
```

## Conventions
- **TypeScript partout.** Définir des types/enums pour chaque statut/étape (status tâche, stage contenu,
  status prospect/client/paiement) et les réutiliser — pas de chaînes "magiques".
- **Composants partagés réutilisables** : `StatusBadge`, `DataTable`, `KanbanBoard`, `StatCard`, `FormModal`.
  C'est ce **socle** qui sera réutilisé pour d'autres clients : le garder générique, ne rien y coder de
  spécifique à Alex & Sam.
- **Navigation** : sidebar fixe (desktop) avec les 7 entrées + l'utilisateur connecté + déconnexion ;
  menu burger sur mobile.
- **Couleurs de statut cohérentes** partout via le composant de badge unique.
- **Variables d'environnement** : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Aucun secret committé.
- **Helpers de dates** centralisés (aujourd'hui / cette semaine / ce mois / retard) en fuseau Europe/Paris.
- Retours visuels immédiats (toast) après chaque action ; états de chargement et d'erreur gérés ;
  états vides soignés.
- **Responsive** : sur mobile, les kanbans deviennent des colonnes empilées ou défilables horizontalement.

## Auth & accès
- Supabase Auth, email + mot de passe. Créer les 2 comptes (Alex, Sam) — pas d'inscription publique.
- Toute page (sauf /login) protégée. RLS : "authenticated peut tout" (équipe de confiance de 2 personnes).

## Formulaires clients publics (voir `08-formulaires-clients.md`)
- Routes publiques `/form/onboarding/[token]` et `/form/suivi/[token]` : **seule surface publique** de l'app.
- Valider le token côté serveur, rattacher au bon client, n'autoriser QUE l'écriture de cette réponse.
- RLS Supabase : une soumission publique ne peut ni lire ni modifier d'autres données. Tout le reste de
  l'app reste derrière l'auth des 2 comptes.
