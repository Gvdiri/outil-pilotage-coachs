# CoachOS — l'outil de pilotage d'un binôme de coachs sportifs

Outil web interne conçu, développé et livré pour **deux coachs sportifs en ligne associés**.
Avant, leur activité était éparpillée entre plusieurs fichiers et applications. Avec CoachOS, ils
ouvrent **un seul écran chaque matin** et savent quoi faire, qui le fait, et où en sont leurs
prospects, leurs clients et leurs contenus.

> Projet client réel, livré et utilisé en 2026. Les noms des clients sont remplacés par
> **Alex & Sam** et toutes les données de cette version sont fictives.

## Ce que fait l'outil

| Module | Ce qu'il apporte |
|---|---|
| **Tableau de bord** | La vue du matin : tâches du jour par coach, priorités de la semaine, rendez-vous, 8 indicateurs, état des contenus |
| **Tâches** | Kanban À faire / En cours / Bloqué / Terminé en glisser-déposer, priorités, filtre par coach |
| **Pipeline de contenu** | Kanban Idée → Script → Tournage → Montage → Programmé → Publié |
| **Prospects** | Ajout rapide, statuts, relances signalées automatiquement, rendez-vous, conversion en client |
| **Clients** | Fiches, paiements (le retard est calculé, jamais saisi), liens vers les formulaires |
| **Documentation** | Procédures, scripts et modèles en markdown, avec tags et recherche |
| **Réunions** | Comptes rendus hebdomadaires ; une action notée devient une tâche en un clic |
| **Formulaires clients** | Onboarding et suivi hebdo remplis par les clients via un lien unique, sans compte |
| **Rapports PDF** | Bilan d'activité, bilan client, préparation d'appel |

## Comment je l'ai construit

1. **Audit du besoin** avec les deux coachs : leurs outils, leurs irritants, ce qu'ils regardent chaque matin.
2. **Cahier des charges** découpé en documents courts : [spécification](docs/02-specification.md),
   [tableau de bord](docs/03-dashboard.md), [modèle de données](docs/04-modele-donnees.md),
   [plan de build](docs/05-plan-de-build.md), [conventions](docs/06-stack-conventions.md),
   [definition of done](docs/07-definition-of-done.md), [formulaires](docs/08-formulaires-clients.md).
3. **Développement piloté avec des agents IA** : le fichier [`CLAUDE.md`](CLAUDE.md) fixe les règles
   du projet, chaque étape du plan est livrée, relue, testée, puis validée avant la suivante.
4. **Déploiement** sur Vercel + Supabase, sur les offres gratuites, avec un guide de mise en route
   non technique pour les clients ([`SETUP.md`](SETUP.md)).

## Architecture

```
app/
  (app)/                 espace privé (connexion requise) : tableau de bord + 7 modules
  login/                 connexion (2 comptes, pas d'inscription publique)
  form/                  formulaires clients publics, protégés par un jeton unique
  api/public/            enregistrement des formulaires côté serveur, après validation du jeton
components/              composants d'interface réutilisables (Kanban, badges, modales…)
lib/
  actions/               écritures côté serveur (Server Actions)
  supabase/              clients navigateur / serveur / administrateur
  pdf/                   génération des rapports PDF
  dates.ts, suivi.ts…    logique métier pure, testée
supabase/                schéma complet + migrations
scripts/test-logic.ts    tests de la logique métier
proxy.ts                 protection des routes : tout est privé sauf /login et /form
```

**Choix techniques**
- **Sécurité par défaut** : politiques RLS (« connecté = accès, anonyme = rien ») ; la clé
  d'administration ne quitte jamais le serveur ; les formulaires publics passent par le serveur.
- **Ne jamais stocker ce qui se calcule** : un paiement « en retard » ou un client « à risque » est déduit des dates.
- **Statuts typés** en TypeScript strict, sans chaînes magiques.
- **Fuseau Europe/Paris** géré explicitement pour toutes les échéances.

## Qualité

- TypeScript en mode strict : `npx tsc --noEmit` passe sans erreur.
- **80 tests** de la logique métier (dates, paiements, relances, risque de départ d'un client) :

```bash
npm test   # 80 tests OK, 0 en échec
```

## Lancer en local

```bash
npm install
cp .env.example .env.local   # renseigner les clés Supabase (voir SETUP.md)
npm run dev                  # http://localhost:3000
```

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS · Supabase (PostgreSQL + Auth) ·
React PDF · Resend · Vercel

---

Conçu et développé par **Gadiri Bah**, étudiant ingénieur à Junia ISEN Lille.
