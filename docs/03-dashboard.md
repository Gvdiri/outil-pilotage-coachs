# 03 — Le Dashboard (cœur de l'outil)

Page d'accueil après connexion. Tout est **agrégé** depuis les autres tables (rien de stocké en plus).
Doit se lire en 5 secondes le matin. Disposition en blocs (cartes).

## Bloc 1 — Tâches du jour
Tâches dont la date limite = aujourd'hui OU au statut "en cours", groupées par assigné (Alex / Sam).
Mettre en rouge les tâches en retard (date limite passée, non terminées).

## Bloc 2 — Priorités de la semaine
Tâches "haute" ou "urgente" dont la date limite tombe dans les 7 prochains jours.

## Bloc 3 — Rendez-vous
Prochains RDV : prospects avec `rdv_at` à venir (aujourd'hui + semaine), affichés par date/heure.

## Bloc 4 — Indicateurs clés (compteurs)
| Indicateur | Calcul |
|---|---|
| Prospects actifs | Nb de prospects en statut `en_conversation` ou `rdv_pris`. |
| À relancer aujourd'hui | Nb de prospects avec `next_action_date` <= aujourd'hui. |
| RDV cette semaine | Nb de prospects avec `rdv_at` dans les 7 jours. |
| Clients actifs | Nb de clients en statut `actif`. |
| CA encaissé ce mois | Somme des `payments` `paye` avec `paid_date` dans le mois en cours. |
| Paiements à risque | Nb + somme des `payments` `en_attente` / `en_retard`. |
| Contenus en cours | Nb de `content_items` par étape (surtout montage + programmés à venir). |
| Tâches en retard | Nb de `tasks` avec `due_date` < aujourd'hui et `status` != `termine`. |

## Bloc 5 — État des contenus
Mini-vue du pipeline : combien de contenus à chaque étape, et les prochains "Programmés" avec leur date.
