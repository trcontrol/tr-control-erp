# TR Control ERP

Sistema ERP SaaS multiempresa construído com Next.js 15, TypeScript, Tailwind CSS, shadcn/ui e Supabase.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS v4 + shadcn/ui
- **Backend/Auth:** Supabase (PostgreSQL + Auth + RLS)
- **Lint/Format:** ESLint + Prettier

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18.18 ou superior
- [npm](https://www.npmjs.com/) ou pnpm/yarn
- Conta no [Supabase](https://supabase.com/) (ou Supabase CLI para desenvolvimento local)

## Instalação

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais do Supabase

# 3. Aplicar migrations no Supabase
# Opção A — Supabase Cloud: execute o SQL em supabase/migrations/001_initial_schema.sql
#   no SQL Editor do dashboard do Supabase
# Opção B — Supabase local:
npx supabase start
npx supabase db reset

# 4. Iniciar servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Servidor de produção |
| `npm run lint` | Verificar ESLint |
| `npm run lint:fix` | Corrigir ESLint automaticamente |
| `npm run format` | Formatar com Prettier |
| `npm run typecheck` | Verificar tipos TypeScript |

## Estrutura do projeto

```
src/
├── app/                    # App Router (páginas e layouts)
│   ├── (auth)/             # Login e registro
│   ├── (dashboard)/        # Área autenticada
│   └── api/                # Route Handlers
├── components/
│   ├── ui/                 # shadcn/ui
│   ├── auth/               # Formulários de autenticação
│   └── layout/             # Sidebar, Header
├── lib/
│   ├── supabase/           # Clientes Supabase (browser, server, middleware)
│   ├── auth/               # Helpers de sessão
│   └── constants.ts        # Rotas e constantes
├── providers/              # Context providers (tenant)
├── hooks/                  # Custom hooks
└── types/                  # Tipos TypeScript
```

## Arquitetura multiempresa

- **companies** — cada tenant (empresa) com slug único e plano
- **profiles** — perfil do usuário vinculado ao `auth.users`
- **company_members** — relação N:N com papéis (`owner`, `admin`, `member`)
- **RLS (Row Level Security)** — isolamento de dados por empresa no PostgreSQL
- **TenantProvider** — contexto React para empresa ativa no frontend

## Adicionar componentes shadcn/ui

```bash
npx shadcn@latest add [component-name]
```

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública (publishable) |
| `NEXT_PUBLIC_APP_URL` | URL da aplicação |
| `NEXT_PUBLIC_APP_NAME` | Nome exibido na UI |

> **Nota:** A chave `service_role` não é necessária neste projeto. Use apenas a chave pública via `@supabase/ssr`.

## Licença

Proprietário — TR Control ERP
