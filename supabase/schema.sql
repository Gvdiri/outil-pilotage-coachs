-- ============================================================================
-- CoachOS — schéma complet (installation neuve)
-- À exécuter tel quel dans le SQL Editor de Supabase. Idempotent : peut être
-- rejoué sans casser l'existant (le seed ne s'insère que si les tables sont vides).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Trigger générique : met à jour updated_at à chaque modification
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- profiles — les 2 membres (lié à Supabase Auth)
-- Rempli automatiquement à la création d'un compte (trigger handle_new_user).
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  role text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    initcap(split_part(new.email, '@', 1)),
    case lower(split_part(new.email, '@', 1))
      when 'alex' then 'acquisition'
      when 'sam' then 'contenu'
      else ''
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- tasks — Module 2 (kanban tâches)
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assignee text not null check (assignee in ('alex', 'sam')),
  priority text not null default 'moyenne'
    check (priority in ('basse', 'moyenne', 'haute', 'urgente')),
  status text not null default 'a_faire'
    check (status in ('a_faire', 'en_cours', 'bloque', 'termine')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- content_items — Module 3 (pipeline contenu)
-- ----------------------------------------------------------------------------
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  platform text not null default 'instagram'
    check (platform in ('instagram', 'tiktok', 'autre')),
  stage text not null default 'idee'
    check (stage in ('idee', 'script', 'tournage', 'montage', 'programme', 'publie')),
  assignee text check (assignee in ('alex', 'sam')),
  scheduled_date date,
  published_date date,
  link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- prospects — Module 4 (CRM prospects)
-- ----------------------------------------------------------------------------
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source text not null default 'instagram',
  status text not null default 'nouveau'
    check (status in ('nouveau', 'contacte', 'en_conversation', 'rdv_pris', 'no_show', 'gagne', 'perdu')),
  assignee text check (assignee in ('alex', 'sam')),
  next_action text,
  next_action_date date,
  rdv_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- clients — Module 5 (CRM clients) + form_token (module formulaires)
-- ----------------------------------------------------------------------------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  status text not null default 'actif'
    check (status in ('actif', 'pause', 'termine')),
  offer text,
  progress text,
  start_date date,
  next_action text,
  next_action_date date,
  notes text,
  form_token text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- payments — Module 5 (liés à un client)
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  amount numeric not null,
  currency text not null default 'EUR',
  status text not null default 'en_attente'
    check (status in ('paye', 'en_attente', 'en_retard')),
  due_date date,
  paid_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- docs — Module 6 (documentation interne)
-- ----------------------------------------------------------------------------
create table if not exists public.docs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null default 'sop'
    check (type in ('sop', 'script', 'ressource', 'modele')),
  content text not null default '',
  tags text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- meetings — Module 7 (réunions hebdo)
-- ----------------------------------------------------------------------------
create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  objectives text,
  decisions text,
  problems text,
  action_items text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Réponses des formulaires clients publics — Module 8 (docs/08)
-- ----------------------------------------------------------------------------
create table if not exists public.client_onboarding_response (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  submitted_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.client_followup_response (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  period date not null default current_date,
  submitted_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  -- 1 suivi par période (semaine) et par client : une resoumission met à jour
  unique (client_id, period)
);

-- ----------------------------------------------------------------------------
-- Triggers updated_at
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['profiles','tasks','content_items','prospects','clients','payments','docs','meetings']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
       for each row execute function public.set_updated_at()', t);
  end loop;
end;
$$;

-- ----------------------------------------------------------------------------
-- RLS : tout utilisateur authentifié peut tout lire/écrire (équipe de 2).
-- Le rôle anon n'a AUCUN accès : les formulaires publics passent par le
-- service_role côté serveur uniquement (validation de token).
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','tasks','content_items','prospects','clients','payments',
    'docs','meetings','client_onboarding_response','client_followup_response'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated_all" on public.%I', t);
    execute format(
      'create policy "authenticated_all" on public.%I
       for all to authenticated using (true) with check (true)', t);
  end loop;
end;
$$;

-- ============================================================================
-- SEED — données de test réalistes (docs/07). Ne s'insère que si la table est
-- vide, pour ne jamais dupliquer en rejouant le script.
-- ============================================================================

-- Prospects : 2 en conversation, 1 RDV pris demain, 1 à relancer aujourd'hui, 1 perdu
insert into public.prospects (name, status, assignee, next_action, next_action_date, rdv_at, notes)
select * from (values
  ('@marco.fit', 'en_conversation', 'alex', 'Répondre à sa question sur le programme', current_date + 1, null::timestamptz, 'Très motivé, veut perdre 10kg. A demandé les tarifs.'),
  ('@lisa_muscu', 'en_conversation', 'alex', 'Proposer un appel découverte', current_date + 2, null, 'Suit le compte depuis 6 mois. Objectif : premiers muscle-ups.'),
  ('@karim.prog', 'rdv_pris', 'alex', 'Appel de closing', null, (current_date + 1)::timestamptz + interval '14 hours', 'RDV confirmé. Budget OK, à conclure sur l''offre 12 semaines.'),
  ('@sofia.cali', 'contacte', 'alex', 'Relancer après premier message', current_date, null, 'A liké plusieurs posts, premier DM envoyé il y a 3 jours.'),
  ('@thomas_street', 'perdu', 'alex', null, null, null, 'Pas le budget pour l''instant. À recontacter dans 3 mois.')
) as v(name, status, assignee, next_action, next_action_date, rdv_at, notes)
where not exists (select 1 from public.prospects);

-- Clients : 2 actifs, 1 en pause
insert into public.clients (name, contact, status, offer, progress, start_date, next_action, next_action_date, notes)
select * from (values
  ('Julien Perrot', '@julien.perrot', 'actif', 'Coaching 12 semaines', 'Semaine 4/12', current_date - 28, 'Point hebdo + ajuster le programme', current_date + 2, 'Très assidu. Objectif : front lever.'),
  ('Emma Ricci', 'emma.ricci@example.com', 'actif', 'Coaching 12 semaines', 'Semaine 9/12', current_date - 63, 'Préparer le bilan de fin de programme', current_date + 5, 'Super progression, envisagera peut-être un renouvellement.'),
  ('Nico Vidal', '@nico_vdl', 'pause', 'Coaching 8 semaines', 'Semaine 3/8 (en pause)', current_date - 45, 'Reprendre contact début du mois prochain', current_date + 12, 'Pause pour blessure au poignet. Reprise prévue.')
) as v(name, contact, status, offer, progress, start_date, next_action, next_action_date, notes)
where not exists (select 1 from public.clients);

-- Paiements : 1 payé ce mois, 1 en attente échu (=> en retard auto), 1 à venir
insert into public.payments (client_id, amount, status, due_date, paid_date, notes)
select c.id, v.amount, v.status, v.due_date, v.paid_date, v.notes
from (values
  ('Julien Perrot', 450::numeric, 'paye', current_date - 5, current_date - 5, 'Mensualité 1/3'),
  ('Emma Ricci', 450::numeric, 'en_attente', current_date - 4, null::date, 'Mensualité 3/3 — relancer'),
  ('Julien Perrot', 450::numeric, 'en_attente', current_date + 23, null, 'Mensualité 2/3')
) as v(client_name, amount, status, due_date, paid_date, notes)
join public.clients c on c.name = v.client_name
where not exists (select 1 from public.payments);

-- Tâches : réparties Alex/Sam, priorités et statuts variés, 1 en retard
insert into public.tasks (title, description, assignee, priority, status, due_date)
select * from (values
  ('Relancer les prospects chauds de la semaine', 'Reprendre la liste "en conversation" et envoyer un message personnalisé.', 'alex', 'haute', 'en_cours', current_date),
  ('Préparer l''appel de closing avec @karim.prog', 'Relire ses objectifs, préparer l''offre 12 semaines et les réponses aux objections.', 'alex', 'urgente', 'a_faire', current_date + 1),
  ('Monter la vidéo "5 erreurs au muscle-up"', 'Rushs dans le drive. Format vertical, sous-titres.', 'sam', 'haute', 'en_cours', current_date - 2),
  ('Écrire le script du prochain reel', 'Sujet : routine de mobilité du matin en 5 minutes.', 'sam', 'moyenne', 'a_faire', current_date + 3),
  ('Mettre à jour le modèle de message de prospection', 'Intégrer les retours du dernier call d''équipe.', 'alex', 'basse', 'bloque', current_date + 7)
) as v(title, description, assignee, priority, status, due_date)
where not exists (select 1 from public.tasks);

-- Contenus : 6 contenus répartis sur les 6 étapes, 1 programmé demain
insert into public.content_items (title, notes, platform, stage, assignee, scheduled_date, published_date, link)
select * from (values
  ('10 000 abonnés : ce qu''on a appris', 'Format face cam + b-roll. Ton authentique.', 'instagram', 'idee', 'sam', null::date, null::date, null::text),
  ('Routine mobilité du matin (5 min)', 'Script en cours — accroche : "Tu te lèves raide comme un piquet ?"', 'instagram', 'script', 'sam', null, null, null),
  ('Défi 30 jours de tractions — épisode 1', 'Tournage prévu au parc. Prendre le trépied et le micro.', 'tiktok', 'tournage', 'sam', null, null, null),
  ('5 erreurs au muscle-up', 'Montage : couper les temps morts, zooms sur les erreurs.', 'instagram', 'montage', 'sam', null, null, null),
  ('Transformation client : Julien, semaine 4', 'Avant/après + interview courte. Autorisation OK.', 'instagram', 'programme', 'alex', current_date + 1, null, null),
  ('3 exos pour débloquer le handstand', 'Publié la semaine dernière, bonnes stats.', 'tiktok', 'publie', 'sam', current_date - 6, current_date - 6, 'https://www.tiktok.com/@coach-os/video/exemple')
) as v(title, notes, platform, stage, assignee, scheduled_date, published_date, link)
where not exists (select 1 from public.content_items);

-- Docs : 1 SOP, 1 script de closing, 1 modèle de message
insert into public.docs (title, type, content, tags)
select * from (values
  ('SOP — Prospection Instagram quotidienne',
   'sop',
   E'# Prospection Instagram — routine quotidienne\n\n## Objectif\n50 outbound/jour, réparties sur la journée (matin/midi/soir).\n\n## Étapes\n1. Ouvrir la liste des nouveaux abonnés des dernières 24h.\n2. Trier : profil actif + intérêt visible pour l''entraînement.\n3. Envoyer le message d''ouverture (voir le modèle "Premier DM").\n4. Noter chaque contact dans le CRM Prospects (statut : Contacté).\n5. Relancer à J+3 sans réponse (statut : à relancer).\n\n## Règles\n- Jamais de copier-coller brut : personnaliser la première ligne.\n- Toute conversation qui parle d''objectifs -> proposer un appel.',
   'prospection, instagram, routine'),
  ('Script — Appel de closing',
   'script',
   E'# Script d''appel de closing\n\n## 1. Ouverture (2 min)\n- Briser la glace, remercier pour le temps.\n- Cadrer : "L''idée aujourd''hui c''est de voir si on peut t''aider, et comment."\n\n## 2. Diagnostic (10 min)\n- Situation actuelle : entraînement, alimentation, historique.\n- Objectif précis : "Dans 3 mois, tu veux en être où ?"\n- Blocage principal : "Qu''est-ce qui t''a empêché d''y arriver seul ?"\n\n## 3. Présentation de l''offre (5 min)\n- Reformuler son objectif avec ses mots.\n- Présenter le programme comme LE pont entre sa situation et son objectif.\n\n## 4. Objections courantes\n- "C''est cher" -> coût de l''inaction, paiement en 3 fois.\n- "Je dois réfléchir" -> "Qu''est-ce qui te ferait dire oui aujourd''hui ?"\n\n## 5. Conclusion\n- Oui -> envoyer le lien de paiement pendant l''appel.\n- Non -> fixer une date de relance dans le CRM.',
   'closing, vente, appel'),
  ('Modèle — Premier DM de prospection',
   'modele',
   E'# Premier DM (nouvel abonné)\n\n> Salut [prénom] ! Merci pour le follow 🙏\n> J''ai vu que tu t''intéressais à [sujet vu sur son profil] — tu t''entraînes depuis longtemps ?\n\n**Règles d''utilisation**\n- Toujours personnaliser [sujet vu sur son profil].\n- Objectif du message : ouvrir une conversation, PAS vendre.\n- Si réponse -> poser des questions sur ses objectifs avant de parler du coaching.',
   'prospection, dm, modele')
) as v(title, type, content, tags)
where not exists (select 1 from public.docs);

-- Réunion : 1 compte-rendu de la semaine passée
insert into public.meetings (date, objectives, decisions, problems, action_items)
select
  current_date - 7,
  E'- Passer à 60 outbound/jour\n- Publier 4 reels cette semaine\n- Conclure 2 closings',
  E'- On concentre la prospection sur les abonnés récents (plus réactifs)\n- Sam passe au format "face cam" pour les conseils techniques',
  E'- Le closing bloque : trop de "je vais réfléchir" en fin d''appel\n- Retard sur le montage à cause du tournage de jeudi',
  E'- Alex : réécrire la partie objections du script de closing\n- Sam : rattraper les 2 montages en retard\n- Ensemble : revoir les stats des reels de la semaine'
where not exists (select 1 from public.meetings);

-- ============================================================================
-- VAGUE 2 (miroir de migrations/0002_upgrade_v2.sql) : paiements intelligents,
-- suivi enrichi, raison de perte, formulaires configurables.
-- ============================================================================

alter table public.clients add column if not exists price_total numeric;
alter table public.clients add column if not exists installments int
  check (installments is null or installments >= 1);
alter table public.clients add column if not exists first_payment_date date;
alter table public.clients add column if not exists phone text;
alter table public.clients add column if not exists archived boolean not null default false;
alter table public.clients add column if not exists archived_at timestamptz;
alter table public.clients add column if not exists last_contact_date date;
alter table public.prospects add column if not exists lost_reason text;

create table if not exists public.form_config (
  id uuid primary key default gen_random_uuid(),
  kind text not null unique check (kind in ('onboarding', 'suivi')),
  title text not null,
  description text not null default '',
  fields jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.form_config enable row level security;
drop policy if exists "authenticated_all" on public.form_config;
create policy "authenticated_all" on public.form_config
  for all to authenticated using (true) with check (true);

drop trigger if exists set_updated_at on public.form_config;
create trigger set_updated_at before update on public.form_config
  for each row execute function public.set_updated_at();

insert into public.form_config (kind, title, description, fields)
select 'onboarding', 'Questionnaire de départ',
  'Quelques questions pour préparer un accompagnement vraiment adapté.',
  '[
    {"key":"email","label":"Ton adresse email","type":"text","required":true,"placeholder":"toi@exemple.com"},
    {"key":"whatsapp","label":"Ton numéro WhatsApp","type":"text","placeholder":"+33 6 12 34 56 78"},
    {"key":"objectif","label":"Ton objectif principal","type":"textarea","required":true,"placeholder":"Ex : réussir mon premier muscle-up, perdre 5 kg…"},
    {"key":"niveau","label":"Ton niveau actuel","type":"select","required":true,"options":["Débutant","Intermédiaire","Avancé"]},
    {"key":"dispo","label":"Combien de séances par semaine peux-tu faire ?","type":"select","required":true,"options":["2","3","4","5+"]},
    {"key":"materiel","label":"Ton matériel / lieu d''entraînement","type":"text","placeholder":"Ex : barre de traction à la maison, salle…"},
    {"key":"blessures","label":"Blessures ou contraintes à connaître","type":"textarea","placeholder":"Laisse vide si rien à signaler"},
    {"key":"attentes","label":"Qu''attends-tu de cet accompagnement ?","type":"textarea"}
  ]'::jsonb
where not exists (select 1 from public.form_config where kind = 'onboarding');

insert into public.form_config (kind, title, description, fields)
select 'suivi', 'Ton suivi de la semaine',
  'Fais le point sur ta semaine : ton coach lit chaque réponse.',
  '[
    {"key":"forme","label":"Ton niveau de forme cette semaine (1 à 10)","type":"select","required":true,"options":["1","2","3","4","5","6","7","8","9","10"]},
    {"key":"seances","label":"Combien de séances as-tu faites cette semaine ?","type":"select","required":true,"options":["0","1","2","3","4","5+"]},
    {"key":"progres","label":"Tes progrès / victoires de la semaine","type":"textarea","placeholder":"Même les petites victoires comptent !"},
    {"key":"blocages","label":"Tes difficultés ou blocages","type":"textarea"},
    {"key":"questions","label":"Tes questions pour le coach","type":"textarea"},
    {"key":"satisfaction","label":"Ta satisfaction de l''accompagnement (1 à 5)","type":"select","required":true,"options":["1","2","3","4","5"]},
    {"key":"actions_faites","label":"As-tu réalisé les actions que tu t''étais fixées la semaine dernière ?","type":"select","required":true,"options":["Oui","Non"]},
    {"key":"actions_semaine","label":"Quelles actions t''engages-tu à réaliser la semaine prochaine ?","type":"textarea","required":true,"placeholder":"Écris-les : ça augmente vraiment le passage à l''action."}
  ]'::jsonb
where not exists (select 1 from public.form_config where kind = 'suivi');

-- ============================================================================
-- VAGUE 3 (miroir de migrations/0003_closing_contacts.sql) : coordonnées
-- structurées + fiche de closing sur les prospects.
-- ============================================================================
alter table public.clients add column if not exists email text;
alter table public.clients add column if not exists instagram text;
alter table public.prospects add column if not exists email text;
alter table public.prospects add column if not exists phone text;
alter table public.prospects add column if not exists instagram text;
alter table public.prospects add column if not exists pain text;
alter table public.prospects add column if not exists desired text;
alter table public.prospects add column if not exists objective text;
alter table public.prospects add column if not exists objections text;

-- ============================================================================
-- V2 (miroir de migrations/0004 + 0005) : Finances + tracker de prospection.
-- ============================================================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null default current_date,
  label text not null,
  amount numeric not null check (amount > 0),
  category text not null default 'divers'
    check (category in ('pub','outils','sous_traitance','materiel','formation','charges','divers')),
  recurring boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  category text not null
    check (category in ('pub','outils','sous_traitance','materiel','formation','charges','divers')),
  amount numeric not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, category)
);
create table if not exists public.prospecting_daily (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  dm int not null default 0 check (dm >= 0),
  calls int not null default 0 check (calls >= 0),
  closings int not null default 0 check (closings >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$
declare t text;
begin
  foreach t in array array['expenses','budgets','prospecting_daily'] loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated_all" on public.%I', t);
    execute format('create policy "authenticated_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end;
$$;

-- ============================================================================
-- FIN. Après exécution : créer les 2 comptes dans Authentication > Users
-- (emails alex@... et sam@...) — leurs profils se créeront automatiquement.
-- ============================================================================
