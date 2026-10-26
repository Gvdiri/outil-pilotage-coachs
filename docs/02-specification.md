# 02 — Spécification fonctionnelle (les 7 modules)

Principe à respecter partout : **simple, visuel, rapide, centralisé, responsive.** Codes couleurs cohérents
pour statuts et priorités (un composant de badge unique réutilisé partout). Ajout d'un élément (tâche,
prospect, idée de contenu) = quelques secondes.

## Module 1 — Dashboard principal
Vue matinale agrégée. Détaillé dans `03-dashboard.md` (à coder en dernier, une fois les autres modules en place).

## Module 2 — Gestion des tâches
- **Vue** : kanban 4 colonnes = À faire / En cours / Bloqué / Terminé. Cartes déplaçables (drag & drop ;
  à défaut, menu de changement de statut).
- **Carte tâche** : titre, badge de priorité (couleur), pastille de l'assigné (Alex/Sam), date limite
  (rouge si dépassée).
- **Filtres** : par assigné (Alex / Sam / tous) et par priorité.
- **Créer/éditer** : titre, description, assigné, priorité, statut, date limite.
- **Couleurs priorité** : basse=gris, moyenne=bleu, haute=orange, urgente=rouge.

## Module 3 — Gestion du contenu (pipeline)
- **Vue** : kanban 6 colonnes = Idée -> Script -> Tournage -> Montage -> Programmé -> Publié. Cartes
  déplaçables d'une étape à l'autre.
- **Carte contenu** : titre/idée, plateforme (Insta/TikTok), assigné, date programmée si renseignée.
- **Créer/éditer** : titre, notes/script, plateforme, étape, assigné, date programmée, date publiée, lien.
- **Règles** : passer en "Programmé" demande une date programmée ; passer en "Publié" propose de saisir la
  date de publication et le lien.

## Module 4 — CRM Prospects
- **Vue** : tableau/liste avec nom/@, statut (badge couleur), prochaine action, date de prochaine action,
  assigné. Triable et filtrable par statut.
- **Fiche détail** : toutes les infos + notes + bouton "convertir en client" (crée une ligne dans clients).
- **Relances** : mettre en évidence les prospects dont `next_action_date` <= aujourd'hui (badge "à relancer").
  Ils remontent dans le Dashboard.
- **Statuts** : nouveau, contacté, en conversation, RDV pris, no-show, gagné, perdu (couleurs distinctes).
- **Ajout rapide** : champ "+ prospect" en haut de liste (nom + statut en une ligne).

## Module 5 — CRM Clients (+ paiements)
- **Vue** : liste des clients avec statut, offre, avancement, prochaine action, état des paiements
  (à jour / en attente / en retard).
- **Fiche détail** : infos client + historique des paiements + prochaines actions + notes.
- **Paiements** : ajouter un paiement (montant, échéance, statut, date payée). Un paiement "en_attente"
  dont l'échéance est passée s'affiche automatiquement "en retard".
- **Conversion** : un client créé depuis un prospect reprend son nom/contact.
- **Formulaires clients** : chaque client a un lien-formulaire unique (onboarding + suivi récurrent) qu'il
  remplit sans compte, et qui remplit automatiquement sa fiche. Détail complet dans `08-formulaires-clients.md`.

## Module 6 — Documentation interne (SOP)
- **Vue** : liste filtrable par type (SOP / script / ressource / modèle) et par tag, avec recherche.
- **Éditeur** : titre, type, tags, contenu (texte riche / markdown). Lecture propre + édition.
- **But** : centraliser procédures, scripts de prospection/closing, ressources et modèles réutilisables.

## Module 7 — Réunion hebdomadaire
- **Vue** : liste des comptes-rendus par date (le plus récent en haut).
- **Formulaire** : date, objectifs, décisions, problèmes rencontrés, actions à réaliser.
- **Bonus utile** : depuis une "action à réaliser", un bouton "créer une tâche" qui pré-remplit une tâche
  dans le Module 2 (lien naturel entre réunion et exécution).
