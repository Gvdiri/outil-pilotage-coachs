# SETUP — Mise en route pas à pas (CoachOS)

> Guide complet pour brancher l'application sur Supabase, la lancer en local,
> puis la déployer sur Vercel. Aucune compétence technique avancée requise.
> Temps total : ~15 minutes.

---

## 1. Créer le projet Supabase (~5 min)

1. Va sur [supabase.com](https://supabase.com) → **Sign up** (gratuit) → **New project**.
2. Choisis :
   - **Name** : `coach-os` (ou ce que tu veux) ;
   - **Database password** : génère-le et garde-le quelque part (il ne resservira presque jamais) ;
   - **Region** : `West EU (Paris)` ou la plus proche.
3. Attends ~1 minute que le projet soit prêt.

## 2. Créer les tables + données de test (~2 min)

1. Dans le menu de gauche : **SQL Editor** → **New query**.
2. Ouvre le fichier [`supabase/schema.sql`](supabase/schema.sql) de ce projet,
   copie **tout** son contenu, colle-le dans l'éditeur, clique **Run**.
3. Résultat attendu : "Success. No rows returned". Les 10 tables sont créées,
   la sécurité (RLS) est activée et des données de démo sont insérées.

> Le script est **rejouable sans risque** : il ne duplique jamais les données.

## 3. Créer les 2 comptes (Alex et Sam) (~2 min)

1. Menu de gauche : **Authentication** → **Users** → **Add user** → **Create new user**.
2. Crée les deux comptes :
   - Email d'Alex (ex : `alex@coach-os.com`) + mot de passe fort ;
   - Email de Sam + mot de passe fort.
3. Coche **Auto Confirm User** pour chacun (sinon un email de confirmation serait attendu).

> 💡 Les profils ("Alex" / "Sam") se créent automatiquement à partir du
> début de l'adresse email. Si l'email ne commence pas par leur prénom, corrige
> le nom dans **Table Editor → profiles** (colonne `name`).

## 4. Récupérer les clés API (~1 min)

Menu de gauche : **Settings** (roue dentée) → **API Keys** :

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → **Data API** → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clé **anon / public** |
| `SUPABASE_SERVICE_ROLE_KEY` | la clé **service_role** (⚠️ secrète, ne jamais la partager) |

## 5. Lancer en local (~2 min)

```bash
# dans le dossier du projet
cp .env.example .env.local
# ouvre .env.local et colle les 3 valeurs de l'étape 4

npm install
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000) → page de connexion →
connecte-toi avec un des 2 comptes. Le Dashboard doit afficher les données de démo.

## 6. Déployer sur Vercel (~5 min)

1. Pousse le projet sur un repo **GitHub privé**.
2. Va sur [vercel.com](https://vercel.com) → **Add New → Project** → importe le repo.
3. Avant de cliquer Deploy, ouvre **Environment Variables** et ajoute les 3
   variables de l'étape 4 (mêmes noms, mêmes valeurs).
4. **Deploy**. À la fin, tu obtiens une URL du type `https://coach-os.vercel.app`.

C'est cette URL que Alex & Sam utilisent au quotidien (et qui sert de base
aux liens de formulaires clients).

## 7. Vérifier que tout marche (checklist)

- [ ] Connexion avec les 2 comptes OK ; une URL privée redirige vers /login si déconnecté.
- [ ] Dashboard : indicateurs remplis avec les données de démo.
- [ ] Tâches : glisser une carte d'une colonne à l'autre → toast de confirmation.
- [ ] Prospects : "@sofia.cali" porte le badge **À relancer**.
- [ ] Clients : Emma Ricci a un paiement **En retard** (calculé automatiquement).
- [ ] Fiche client → **Liens formulaires** → Copier → ouvrir le lien en navigation
      privée → remplir → la réponse apparaît dans la fiche.
- [ ] Réunions : bouton **+ tâche** sur une action → tâche pré-remplie.
- [ ] Sur mobile : menu burger + kanbans en défilement horizontal.

## 7 bis. Mot de passe oublié (config Supabase Auth)

Le flux « mot de passe oublié » utilise l'envoi d'email natif de Supabase (pas
besoin de Resend). Pour qu'il marche en production :

1. Supabase → **Authentication → URL Configuration**.
2. **Site URL** = l'URL Vercel (ex : `https://coach-os.vercel.app`).
3. **Redirect URLs** : ajouter `https://<ton-url>/auth/confirm`.

En local, `http://localhost:3000/auth/confirm` est déjà géré.

## 7 ter. Données de démonstration (optionnel)

Pour remplir l'app de données réalistes couvrant toutes les situations
(clients avec plans de paiement variés, prospects tous statuts, retards,
suivis hebdo, churn, etc.) :

```bash
npx tsx scripts/seed-demo.ts          # injecte (sans doublon)
npx tsx scripts/seed-demo.ts --reset  # régénère à neuf
```

Tout est préfixé « Démo » pour être purgé facilement avant la vraie mise en prod.

## 8. Purger les données de démo (quand ils démarrent pour de vrai)

Le plus simple : `npx tsx scripts/seed-demo.ts --reset` puis, sans relancer le
seed, supprimer aussi les données réelles de test au cas par cas. Ou en SQL :

Dans le SQL Editor :

```sql
delete from public.payments;
delete from public.client_followup_response;
delete from public.client_onboarding_response;
delete from public.clients;
delete from public.prospects;
delete from public.tasks;
delete from public.content_items;
delete from public.docs;
delete from public.meetings;
```

(Ou supprime au cas par cas depuis l'interface.)

## Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Écran "Configuration requise" | `.env.local` absent ou incomplet | Refaire l'étape 5, redémarrer `npm run dev` |
| "Email ou mot de passe incorrect" | Compte non créé ou non confirmé | Étape 3 (penser à **Auto Confirm User**) |
| Les pages privées sont vides | Le SQL n'a pas été exécuté | Étape 2 |
| Lien formulaire → "Lien invalide" | `SUPABASE_SERVICE_ROLE_KEY` absente | Étape 4-5 (et variable ajoutée sur Vercel) |
| Le formulaire public ne s'enregistre pas | idem clé service_role | idem |

## Personnalisation courante

- **Champs des formulaires clients** : [`lib/forms.ts`](lib/forms.ts) — ajouter/
  retirer des questions ne demande **aucune migration** (réponses en jsonb).
- **Nom de l'app** : [`lib/config.ts`](lib/config.ts) (`APP_NAME`).
- **Couleurs** : variables CSS dans [`app/globals.css`](app/globals.css).
- **Prénoms des associés** : seed + libellés dans [`lib/types.ts`](lib/types.ts)
  (`ASSIGNEE_LABELS`) si "Sam" devait devenir un autre prénom.
