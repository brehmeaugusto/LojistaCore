-- Permite que o cliente (anon) leia e atualize a tabela usuarios para login.
-- Execute no SQL Editor se o login retornar "Usuário não encontrado" mesmo com admin cadastrado.
alter table public.usuarios disable row level security;
