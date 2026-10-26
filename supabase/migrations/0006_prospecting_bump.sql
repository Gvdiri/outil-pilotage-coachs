-- ============================================================================
-- Migration 0006 — Incrément atomique du tracker de prospection.
-- Avant : l'app lisait la ligne du jour puis la réécrivait (read-modify-write).
-- Deux clics simultanés (Alex et Sam) pouvaient s'écraser l'un l'autre, et
-- le tout premier clic du jour pouvait violer UNIQUE(date) → message Postgres
-- brut affiché à l'utilisateur.
-- Ici tout se fait en UNE instruction SQL : plus de course possible.
-- La date est passée par l'app (fuseau Europe/Paris), pas current_date (UTC).
-- Additive et idempotente.
-- ============================================================================

create or replace function public.bump_prospecting(
  p_date date,
  p_field text,
  p_delta integer
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Le nom de colonne est interpolé : on le verrouille sur une liste blanche.
  if p_field not in ('dm', 'calls', 'closings') then
    raise exception 'Champ de prospection invalide : %', p_field;
  end if;

  execute format(
    'insert into public.prospecting_daily (date, %1$I)
       values ($1, greatest(0, $2))
     on conflict (date) do update
       set %1$I = greatest(0, prospecting_daily.%1$I + $2)',
    p_field
  ) using p_date, p_delta;
end;
$$;

grant execute on function public.bump_prospecting(date, text, integer) to authenticated;
