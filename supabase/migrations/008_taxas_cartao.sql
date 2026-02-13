-- Taxas de cartão por bandeira e tipo/faixa de parcelas (crédito, débito, parcelado 2-6x, 7-12x)
create table if not exists public.taxas_cartao (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.empresas(id) on delete cascade,
  bandeira   text not null,
  tipo       text not null,
  taxa       numeric(5,2),
  unique (empresa_id, bandeira, tipo)
);

create index if not exists taxas_cartao_empresa_idx on public.taxas_cartao (empresa_id);

comment on table public.taxas_cartao is 'Taxas (%) por bandeira (visa, mastercard, elo, hipercard, amex) e tipo: credito, debito, parcelado_2_6, parcelado_7_12. taxa null = não aplicável (ex: débito Hipercard).';
