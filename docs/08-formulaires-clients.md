# 08 — Formulaires clients (module partagé, greffé sur le CRM Clients)

> Ajout par rapport au brief initial d'Alex & Sam. Même mécanisme que l'outil d'un coach solo : ce module fait
> partie du **socle réutilisable** commun à tous les clients coachs/infopreneurs.

## But
Permettre à Alex & Sam d'envoyer un **lien-formulaire** à leurs propres clients (ou prospects). Le client
clique, remplit sans avoir de compte, et ses réponses se rangent **automatiquement dans sa fiche** côté CRM —
fini la saisie manuelle.

## Deux formulaires
1. **Formulaire d'onboarding** (1 par client, à l'entrée) : `/form/onboarding/[token]`.
   - À la soumission : crée une entrée liée au client + remplit/complète sa fiche.
2. **Formulaire de suivi récurrent** (optionnel, ex. hebdomadaire) : `/form/suivi/[token]`.
   - Chaque soumission s'enregistre comme une **nouvelle entrée datée** sous la fiche du client (historique).

## Champs
- **Configurables / éditables** (définition des champs en config ou colonne `jsonb`), avec un jeu par défaut
  raisonnable. Les champs exacts seront précisés par Alex & Sam (non bloquant : on construit le mécanisme,
  on ajuste les champs ensuite).

## Comportement
- Pages de formulaire **publiques** (le client n'a pas de compte) mais **protégées par token unique**.
- Token invalide/expiré -> message d'erreur propre, aucune donnée exposée.
- Après soumission : page de confirmation simple pour le client.
- Dans le CRM Clients, un bouton génère/affiche le lien à copier pour chaque client (Alex/Sam l'envoient eux-mêmes).

## Sécurité (critique)
Valider le token côté serveur -> rattacher la réponse au bon `client` -> n'autoriser QUE cette écriture
(jamais lire/écrire d'autres données). Configurer la RLS Supabase pour qu'une soumission publique ne puisse
ni lire ni modifier autre chose. C'est la **seule surface publique** de l'app ; tout le reste reste derrière l'auth.

## Impact sur le modèle de données
- Ajouter `form_token` (text, unique) sur la table `clients` (et optionnellement `prospects`).
- Ajouter les tables `client_onboarding_response` et `client_followup_response` (voir `04-modele-donnees.md`).
