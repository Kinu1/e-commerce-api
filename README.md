# E-commerce Api

Backend REST API para loja virtual, feito com NestJS, Prisma e PostgreSQL. O objetivo e demonstrar uma base profissional para vaga de desenvolvedor full stack junior: arquitetura modular, autenticacao, autorizacao por roles, regras de negocio, testes, Swagger, seed demo e deploy.

## Stack

- Node.js + NestJS
- Prisma ORM
- PostgreSQL no Supabase
- JWT bearer + refresh token persistido
- Bcrypt para hash de senha
- Jest + supertest
- Swagger em `/api/docs` fora de producao

## Modulos

- `auth`: registro, login, refresh e logout
- `users`: perfil autenticado
- `catalog`: categorias, produtos, filtros, sort, soft delete e auditoria
- `cart`: carrinho ativo por cliente
- `orders`: checkout, historico, status e cancelamento
- `payments`: pagamento simulado
- `health`: healthcheck com conexao ao banco

## Setup local

### Pre-requisitos

- Node.js 22+
- Projeto criado no Supabase
- Connection string do Supavisor em Session mode para Prisma

### Rodando a API

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

Antes de rodar as migrations, ajuste o `DATABASE_URL` no `.env` com a connection string do Supabase:

```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@[REGION].pooler.supabase.com:5432/postgres?schema=public"
```

Use a connection string em **Session mode** no desenvolvimento local com Prisma. Se o ambiente suportar IPv6, a connection string direta do Supabase também pode ser usada.

API: `http://localhost:3000/api/v1`

Swagger: `http://localhost:3000/api/docs` em desenvolvimento

## Usuarios seed

Todos usam a senha `Password123!`.

- Admin: `admin@example.com`
- Staff: `staff@example.com`
- Customer: `customer@example.com`

## Scripts

```bash
npm run lint
npm test
npm run test:e2e
npm run build
npm run prisma:generate
npm run prisma:migrate
npm run prisma:deploy
npm run prisma:seed
```

## Variaveis de ambiente

```env
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[DB_PASSWORD]@[REGION].pooler.supabase.com:5432/postgres?schema=public"
JWT_ACCESS_SECRET="change-me-access-secret"
JWT_REFRESH_SECRET="change-me-refresh-secret"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
BCRYPT_ROUNDS=10
CORS_ORIGIN="http://localhost:5173"
```

No deploy em Render ou Railway, configure essas variaveis no painel da plataforma e aponte `DATABASE_URL` para o PostgreSQL do Supabase.

Em `NODE_ENV=production`, a documentacao Swagger nao e exposta.

## Fluxo principal para testar

1. Fazer login como `admin@example.com`.
2. Criar ou editar categorias/produtos.
3. Fazer login como `customer@example.com`.
4. Adicionar produto ao carrinho.
5. Executar checkout.
6. Simular pagamento aprovado.
7. Consultar pedido.

## Decisoes arquiteturais

- PostgreSQL fica externo a API; auth fica na API para demonstrar JWT, guards e refresh token.
- Soft delete amplo protege historico e evita perda acidental de dados administrativos.
- Estoque e debitado somente quando pagamento simulado e aprovado.
- Cancelamento antes de `shipped` devolve estoque imediatamente.
- Produtos e categorias guardam `created_by` e `updated_by` para auditoria simples.
