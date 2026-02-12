-- Valor mensal do plano (R$) para o Admin Global acompanhar pagamentos das licenças
alter table public.planos
  add column if not exists valor_mensal numeric(12,2) not null default 0;

comment on column public.planos.valor_mensal is 'Valor mensal do plano em reais para acompanhamento de pagamentos das licenças';
