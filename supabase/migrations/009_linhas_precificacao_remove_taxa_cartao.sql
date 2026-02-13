-- Remove taxa_cartao da precificação; preço cartão passa a ser apenas "preço" (base). Taxas de cartão por parcelas ficam em taxas_cartao e são aplicadas no PDV.
alter table public.linhas_precificacao
  drop column if exists taxa_cartao;
