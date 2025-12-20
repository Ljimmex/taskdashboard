# ⚡ Task Management Dashboard

Ultra-fast task management platform for teams.

## Tech Stack

- **Frontend**: Vite + React 19 + TanStack Router
- **Backend**: Bun + Hono (150k req/s)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Better Auth
- **Hosting**: Cloudflare Pages/Workers

## Quick Start

```bash
# Install dependencies
bun install

# Setup environment
cp .env.example .env.local

# Run Supabase locally (optional)
bunx supabase start

# Start development (frontend + backend)
bun run dev
```

## Development URLs

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Supabase Studio: http://localhost:54323

## Project Structure

```
taskdashboard/
├── apps/
│   ├── web/          # Frontend (Vite + React)
│   └── api/          # Backend (Hono + Bun)
├── packages/
│   ├── ui/           # Shared UI components
│   ├── types/        # Shared TypeScript types
│   └── utils/        # Shared utilities
└── turbo.json        # Turborepo config
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start all in dev mode |
| `bun run dev:web` | Frontend only |
| `bun run dev:api` | Backend only |
| `bun run build` | Build for production |
| `bun run test` | Run tests |
| `bun run db:generate` | Generate Drizzle migration |
| `bun run db:migrate` | Apply migrations |
| `bun run deploy` | Deploy to Cloudflare |

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

## License

MIT
