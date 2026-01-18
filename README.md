# Portfolio Tracker API

API to manage a financial portfolio: users, platforms, accounts, assets, transactions, prices, and historical snapshots.

## Technologies
- Node.js + TypeScript
- Express 5
- Drizzle ORM + PostgreSQL
- Redis (in-memory storage and scheduled tasks support)
- Zod (validation)
- Tsyringe (dependency injection)
- Pino (logging)

## Architecture
Code is organized by modules and layers:
- `domain`: entities, types, and repositories
- `application`: use cases, services, and validators
- `infrastructure`: HTTP, persistence (Drizzle), external providers, scheduled tasks

HTTP routes are registered from `src/shared/container/modules.container.ts`.

## Requirements
- Node.js 18+
- pnpm
- PostgreSQL
- Redis

## Environment variables
Create a `.env` file with:

| Variable | Description |
| --- | --- |
| `PORT` | API HTTP port |
| `NODE_ENV` | `development` \| `test` \| `staging` \| `production` |
| `ACCEPTED_ORIGINS` | Allowed origins CSV list (optional) |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` |
| `JWT_SECRET` | JWT signing secret (min 10 chars) |
| `DB_URL` | PostgreSQL URL |
| `REDIS_URL` | Redis URL |
| `ASSETPRICE_PROVIDER_API_KEY` | API key for the price provider |

## Scripts
- `pnpm dev`: run the server in development mode
- `pnpm build`: compile TypeScript to `dist/`
- `pnpm start`: run the compiled build (see note below)
- `pnpm lint`: run TypeScript lint

Note: the build outputs `dist/main.js`. If `pnpm start` points to another file, run `node dist/main.js` manually.

## Base routes
All routes require `Bearer` authentication except `/api/auth`.

- `/api/auth`: sign up and sign in
- `/api/users`: current user profile
- `/api/platforms`: platform CRUD
- `/api/accounts`: account CRUD
- `/api/assets`: asset CRUD
- `/api/transactions`: operations and movements
- `/api/asset-prices`: prices and synchronization
- `/api/portfolio-snapshots`: portfolio snapshots

## Scheduled tasks
When the server starts it runs tasks to:
- synchronize asset prices

## Migrations
Migrations live in `drizzle/` and the schema in `src/shared/database/drizzle/schema.ts`.
`drizzle.config.ts` defines the database connection.
