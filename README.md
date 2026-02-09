# LojistaCore

Sistema de gestão para loja de roupas: PDV, estoque, custos, precificação, financeiro e admin multi-tenant com identidade visual por empresa.

**Repositório:** [github.com/brehmeaugusto/LojistaCore](https://github.com/brehmeaugusto/LojistaCore)

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **React 19** + **shadcn/ui** + **Tailwind CSS**
- Store in-memory reativo, integração opcional com **Supabase**

## Funcionalidades

- **Admin Global**: empresas, planos, licenças, auditoria
- **Cadastros**: produtos, SKUs (grade), clientes, fornecedores
- **Estoque**: saldos por loja, ajustes, transferências
- **Custos e preços**: custos fixos/variáveis, overhead, precificação
- **PDV**: vendas, múltiplas formas de pagamento, modo fullscreen (kiosk)
- **Caixa**: abertura/fechamento, sangria, suprimento
- **Financeiro**: contas a receber
- **Relatórios**: vendas, estoque, custos
- **Usuários e acessos**: módulos e permissões por usuário
- **Identidade visual**: logo e cores por empresa (white label)

## Como rodar

```bash
pnpm install
cp .env.local.example .env.local   # configurar Supabase se quiser
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Documentação

Ver [DOCUMENTACAO_LOJISTACORE.md](./DOCUMENTACAO_LOJISTACORE.md) para arquitetura, modelo de dados, permissões e regras de negócio.
