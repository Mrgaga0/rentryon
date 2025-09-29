# Repository Guidelines

## Project Structure & Module Organization
- `client/src` hosts the Vite React UI: keep ShadCN primitives in `components/ui`, page views in `pages`, and shared hooks or helpers in `lib`.
- The Express API lives in `server/`; pair each `routes.ts` with its data access or Gemini helper nearby, and expose the app through `server/index.ts`.
- Share runtime contracts from `shared/schema.ts` via the `@shared/` alias; keep curated assets in `attached_assets/` and transient uploads in `uploads/`.
- End-to-end specs sit in `playwright/tests`.

## Build, Test, and Development Commands
- `npm install` (or `start-webapp.cmd`) installs dependencies and seeds required env vars into `.env.local`.
- `start-webapp.cmd` loads the environment and launches the Express + Vite stack on http://localhost:5000.
- `npm run dev` starts the API with `tsx`; use it when env vars are already exported in your shell.
- `npm run build` bundles the client and server into `dist/`; `npm run start` boots the bundle for smoke-testing.
- `npm run check` runs `tsc`; `npm run db:push` applies Drizzle migrations; `npm run test:e2e` executes Playwright flows.

## Coding Style & Naming Conventions
- All source is TypeScript with 2-space indentation, trailing commas, and `const` exports by default.
- Components use PascalCase filenames (`DashboardHeader.tsx`), hooks start with `use`, and utilities stay in `client/src/lib`.
- Prefer path aliases such as `@/components/ui/button` and `@shared/schema`; style with Tailwind classes or tokens.
- Keep formatting aligned with the workspace Prettier config and resolve type issues before committing.

## Testing Guidelines
- Favor Playwright for cross-surface coverage; group specs by feature (e.g., `playwright/tests/auth.spec.ts`).
- Run `npm run test:e2e` before opening a PR; re-run `npm run dev` to exercise critical upload and chat flows manually.
- Keep ephemeral fixtures in `uploads/` out of commits unless scrubbed and explicitly requested by reviewers.

## Security & Configuration Tips
- Mirror `.env.example` into `.env.local` with Supabase credentials, `SESSION_SECRET`, `REPLIT_DOMAINS`, `REPL_ID`, `ISSUER_URL`, `GEMINI_API_KEY`, and optional `PORT`.
- Postgres sessions require SSL (append `?sslmode=require` to the connection string); adjust `DATA_ROOT` when deploying off the default mount.

## Commit & Pull Request Guidelines
- Use short, imperative commits ("Add inventory upload validation"), calling out schema changes, env var updates, and asset refreshes explicitly.
- Document manual checks in the PR body (`npm run dev`, `npm run check`, `npm run test:e2e`) and attach updated UI screenshots in `attached_assets/`.
- Mention reviewers for auth, storage, or AI updates and link the driving issue or task for traceability.
