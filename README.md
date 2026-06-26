# AcreOS

AI-native property investment platform for Abu Dhabi real estate intelligence — grounded in parcels, transactions, investor mandates, and community data.

Built by [@Suryavir Kapur](https://github.com/suryavirkapur) and [@Revanth Barik](https://github.com/revanthbarik) for their hackathon project.

## What the app does

AcreOS helps investors explore Abu Dhabi land and property opportunities with data-backed tools and an AI copilot. Sign in, set your investor profile, and use the dashboard to research districts, match mandates to parcels, generate deal memos, and ask cross-dataset questions with cited answers.

### Live features

| Feature | What you can do |
| --- | --- |
| **Marketing site** | Product landing page with platform overview, workflow, and sign-up CTAs |
| **Passwordless auth** | Sign in with email + 6-digit OTP (no passwords) |
| **Overview dashboard** | Portfolio-level stats — vacant land value, district coverage, yields, price momentum, capital supply |
| **Investor profile** | Save retail or institutional preferences (budget, risk, sectors, districts, amenities, commute) |
| **District recommendations** | Personalized district picks scored against your profile |
| **Decision Copilot** | Ask natural-language questions; AI queries parcels, transactions, investors & communities with cited tool sources |
| **Chat history** | Persisted copilot conversations per user (list, resume, delete) |
| **Opportunities** | Match investor mandates to land parcels with explainable fit scores (0–100) |
| **Deal memos** | Generate one-page AI investment memos for investor × parcel pairs (Gemini) |
| **Data explorer** | Filter and sort parcels by district, land use, status, potential, value, and size |
| **Market view** | District price levels, momentum, and transaction breakdowns |
| **Investors** | Browse active UAE investor mandates from the dataset |
| **Downpayment calculator** | Estimate downpayment, mortgage, and monthly payments (retail profile) |
| **REST API** | `/api/intel/*` endpoints + OpenAPI docs at `/api/docs` |
| **Health check** | `/api/health` — service and database status |

### Data sources

Intelligence is powered by CSV datasets in `data/`:

- `sample_parcels.csv` — Abu Dhabi land parcels (status, use, potential, value)
- `sample_transactions.csv` — Sale transactions (2023–2026) for price trends
- `sample_investors.csv` — Investor mandates (sector, risk, capital range)
- `sample_communities.csv` — Community service demand indices
- `districts.csv` — District-level price, yield, and infrastructure baselines
- `osm_amenities.csv` — Amenity density by district

## Tech stack

- **Frontend:** React 19, TanStack Start & Router, Tailwind CSS v4
- **Backend:** Hono (OpenAPI), Better Auth
- **Database:** PostgreSQL via Prisma (users, profiles, chat history)
- **AI:** Google Gemini (primary, OpenAI-compatible) or OpenAI fallback
- **Build:** Rsbuild

## Getting started

### Prerequisites

- Node.js 22+ (or [mise](https://mise.jdx.dev/) — see `mise.toml`)
- pnpm 11+
- PostgreSQL (local via Prisma, or a remote instance)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Auth signing secret (`openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | App URL (default `http://localhost:3000`) |
| `GEMINI_API_KEY` | Google Gemini key — powers Copilot and deal memos |
| `GEMINI_MODEL` | Gemini model (default `gemini-2.0-flash`) |
| `OPENAI_API_KEY` | Optional fallback if Gemini is not set |
| `OPENAI_MODEL` | OpenAI model (default `gpt-4o-mini`) |

### 3. Set up the database

**Remote Postgres** — set `DATABASE_URL` in `.env`, then:

```bash
pnpm db:push
```

**Local Postgres** via Prisma:

```bash
pnpm db:dev:detach
# Copy the postgres:// URL from `pnpm exec prisma dev ls` into DATABASE_URL
pnpm db:push
```

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

**Sign in:** enter any email on `/login`. In development, the OTP is printed to the server console.

**Copilot & memos:** require `GEMINI_API_KEY` or `OPENAI_API_KEY` in `.env`.

## Routes

| Path | Description |
| --- | --- |
| `/` | Marketing landing page |
| `/login` | Email sign-in |
| `/verify` | OTP verification |
| `/dashboard` | Signed-in workspace (Overview, Profile, Copilot, Opportunities, Explore, Market, Investors) |
| `/api/docs` | Interactive API reference |
| `/api/health` | Service + database health check |
| `/api/intel/*` | Intelligence API (summary, match, copilot, profile, etc.) |

## Scripts

```bash
pnpm dev          # development server
pnpm build        # production build
pnpm start        # serve production build
pnpm db:push      # sync Prisma schema to database
pnpm db:studio    # Prisma Studio
pnpm lint         # oxlint
pnpm fmt          # oxfmt
```

## Docker

```bash
docker build -t acreos .
docker run -p 3000:3000 --env-file .env acreos
```

## Project structure

```
data/                # Abu Dhabi CSV datasets
src/
├── routes/          # TanStack Router pages
├── components/      # UI components
├── server/
│   ├── data/        # CSV store, queries, matching, copilot, memos
│   ├── routes/      # OpenAPI routes (health, chat)
│   ├── auth.ts      # Better Auth (email OTP)
│   └── app.ts       # Hono API mount
├── lib/             # Auth client, markdown, utilities
└── generated/       # Prisma client
prisma/
└── schema.prisma    # User, InvestorProfile, Conversation, Message
```

## What's next

- Live broker feeds and off-market sourcing (beyond static CSVs)
- Agent runtime for end-to-end deal workflows
- Production email delivery for OTP
- Portfolio tracking and asset management post-acquisition
