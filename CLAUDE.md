# CLAUDE.md — AgriCompta

## Project Overview

**AgriCompta** is a production-ready agricultural accounting application designed for collective farms in Morocco. The UI, comments, variable names, and documentation are all in **French**. Default locale is `Africa/Casablanca` and default currency is `MAD`.

---

## Repository Structure

```
AgriCompta/
├── backend/                  # Express.js API (Node.js 20 + TypeScript)
│   ├── prisma/
│   │   ├── schema.prisma     # Database schema (26 models)
│   │   └── seed.ts           # Demo data seeder
│   ├── src/
│   │   ├── routes/           # 13+ Express route modules
│   │   ├── middleware/        # auth, validation, errorHandler, upload
│   │   ├── types/            # TypeScript type definitions
│   │   └── server.ts         # Express entry point
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React 18 + Vite SPA (TypeScript)
│   ├── src/
│   │   ├── pages/            # 35+ pages grouped by module
│   │   ├── components/       # Layout, Cards, Modals
│   │   ├── services/         # Axios API service wrappers
│   │   ├── store/            # Zustand state stores
│   │   ├── types/            # Shared TypeScript interfaces
│   │   ├── utils/            # Formatters, helpers
│   │   ├── App.tsx           # React Router configuration
│   │   └── main.tsx          # App entry point
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
├── nginx/
│   └── nginx.conf            # Reverse proxy + SPA routing
├── scripts/
│   └── backup.sh             # Database + uploads backup utility
├── docs/                     # User documentation
├── docker-compose.yml        # Full-stack orchestration
├── .env.example              # Environment variable template
└── README.md                 # Quick-start and architecture docs
```

---

## Technology Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js 20 Alpine |
| Language | TypeScript 5.3.3 (strict mode) |
| Framework | Express 4.18.2 |
| ORM | Prisma 5.7.1 |
| Database | PostgreSQL 15 |
| Auth | JWT (7-day expiry) + bcrypt (12 rounds) |
| Validation | Zod 3.22.4 |
| Logging | Winston 3.11.0 |
| File Upload | Multer (10 MB limit) |
| Export | XLSX + jsPDF/autotable |
| API Docs | Swagger/OpenAPI (`/api/docs`) |
| Security | Helmet, CORS, express-rate-limit |

### Frontend
| Layer | Technology |
|---|---|
| Language | TypeScript 5.3.3 |
| Framework | React 18 |
| Build | Vite 5.0.11 |
| Styling | Tailwind CSS 3.4.1 + CSS custom properties |
| State | Zustand 4.4.7 (persisted in localStorage) |
| Forms | React Hook Form 7.49.3 + Zod |
| HTTP | Axios 1.6.5 (JWT interceptors + auto-refresh) |
| Routing | React Router v6 |
| Tables | TanStack React Table 8.11.0 |
| Charts | Recharts 2.10.3 |
| Date | date-fns 3.0.6 + date-fns-tz (fr locale) |
| UI | Radix UI primitives + Lucide React icons |

### Infrastructure
| Layer | Technology |
|---|---|
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx Alpine |
| Storage | Docker volumes (postgres_data, uploads, backups) |

---

## Development Setup

### Prerequisites
- Docker and Docker Compose installed

### Quick Start
```bash
cp .env.example .env
# Edit .env: set DB_PASSWORD and JWT_SECRET (min 32 chars)
docker compose up -d
```

The application is then accessible at `http://localhost:8888`.

### Demo Credentials
After initial startup the seeder creates:
- Admin: `admin@agricompta.ma` / `Admin1234!`
- Associate: `hassan.ait@agricompta.ma` / `User1234!`
- Accountant: `comptable@agricompta.ma` / `User1234!`
- Observer: `observateur@agricompta.ma` / `User1234!`

### Development Mode (without Docker)
```bash
# Backend
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev        # ts-node-dev with hot reload

# Frontend
cd frontend
npm install
npm run dev        # Vite dev server with HMR (proxies /api to localhost:3000)
```

