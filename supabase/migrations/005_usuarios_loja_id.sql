-- Adiciona relacionamento opcional de usuario com loja
-- Permite que funcionarios fiquem vinculados a uma unica loja

alter table public.usuarios
  add column if not exists loja_id uuid references public.lojas(id) on delete set null;

create index if not exists usuarios_loja_id_idx on public.usuarios (loja_id);

