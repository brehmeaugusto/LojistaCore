-- Bandeira do cartão no pagamento (para aplicar a taxa correta e relatórios por bandeira)
alter table public.pagamentos
  add column if not exists bandeira text;

comment on column public.pagamentos.bandeira is 'Bandeira do cartão quando forma é cartao_credito ou cartao_debito: visa, mastercard, elo, hipercard, amex.';