---

## Key Conventions

### Language
- **All code comments, variable names, UI text, and documentation are in French.**
- API error messages returned in French.
- Dates formatted with `date-fns` using `fr` locale.

### TypeScript
- Strict mode enabled in both backend and frontend (`"strict": true`).
- Avoid `any`; use proper Prisma-generated types and Zod-inferred types.
- Backend target: ES2020; module: CommonJS.

### Backend Conventions
- Each domain (assets, crops, livestock, stocks, …) has its own route file in `backend/src/routes/`.
- Route files export an Express `Router` and are mounted in `server.ts`.
- **Validation** at the route level uses Zod schemas before any business logic.
- **Auth middleware** (`authenticateToken`) must be applied to all protected routes; role checks use `requireRole(Role[])`.
- Use Prisma's generated client — never write raw SQL unless absolutely necessary.
- Error handling: throw `AppError` (operational errors) or let the global error middleware catch Prisma / Zod errors.
- File uploads land in `/uploads` (Docker volume); serve via the `/uploads` static path.

### Database / Prisma
- Schema is in `backend/prisma/schema.prisma`.
- **Do NOT use `prisma migrate`**; the project uses `prisma db push` for schema synchronization (see Dockerfile entrypoint).
- After schema changes: `npx prisma generate` to update the client.
- Models use `camelCase` field names; PostgreSQL tables are auto-named in `snake_case` by Prisma.
- All project-scoped data includes a `projectId` foreign key with cascade delete.
- Performance indexes exist on: `projectId`, `date`, `status`, `type`.

### Frontend Conventions
- Pages are organized by module under `frontend/src/pages/`.
- Global state lives in Zustand stores (`authStore`, `projectStore`) — both persisted in `localStorage`.
- API calls go through service modules in `frontend/src/services/` (never call Axios directly in components).
- Forms always use React Hook Form + Zod resolver; match backend validation schemas.
- All monetary values displayed in MAD with French number formatting.
- Use Radix UI primitives for dialogs, dropdowns, tabs, toasts — do not build custom accessible components from scratch.
- Charts use Recharts; data tables use TanStack React Table.

### Routing
- Public routes: `/login`, `/register` (redirect to projects if authenticated).
- Protected routes: require valid JWT; redirect to `/login` otherwise.
- Project-scoped routes nested under `/projects/:projectId/`.
- Admin-only routes: `/admin/users`, `/accounts`, `/profile`.

---

## API Structure

**Base URL**: `/api` (via Nginx on port 8888)

| Route prefix | Domain |
|---|---|
| `/api/auth` | Authentication (register, login, refresh, logout, password reset) |
| `/api/users` | User management (admin only) |
| `/api/projects` | Projects + dashboard summary |
| `/api/projects/:id/associates` | Associate participation |
| `/api/accounts` | Chart of accounts (hierarchical tree) |
| `/api/projects/:id/transactions` | Transaction CRUD + file upload |
| `/api/assets` | Fixed assets + depreciation schedule |
| `/api/livestock` | Livestock groups, movements, expenses |
| `/api/crops` | Plots, crops, harvests, expenses |
| `/api/stocks` | Inventory + CUMP valuation |
| `/api/sales` | Invoices + customer management |
| `/api/treasury` | Cash accounts + flows |
| `/api/projects/:id/reports` | P&L, balance sheet, cash flow, crop/livestock analysis |
| `/api/closures` | Season closure workflow + profit distribution |
| `/api/docs` | Swagger UI |

**Rate limits**: 100 req/15 min general; 10 req/15 min on auth endpoints.

---

## Database Schema Overview

26 Prisma models grouped by domain:

