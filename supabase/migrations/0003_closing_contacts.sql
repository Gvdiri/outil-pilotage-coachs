-- ============================================================================
-- Migration 0003 — coordonnées structurées (email / Instagram / WhatsApp) et
-- champs de closing sur les prospects (repris à la conversion en client).
-- Additive et idempotente : rejouable sans risque.
-- ============================================================================

-- Clients : email et Instagram deviennent des champs à part entière
-- (WhatsApp = colonne "phone" déjà présente depuis 0002).
alter table public.clients add column if not exists email text;
alter table public.clients add column if not exists instagram text;

-- Prospects : coordonnées + fiche de closing (douleur, situation désirée,
-- objectif, objections) — la matière d'un bon appel de closing.
alter table public.prospects add column if not exists email text;
alter table public.prospects add column if not exists phone text;
alter table public.prospects add column if not exists instagram text;
alter table public.prospects add column if not exists pain text;
alter table public.prospects add column if not exists desired text;
alter table public.prospects add column if not exists objective text;
alter table public.prospects add column if not exists objections text;
