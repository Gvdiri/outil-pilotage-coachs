-- ============================================================================
-- Migration 0002 — Vague 2 : paiements intelligents, suivi enrichi,
-- raison de perte, formulaires configurables.
-- Additive et idempotente : rejouable sans risque, ne touche à aucune donnée.
-- ============================================================================

-- Moteur de paiement : configuration du plan par client.
-- Le nombre d'échéances payées se DÉDUIT de la table payments (jamais stocké).
alter table public.clients add column if not exists price_total numeric;
alter table public.clients add column if not exists installments int
  check (installments is null or installments >= 1);
alter table public.clients add column if not exists first_payment_date date;

-- Coordonnée directe pour le bouton WhatsApp (wa.me).
alter table public.clients add column if not exists phone text;

-- Archivage (anti-perte de données) : "Supprimer" archive d'abord, la
-- suppression définitive se fait consciemment depuis la corbeille.
alter table public.clients add column if not exists archived boolean not null default false;
alter table public.clients add column if not exists archived_at timestamptz;

-- Suivi & relances : date du dernier contact (bouton "Contacté aujourd'hui").
alter table public.clients add column if not exists last_contact_date date;

-- Capture des raisons de non-closing (data d'objections pour le marketing).
alter table public.prospects add column if not exists lost_reason text;

-- ----------------------------------------------------------------------------
-- form_config : les 2 formulaires clients deviennent éditables dans l'app
-- (builder visuel). Les réponses restant en jsonb, modifier les questions ne
-- demande aucune migration.
-- ----------------------------------------------------------------------------
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

-- Jeu de questions par défaut (repris de l'app) — inséré seulement si absent.
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
