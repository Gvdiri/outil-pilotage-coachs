# 05 — Plan de build (ordre et priorités)

Construire et **tester module par module**, dans cet ordre. Chaque étape doit fonctionner avant la suivante.

| # | Étape | Livrable |
|---|---|---|
| 1 | Setup projet | Next.js + Tailwind + client Supabase + Auth (2 comptes) + layout/sidebar + login + protection des routes. |
| 2 | Schéma BDD | Toutes les tables de `04-modele-donnees.md` + RLS + seed (voir `07`). |
| 3 | CRM Prospects | CRUD, statuts, relances, ajout rapide, fiche détail, conversion en client. |
| 4 | CRM Clients + Paiements | CRUD clients, fiche détail, paiements + état "en retard" auto. |
| 5 | Tâches | Kanban 4 colonnes, attribution, priorités, dates, filtres. |
| 6 | Pipeline Contenu | Kanban 6 étapes, plateformes, dates programmées/publiées, lien. |
| 7 | Dashboard | Tous les blocs et indicateurs de `03-dashboard.md`, agrégés en direct. |
| 8 | Docs / SOP | Liste filtrable + éditeur, types et tags. |
| 9 | Réunions hebdo | Liste + formulaire + bouton "créer une tâche" depuis une action. |
| 9b | Formulaires clients | Token sur clients, pages publiques `/form/...`, auto-remplissage des fiches, sécurité RLS (voir `08`). |
| 10 | Polish | Design, responsive, états vides, toasts, déploiement Vercel. |

Note : l'ordre commence par le CRM (prospects/clients) car c'est le socle réutilisable ; le Dashboard vient
après car il agrège tout le reste.
