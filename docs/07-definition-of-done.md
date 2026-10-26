# 07 — Definition of Done, hors scope & données de test

## Critères de "terminé"
- Alex et Sam se connectent avec leurs comptes ; toutes les pages sont protégées.
- Chaque module permet de créer, lire, modifier, supprimer ses éléments ; les données persistent dans Supabase.
- Les statuts/étapes se changent facilement (kanban) ; couleurs cohérentes partout.
- Le **Dashboard** agrège correctement en direct : tâches du jour, priorités semaine, RDV, indicateurs, état contenus.
- Les **relances** (prospects) et les **paiements en retard** remontent automatiquement.
- L'outil est **responsive** (utilisable sur mobile) et rapide.
- Déployé sur **Vercel + Supabase**, accessible via une URL.

## Hors scope (Phase 2 — ne PAS construire)
- Intégration **Slack / WhatsApp** (Slack faisable plus tard via API/webhooks ; WhatsApp = WhatsApp Business
  API, lourd et payant).
- Notifications/rappels automatiques, automatisations.
- Application mobile native (le web responsive suffit pour la v1).
- Multi-équipe / multi-tenant — mais garder l'architecture modulaire pour réutiliser le socle ailleurs.

## Données de test (seed)
Insérer quelques lignes réalistes pour que le Dashboard ait de quoi afficher dès le premier lancement :
- **profiles** : Alex (acquisition), Sam (contenu).
- **prospects** : 5 prospects, statuts variés (2 en_conversation, 1 rdv_pris avec `rdv_at` demain,
  1 contacte avec `next_action_date` = aujourd'hui, 1 perdu).
- **clients** : 2 actifs (offre + progress), 1 en pause.
- **payments** : 1 payé ce mois, 1 en_attente échu (-> en retard), 1 à venir.
- **tasks** : 5 tâches réparties Alex/Sam, priorités et statuts variés, 1 en retard.
- **content_items** : 6 contenus répartis sur les 6 étapes, 1 programmé demain.
- **docs** : 1 SOP prospection, 1 script de closing, 1 modèle de message.
- **meetings** : 1 compte-rendu de la semaine passée.

## Formulaires clients (module ajouté — voir `08`)
- Depuis une fiche client, Alex/Sam génèrent/copient un lien-formulaire unique.
- Le client remplit le lien sans compte ; les réponses apparaissent automatiquement dans sa fiche.
- Le formulaire de suivi récurrent enregistre un historique daté par client.
- La page publique est protégée par token et n'expose aucune autre donnée.
