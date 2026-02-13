-- Parcelas sem juros e percentual de juros por parcela (cartão crédito)
-- Usado no PDV: quando parcelas > parcelas_sem_juros, aplica taxa_juros_parcela ao valor
alter table public.parametros_custo
  add column if not exists parcelas_sem_juros integer not null default 1,
  add column if not exists taxa_juros_parcela numeric(5,2) not null default 0;

comment on column public.parametros_custo.parcelas_sem_juros is 'Até quantas parcelas no cartão são sem juros (ex: 3 = 1x, 2x e 3x sem juros)';
comment on column public.parametros_custo.taxa_juros_parcela is 'Percentual de juros aplicado ao valor por parcela além do sem juros (ex: 2 = 2% por parcela)';
