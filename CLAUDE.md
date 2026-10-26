# CLAUDE.md — "Cerveau commun" d'Alex & Sam (OS interne d'équipe)

> **Version publique** : le contexte client (`docs/01`) et le document de référence d'un outil précédent ont été retirés par confidentialité. Les noms des clients sont remplacés par Alex & Sam.

> Fichier de contexte principal. À lire en entier avant d'écrire la moindre ligne de code.
> Tout le détail est dans `docs/`. Ce fichier est la source de vérité des règles du projet.
>
> Les docs `01`→`08` définissent **les besoins d'Alex & Sam** : c'est la base du projet.
> Le fichier `blueprint-coachos-coach-solo.md` est fourni **en référence** : il décrit l'outil d'un coach solo
> tel qu'il a été construit et testé. Il sert d'appui pour les modules qu'Alex & Sam
> partagent avec cet outil (CRM prospects, CRM clients, paiements, formulaires) — pas à reconstruire
> l'outil d'un coach solo à l'identique. Différence clé : **outil précédent = 1 coach ; Alex & Sam = 2** → prévoir
> l'attribution Alex/Sam là où c'est pertinent (prospects, tâches, contenus).

## En une phrase
Construire un **outil web interne** pour le binôme Alex & Sam : un "cerveau commun" qui centralise
toute leur organisation dans un seul espace — tâches, pipeline de contenu, CRM prospects, CRM clients,
documentation interne, réunions hebdo — pour qu'ils ouvrent **un seul écran chaque matin** et sachent
immédiatement quoi faire, qui le fait, et où en sont prospects, clients et contenus.

## Règles d'or (non négociables)
1. **Espace de travail interne.** Les clients n'accèdent JAMAIS au dashboard ni aux fiches : c'est l'espace
   des 2 associés. SEULE exception : des **pages formulaires publiques** que les clients remplissent via un
   lien à token (module formulaires, voir `docs/08`). Tout le reste est derrière l'auth.
2. **Simple, visuel, rapide.** Exigence n°1 du client. Peu de clics, statuts en couleurs, vues en colonnes
   (kanban). En cas de doute : la solution la plus simple et la plus claire.
3. **Centralisé.** Le Dashboard est la page d'accueil et agrège tout. C'est le cœur de l'outil.
4. **Multi-utilisateur (2 personnes).** Tout est partagé ; la notion d'"assigné" sert à l'attribution
   (qui est responsable), pas au contrôle d'accès. Les deux voient et modifient tout.
5. **Responsive.** Utilisable sur ordinateur ET mobile (consultation du matin, parfois sur téléphone).
6. **Architecture modulaire.** Chaque module = un bloc autonome au-dessus d'un socle commun réutilisable.
   Ne rien coder en dur de spécifique à Alex & Sam au-delà du seed (ce socle resservira pour d'autres clients).

## Les 2 utilisateurs
- **Alex** : stratégie, acquisition, prospection, setting, closing, relation client, pilotage -> surtout CRM + tâches.
- **Sam** : création de contenu, montage vidéo, production -> surtout pipeline contenu + tâches.
- Accès complet pour les deux. "Assigné = Alex | Sam" sur tâches, contenus, prospects.

## Les 7 modules (détail dans docs/02 et docs/03)
1. **Dashboard** — vue matinale agrégée (tâches du jour, priorités semaine, RDV, indicateurs, état contenus).
2. **Tâches** — kanban (À faire / En cours / Bloqué / Terminé), attribution, priorités, dates.
3. **Pipeline contenu** — kanban Idée -> Script -> Tournage -> Montage -> Programmé -> Publié.
4. **CRM Prospects** — suivi prospects Instagram, statut commercial, relances, RDV.
5. **CRM Clients** — clients actifs, avancement, paiements, prochaines actions.
6. **Documentation interne** — SOP, scripts, ressources, modèles réutilisables.
7. **Réunion hebdo** — objectifs, décisions, problèmes, actions à réaliser.
8. **Formulaires clients** (module partagé, greffé sur le CRM Clients) — liens-formulaires à token que les
   clients remplissent ; les réponses se rangent auto dans leur fiche. Voir `docs/08`.

## Stack imposée
- **Front** : Next.js (App Router) + React + TypeScript + Tailwind CSS.
- **BDD + Auth** : Supabase (PostgreSQL + login email/mot de passe pour les 2 comptes).
- **Hébergement** : Vercel + Supabase, offres gratuites au démarrage.
- Détails et conventions : `docs/06-stack-conventions.md`.

## Hors scope (Phase 2 — NE PAS construire maintenant)
- Intégration **Slack / WhatsApp** (Slack faisable plus tard ; WhatsApp = API pro, lourd/payant).
- Notifications/rappels automatiques, automatisations, application mobile native.

## Ordre de build (résumé — détail dans docs/05)
Setup -> Schéma BDD -> CRM Prospects -> CRM Clients + Paiements -> Tâches -> Pipeline Contenu ->
Dashboard -> Docs/SOP -> Réunions hebdo -> Polish. Construire et tester module par module.

## Où trouver le détail
- `docs/01-contexte-client.md` — qui sont Alex & Sam, leur activité, le "pourquoi".
- `docs/02-specification.md` — spec des 7 modules + objectif.
- `docs/03-dashboard.md` — le dashboard et ses indicateurs (calculs exacts).
- `docs/04-modele-donnees.md` — schéma de base de données.
- `docs/05-plan-de-build.md` — ordre de build et priorités.
- `docs/06-stack-conventions.md` — stack, structure, conventions de code, sécurité.
- `docs/07-definition-of-done.md` — critères de "terminé", hors scope, données de test.
- `docs/08-formulaires-clients.md` — module formulaires clients (liens à token, auto-remplissage des fiches).
- `blueprint-coachos-coach-solo.md` — RÉFÉRENCE : l'outil d'un coach solo (core commun) tel que construit et testé.

## Note coût/hébergement
Démarrer sur les offres gratuites (Vercel + Supabase). En production, ~60€ de frais d'hébergement possibles,
**à la charge du client** (c'est leur outil) — déjà communiqué à Alex & Sam.
