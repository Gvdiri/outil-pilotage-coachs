-- ============================================================================
-- Migration 0005 — Tracker de prospection quotidien (V2, local).
-- 1 ligne par jour : DM/outbound envoyés, appels effectués, closings signés.
-- Débloque le VRAI taux de closing (closings / appels) et les ratios d'effort.
-- Additive et idempotente.
-- ============================================================================

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

drop trigger if exists set_updated_at on public.prospecting_daily;
create trigger set_updated_at before update on public.prospecting_daily
  for each row execute function public.set_updated_at();

alter table public.prospecting_daily enable row level security;
drop policy if exists "authenticated_all" on public.prospecting_daily;
create policy "authenticated_all" on public.prospecting_daily
  for all to authenticated using (true) with check (true);
