-- Permite que o app (anon) insira/atualize empresas para o Admin Global gerenciar.
-- Execute no SQL Editor se ao salvar empresa aparecer erro de RLS.
alter table public.empresas disable row level security;
