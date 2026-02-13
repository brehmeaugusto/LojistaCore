-- Permite que o app (anon) insira/atualize estoque e movimentos.
-- Execute no SQL Editor do Supabase se ao salvar ajuste/estoque aparecer erro de permissão (RLS).
alter table public.estoque_saldos disable row level security;
alter table public.movimentos_estoque disable row level security;
