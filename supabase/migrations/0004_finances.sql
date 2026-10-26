-- ============================================================================
-- Migration 0004 — Module Finances (V2, local).
-- Gestion de trésorerie : dépenses catégorisées + budgets mensuels par
-- catégorie. Les REVENUS ne sont pas stockés ici : ils se déduisent des
-- paiements clients encaissés (table payments) — zéro double saisie.
-- Additive et idempotente.
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

-- Budget mensuel par catégorie (1 ligne par mois + catégorie).
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  month text not null, -- 'YYYY-MM'
  category text not null
    check (category in ('pub','outils','sous_traitance','materiel','formation','charges','divers')),
  amount numeric not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (month, category)
);

-- updated_at
drop trigger if exists set_updated_at on public.expenses;
create trigger set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.budgets;
create trigger set_updated_at before update on public.budgets
  for each row execute function public.set_updated_at();

-- RLS : équipe authentifiée = accès total (comme le reste).
do $$
declare t text;
begin
  foreach t in array array['expenses','budgets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated_all" on public.%I', t);
    execute format('create policy "authenticated_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end;
$$;