- **Auth & Governance**: `User` (4 roles: ADMIN, ASSOCIATE, ACCOUNTANT, OBSERVER), `Associate`, `Project`
- **Accounting**: `Account` (Moroccan plan comptable: classes 2, 3, 5, 6, 7), `Transaction` (7 types), `CashAccount` (CASH/BANK/MOBILE_MONEY), `CashFlow`
- **Fixed Assets**: `Asset` (6 categories), `Depreciation` (LINEAR/DECLINING/NONE)
- **Inventory**: `StockItem` (3 categories), `StockMovement` (CUMP auto-valuation, 5 sources)
- **Agricultural Ops**: `Plot`, `Crop` (5 lifecycle statuses), `CropExpense` (6 types), `Harvest`
- **Livestock**: `LivestockGroup`, `LivestockMovement` (5 types), `LivestockExpense` (4 types)
- **Sales**: `Customer` (INDIVIDUAL/COMPANY), `Sale` (PAID/PARTIAL/UNPAID), `SaleLine`
- **Reporting**: `SeasonClosure` (DRAFT/VALIDATED/DISTRIBUTED), `ProfitDistribution`

---

## User Roles

| Role | Permissions |
|---|---|
| `ADMIN` | Full access; can create users and projects |
| `ASSOCIATE` | Read/write on assigned projects |
| `ACCOUNTANT` | Read/write accounting data on assigned projects |
| `OBSERVER` | Read-only on assigned projects |

Role checks are enforced server-side via middleware — do not rely on frontend-only role hiding for security.

---

## Environment Variables

Copy `.env.example` to `.env` before running:

```
DB_USER=agri_user
DB_PASSWORD=<secure password>
DB_NAME=agri_compta
DB_PORT=5432
JWT_SECRET=<min 32 random chars>
JWT_EXPIRATION=7d
API_PORT=3000
NODE_ENV=production
VITE_API_URL=http://localhost/api
DEFAULT_LANGUAGE=fr
TIMEZONE=Africa/Casablanca
CURRENCY=MAD
CORS_ORIGIN=*
```

**Never commit `.env`** — it is gitignored.

---

## Build & Deployment

### Docker (production)
```bash
docker compose up -d --build
```

Backend Dockerfile uses a **multi-stage build**:
1. Builder stage: compiles TypeScript, generates Prisma client.
2. Production stage: minimal Alpine image; entrypoint runs `prisma db push && node dist/server.js`.

Frontend Dockerfile:
1. Builds with Vite (accepts `VITE_API_URL` build arg).
2. Serves the `dist/` directory via Nginx.

### Useful Commands
```bash
# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Run database seed manually
docker compose exec backend node dist/prisma/seed.js

# Backup database + uploads
./scripts/backup.sh

# Rebuild a single service
docker compose up -d --build backend
```

---

## Testing

The test infrastructure is configured (Jest 29 + ts-jest + supertest for backend) but **no test specs exist yet**. When writing new tests:
- Backend: place under `backend/src/__tests__/` or co-locate as `*.test.ts`.
- Run: `npm test` / `npm run test:coverage` inside `backend/`.
- Frontend: Vite test runner is configured; run `npm test` inside `frontend/`.

---

## Common Pitfalls

1. **Schema changes require two steps**: edit `schema.prisma` → `npx prisma generate` (regenerate client) → `npx prisma db push` (sync DB). In Docker the push happens automatically at container start.
2. **Do not mix `prisma migrate` and `prisma db push`** — this project uses only `db push`.
3. **All monetary amounts are stored in MAD** (Moroccan Dirham) as floats in the database. Do not convert at persistence time.
4. **JWT refresh** is handled by the Axios interceptor in the frontend — do not add manual refresh logic in individual service calls.
5. **CUMP (Coût Unitaire Moyen Pondéré)** for stock valuation is recalculated automatically by the backend on each stock movement — never recalculate it on the frontend.
6. **Cascade deletes**: deleting a `Project` cascades to all its child records. This is intentional — warn users before deletion.
7. **File uploads** are persisted at `/uploads` (Docker volume). Ensure the volume is mounted in production to avoid losing files on container restart.
8. **Rate limiting** on auth endpoints (10 req/15 min) — account for this in any automated scripts or seeding logic that calls auth endpoints.
