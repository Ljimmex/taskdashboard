# ⚡ Task Management Dashboard

A modern, high-performance task management platform built for speed and efficiency. Designed with a focus on developer experience and user interaction.

## ✨ Key Features

- **🚀 Ultra-fast Performance**: Built on **Bun** and **Hono** for high-throughput API handling (150k+ req/s).
- **🎨 Modern UI/UX**: Crafted with **React 19**, **Tailwind CSS**, and **Radix UI**.
- **📋 Advanced Task Management**: 
  - **Kanban Board** with drag-and-drop support (via `@dnd-kit`).
  - **Gantt View** for timeline planning.
  - **List View** for compact data representation.
- **🔐 Secure Authentication**: Integrated with **Better Auth** for robust security.
- **💾 Type-Safe Database**: Fully typed database interactions using **Drizzle ORM** and **PostgreSQL** (Supabase).
- **🛠️ Monorepo Architecture**: Managed with **Turborepo** for efficient build pipelines.

## 🛠️ Tech Stack

### Monorepo & Tooling
- **Manager**: [Turborepo](https://turbo.build/)
- **Runtime**: [Bun](https://bun.sh/)
- **Package Manager**: Bun

### Apps

#### 🖥️ Frontend (`apps/web`)
- **Framework**: [Vite](https://vitejs.dev/) + [React 19](https://react.dev/)
- **Routing**: [TanStack Router](https://tanstack.com/router)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand) + [TanStack Query](https://tanstack.com/query)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Radix UI](https://www.radix-ui.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **DnD**: [@dnd-kit](https://dndkit.com/)

#### 🔌 Backend (`apps/api`)
- **Framework**: [Hono](https://hono.dev/)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
- **Validation**: [Zod](https://zod.dev/)
- **Auth**: [Better Auth](https://better-auth.com/)
- **Docs**: [Scalar](https://scalar.com/) (OpenAPI)
- **Email**: Nodemailer

### Database
- **Provider**: [Supabase](https://supabase.com/) (PostgreSQL)

## 🚀 Quick Start

### Prerequisites
- **Bun** (v1.1+): [Install Bun](https://bun.sh/docs/installation)
- **PostgreSQL** database (or Supabase project)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/taskdashboard.git
    cd taskdashboard
    ```

2.  **Install dependencies:**
    ```bash
    bun install
    ```

3.  **Configure Environment Variables:**
    Copy the example env file and update with your credentials.
    ```bash
    cp .env.example .env.local
    ```
    *Ensure you provide a valid `DATABASE_URL` and `BETTER_AUTH_SECRET`.*

### Running Locally

To start the entire stack (Frontend + Backend) in development mode:

```bash
bun run dev
```

- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **API Docs**: [http://localhost:3000/doc](http://localhost:3000/doc)

## 📜 Scripts

| Command | Description |
| :--- | :--- |
| `bun run dev` | Start both frontend and backend in dev mode |
| `bun run dev:web` | Start only the frontend |
| `bun run dev:api` | Start only the backend |
| `bun run build` | Build all apps and packages |
| `bun run lint` | Lint code across the monorepo |
| `bun run db:generate` | Generate database migrations (Drizzle) |
| `bun run db:migrate` | Apply database migrations |
| `bun run db:studio` | Open Drizzle Studio to view data |

## 🤝 Contributing

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.