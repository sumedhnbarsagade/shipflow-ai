# ShipFlow AI 🚀

**ShipFlow AI** is an event-driven, multi-agent framework designed to unify product planning, task estimation, and continuous code quality reviews into a single, automated delivery loop.

---

## 🌟 Overview

In software development teams, product planning and code reviews often exist in silos. Product Managers write PRDs in static document editors, engineers manually break them down into tickets, and peer code reviews on GitHub are disconnected from the original acceptance criteria.

**ShipFlow AI** bridges this gap:
1. **Clarifies Requirements**: An interactive AI agent interviews you to flesh out edge cases, security requirements, and technical boundaries.
2. **Generates PRDs**: Compiles an enterprise-grade Product Requirements Document (PRD) with user stories, acceptance criteria, and KPI metrics.
3. **Breaks Down Tasks**: A Scrum Master Agent decomposes the PRD into atomic Kanban board tasks, complete with Fibonacci story points (1, 2, 3, 5, 8) and priority classifications.
4. **Conducts AI Code Reviews**: Traces GitHub Pull Requests directly back to the generated PRD, conducting automated line-by-line QA and security audits.
5. **Human Release Sign-Off**: Gives team leads a consolidated dashboard to approve releases.

---

## 🏗️ Architecture

```mermaid
graph TD
    User([Developer / PM]) -->|Feature Idea| Chat[Requirement Clarification Agent]
    Chat -->|Publish Event: prd.generate| Inngest[Inngest Workflow Engine]
    Inngest -->|Trigger Function| PMAgent[Elite PM Agent]
    PMAgent -->|GenerateText: groq/compound| PRD[Structured PRD]
    PRD -->|Publish Event: tasks.generate| Inngest
    Inngest -->|Trigger Function| TPMAgent[Scrum Master Agent]
    TPMAgent -->|GenerateObject: Zod Schema| Tasks[Estimated Kanban Tasks]
    Tasks -->|Link GitHub PR| QAAgent[AI QA & Security Agent]
    QAAgent -->|Analyze Code Diff against PRD| Review[Line-by-Line PR Feedback]
    Review --> Release[Human Release Sign-Off]
```

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
- **Monorepo Tooling**: [Turborepo](https://turbo.build/repo)
- **Background Jobs**: [Inngest](https://www.inngest.com/) (Event-driven serverless workflows)
- **AI Inference Engine**: [Vercel AI SDK](https://sdk.vercel.ai/) powered by [Groq](https://groq.com/) (`groq/compound` / `meta-llama/llama-4-scout-17b-16e-instruct`)
- **Type-Safe API**: [tRPC](https://trpc.io/) + [TanStack React Query](https://tanstack.com/query)
- **Authentication**: [Better Auth](https://better-auth.com/) (Email/Password, Google & GitHub OAuth) with auto-logout on inactivity
- **Database & ORM**: PostgreSQL + [Prisma ORM](https://www.prisma.io/)
- **Styling**: Vanilla CSS (Deep space glassmorphism design system)

---

## 📁 Repository Structure

```text
shipflow-ai/
├── apps/
│   └── web/                   # Next.js frontend & full-stack web application
│       ├── app/               # App router pages (dashboard, feature, auth, billing)
│       ├── lib/               # Auth client, tRPC client, utilities
│       └── public/            # Static assets & fonts
├── packages/
│   ├── api/                   # tRPC routers (featureRequest, project, github, etc.)
│   ├── auth/                  # Better Auth server configuration & plugins
│   ├── db/                    # Prisma schema, migrations, and database client
│   ├── inngest/               # Inngest function workflows (PRD, tasks, code review)
│   ├── ui/                    # Shared React UI components
│   ├── eslint-config/         # ESLint configurations
│   └── typescript-config/     # Shared tsconfig definitions
├── turbo.json                 # Turborepo pipeline configuration
└── package.json               # Root monorepo workspace dependencies
```

---

## 📋 Prerequisites

Make sure you have the following installed on your machine:
- **Node.js**: `v18.17.0` or higher (Recommended: `v20+`)
- **pnpm**: `v9.0.0` or higher (`corepack enable && corepack prepare pnpm@latest --activate` or `npm i -g pnpm`)
- **PostgreSQL**: A running local or cloud PostgreSQL instance (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Prisma Postgres](https://www.prisma.io/postgres))
- **Groq API Key**: Get a free API key at [console.groq.com](https://console.groq.com)

---

## 🚀 Local Installation & Setup

Follow these step-by-step instructions to clone, configure, and run ShipFlow AI on your local machine:

### 1. Clone the Repository
```bash
git clone https://github.com/sumedhnbarsagade/shipflow-ai.git
cd shipflow-ai
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Configure Environment Variables
Copy the example environment file to `.env`:
```bash
cp .env.example .env
```

Open `.env` and configure your credentials:

```env
# Database Settings
DATABASE_URL="postgresql://user:password@localhost:5432/shipflow"

# BetterAuth Settings
BETTER_AUTH_SECRET="your-32-char-random-secret-key-here"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# AI Inference (Groq)
GROQ_API_KEY="your-groq-api-key"

# GitHub Integration (Optional - Fallback Mock available)
GITHUB_TOKEN="your-github-personal-access-token"
GITHUB_CLIENT_ID="your-github-oauth-client-id"
GITHUB_CLIENT_SECRET="your-github-oauth-client-secret"

# Google OAuth Social Provider (Optional)
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"

# Payments (Optional - Fallback Mock available)
RAZORPAY_KEY_ID="your-razorpay-key-id"
RAZORPAY_KEY_SECRET="your-razorpay-key-secret"
```

> 💡 **Tip for `BETTER_AUTH_SECRET`**: You can generate a secure secret with `openssl rand -base64 32`.

### 4. Setup Database Schema
Push the Prisma schema to your database and generate the Prisma Client:

```bash
# Push schema tables to your database
export $(cat .env | grep -v '#' | xargs) && pnpm --filter @repo/db exec prisma db push

# Generate Prisma Client types
pnpm --filter @repo/db run db:generate
```

### 5. Start the Development Server
Run the local dev command. This will concurrently start **Next.js** (Turbopack) and the local **Inngest Dev Server**:

```bash
pnpm dev
```

The services will be available at:
- 🌐 **Web Application**: [http://localhost:3000](http://localhost:3000)
- ⚡ **Inngest Dev Server**: [http://localhost:8290](http://localhost:8290)

---

## 🧪 Testing the Workflow

1. Navigate to [http://localhost:3000](http://localhost:3000) and click **Get Started** to create an account.
2. Create a new **Project** from your dashboard.
3. Submit a new **Feature Request** (e.g. *"Add Google and GitHub OAuth social login"*).
4. Use the **Clarification Chat** to answer the AI PM's questions about your requirements.
5. Click **Finalize & Generate PRD** to trigger the automated PRD & Kanban task generation.
6. Under the **QA & Code** tab, link a live GitHub PR or click **Simulate PR** to watch the AI QA agent audit the code diff against the PRD.

---

## 📦 Available Scripts

Run these scripts from the repository root:

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Starts Next.js and Inngest Dev Server concurrently |
| `pnpm build` | Builds all packages and apps with Turborepo |
| `pnpm lint` | Runs ESLint across the monorepo |
| `pnpm check-types` | Performs TypeScript typechecking across all packages |
| `pnpm --filter @repo/db exec prisma studio` | Opens Prisma Studio to view and edit database records |

---

## 🚢 Deployment (Vercel + Inngest Cloud)

### 1. Vercel Setup
1. Push your repository to GitHub.
2. Import the repository into [Vercel](https://vercel.com).
3. Set the **Framework Preset** to `Next.js` and Root Directory to `./`.
4. Configure all environment variables from `.env` in Vercel's **Environment Variables** settings.

### 2. Inngest Cloud Setup
When deploying to production, Inngest runs in the cloud:
1. Create a free account at [Inngest Cloud](https://app.inngest.com).
2. Retrieve your **Event Key** (`INNGEST_EVENT_KEY`) and **Signing Key** (`INNGEST_SIGNING_KEY`) from your Inngest Environment settings.
3. Add `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` to your Vercel Environment Variables.
4. Set the Inngest App Sync URL in Inngest Cloud to: `https://your-vercel-domain.app/api/inngest`.

### 3. OAuth Callback URLs
In your Google Cloud Console and GitHub Developer Settings, add the production callback URLs:
- **Google Authorized Redirect URI**: `https://your-vercel-domain.app/api/auth/callback/google`
- **GitHub Authorization Callback URL**: `https://your-vercel-domain.app/api/auth/callback/github`

---

## 📄 License

This project is licensed under the MIT License.
